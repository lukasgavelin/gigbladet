import type { ScheduleItem } from '../types/gig.ts';

export type ItemTimeStatus = 'past' | 'current' | 'upcoming' | 'next';

export interface EvaluatedScheduleItem extends ScheduleItem {
  status: ItemTimeStatus;
  startMinutes: number;
  endMinutes: number;
  minutesUntilStart: number;
  minutesUntilEnd: number;
}

export interface LivePulseInfo {
  mode: 'live_now' | 'countdown_today' | 'upcoming_date' | 'completed' | 'empty';
  headline: string;
  subheadline: string;
  badgeText: string;
  currentItem?: EvaluatedScheduleItem;
  nextItem?: EvaluatedScheduleItem;
  concertItem?: EvaluatedScheduleItem;
  concertCountdownText?: string;
}

export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || !/^\d{1,2}:\d{2}$/.test(timeStr.trim())) return null;
  const [h, m] = timeStr.trim().split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function formatDurationMinutes(totalMinutes: number): string {
  const mins = Math.max(1, Math.round(totalMinutes));
  if (mins < 60) {
    return `${mins} min`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

export function formatSwedishDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(date.getTime())) return dateStr;

  const formatted = new Intl.DateTimeFormat('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export const MIDNIGHT_ROLLOVER_MINUTES = 6 * 60; // 06:00
export const DAY_MINUTES = 24 * 60; // 1440

export function hasEveningScheduleItems(schedule: ScheduleItem[]): boolean {
  return schedule.some((item) => {
    const m = parseTimeToMinutes(item.time);
    return m !== null && m >= 12 * 60;
  });
}

export function scheduleSortMinutes(timeStr?: string, hasEvening = false): number {
  const m = parseTimeToMinutes(timeStr);
  if (m === null) return 9999;
  if (hasEvening && m < MIDNIGHT_ROLLOVER_MINUTES) {
    return m + DAY_MINUTES;
  }
  return m;
}

export function evaluateSchedule(
  schedule: ScheduleItem[],
  gigDateStr: string,
  now: Date,
  forceSameDaySimulation = false
): {
  items: EvaluatedScheduleItem[];
  pulse: LivePulseInfo;
} {
  const hasEvening = hasEveningScheduleItems(schedule);
  const sorted = [...schedule].sort((a, b) => {
    return scheduleSortMinutes(a.time, hasEvening) - scheduleSortMinutes(b.time, hasEvening);
  });

  if (sorted.length === 0) {
    return {
      items: [],
      pulse: {
        mode: 'empty',
        headline: 'Inga hållpunkter inlagda ännu',
        subheadline: 'Körschemat uppdateras av kapellmästaren.',
        badgeText: 'KÖRSCHEMA',
      },
    };
  }

  const nowYear = now.getFullYear();
  const nowMonth = String(now.getMonth() + 1).padStart(2, '0');
  const nowDay = String(now.getDate()).padStart(2, '0');
  const todayStr = `${nowYear}-${nowMonth}-${nowDay}`;

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const isYesterdayGigEarlyMorning =
    hasEvening &&
    now.getHours() < 6 &&
    gigDateStr === yesterdayStr;

  const isToday = forceSameDaySimulation || gigDateStr === todayStr || isYesterdayGigEarlyMorning;
  const isFutureDate = !isToday && gigDateStr > todayStr;
  const isPastDate = !isToday && !isYesterdayGigEarlyMorning && gigDateStr < todayStr;

  let effectiveNowMinutes = now.getHours() * 60 + now.getMinutes();
  if (hasEvening && effectiveNowMinutes < MIDNIGHT_ROLLOVER_MINUTES && isToday) {
    effectiveNowMinutes += DAY_MINUTES;
  }

  // Compute start and end minutes for each item
  const rawEvaluated = sorted.map((item, idx) => {
    let startMinutes = parseTimeToMinutes(item.time) ?? 0;
    if (hasEvening && startMinutes < MIDNIGHT_ROLLOVER_MINUTES) {
      startMinutes += DAY_MINUTES;
    }

    let explicitEnd = parseTimeToMinutes(item.endTime);
    if (explicitEnd !== null) {
      if (hasEvening && explicitEnd < MIDNIGHT_ROLLOVER_MINUTES) {
        explicitEnd += DAY_MINUTES;
      } else if (explicitEnd < startMinutes) {
        explicitEnd += DAY_MINUTES;
      }
    }

    let nextItemStart =
      idx + 1 < sorted.length ? parseTimeToMinutes(sorted[idx + 1].time) : null;
    if (nextItemStart !== null && hasEvening && nextItemStart < MIDNIGHT_ROLLOVER_MINUTES) {
      nextItemStart += DAY_MINUTES;
    }

    let endMinutes: number;
    if (explicitEnd !== null && explicitEnd > startMinutes) {
      endMinutes = explicitEnd;
    } else if (nextItemStart !== null && nextItemStart > startMinutes) {
      endMinutes = nextItemStart;
    } else {
      endMinutes = startMinutes + 45;
    }

    return {
      ...item,
      startMinutes,
      endMinutes,
      minutesUntilStart: startMinutes - effectiveNowMinutes,
      minutesUntilEnd: endMinutes - effectiveNowMinutes,
      status: 'upcoming' as ItemTimeStatus,
    };
  });

  if (isPastDate) {
    const items = rawEvaluated.map((item) => ({ ...item, status: 'past' as ItemTimeStatus }));
    return {
      items,
      pulse: {
        mode: 'completed',
        headline: 'Evenemanget är genomfört',
        subheadline: `Giget ägde rum ${formatSwedishDate(gigDateStr).toLowerCase()}.`,
        badgeText: 'AVSLUTAT',
      },
    };
  }

  if (isFutureDate) {
    const items = rawEvaluated.map((item, idx) => ({
      ...item,
      status: (idx === 0 ? 'next' : 'upcoming') as ItemTimeStatus,
    }));
    const firstItem = items[0];
    const concertItem = items.find((i) => i.highlight) || items[items.length - 1];
    return {
      items,
      pulse: {
        mode: 'upcoming_date',
        headline: `${firstItem.title} kl ${firstItem.time}`,
        subheadline: `${formatSwedishDate(gigDateStr)} • Konsert/huvudpunkt kl ${concertItem.time}`,
        badgeText: 'KOMMANDE GIG',
        nextItem: firstItem,
        concertItem,
      },
    };
  }

  // Same day (today, simulated gig day, or morning after with evening gig)
  let foundCurrent = false;
  let foundNext = false;

  const items: EvaluatedScheduleItem[] = rawEvaluated.map((item) => {
    if (effectiveNowMinutes >= item.endMinutes) {
      return { ...item, status: 'past' };
    }
    if (effectiveNowMinutes >= item.startMinutes && effectiveNowMinutes < item.endMinutes && !foundCurrent) {
      foundCurrent = true;
      return { ...item, status: 'current' };
    }
    if (effectiveNowMinutes < item.startMinutes && !foundCurrent && !foundNext) {
      foundNext = true;
      return { ...item, status: 'next' };
    }
    if (effectiveNowMinutes < item.startMinutes && foundCurrent && !foundNext) {
      foundNext = true;
      return { ...item, status: 'next' };
    }
    return { ...item, status: 'upcoming' };
  });

  const currentItem = items.find((i) => i.status === 'current');
  const nextItem = items.find((i) => i.status === 'next');
  const upcomingConcert = items.find((i) => i.highlight && i.startMinutes > effectiveNowMinutes);

  const concertCountdownText =
    upcomingConcert && upcomingConcert.id !== nextItem?.id
      ? `${upcomingConcert.title} om ${formatDurationMinutes(upcomingConcert.minutesUntilStart)} (${upcomingConcert.time})`
      : undefined;

  if (currentItem) {
    const remainingText = formatDurationMinutes(currentItem.minutesUntilEnd);
    const subParts: string[] = [];
    if (currentItem.location) {
      subParts.push(`Plats: ${currentItem.location}`);
    }
    if (nextItem) {
      subParts.push(
        `Nästa: ${nextItem.title} om ${formatDurationMinutes(nextItem.minutesUntilStart)} (kl ${nextItem.time})`
      );
    } else {
      subParts.push(`Pågår i ca ${remainingText} till`);
    }

    return {
      items,
      pulse: {
        mode: 'live_now',
        headline: currentItem.title,
        subheadline: subParts.join(' • '),
        badgeText: 'PÅGÅR JUST NU',
        currentItem,
        nextItem,
        concertItem: upcomingConcert,
        concertCountdownText,
      },
    };
  }

  if (nextItem) {
    const waitText = formatDurationMinutes(nextItem.minutesUntilStart);
    const subParts: string[] = [`Startar kl ${nextItem.time}`];
    if (nextItem.location) {
      subParts.push(nextItem.location);
    }
    if (concertCountdownText) {
      subParts.push(concertCountdownText);
    }

    return {
      items,
      pulse: {
        mode: 'countdown_today',
        headline: `${nextItem.title} om ${waitText}`,
        subheadline: subParts.join(' • '),
        badgeText: 'NÄSTA HÅLLPUNKT',
        nextItem,
        concertItem: upcomingConcert,
        concertCountdownText,
      },
    };
  }

  return {
    items,
    pulse: {
      mode: 'completed',
      headline: 'Alla hållpunkter för kvällen är avklarade',
      subheadline: 'Tack för ett grymt gig! Glöm inte dina kablar och notställ.',
      badgeText: 'KLART FÖR KVÄLLEN',
    },
  };
}

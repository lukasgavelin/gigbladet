import type { GigData } from '../types/gig.ts';
import { parseTimeToMinutes } from './time.ts';

const DEFAULT_START_MINUTES = 18 * 60;
const DEFAULT_CALL_START_MINUTES = 17 * 60;
const DEFAULT_ITEM_DURATION_MINUTES = 60;
const DEFAULT_EVENT_DURATION_MINUTES = 180;
const MIN_EVENT_DURATION_MINUTES = 30;

function formatIcsDateTime(dateStr: string, minutesFromMidnight: number): string {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || 1;
  const day = parts[2] || 1;
  const clampedMinutes = Math.max(0, Math.min(23 * 60 + 59, minutesFromMidnight));
  const hours = Math.floor(clampedMinutes / 60);
  const mins = clampedMinutes % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}${pad(month)}${pad(day)}T${pad(hours)}${pad(mins)}00`;
}

export function escapeIcsText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function generateGigCalendarIcs(gig: GigData, origin: string): string {
  const sorted = [...gig.schedule].sort((a, b) => {
    return (parseTimeToMinutes(a.time) ?? 9999) - (parseTimeToMinutes(b.time) ?? 9999);
  });

  const firstMin =
    sorted.length > 0
      ? (parseTimeToMinutes(sorted[0].time) ?? DEFAULT_CALL_START_MINUTES)
      : DEFAULT_START_MINUTES;

  const lastItem = sorted[sorted.length - 1];
  const lastEndMin = lastItem
    ? (parseTimeToMinutes(lastItem.endTime) ??
        (parseTimeToMinutes(lastItem.time) ?? 20 * 60) + DEFAULT_ITEM_DURATION_MINUTES)
    : firstMin + DEFAULT_EVENT_DURATION_MINUTES;

  const dtStart = formatIcsDateTime(gig.date, firstMin);
  const dtEnd = formatIcsDateTime(
    gig.date,
    Math.max(firstMin + MIN_EVENT_DURATION_MINUTES, lastEndMin)
  );
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const descriptionLines: string[] = [];
  if (gig.ensemble) {
    descriptionLines.push(`Ensemble: ${gig.ensemble}`);
  }
  if (gig.generalNotes) {
    descriptionLines.push(`Notering: ${gig.generalNotes}`);
  }
  descriptionLines.push('');
  descriptionLines.push('KÖRSCHEMA:');
  for (const item of sorted) {
    const timeRange = item.endTime ? `${item.time}–${item.endTime}` : item.time;
    const loc = item.location ? ` (${item.location})` : '';
    descriptionLines.push(`• ${timeRange} ${item.title}${loc}`);
  }

  if (gig.backstage.doorCode || gig.backstage.greenRoom || gig.backstage.dressCodeText) {
    descriptionLines.push('');
    descriptionLines.push('BACKSTAGE & PRAKTISKT:');
    if (gig.backstage.doorCode) descriptionLines.push(`Dörr-/scenkod: ${gig.backstage.doorCode}`);
    if (gig.backstage.greenRoom) descriptionLines.push(`Loge: ${gig.backstage.greenRoom}`);
    if (gig.backstage.dressCodeText) descriptionLines.push(`Klädkod: ${gig.backstage.dressCodeText}`);
  }

  const safeId = (gig.publicId || 'gigbladet').replace(/[^a-zA-Z0-9_-]/g, '');
  const publicUrl = `${origin.replace(/\/+$/, '')}/g/${encodeURIComponent(safeId)}`;
  descriptionLines.push('');
  descriptionLines.push(`Live-körschema (GigBladet): ${publicUrl}`);

  const locationStr = [gig.venue, gig.address].filter(Boolean).join(', ');
  const summaryStr = gig.ensemble ? `${gig.title} – ${gig.ensemble}` : gig.title;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GigBladet//SE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:gigbladet-${safeId}@gigbladet.local`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summaryStr)}`,
    `LOCATION:${escapeIcsText(locationStr)}`,
    `DESCRIPTION:${escapeIcsText(descriptionLines.join('\n'))}`,
    `URL:${escapeIcsText(publicUrl)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return icsLines.join('\r\n');
}

export function downloadGigCalendarFile(gig: GigData): void {
  const icsContent = generateGigCalendarIcs(gig, window.location.origin);
  const safeFilename = (gig.publicId || 'gigbladet').replace(/[^a-zA-Z0-9_-]/g, '') || 'gigbladet';

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFilename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowSquareOut,
  CalendarPlus,
  Check,
  Clock,
  Info,
  MapPin,
  NavigationArrow,
  PencilSimple,
  Phone,
  ShareNetwork,
  SlidersHorizontal,
  Sparkle,
  WifiSlash,
} from '@phosphor-icons/react';
import type { GigData } from '../types/gig.ts';
import { evaluateSchedule, formatSwedishDate } from '../utils/time.ts';
import { downloadGigCalendarFile } from '../utils/calendar.ts';
import { useCopyFeedback } from '../hooks/useCopyFeedback.ts';
import { ThemeToggle } from './ThemeToggle.tsx';
import { BackstageSection } from './musician/BackstageSection.tsx';
import { SetlistSection } from './musician/SetlistSection.tsx';

interface MusicianViewProps {
  gig: GigData;
  isOfflineFallback?: boolean;
  isPreviewMode?: boolean;
  onNavigate: (path: string) => void;
  onExitPreview?: () => void;
}

const CLOCK_TICK_INTERVAL_MS = 15_000;
const DEFAULT_SIM_MINUTES = 17 * 60 + 35;

export const MusicianView: React.FC<MusicianViewProps> = ({
  gig,
  isOfflineFallback = false,
  isPreviewMode = false,
  onNavigate,
  onExitPreview,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const { copiedKey, copyWithFeedback } = useCopyFeedback<'wifi' | 'door' | 'share'>();

  const [simEnabled, setSimEnabled] = useState<boolean>(false);
  const [simMinutes, setSimMinutes] = useState<number>(DEFAULT_SIM_MINUTES);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, CLOCK_TICK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveNow = useMemo(() => {
    if (!simEnabled) return now;
    const d = new Date(now);
    d.setHours(Math.floor(simMinutes / 60), simMinutes % 60, 0, 0);
    return d;
  }, [now, simEnabled, simMinutes]);

  // Filter out any empty schedule rows so unused rows never appear
  const nonEmptySchedule = useMemo(
    () => gig.schedule.filter((item) => item.title.trim().length > 0),
    [gig.schedule]
  );

  const nonEmptyContacts = useMemo(
    () =>
      gig.contacts.filter(
        (c) => c.name.trim().length > 0 || c.phone.trim().length > 0
      ),
    [gig.contacts]
  );

  const { items: evaluatedSchedule, pulse } = useMemo(
    () => evaluateSchedule(nonEmptySchedule, gig.date, effectiveNow, simEnabled),
    [nonEmptySchedule, gig.date, effectiveNow, simEnabled]
  );

  const mapsUrl = useMemo(() => {
    const query = [gig.venue.trim(), gig.address.trim()].filter(Boolean).join(', ');
    if (!query) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }, [gig.venue, gig.address]);

  const handleSharePublicLink = async () => {
    const url = `${window.location.origin}/g/${encodeURIComponent(gig.publicId)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${gig.title} – Körschema`,
          text: `Körschema och hålltider för ${gig.title}`,
          url,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    void copyWithFeedback(url, 'share');
  };

  const formatSimTime = (mins: number) => {
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(mins % 60).padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-24 transition-colors">
      {/* Minimalist Top Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 dark:border-zinc-900 bg-zinc-50/85 dark:bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto max-w-xl px-5 py-3.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400" />
            GigBladet
          </button>

          <div className="flex items-center gap-2">
            {(!isOnline || isOfflineFallback) && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                <WifiSlash weight="duotone" className="w-3.5 h-3.5" />
                Offline
              </span>
            )}

            {evaluatedSchedule.length > 0 && (
              <button
                type="button"
                onClick={() => setSimEnabled((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  simEnabled
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="Testa hur körschemat och live-pulsen ser ut vid olika klockslag"
              >
                <SlidersHorizontal weight="duotone" className="w-3.5 h-3.5" />
                <span>{simEnabled ? formatSimTime(simMinutes) : 'Testa tid'}</span>
              </button>
            )}

            <ThemeToggle />

            {isPreviewMode && onExitPreview ? (
              <button
                type="button"
                onClick={onExitPreview}
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 dark:bg-amber-500 hover:opacity-90 text-white dark:text-zinc-950 font-medium px-3.5 py-1.5 text-xs transition-opacity cursor-pointer"
              >
                <PencilSimple weight="bold" className="w-3.5 h-3.5" />
                Tillbaka
              </button>
            ) : gig.adminToken ? (
              <button
                type="button"
                onClick={() => onNavigate(`/edit/${encodeURIComponent(gig.adminToken!)}`)}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                <PencilSimple weight="duotone" className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                Redigera
              </button>
            ) : null}
          </div>
        </div>

        {/* Time Simulator Drawer */}
        {simEnabled && evaluatedSchedule.length > 0 && (
          <div className="border-t border-zinc-200/70 dark:border-zinc-800/70 bg-white/90 dark:bg-zinc-900/60 px-5 py-3">
            <div className="mx-auto max-w-xl flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  Simulerar gig-dagen kl {formatSimTime(simMinutes)}
                </span>
                <button
                  type="button"
                  onClick={() => setSimEnabled(false)}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white underline cursor-pointer"
                >
                  Realtid ({now.toTimeString().slice(0, 5)})
                </button>
              </div>
              <input
                type="range"
                min={14 * 60}
                max={23 * 60 + 45}
                step={5}
                value={simMinutes}
                onChange={(e) => setSimMinutes(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
                aria-label="Simulera klockslag"
              />
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-xl px-5 sm:px-6 pt-8 sm:pt-12 space-y-10 sm:space-y-12">
        {/* 1. GIG-HUVUD */}
        <section aria-label="Gig-huvud" className="space-y-4">
          {gig.ensemble.trim() && (
            <div className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              {gig.ensemble}
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
            {gig.title.trim() || 'Namnlöst gig'}
          </h1>

          {(gig.date.trim() || gig.venue.trim() || gig.address.trim()) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 text-sm text-zinc-600 dark:text-zinc-400 pt-1">
              {gig.date.trim() && (
                <div className="inline-flex items-center gap-2">
                  <Clock weight="duotone" className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <span>{formatSwedishDate(gig.date)}</span>
                </div>
              )}
              {(gig.venue.trim() || gig.address.trim()) && (
                <div className="inline-flex items-center gap-2">
                  <MapPin weight="duotone" className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <span>
                    {gig.venue.trim()}
                    {gig.venue.trim() && gig.address.trim()
                      ? `, ${gig.address.trim()}`
                      : gig.address.trim()}
                  </span>
                </div>
              )}
            </div>
          )}

          {gig.generalNotes.trim() && (
            <div className="rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800/60 px-4 py-3.5 flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <Info weight="duotone" className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{gig.generalNotes}</p>
            </div>
          )}
        </section>

        {/* 2. LIVE-PULS (Endast om det finns hållpunkter i körschemat) */}
        {evaluatedSchedule.length > 0 && (
          <section
            aria-label="Live-puls"
            className={`rounded-2xl border p-5 sm:p-6 transition-colors ${
              pulse.mode === 'live_now'
                ? 'border-emerald-500/35 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07]'
                : pulse.mode === 'countdown_today'
                ? 'border-amber-500/35 bg-amber-500/[0.04] dark:bg-amber-500/[0.06]'
                : 'border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="inline-flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  {(pulse.mode === 'live_now' || pulse.mode === 'countdown_today') && (
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        pulse.mode === 'live_now' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      pulse.mode === 'live_now'
                        ? 'bg-emerald-500 dark:bg-emerald-400'
                        : pulse.mode === 'countdown_today'
                        ? 'bg-amber-500 dark:bg-amber-400'
                        : 'bg-zinc-400 dark:bg-zinc-600'
                    }`}
                  />
                </span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-widest ${
                    pulse.mode === 'live_now'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : pulse.mode === 'countdown_today'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {pulse.badgeText}
                </span>
              </div>

              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                {effectiveNow.toTimeString().slice(0, 5)}
              </span>
            </div>

            <div className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white leading-snug">
              {pulse.headline}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
              {pulse.subheadline}
            </p>

            {pulse.mode === 'upcoming_date' && !simEnabled && (
              <button
                type="button"
                onClick={() => setSimEnabled(true)}
                className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                <SlidersHorizontal weight="duotone" className="w-3.5 h-3.5" />
                Förhandsvisa live-pulsen som på gig-dagen
              </button>
            )}
          </section>
        )}

        {/* 3. SNABBKNAPPAR & KONTAKTER (Döljer kartknapp om plats/adress saknas) */}
        <section aria-label="Snabbåtgärder" className="space-y-4">
          <div className={`grid gap-3 ${mapsUrl ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 py-4 px-3 text-center transition-colors"
              >
                <NavigationArrow weight="duotone" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  Öppna karta
                </span>
              </a>
            )}

            <button
              type="button"
              onClick={() => downloadGigCalendarFile(gig)}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 py-4 px-3 text-center transition-colors cursor-pointer"
            >
              <CalendarPlus weight="duotone" className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                Kalender (.ics)
              </span>
            </button>

            <button
              type="button"
              onClick={handleSharePublicLink}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 py-4 px-3 text-center transition-colors cursor-pointer"
            >
              {copiedKey === 'share' ? (
                <>
                  <Check weight="bold" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Kopierad
                  </span>
                </>
              ) : (
                <>
                  <ShareNetwork weight="duotone" className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    Dela länk
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Minimalist 1-Click Call Contacts */}
          {nonEmptyContacts.length > 0 && (
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden">
              {nonEmptyContacts.map((contact) => {
                const cleanPhone = contact.phone.replace(/[^\d+]/g, '');
                return (
                  <a
                    key={contact.id}
                    href={cleanPhone ? `tel:${cleanPhone}` : undefined}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {contact.name || contact.phone}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {[contact.role.trim(), contact.phone.trim()].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                    {cleanPhone && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 shrink-0">
                        <Phone weight="duotone" className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Ring</span>
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. TIDSLINJE / KÖRSCHEMA (Döljs helt om inga hållpunkter har fyllts i) */}
        {evaluatedSchedule.length > 0 && (
          <section aria-label="Körschema" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Körschema
              </h2>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {evaluatedSchedule.length}{' '}
                {evaluatedSchedule.length === 1 ? 'hållpunkt' : 'hållpunkter'}
              </span>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden">
              {evaluatedSchedule.map((item) => {
                const isPast = item.status === 'past';
                const isCurrent = item.status === 'current';
                const isNext = item.status === 'next';

                return (
                  <div
                    key={item.id}
                    className={`p-5 transition-colors ${
                      isCurrent
                        ? 'bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08]'
                        : isNext
                        ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.05]'
                        : isPast
                        ? 'opacity-45'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {item.time && (
                        <div className="w-16 shrink-0 pt-0.5">
                          <div
                            className={`text-sm sm:text-base font-mono font-semibold leading-none ${
                              isCurrent
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isNext || item.highlight
                                ? 'text-amber-600 dark:text-amber-400'
                                : isPast
                                ? 'text-zinc-400 dark:text-zinc-500 line-through'
                                : 'text-zinc-900 dark:text-zinc-200'
                            }`}
                          >
                            {item.time}
                          </div>
                          {item.endTime && (
                            <div className="text-xs font-mono text-zinc-400 dark:text-zinc-500 mt-1">
                              – {item.endTime}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                            {item.title}
                          </h3>

                          {isCurrent && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-[11px] font-semibold">
                              Pågår nu
                            </span>
                          )}

                          {isNext && (
                            <span className="inline-flex items-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 text-[11px] font-semibold">
                              Nästa
                            </span>
                          )}

                          {item.highlight && !isCurrent && !isNext && (
                            <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-0.5 text-[11px] font-medium">
                              Konsert
                            </span>
                          )}
                        </div>

                        {item.location?.trim() && (
                          <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <MapPin weight="duotone" className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.location}</span>
                          </div>
                        )}

                        {item.description?.trim() && (
                          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. BACKSTAGE & PRAKTISKT */}
        <BackstageSection
          backstage={gig.backstage}
          copiedKey={copiedKey}
          onCopy={(text, key) => void copyWithFeedback(text, key)}
        />

        {/* 6. SETLIST / REPERTOAR */}
        <SetlistSection enabled={gig.setlistEnabled} setlist={gig.setlist} />

        {/* 7. SPRIDNINGSKNAPP & FOOTER */}
        <footer className="pt-8 border-t border-zinc-200/70 dark:border-zinc-900 text-center space-y-3">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Allt för gigget på en enda länk – även offline i logen.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/ny')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-500/50 px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              <Sparkle weight="duotone" className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Skapa eget körschema gratis</span>
            </button>
            <a
              href="https://github.com/lukasgavelin/gigbladet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors py-1"
            >
              <span>Öppen källkod på GitHub</span>
              <ArrowSquareOut weight="bold" className="w-3 h-3" />
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
};

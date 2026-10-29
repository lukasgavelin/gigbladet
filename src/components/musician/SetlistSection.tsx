import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ListMusic } from 'lucide-react';
import type { SetlistItem } from '../../types/gig.ts';

interface SetlistSectionProps {
  enabled: boolean;
  setlist: SetlistItem[];
}

const MIN_BPM = 40;
const MAX_BPM = 240;

export const SetlistSection: React.FC<SetlistSectionProps> = ({ enabled, setlist }) => {
  const [setlistOpen, setSetlistOpen] = useState<boolean>(true);
  const [activeBpmId, setActiveBpmId] = useState<string | null>(null);

  const validSongs = useMemo(
    () => setlist.filter((s) => s.title.trim().length > 0),
    [setlist]
  );

  if (!enabled || validSongs.length === 0) return null;

  return (
    <section aria-label="Setlist och repertoar" className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 overflow-hidden">
        <button
          type="button"
          onClick={() => setSetlistOpen((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
          aria-expanded={setlistOpen}
        >
          <div className="flex items-center gap-3">
            <ListMusic className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Setlist / Repertoar
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {validSongs.length} {validSongs.length === 1 ? 'låt' : 'låtar'}
              </p>
            </div>
          </div>
          <span className="rounded-full p-2 text-zinc-400 dark:text-zinc-500">
            {setlistOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {setlistOpen && (
          <div className="border-t border-zinc-100 dark:border-zinc-800/60 divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {validSongs.map((song, idx) => {
              const numericBpm = Number.parseInt(song.tempo, 10);
              const hasValidBpm =
                !Number.isNaN(numericBpm) && numericBpm >= MIN_BPM && numericBpm <= MAX_BPM;
              const isBpmBlinking = activeBpmId === song.id && hasValidBpm;
              const beatIntervalMs = hasValidBpm ? Math.round(60000 / numericBpm) : 500;

              return (
                <React.Fragment key={song.id}>
                  {song.setHeader?.trim() && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/80 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      {song.setHeader}
                    </div>
                  )}
                  <div className="px-5 py-4 flex items-start gap-3.5">
                    <span className="w-5 shrink-0 pt-0.5 text-xs font-mono text-zinc-400 dark:text-zinc-500">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100">
                          {song.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {song.key.trim() && (
                            <span className="rounded-md bg-amber-500/10 dark:bg-amber-500/15 px-2 py-0.5 text-xs font-mono font-medium text-amber-700 dark:text-amber-300">
                              {song.key}
                            </span>
                          )}
                          {song.tempo.trim() && (
                            <button
                              type="button"
                              onClick={() =>
                                hasValidBpm &&
                                setActiveBpmId((prev) => (prev === song.id ? null : song.id))
                              }
                              title={
                                hasValidBpm
                                  ? 'Klicka för visuell tempoblink (ljudlös metronom)'
                                  : undefined
                              }
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-mono transition-colors ${
                                isBpmBlinking
                                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                              } ${hasValidBpm ? 'cursor-pointer' : ''}`}
                            >
                              {isBpmBlinking && (
                                <span
                                  className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping"
                                  style={{ animationDuration: `${beatIntervalMs}ms` }}
                                />
                              )}
                              {song.tempo}
                            </button>
                          )}
                        </div>
                      </div>
                      {song.soloistOrNotes.trim() && (
                        <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                          {song.soloistOrNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

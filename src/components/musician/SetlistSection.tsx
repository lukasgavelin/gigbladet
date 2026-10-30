import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CaretDown, CaretUp, Queue } from '@phosphor-icons/react';
import type { SetlistItem } from '../../types/gig.ts';
import {
  parseKey,
  playPitchPipeSequence,
  startMetronome,
  type MetronomeController,
} from '../../utils/audio.ts';
import { MetronomeIcon, SoundWaveIcon } from '../icons/MusicIcons.tsx';

interface SetlistSectionProps {
  enabled: boolean;
  setlist: SetlistItem[];
}

const MIN_BPM = 40;
const MAX_BPM = 240;

export const SetlistSection: React.FC<SetlistSectionProps> = ({ enabled, setlist }) => {
  const [setlistOpen, setSetlistOpen] = useState<boolean>(true);
  const [activeBpmId, setActiveBpmId] = useState<string | null>(null);
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);
  const [beatPulse, setBeatPulse] = useState<boolean>(false);

  const metronomeRef = useRef<MetronomeController | null>(null);
  const pitchCancelRef = useRef<(() => void) | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop any active audio when unmounting
  useEffect(() => {
    return () => {
      if (metronomeRef.current) {
        metronomeRef.current.stop();
        metronomeRef.current = null;
      }
      if (pitchCancelRef.current) {
        pitchCancelRef.current();
        pitchCancelRef.current = null;
      }
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, []);

  const validSongs = useMemo(
    () => setlist.filter((s) => s.title.trim().length > 0),
    [setlist]
  );

  const stopAllAudio = () => {
    if (metronomeRef.current) {
      metronomeRef.current.stop();
      metronomeRef.current = null;
    }
    if (pitchCancelRef.current) {
      pitchCancelRef.current();
      pitchCancelRef.current = null;
    }
    setActiveBpmId(null);
    setActiveKeyId(null);
    setBeatPulse(false);
  };

  const handleToggleBpm = (songId: string, tempoStr: string) => {
    const numericBpm = Number.parseInt(tempoStr, 10);
    if (Number.isNaN(numericBpm) || numericBpm < MIN_BPM || numericBpm > MAX_BPM) {
      return;
    }

    // If this song's BPM is already ticking, stop it
    if (activeBpmId === songId) {
      stopAllAudio();
      return;
    }

    // Stop any other sound before starting
    stopAllAudio();

    setActiveBpmId(songId);

    let beatsCount = 0;
    const maxBeats = 64; // Auto-stop after ~16 bars of 4/4 so it doesn't drain battery if forgotten

    metronomeRef.current = startMetronome(numericBpm, () => {
      setBeatPulse(true);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = setTimeout(() => {
        setBeatPulse(false);
      }, 100);

      beatsCount++;
      if (beatsCount >= maxBeats) {
        stopAllAudio();
      }
    });
  };

  const handlePlayKey = (songId: string, keyStr: string) => {
    const parsed = parseKey(keyStr);
    if (!parsed) return;

    // If currently playing this key, stop it
    if (activeKeyId === songId) {
      stopAllAudio();
      return;
    }

    // Stop other audio
    stopAllAudio();

    setActiveKeyId(songId);

    const cancel = playPitchPipeSequence(keyStr, () => {
      setActiveKeyId((current) => (current === songId ? null : current));
      pitchCancelRef.current = null;
    });

    pitchCancelRef.current = cancel;
  };

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
            <Queue weight="duotone" className="w-4 h-4 text-amber-500 dark:text-amber-400" />
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
            {setlistOpen ? (
              <CaretUp weight="bold" className="w-4 h-4" />
            ) : (
              <CaretDown weight="bold" className="w-4 h-4" />
            )}
          </span>
        </button>

        {setlistOpen && (
          <div className="border-t border-zinc-100 dark:border-zinc-800/60 divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {validSongs.map((song, idx) => {
              const numericBpm = Number.parseInt(song.tempo, 10);
              const hasValidBpm =
                !Number.isNaN(numericBpm) && numericBpm >= MIN_BPM && numericBpm <= MAX_BPM;
              const isBpmActive = activeBpmId === song.id;

              const parsedKey = parseKey(song.key);
              const isKeyPlayable = Boolean(parsedKey);
              const isKeyActive = activeKeyId === song.id;

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
                          {/* Key / Tonart Badge & Stämpipa */}
                          {song.key.trim() && (
                            <button
                              type="button"
                              onClick={() =>
                                isKeyPlayable && handlePlayKey(song.id, song.key)
                              }
                              disabled={!isKeyPlayable}
                              title={
                                isKeyPlayable
                                  ? isKeyActive
                                    ? 'Klicka för att tysta tonen'
                                    : `Stämpipa: Spela tonarten ${song.key} (låg oktav, sedan hög)`
                                  : undefined
                              }
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-mono font-medium transition-all ${
                                isKeyActive
                                  ? 'bg-amber-500 text-zinc-950 font-bold ring-2 ring-amber-400/50 scale-105'
                                  : isKeyPlayable
                                    ? 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 active:scale-95 cursor-pointer'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-default'
                              }`}
                            >
                              {isKeyActive && (
                                <SoundWaveIcon className="w-3.5 h-3.5 animate-pulse text-zinc-950" />
                              )}
                              <span>{song.key}</span>
                            </button>
                          )}

                          {/* Tempo / BPM Metronome Ticker */}
                          {song.tempo.trim() && (
                            <button
                              type="button"
                              onClick={() =>
                                hasValidBpm && handleToggleBpm(song.id, song.tempo)
                              }
                              title={
                                hasValidBpm
                                  ? isBpmActive
                                    ? 'Klicka för att stoppa metronomen'
                                    : `Metronom: Ticka ${song.tempo} BPM (med ljud & visuell puls)`
                                  : undefined
                              }
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-mono transition-all ${
                                isBpmActive
                                  ? beatPulse
                                    ? 'border-emerald-400 bg-emerald-500 text-zinc-950 font-bold scale-105 ring-2 ring-emerald-400/50'
                                    : 'border-emerald-500/50 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold'
                                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                              } ${hasValidBpm ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                            >
                              <MetronomeIcon
                                className={`w-3.5 h-3.5 ${
                                  isBpmActive
                                    ? beatPulse
                                      ? 'text-zinc-950 rotate-6 transition-transform'
                                      : 'text-emerald-600 dark:text-emerald-300 -rotate-6 transition-transform'
                                    : 'text-zinc-400 dark:text-zinc-500'
                                }`}
                              />
                              <span>{song.tempo}</span>
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

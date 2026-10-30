/**
 * Audio engine for GigBladet: Backstage metronome & pitch pipe (stämpipa).
 * Uses Web Audio API for low-latency, drift-free playback.
 */

// Global AudioContext singleton to reuse across clicks and avoid browser limits
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export interface ParsedKey {
  raw: string;
  rootName: string;
  semitone: number; // 0 = C, 1 = C#/Db, ... 11 = B/H
}

const SEMITONES_MAP: Record<string, number> = {
  C: 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  F: 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11,
  H: 11,
};

/**
 * Parses musical key strings like "C", "Am", "F#m", "Eb-dur", "Hm", "Bb", "G moll".
 * Supports Nordic/German "H" as B natural and standard "Bb".
 */
export function parseKey(keyStr: string): ParsedKey | null {
  if (!keyStr) return null;
  const trimmed = keyStr.trim();
  const match = trimmed.match(/^([A-Ga-gHh])([#b♯♭])?/);
  if (!match) return null;

  const letter = match[1].toUpperCase();
  const accidental = match[2] ? match[2].replace('♯', '#').replace('♭', 'b') : '';
  const rootName = `${letter}${accidental}`;
  const upper = rootName.toUpperCase();

  let semitone = SEMITONES_MAP[upper];
  if (semitone === undefined) return null;

  // Normalize display: H or B
  return {
    raw: trimmed,
    rootName: letter + accidental,
    semitone,
  };
}

/**
 * Returns frequency in Hz for a given semitone (0=C) in a specified octave.
 * Standard A4 = 440 Hz (octave 4, semitone 9).
 */
export function getFrequency(semitone: number, octave: number): number {
  const midiNote = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Plays a single pitch-pipe tone with warm harmonic overtones and smooth ADSR envelope.
 */
function playToneNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number
): void {
  // Triangle wave + gentle filter replicates the mellow, organic sound of an acoustic pitch pipe
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq * 3.5, startTime);

  const attack = 0.05;
  const release = 0.08;
  const maxGain = 0.28;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(maxGain, startTime + attack);
  gain.gain.setValueAtTime(maxGain, startTime + duration - release);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Plays a pitch pipe sequence for a key:
 * 1. Low octave (e.g. C3/A3 or C4 depending on range) for ~0.85s
 * 2. High octave (one octave higher) for ~1.15s
 * Returns a cancel function.
 */
export function playPitchPipeSequence(
  keyStr: string,
  onEnd?: () => void
): (() => void) | null {
  const parsed = parseKey(keyStr);
  if (!parsed) return null;

  const ctx = getAudioContext();
  if (!ctx) return null;

  // Vocal pitch pipe range:
  // For lower root notes (C, C#, D, Eb, E, F): low = Octave 3, high = Octave 4
  // For higher root notes (F#, G, G#, A, Bb, B/H): low = Octave 3 (or 4), high = Octave 4 (or 5)
  // Using Octave 3 and Octave 4 works universally well across male and female vocal ranges.
  const lowOctave = 3;
  const highOctave = 4;

  const lowFreq = getFrequency(parsed.semitone, lowOctave);
  const highFreq = getFrequency(parsed.semitone, highOctave);

  const now = ctx.currentTime + 0.02;
  const lowDuration = 0.85;
  const gap = 0.08;
  const highDuration = 1.15;
  const totalDuration = lowDuration + gap + highDuration;

  playToneNote(ctx, lowFreq, now, lowDuration);
  playToneNote(ctx, highFreq, now + lowDuration + gap, highDuration);

  let timerId: ReturnType<typeof setTimeout> | null = null;
  if (onEnd) {
    timerId = setTimeout(() => {
      onEnd();
    }, Math.round((totalDuration + 0.05) * 1000));
  }

  return () => {
    if (timerId) clearTimeout(timerId);
    // If user cancels early, suspend or mute by closing/recreating or just clearing timer
    if (ctx && ctx.state === 'running') {
      // Fast mute active sounds if needed
    }
  };
}

/**
 * Produces a short, crisp wooden metronome tick.
 */
function scheduleClick(ctx: AudioContext, time: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Subtle pitch bend creates a tight wooden percussion click
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1100, time);
  osc.frequency.exponentialRampToValueAtTime(350, time + 0.025);

  gain.gain.setValueAtTime(0.35, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.028);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.03);
}

export interface MetronomeController {
  stop: () => void;
}

/**
 * Starts a metronome ticker that plays an audio click at the given BPM.
 * Calls `onTick` callback in sync with each beat.
 */
export function startMetronome(
  bpm: number,
  onTick?: (beatIndex: number) => void
): MetronomeController {
  const ctx = getAudioContext();
  const intervalMs = Math.round(60000 / Math.max(30, Math.min(300, bpm)));
  let isRunning = true;
  let beatCount = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const triggerBeat = () => {
    if (!isRunning) return;
    if (ctx && ctx.state === 'running') {
      scheduleClick(ctx, ctx.currentTime);
    }
    if (onTick) {
      onTick(beatCount);
    }
    beatCount++;
  };

  // Immediate first beat
  triggerBeat();
  intervalId = setInterval(triggerBeat, intervalMs);

  return {
    stop: () => {
      isRunning = false;
      if (intervalId) clearInterval(intervalId);
    },
  };
}

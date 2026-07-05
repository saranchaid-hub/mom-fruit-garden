import { getAudioContext } from './context';

// A short, bouncy looping tune in C-major pentatonic (melody) over a simple
// bass line, instead of the earlier one-random-note-every-1.8s amble that
// felt lifeless. Pentatonic keeps every interval consonant; the fixed melody
// gives it an actual "song" feel while staying gentle enough to loop all day.
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880.0;
const C6 = 1046.5;
const C3 = 130.81;
const F3 = 174.61;
const G3 = 196.0;
const A3 = 220.0;

const STEP_MS = 310;
// 32 eighth-note steps (two phrases); null = rest.
const MELODY: (number | null)[] = [
  C5, E5, G5, null, A5, G5, E5, null,
  C5, E5, G5, A5, C6, null, A5, G5,
  E5, G5, A5, null, G5, E5, D5, null,
  E5, D5, C5, E5, D5, null, C5, null,
];
// One bass note per 4 steps (8 total across the loop).
const BASS: number[] = [C3, G3, A3, G3, F3, C3, G3, C3];

let enabled = true;
let intervalId: ReturnType<typeof setInterval> | null = null;
let stepIndex = 0;

function playTone(freq: number, type: OscillatorType, peak: number, decay: number): void {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + decay + 0.05);
}

function tick(): void {
  const note = MELODY[stepIndex];
  if (note !== null && note !== undefined) {
    playTone(note, 'triangle', 0.045, 0.45);
  }
  if (stepIndex % 4 === 0) {
    playTone(BASS[stepIndex / 4] as number, 'sine', 0.05, 0.7);
  }
  stepIndex = (stepIndex + 1) % MELODY.length;
}

export function startMusic(): void {
  if (!enabled || intervalId !== null) return;
  stepIndex = 0;
  tick();
  intervalId = setInterval(tick, STEP_MS);
}

export function stopMusic(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/** Sets the enabled flag only — does not start audio. Safe to call before any user gesture. */
export function setMusicEnabledFlag(value: boolean): void {
  enabled = value;
}

export function setMusicEnabled(value: boolean): void {
  setMusicEnabledFlag(value);
  if (!enabled) {
    stopMusic();
  } else {
    startMusic();
  }
}

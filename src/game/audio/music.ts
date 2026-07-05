import { getAudioContext } from './context';

// Pentatonic scale — any note played against any other sounds consonant, so
// a random walk over this set can never produce a "wrong" note.
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0];
const NOTE_INTERVAL_MS = 1800;

let enabled = true;
let intervalId: ReturnType<typeof setInterval> | null = null;

function playNote(freq: number): void {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.05, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.4);
}

function tick(): void {
  const note = SCALE[Math.floor(Math.random() * SCALE.length)] as number;
  playNote(note);
}

export function startMusic(): void {
  if (!enabled || intervalId !== null) return;
  tick();
  intervalId = setInterval(tick, NOTE_INTERVAL_MS);
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

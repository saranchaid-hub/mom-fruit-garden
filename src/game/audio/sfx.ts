import { getAudioContext } from './context';

let enabled = true;

export function setSfxEnabled(value: boolean): void {
  enabled = value;
}

function beep(freq: number, duration: number, type: OscillatorType, peakGain: number, delay = 0): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain).connect(ctx.destination);
  const start = ctx.currentTime + delay;
  gain.gain.setValueAtTime(peakGain, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.start(start);
  osc.stop(start + duration);
}

export function playPop(): void {
  beep(600, 0.12, 'sine', 0.15);
}

export function playSwoosh(): void {
  beep(300, 0.1, 'triangle', 0.08);
}

export function playThud(): void {
  beep(140, 0.15, 'square', 0.1);
}

export function playSpecialFire(): void {
  beep(900, 0.18, 'sawtooth', 0.08);
}

export function playFanfare(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => beep(freq, 0.28, 'triangle', 0.12, i * 0.09));
}

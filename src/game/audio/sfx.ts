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

/**
 * ดอกบาน (flower bloom): a soft, warm, rising two-note chime — a small
 * reward for a move just granted, not an "achievement!" sting. Kept to a
 * gentle sine wave and a lower peak gain than playPop's ordinary match
 * sound, so it reads as a quiet bonus rather than a loud alert.
 */
export function playBloom(): void {
  const notes = [660, 880];
  notes.forEach((freq, i) => beep(freq, 0.22, 'sine', 0.09, i * 0.09));
}

/**
 * ลงตะกร้า (delivery): the payoff sound for the whole deliver objective — a
 * soft low thunk as the big fruit settles into the basket, followed by a
 * quick bright sparkle tail.
 */
export function playDelivery(): void {
  beep(170, 0.16, 'sine', 0.14);
  beep(1200, 0.09, 'triangle', 0.06, 0.08);
  beep(1600, 0.07, 'triangle', 0.05, 0.14);
}

/**
 * สายฝน (rain special firing): a brief patter of quick soft taps under a
 * short low whoosh, deliberately un-melodic (randomish pitches, very short
 * notes) so it reads as rain rather than another musical chime — distinct
 * from playSpecialFire's single sawtooth beep used by the other specials.
 */
export function playRainSpecial(): void {
  const drops = [520, 610, 480, 700, 560];
  drops.forEach((freq, i) => beep(freq, 0.05, 'triangle', 0.05, i * 0.035));
  beep(240, 0.22, 'sine', 0.07, 0.02);
}

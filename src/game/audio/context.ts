let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

/** iOS/Safari suspend audio until a real user gesture unlocks it. */
export function unlockAudio(): void {
  const c = getAudioContext();
  if (c.state === 'suspended') {
    void c.resume();
  }
}

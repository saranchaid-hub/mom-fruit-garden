import { describe, expect, it } from 'vitest';
import { ALL_LEVELS } from '../src/core/levels';
import { STRINGS } from '../src/game/strings';

// Matches non-Thai-range characters that aren't punctuation/whitespace/digits
// already permitted in the copy (e.g. "1" in "อีก 1 ตา"). Anything from the
// Basic Latin letter ranges would indicate stray English leaking into copy
// that must be Thai-only (M9.5 requirement).
const HAS_LATIN_LETTERS = /[a-zA-Z]/;

describe('tutorialByLevel', () => {
  const levelIds = Object.keys(STRINGS.tutorialByLevel).map(Number);

  it('has at least one entry (regression guard against an emptied-out map)', () => {
    expect(levelIds.length).toBeGreaterThan(0);
  });

  it.each(levelIds)('level %i with a tutorial entry actually exists in ALL_LEVELS', (id) => {
    expect(ALL_LEVELS.some((level) => level.id === id)).toBe(true);
  });

  it.each(levelIds)('tutorial text for level %i is non-empty Thai with no stray English', (id) => {
    const text = STRINGS.tutorialByLevel[id];
    expect(text).toBeDefined();
    expect((text ?? '').trim().length).toBeGreaterThan(0);
    expect(text).not.toMatch(HAS_LATIN_LETTERS);
  });

  // M9.5 binding requirement (BLUEPRINT-M9.md): levels 65 and 67 must each
  // teach that the big fruit can be nudged sideways to any neighbouring
  // square even when it doesn't line anything up — simulated pure-random
  // play that never nudges wins level 69 zero times out of sixty without it.
  it('level 65 explicitly teaches the sideways nudge', () => {
    const text65 = STRINGS.tutorialByLevel[65];
    expect(text65).toBeDefined();
    expect(text65).toMatch(/ลาก/);
    expect(text65).toMatch(/ตะกร้า/);
  });

  it('level 67 reinforces the nudge with different wording than level 65', () => {
    const text67 = STRINGS.tutorialByLevel[67];
    expect(text67).toBeDefined();
    expect(text67).toMatch(/ลาก/);
    expect(text67).not.toBe(STRINGS.tutorialByLevel[65]);
  });

  it('level 61 introduces flower cells and level 71 introduces rain, each non-empty Thai', () => {
    expect((STRINGS.tutorialByLevel[61] ?? '').trim().length).toBeGreaterThan(0);
    expect((STRINGS.tutorialByLevel[71] ?? '').trim().length).toBeGreaterThan(0);
  });
});

describe('calendarHint', () => {
  it('is non-empty Thai with no stray English', () => {
    expect(STRINGS.calendarHint.trim().length).toBeGreaterThan(0);
    expect(STRINGS.calendarHint).not.toMatch(HAS_LATIN_LETTERS);
  });

  it('reassures that a missed day costs nothing and old days remain playable', () => {
    expect(STRINGS.calendarHint).toMatch(/ไม่เป็นไร/);
  });
});

import { describe, expect, it } from 'vitest';
import { parseSave, recordDailyBloom, type SaveData } from '../src/game/save';

// save.ts touches `localStorage`, which isn't available in this suite's
// (default, non-DOM) Vitest environment. The migration/fallback logic itself
// is pure, so it's tested directly through `parseSave` (raw string in,
// SaveData out) rather than inventing a DOM/localStorage shim — loadSave()
// itself is a two-line wrapper (read localStorage, hand the result to
// parseSave) not worth its own test.

describe('parseSave — v1 -> v2 migration', () => {
  it('migrates a realistic v1 payload to v2, keeping every existing value intact', () => {
    const v1 = {
      version: 1,
      unlockedLevel: 47,
      stars: { 1: 3, 2: 2, 3: 3, 10: 1, 46: 2 },
      settings: { music: false, sfx: true, hints: false, animSpeed: 'slow' },
      failStreak: { levelId: 46, count: 1 },
      tutorialSeen: [1, 5, 9, 33, 45],
    };

    const result = parseSave(JSON.stringify(v1));

    expect(result.version).toBe(2);
    expect(result.unlockedLevel).toBe(47);
    expect(result.stars).toEqual({ 1: 3, 2: 2, 3: 3, 10: 1, 46: 2 });
    expect(result.settings).toEqual({ music: false, sfx: true, hints: false, animSpeed: 'slow' });
    expect(result.failStreak).toEqual({ levelId: 46, count: 1 });
    expect(result.tutorialSeen).toEqual([1, 5, 9, 33, 45]);
    expect(result.dailyBlooms).toEqual([]);
  });

  it('round-trips a v2 payload unchanged', () => {
    const v2: SaveData = {
      version: 2,
      unlockedLevel: 12,
      stars: { 1: 2, 2: 3 },
      settings: { music: true, sfx: false, hints: true, animSpeed: 'normal' },
      failStreak: { levelId: 0, count: 0 },
      tutorialSeen: [1],
      dailyBlooms: ['2026-01-01', '2026-01-03'],
    };

    const result = parseSave(JSON.stringify(v2));
    expect(result).toEqual(v2);
  });

  it('falls back to a fresh save for an absent key, malformed JSON, and a future version, without throwing', () => {
    const fresh = parseSave(null);
    expect(fresh.version).toBe(2);
    expect(fresh.unlockedLevel).toBe(1);
    expect(fresh.stars).toEqual({});
    expect(fresh.dailyBlooms).toEqual([]);

    expect(() => parseSave('{not valid json')).not.toThrow();
    expect(parseSave('{not valid json')).toEqual(fresh);

    expect(() => parseSave(JSON.stringify({ version: 99, unlockedLevel: 80 }))).not.toThrow();
    expect(parseSave(JSON.stringify({ version: 99, unlockedLevel: 80 }))).toEqual(fresh);
  });

  it('fills in defaults for a v1 payload missing a nested field', () => {
    const v1Missing = {
      version: 1,
      unlockedLevel: 5,
      stars: { 1: 1 },
      settings: { music: false }, // sfx/hints/animSpeed absent
      failStreak: { levelId: 4, count: 1 },
      tutorialSeen: [],
    };

    const result = parseSave(JSON.stringify(v1Missing));
    expect(result.settings).toEqual({ music: false, sfx: true, hints: true, animSpeed: 'normal' });
    expect(result.unlockedLevel).toBe(5);
    expect(result.stars).toEqual({ 1: 1 });
    expect(result.dailyBlooms).toEqual([]);
  });
});

describe('recordDailyBloom', () => {
  const base: SaveData = {
    version: 2,
    unlockedLevel: 20,
    stars: { 1: 3, 5: 2 },
    settings: { music: true, sfx: true, hints: true, animSpeed: 'normal' },
    failStreak: { levelId: 0, count: 0 },
    tutorialSeen: [1],
    dailyBlooms: [],
  };

  it('adds a date to dailyBlooms', () => {
    const next = recordDailyBloom(base, '2026-07-26');
    expect(next.dailyBlooms).toEqual(['2026-07-26']);
  });

  it('is idempotent for the same date', () => {
    const once = recordDailyBloom(base, '2026-07-26');
    const twice = recordDailyBloom(once, '2026-07-26');
    expect(twice.dailyBlooms).toEqual(['2026-07-26']);
    expect(twice).toBe(once); // same-date call returns the identical object, not a new copy
  });

  it('leaves stars and unlockedLevel untouched', () => {
    const next = recordDailyBloom(base, '2026-07-26');
    expect(next.stars).toEqual(base.stars);
    expect(next.unlockedLevel).toBe(base.unlockedLevel);
  });
});

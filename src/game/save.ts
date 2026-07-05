export type Stars = 1 | 2 | 3;

export interface Settings {
  music: boolean;
  sfx: boolean;
  hints: boolean;
  animSpeed: 'normal' | 'slow';
}

export interface FailStreak {
  levelId: number;
  count: number;
}

export interface SaveData {
  version: 1;
  unlockedLevel: number;
  stars: Record<number, Stars>;
  settings: Settings;
  failStreak: FailStreak;
  tutorialSeen: number[];
}

const STORAGE_KEY = 'mom-fruit-garden-save-v1';

/** Failing the same level this many times in a row grants +5 Mercy Moves next attempt. */
export const MERCY_STREAK_THRESHOLD = 2;
export const MERCY_BONUS_MOVES = 5;

function defaultSave(): SaveData {
  return {
    version: 1,
    unlockedLevel: 1,
    stars: {},
    settings: { music: true, sfx: true, hints: true, animSpeed: 'normal' },
    failStreak: { levelId: 0, count: 0 },
    tutorialSeen: [],
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSave();
    }
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== 1) {
      return defaultSave();
    }
    const fallback = defaultSave();
    // Deep-merge nested objects specifically: a shallow spread would let a
    // saved object missing a future field (e.g. from an older version)
    // silently produce `undefined` for it instead of falling back cleanly.
    return {
      ...fallback,
      ...parsed,
      settings: { ...fallback.settings, ...parsed.settings },
      failStreak: { ...fallback.failStreak, ...parsed.failStreak },
      tutorialSeen: parsed.tutorialSeen ?? fallback.tutorialSeen,
    };
  } catch {
    // Private browsing / corrupted data — start fresh rather than crash.
    return defaultSave();
  }
}

export function writeSave(save: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Storage unavailable or full — progress just won't persist this session.
  }
}

export function recordLevelResult(save: SaveData, levelId: number, stars: Stars, levelCount: number): SaveData {
  const bestStars = Math.max(save.stars[levelId] ?? 0, stars) as Stars;
  const next: SaveData = {
    ...save,
    stars: { ...save.stars, [levelId]: bestStars },
    unlockedLevel: Math.min(levelCount, Math.max(save.unlockedLevel, levelId + 1)),
    failStreak: { levelId: 0, count: 0 },
  };
  writeSave(next);
  return next;
}

export function recordLevelFailure(save: SaveData, levelId: number): SaveData {
  const count = save.failStreak.levelId === levelId ? save.failStreak.count + 1 : 1;
  const next: SaveData = { ...save, failStreak: { levelId, count } };
  writeSave(next);
  return next;
}

/** Whether the next attempt at this level should receive the Mercy Moves bonus. */
export function hasMercyBonus(save: SaveData, levelId: number): boolean {
  return save.failStreak.levelId === levelId && save.failStreak.count >= MERCY_STREAK_THRESHOLD;
}

export function markTutorialSeen(save: SaveData, levelId: number): SaveData {
  if (save.tutorialSeen.includes(levelId)) {
    return save;
  }
  const next: SaveData = { ...save, tutorialSeen: [...save.tutorialSeen, levelId] };
  writeSave(next);
  return next;
}

export function updateSettings(save: SaveData, patch: Partial<Settings>): SaveData {
  const next: SaveData = { ...save, settings: { ...save.settings, ...patch } };
  writeSave(next);
  return next;
}

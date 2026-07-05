export type Stars = 1 | 2 | 3;

export interface Settings {
  music: boolean;
  sfx: boolean;
  hints: boolean;
  animSpeed: 'normal' | 'slow';
}

export interface SaveData {
  version: 1;
  unlockedLevel: number;
  stars: Record<number, Stars>;
  settings: Settings;
}

const STORAGE_KEY = 'mom-fruit-garden-save-v1';

function defaultSave(): SaveData {
  return {
    version: 1,
    unlockedLevel: 1,
    stars: {},
    settings: { music: true, sfx: true, hints: true, animSpeed: 'normal' },
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
    // Deep-merge settings specifically: a shallow spread would let a saved
    // settings object missing a future field (e.g. from an older version)
    // silently produce `undefined` for it instead of falling back cleanly.
    return { ...fallback, ...parsed, settings: { ...fallback.settings, ...parsed.settings } };
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
  };
  writeSave(next);
  return next;
}

export function updateSettings(save: SaveData, patch: Partial<Settings>): SaveData {
  const next: SaveData = { ...save, settings: { ...save.settings, ...patch } };
  writeSave(next);
  return next;
}

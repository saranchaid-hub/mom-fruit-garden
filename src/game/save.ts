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
  version: 2;
  unlockedLevel: number;
  stars: Record<number, Stars>;
  settings: Settings;
  failStreak: FailStreak;
  tutorialSeen: number[];
  // dateKeys ('YYYY-MM-DD') already bloomed in the Daily Garden (ADR-0005).
  // Not a level: recordDailyBloom never touches unlockedLevel or stars.
  dailyBlooms: string[];
  // Whether the one-time Garden Calendar explanation (M9.5) has been
  // dismissed. Additive optional-shaped field on the existing v2 schema — NOT
  // a version bump (see parseSave: absent on an old v2 payload just falls
  // back to `false` via the same deep-merge every other field already uses).
  calendarHintSeen: boolean;
}

/** Shape of a save as it existed at version 1, before dailyBlooms existed. */
interface SaveDataV1 {
  version: 1;
  unlockedLevel: number;
  stars: Record<number, Stars>;
  settings: Settings;
  failStreak: FailStreak;
  tutorialSeen: number[];
}

const CURRENT_VERSION = 2;
const STORAGE_KEY = 'mom-fruit-garden-save-v1';

/** Failing the same level this many times in a row grants +5 Mercy Moves next attempt. */
export const MERCY_STREAK_THRESHOLD = 2;
export const MERCY_BONUS_MOVES = 5;

function defaultSave(): SaveData {
  return {
    version: CURRENT_VERSION,
    unlockedLevel: 1,
    stars: {},
    settings: { music: true, sfx: true, hints: true, animSpeed: 'normal' },
    failStreak: { levelId: 0, count: 0 },
    tutorialSeen: [],
    dailyBlooms: [],
    calendarHintSeen: false,
  };
}

/**
 * Migrates a version-1 payload to v2 in memory: keeps every existing field
 * (unlockedLevel, stars, settings, failStreak, tutorialSeen) exactly as they
 * were, and adds the new dailyBlooms field empty. This is the load-bearing
 * function of the whole M9.4 change — get it wrong and every real save on a
 * real device (mom's 80 levels of stars and progress) is silently discarded
 * on next load, with no export/restore feature and no backup (ADR-0001:
 * localStorage-only). Deliberately does NOT go through defaultSave() for the
 * carried-over fields, so there is no path by which a v1 payload's own data
 * gets replaced by fresh defaults.
 */
function migrateV1ToV2(v1: SaveDataV1): SaveData {
  const fallbackSettings = defaultSave().settings;
  const fallbackFailStreak = defaultSave().failStreak;
  return {
    version: 2,
    unlockedLevel: v1.unlockedLevel,
    stars: v1.stars,
    // Deep-merge nested objects specifically: a v1 save missing a field
    // added to Settings/FailStreak after it was written must still fill in
    // cleanly rather than produce `undefined` for that field.
    settings: { ...fallbackSettings, ...v1.settings },
    failStreak: { ...fallbackFailStreak, ...v1.failStreak },
    tutorialSeen: v1.tutorialSeen ?? [],
    dailyBlooms: [],
    calendarHintSeen: false,
  };
}

/**
 * Pure parse of a raw localStorage string (or its absence) into a SaveData.
 * Split out from loadSave so the migration/fallback logic can be unit
 * tested without a DOM/localStorage shim — this file's only environment
 * dependency (`localStorage` itself) stays confined to loadSave/writeSave.
 */
export function parseSave(raw: string | null): SaveData {
  try {
    if (!raw) {
      return defaultSave();
    }
    const parsed = JSON.parse(raw) as Partial<SaveData> | Partial<SaveDataV1>;
    if (parsed.version === 1) {
      return migrateV1ToV2(parsed as SaveDataV1);
    }
    if (parsed.version !== CURRENT_VERSION) {
      // Absent version, or a version newer than this build understands —
      // both are genuinely unusable data, unlike a v1 payload which is
      // always migratable. Falling back to a fresh save is correct here.
      return defaultSave();
    }
    const fallback = defaultSave();
    const v2 = parsed as Partial<SaveData>;
    // Deep-merge nested objects specifically: a shallow spread would let a
    // saved object missing a future field (e.g. from an older version)
    // silently produce `undefined` for it instead of falling back cleanly.
    return {
      ...fallback,
      ...v2,
      settings: { ...fallback.settings, ...v2.settings },
      failStreak: { ...fallback.failStreak, ...v2.failStreak },
      tutorialSeen: v2.tutorialSeen ?? fallback.tutorialSeen,
      dailyBlooms: v2.dailyBlooms ?? fallback.dailyBlooms,
      // A real v2 save written before this field existed has no
      // calendarHintSeen key at all (undefined, not false) — this is the
      // exact "existing v2 save without the field still loads perfectly"
      // case called out in BLUEPRINT-M9 M9.5. Falling back to false (not
      // true) means she sees the hint once on her next calendar visit,
      // which is the correct/harmless outcome, not a lost-progress one.
      calendarHintSeen: v2.calendarHintSeen ?? fallback.calendarHintSeen,
    };
  } catch {
    // Private browsing / corrupted data — start fresh rather than crash.
    return defaultSave();
  }
}

export function loadSave(): SaveData {
  const raw = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  })();
  return parseSave(raw);
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

/** Marks the one-time Garden Calendar explanation (M9.5) as seen, so it never shows again. */
export function markCalendarHintSeen(save: SaveData): SaveData {
  if (save.calendarHintSeen) {
    return save;
  }
  const next: SaveData = { ...save, calendarHintSeen: true };
  writeSave(next);
  return next;
}

export function updateSettings(save: SaveData, patch: Partial<Settings>): SaveData {
  const next: SaveData = { ...save, settings: { ...save.settings, ...patch } };
  writeSave(next);
  return next;
}

/**
 * Records that the Daily Garden for `dateKey` bloomed. Idempotent (playing
 * the same day's garden again doesn't duplicate the entry) and deliberately
 * leaves unlockedLevel/stars untouched — the Daily Garden is not a level and
 * awards no stars (CONTEXT.md: "ไม่มีดาว ไม่ปลดล็อกอะไร").
 */
export function recordDailyBloom(save: SaveData, dateKey: string): SaveData {
  if (save.dailyBlooms.includes(dateKey)) {
    return save;
  }
  const next: SaveData = { ...save, dailyBlooms: [...save.dailyBlooms, dateKey] };
  writeSave(next);
  return next;
}

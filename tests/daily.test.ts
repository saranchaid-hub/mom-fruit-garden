import { describe, expect, it } from 'vitest';
import { dailyLevelFor } from '../src/core/daily';
import { validateLevel } from '../src/core/levels/schema';
import { hasValidMove } from '../src/core/moves';
import { createSession } from '../src/core/session';

function allDateKeysAcrossYears(startYear: number, endYearExclusive: number): string[] {
  const keys: string[] = [];
  for (let year = startYear; year < endYearExclusive; year++) {
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        keys.push(`${year}-${mm}-${dd}`);
      }
    }
  }
  return keys;
}

describe('dailyLevelFor — determinism', () => {
  it('produces a deeply identical level for the same dateKey', () => {
    const a = dailyLevelFor('2026-07-26');
    const b = dailyLevelFor('2026-07-26');
    expect(a).toEqual(b);
  });

  it('produces different levels for different dateKeys, generally', () => {
    const keys = allDateKeysAcrossYears(2026, 2027);
    const levels = keys.map((k) => dailyLevelFor(k));
    const serialized = new Set(levels.map((l) => JSON.stringify(l)));
    // Not every field need differ every day, but across a full year the
    // generated levels should not all collapse onto a handful of shapes.
    expect(serialized.size).toBeGreaterThan(keys.length * 0.5);
  });

  it('always uses the reserved id 0, never a real level id', () => {
    expect(dailyLevelFor('2026-01-01').id).toBe(0);
    expect(dailyLevelFor('2030-12-31').id).toBe(0);
  });
});

describe('dailyLevelFor — three-year sweep', () => {
  // ~1096 dateKeys (2026-2028, including the 2028 leap day). This is the
  // test that matters most: it's the guarantee that no future calendar day
  // ever hands the player an invalid or unplayable board. Each date does one
  // validateLevel pass (pure, cheap) and one createSession call (which
  // itself retries board generation internally up to 3000 times only if
  // needed — in practice almost every attempt succeeds on its first try).
  // Measured cost: ~1-2s added to the suite's ~3s baseline.
  const dateKeys = allDateKeysAcrossYears(2026, 2029);

  it(`every day across ${dateKeys.length} dates produces a valid, solvable level`, () => {
    for (const dateKey of dateKeys) {
      const level = dailyLevelFor(dateKey);
      const errors = validateLevel(level);
      expect(errors, `${dateKey}: ${errors.join('; ')}`).toEqual([]);

      const session = createSession(level, hashSeedForTest(dateKey));
      expect(hasValidMove(session.board), `${dateKey}: no valid move on starting board`).toBe(true);
    }
  });

  it('board sizes, fruit counts, and move budgets stay within the kind bounds', () => {
    for (const dateKey of dateKeys) {
      const level = dailyLevelFor(dateKey);
      expect(level.width).toBeGreaterThanOrEqual(6);
      expect(level.width).toBeLessThanOrEqual(8);
      expect(level.height).toBeGreaterThanOrEqual(6);
      expect(level.height).toBeLessThanOrEqual(8);
      expect(level.fruits.length).toBeGreaterThanOrEqual(4);
      expect(level.fruits.length).toBeLessThanOrEqual(6);
      expect(level.moves).toBeGreaterThan(0);
      // Sanity ceiling: catches a formula regression that blows the budget up
      // absurdly, without pinning to today's exact heuristic constants.
      expect(level.moves).toBeLessThan(300);
    }
  });

  it('every objective type shows up across a year', () => {
    const seen = new Set<string>();
    for (const dateKey of allDateKeysAcrossYears(2026, 2027)) {
      seen.add(dailyLevelFor(dateKey).objective.type);
    }
    expect(seen).toEqual(new Set(['collect', 'jelly', 'score', 'deliver']));
  });
});

/** A stable, arbitrary per-date seed for createSession — unrelated to
 * dailyLevelFor's own internal hash, just needs to be deterministic per test
 * run so a failure is reproducible. */
function hashSeedForTest(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

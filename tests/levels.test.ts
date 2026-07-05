import { describe, expect, it } from 'vitest';
import { createBoardFromLayout } from '../src/core/board';
import { ALL_LEVELS, getLevel, validateLevel } from '../src/core/levels';
import { hasValidMove } from '../src/core/moves';
import { createSession } from '../src/core/session';

describe('level data', () => {
  it('has 60 levels numbered sequentially from 1', () => {
    expect(ALL_LEVELS).toHaveLength(60);
    expect(ALL_LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
  });

  it.each(ALL_LEVELS)('level $id passes schema validation', (level) => {
    expect(validateLevel(level)).toEqual([]);
  });

  const STRESS_SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 1);

  it.each(ALL_LEVELS)('level $id generates a solvable starting board across many seeds', (level) => {
    // createSession retries internally until it finds a board with no
    // pre-existing matches and at least one valid move, or throws. Checking
    // many seeds (not just one fixed seed) matters: some level shapes have a
    // per-attempt success rate low enough that a single lucky seed can pass
    // while ~1 in 65 real (Date.now()-seeded) plays would fail.
    for (const seed of STRESS_SEEDS) {
      const session = createSession(level, seed);
      expect(hasValidMove(session.board)).toBe(true);
    }
  });

  it.each(ALL_LEVELS)('level $id star thresholds are ascending', (level) => {
    expect(level.starScores[0]).toBeLessThan(level.starScores[1]);
  });

  it('getLevel returns the matching level and throws for an unknown id', () => {
    expect(getLevel(1).id).toBe(1);
    expect(() => getLevel(999)).toThrow();
  });

  it('every layout parses to a board with the declared dimensions', () => {
    for (const level of ALL_LEVELS) {
      if (!level.layout) continue;
      const board = createBoardFromLayout(level.width, level.height, level.layout);
      expect(board.width).toBe(level.width);
      expect(board.height).toBe(level.height);
    }
  });
});

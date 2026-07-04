import { beforeEach, describe, expect, it } from 'vitest';
import { advanceObjective, createObjectiveProgress, isObjectiveComplete, starsForScore } from '../src/core/objectives';
import { parseTestBoard, resetAutoId } from './helpers';

beforeEach(() => resetAutoId());

describe('createObjectiveProgress', () => {
  it('sets target from the objective for collect and score types', () => {
    const board = parseTestBoard(['M O', 'O M']);
    expect(createObjectiveProgress({ type: 'collect', fruit: 'mango', count: 10 }, board)).toEqual({
      current: 0,
      target: 10,
    });
    expect(createObjectiveProgress({ type: 'score', target: 5000 }, board)).toEqual({ current: 0, target: 5000 });
  });

  it('derives jelly target by counting jelly cells on the board', () => {
    const board = parseTestBoard(['MJ O', 'O MJ']);
    expect(createObjectiveProgress({ type: 'jelly' }, board)).toEqual({ current: 0, target: 2 });
  });
});

describe('advanceObjective', () => {
  it('advances collect progress only by the matching fruit', () => {
    const objective = { type: 'collect', fruit: 'mango', count: 10 } as const;
    const progress = { current: 2, target: 10 };
    const next = advanceObjective(progress, objective, {
      byFruit: { mango: 3, orange: 5 },
      jellyClearedCount: 0,
      totalScore: 100,
    });
    expect(next.current).toBe(5);
  });

  it('clamps progress at the target and never exceeds it', () => {
    const objective = { type: 'collect', fruit: 'mango', count: 5 } as const;
    const progress = { current: 4, target: 5 };
    const next = advanceObjective(progress, objective, { byFruit: { mango: 10 }, jellyClearedCount: 0, totalScore: 0 });
    expect(next.current).toBe(5);
  });

  it('reads score progress from the authoritative running total, not a delta', () => {
    const objective = { type: 'score', target: 1000 } as const;
    const progress = { current: 200, target: 1000 };
    const next = advanceObjective(progress, objective, { byFruit: {}, jellyClearedCount: 0, totalScore: 350 });
    expect(next.current).toBe(350);
  });

  it('clamps score progress at the target even if the running total exceeds it', () => {
    const objective = { type: 'score', target: 1000 } as const;
    const progress = { current: 900, target: 1000 };
    const next = advanceObjective(progress, objective, { byFruit: {}, jellyClearedCount: 0, totalScore: 1500 });
    expect(next.current).toBe(1000);
  });

  it('advances jelly progress by cells cleared this turn', () => {
    const objective = { type: 'jelly' } as const;
    const progress = { current: 1, target: 4 };
    const next = advanceObjective(progress, objective, { byFruit: {}, jellyClearedCount: 2, totalScore: 0 });
    expect(next.current).toBe(3);
  });
});

describe('isObjectiveComplete', () => {
  it('is false below target and true at or above target', () => {
    expect(isObjectiveComplete({ current: 4, target: 5 })).toBe(false);
    expect(isObjectiveComplete({ current: 5, target: 5 })).toBe(true);
    expect(isObjectiveComplete({ current: 6, target: 5 })).toBe(true);
  });

  it('never completes a misconfigured zero-target objective', () => {
    expect(isObjectiveComplete({ current: 0, target: 0 })).toBe(false);
  });
});

describe('starsForScore', () => {
  it('always grants at least 1 star, per the kindness model', () => {
    expect(starsForScore(0, [1000, 2000])).toBe(1);
  });

  it('grants 2 stars at the first threshold and 3 at the second', () => {
    expect(starsForScore(1000, [1000, 2000])).toBe(2);
    expect(starsForScore(1999, [1000, 2000])).toBe(2);
    expect(starsForScore(2000, [1000, 2000])).toBe(3);
  });
});

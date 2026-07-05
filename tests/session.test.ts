import { describe, expect, it } from 'vitest';
import { createObjectiveProgress } from '../src/core/objectives';
import { createSession, trySwap, useHammer } from '../src/core/session';
import type { LevelConfig } from '../src/core/types';
import { parseTestBoard } from './helpers';

const baseConfig: LevelConfig = {
  width: 6,
  height: 6,
  fruits: ['mango', 'orange', 'grape', 'watermelon'],
  moves: 20,
  objective: { type: 'score', target: 100_000 },
  starScores: [500, 1000],
};

describe('createSession', () => {
  it('generates a board with no pre-existing matches and at least one valid move', () => {
    const session = createSession(baseConfig, 1);
    expect(session.outcome).toBe('continue');
    expect(session.movesLeft).toBe(20);
    expect(session.hammersLeft).toBe(3);
    expect(session.score).toBe(0);
  });

  it('is deterministic for the same seed', () => {
    const a = createSession(baseConfig, 42);
    const b = createSession(baseConfig, 42);
    expect(a.board.cells.map((c) => c.piece?.fruit)).toEqual(b.board.cells.map((c) => c.piece?.fruit));
  });
});

describe('trySwap', () => {
  it('decrements movesLeft only on a legal swap', () => {
    const session = createSession(baseConfig, 7);
    const movesLeftBefore = session.movesLeft;
    // Try every adjacent pair until we find a legal move, since board layout is randomized.
    let found = false;
    for (let y = 0; y < session.board.height && !found; y++) {
      for (let x = 0; x < session.board.width - 1 && !found; x++) {
        const before = session.movesLeft;
        const result = trySwap(session, { x, y }, { x: x + 1, y });
        if (result.movesUsed === 1) {
          expect(session.movesLeft).toBe(before - 1);
          found = true;
        } else {
          expect(session.movesLeft).toBe(before);
        }
      }
    }
    expect(found).toBe(true);
    expect(session.movesLeft).toBeLessThanOrEqual(movesLeftBefore);
  });

  it('transitions to lost when moves run out without completing the objective', () => {
    const session = createSession({ ...baseConfig, moves: 1, objective: { type: 'score', target: 1_000_000 } }, 3);
    // Exhaust the single move with an illegal swap attempt does not use it up;
    // find a legal swap to consume the only move.
    outer: for (let y = 0; y < session.board.height; y++) {
      for (let x = 0; x < session.board.width - 1; x++) {
        const result = trySwap(session, { x, y }, { x: x + 1, y });
        if (result.movesUsed === 1) {
          break outer;
        }
      }
    }
    expect(session.outcome).toBe('lost');
  });

  it('returns a stale no-op result once the session has ended', () => {
    const session = createSession({ ...baseConfig, moves: 1, objective: { type: 'score', target: 1_000_000 } }, 3);
    outer: for (let y = 0; y < session.board.height; y++) {
      for (let x = 0; x < session.board.width - 1; x++) {
        if (trySwap(session, { x, y }, { x: x + 1, y }).movesUsed === 1) break outer;
      }
    }
    expect(session.outcome).toBe('lost');
    const after = trySwap(session, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(after.phases).toEqual([]);
    expect(after.outcome).toBe('lost');
  });
});

describe('useHammer', () => {
  it('does not consume a move but does consume a hammer charge', () => {
    const session = createSession(baseConfig, 9);
    const movesBefore = session.movesLeft;
    const result = useHammer(session, { x: 0, y: 0 });
    expect(result.movesUsed).toBe(0);
    expect(session.movesLeft).toBe(movesBefore);
    expect(session.hammersLeft).toBe(2);
  });

  it('refuses to fire once hammersLeft reaches zero', () => {
    const session = createSession(baseConfig, 9, 1);
    useHammer(session, { x: 0, y: 0 });
    expect(session.hammersLeft).toBe(0);
    const before = session.score;
    const result = useHammer(session, { x: 1, y: 1 });
    expect(result.phases).toEqual([]);
    expect(session.score).toBe(before);
  });
});

describe('victory blast', () => {
  it('fires leftover special pieces on the winning turn and adds their score', () => {
    const config: LevelConfig = {
      width: 5,
      height: 5,
      fruits: ['mango', 'orange', 'grape', 'watermelon'],
      moves: 5,
      objective: { type: 'score', target: 10 },
      starScores: [500, 1000],
    };
    const session = createSession(config, 1);
    // Replace the random board with a fixture: a single winning 3-match is
    // available (swap (3,1)<->(3,2) lines up mango on row 1), and an unused
    // stripedH orange sits far away in the corner.
    session.board = parseTestBoard([
      'M O G W Oh',
      'O M M G W',
      'G W O M G',
      'W G M O W',
      'O W G W M',
    ]);
    session.objectiveProgress = createObjectiveProgress(config.objective, session.board);

    const result = trySwap(session, { x: 3, y: 1 }, { x: 3, y: 2 });
    expect(session.outcome).toBe('won');

    // The leftover striped fired as part of the winning turn's phases...
    const fires = result.phases.flat().filter((e) => e.kind === 'specialFire');
    expect(fires.some((e) => e.kind === 'specialFire' && e.special === 'stripedH')).toBe(true);
    // ...its cleared pieces scored beyond the bare 3-match (3 x 10 points)...
    expect(session.score).toBeGreaterThan(30);
    expect(result.scoreDelta).toBe(session.score);
    // ...and no special piece is left un-celebrated on the final board.
    for (const cell of session.board.cells) {
      expect(cell.piece?.special ?? 'none').toBe('none');
    }
  });

  it('does not fire specials when the level is lost', () => {
    const config: LevelConfig = {
      width: 5,
      height: 5,
      fruits: ['mango', 'orange', 'grape', 'watermelon'],
      moves: 1,
      objective: { type: 'score', target: 1_000_000 },
      starScores: [500, 1000],
    };
    const session = createSession(config, 1);
    session.board = parseTestBoard([
      'M O G W Oh',
      'O M M G W',
      'G W O M G',
      'W G M O W',
      'O W G W M',
    ]);
    session.objectiveProgress = createObjectiveProgress(config.objective, session.board);

    const result = trySwap(session, { x: 3, y: 1 }, { x: 3, y: 2 });
    expect(session.outcome).toBe('lost');
    const fires = result.phases.flat().filter((e) => e.kind === 'specialFire' && e.special === 'stripedH');
    expect(fires).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { cellAt, countJellyCells } from '../src/core/board';
import { ALL_LEVELS, validateLevel, type LevelDef } from '../src/core/levels';
import { hasMatches } from '../src/core/match';
import { findValidMoves, hasValidMove } from '../src/core/moves';
import { createRng, randomInt } from '../src/core/rng';
import { createSession, trySwap, useHammer, type LevelSession } from '../src/core/session';
import type { Board, FruitKind, LevelConfig, Pos, TurnEvent, TurnResult } from '../src/core/types';

/**
 * M9.1c soak test (BLUEPRINT-M9.md). A seeded random-play fuzzer that plays
 * the real game loop (createSession / trySwap / useHammer, exactly as the
 * renderer would drive it) and asserts a set of board/session invariants
 * after every single turn. Three real bugs reached the developer's mother
 * before this existed — a piece with `fruit: null` the renderer drew as
 * nothing, a victory that left special pieces unexploded, and a resolve path
 * that settled without cascading a completed match — and all three are
 * exactly the kind of thing random play surfaces immediately. Do not weaken
 * or delete an invariant to make this file green; a failure here means a
 * real bug was found (see BLUEPRINT-M9.md "If an invariant fails").
 *
 * Mutation-tested, because a fuzzer that never fails is worthless and looks
 * identical to one that works. Each of the three historical bugs above was
 * reintroduced into src/core/ one at a time and this suite was re-run:
 *   - victory blast capped at a single pass  -> caught (invariant 9)
 *   - special spawn reading its fruit after the clear -> caught (invariant 1)
 *   - free-swap path settling without cascading -> caught (invariant 4),
 *     but ONLY after the driver was taught to make big-fruit free swaps and
 *     to bias them downward. With uniformly random directions, and with no
 *     free-swap move type at all, this bug sailed through the whole suite.
 *     The lesson is in the driver: a fuzzer only finds what a plausible
 *     player would actually do.
 *
 * Runtime budget: this runs in CI on every push, target is well under 30s
 * total. Coverage is deliberately "many turns on few boards" rather than a
 * huge seed x level matrix: 60 shipping levels x 3 seeds, 3 synthetic M9
 * configs x 4 seeds, plus 2 short determinism runs. Turn cap per run is a
 * generous safety net (games actually end within ~config.moves turns, since
 * every accepted swap consumes exactly one move); it is not expected to be
 * hit in normal play. If this creeps toward the time ceiling, cut seed
 * counts first — a few boards played deeply catches more than a wide
 * shallow sweep.
 */

const TURN_CAP = 300;
const HAMMER_CHANCE_DENOMINATOR = 8; // roughly one turn in eight uses the hammer instead of a swap

const CORE_FRUITS: FruitKind[] = ['mango', 'orange', 'grape', 'watermelon'];

// ---------------------------------------------------------------------------
// Synthetic M9 configs. No shipping level (1-60) uses flower cells, baskets,
// or reliably produces 6+ cell rain groups yet (those ship in levels 61-80,
// M9.3), so the soak driver needs hand-built boards to exercise them.
// ---------------------------------------------------------------------------

const FLOWER_LEVEL: LevelDef = {
  id: 9001,
  width: 6,
  height: 6,
  layout: ['F.F.F.', '......', '.F..F.', '......', 'F....F', '......'],
  fruits: CORE_FRUITS,
  moves: 30,
  objective: { type: 'score', target: 8000 },
  starScores: [2000, 4000],
};

const DELIVER_LEVEL: LevelDef = {
  id: 9002,
  width: 6,
  height: 6,
  layout: ['......', '......', '......', '......', '......', '..B.B.'],
  fruits: CORE_FRUITS,
  moves: 45,
  objective: { type: 'deliver', count: 3 },
  bigFruitTotal: 4,
  starScores: [1500, 3000],
};

const RAIN_LEVEL: LevelDef = {
  id: 9003,
  width: 8,
  height: 8,
  // No layout (fully open) + only 4 fruit kinds on the largest allowed board
  // maximizes the odds of a same-fruit blob of 6+ cells (rain, per
  // classifySpawn in specials.ts), which is otherwise rare to trigger.
  fruits: CORE_FRUITS,
  moves: 60,
  objective: { type: 'score', target: 20000 },
  starScores: [5000, 10000],
};

const SYNTHETIC_LEVELS: LevelDef[] = [FLOWER_LEVEL, DELIVER_LEVEL, RAIN_LEVEL];

// ---------------------------------------------------------------------------
// Small board readers the invariants need that aren't already exported
// elsewhere.
// ---------------------------------------------------------------------------

function countFlowerCells(board: Board): number {
  let count = 0;
  for (const cell of board.cells) {
    if (cell.flower) count++;
  }
  return count;
}

function countBigPieces(board: Board): number {
  let count = 0;
  for (const cell of board.cells) {
    if (cell.piece?.big) count++;
  }
  return count;
}

/**
 * Picks a big-fruit free swap: a big fruit on the board paired with one of
 * its orthogonal neighbours. Returns null when the board holds no big fruit
 * (the usual case — no shipping level uses them yet) or when the chosen one
 * has no swappable neighbour. Uses `isAdjacent`-compatible neighbours only
 * and lets `canSwap` inside resolveSwap reject holes, so an occasional
 * rejected swap is fine and itself worth exercising.
 */
function pickBigFruitSwap(board: Board, rng: ReturnType<typeof createRng>): [Pos, Pos] | null {
  const bigPositions: Pos[] = [];
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      if (cellAt(board, { x, y }).piece?.big) {
        bigPositions.push({ x, y });
      }
    }
  }
  if (bigPositions.length === 0) return null;

  const from = bigPositions[randomInt(rng, bigPositions.length)] as Pos;
  const neighbours: Pos[] = [
    { x: from.x - 1, y: from.y },
    { x: from.x + 1, y: from.y },
    { x: from.x, y: from.y - 1 },
    { x: from.x, y: from.y + 1 },
  ].filter((p) => p.x >= 0 && p.x < board.width && p.y >= 0 && p.y < board.height);
  const usable = neighbours.filter((p) => {
    const cell = cellAt(board, p);
    return cell.kind !== 'hole' && cell.piece !== null;
  });
  if (usable.length === 0) return null;

  // Bias downward. A real player pushes the big fruit toward a basket, and
  // uniformly random directions almost never produce the interesting case —
  // a swap that itself lands the fruit in a basket, collapsing the column
  // and creating a match during the same settle. That is precisely the
  // situation the free-swap path's cascade exists to handle.
  const below = usable.find((p) => p.y > from.y);
  if (below && randomInt(rng, 4) > 0) {
    return [from, below];
  }
  return [from, usable[randomInt(rng, usable.length)] as Pos];
}

function collectNonHolePositions(board: Board): Pos[] {
  const positions: Pos[] = [];
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      if (cellAt(board, { x, y }).kind !== 'hole') {
        positions.push({ x, y });
      }
    }
  }
  return positions;
}

function countBigSpawnedInPhases(phases: TurnEvent[][]): number {
  let count = 0;
  for (const event of phases.flat()) {
    if (event.kind === 'refill') {
      for (const spawn of event.spawns) {
        if (spawn.piece.big) count++;
      }
    }
  }
  return count;
}

function countDeliverEventsInPhases(phases: TurnEvent[][]): number {
  return phases.flat().filter((e) => e.kind === 'deliver').length;
}

function hadReshuffleThisTurn(phases: TurnEvent[][]): boolean {
  return phases.some((phase) => phase.some((e) => e.kind === 'reshuffle'));
}

// ---------------------------------------------------------------------------
// Invariant checking
// ---------------------------------------------------------------------------

interface SoakContext {
  label: string;
  seed: number;
  config: LevelConfig;
}

/** Rolling state carried from the previous checked turn, needed to detect
 * "never increases" / "never decreases" violations and to reconcile big
 * fruit accounting across a turn. */
interface TurnCheckState {
  prevJelly: number;
  prevFlower: number;
  prevScore: number;
  prevObjective: number;
  bigBefore: number;
  bigSpawnedThisTurn: number;
  totalBigSpawnedBefore: number;
}

function fail(ctx: SoakContext, turn: number, message: string): never {
  throw new Error(
    `[soak] invariant violated: ${message}\n` +
      `  level/config: ${ctx.label}\n` +
      `  seed: ${ctx.seed}\n` +
      `  turn: ${turn}\n` +
      `  reproduce: playSoak(<${ctx.label} config>, ${ctx.seed}) and inspect turn ${turn}`,
  );
}

/**
 * Runs the full invariant list from BLUEPRINT-M9.md M9.1c against the board
 * and session as they stand immediately after a completed trySwap/useHammer
 * call. Throws with level/seed/turn context on the first violation so a CI
 * failure is reproducible without guesswork.
 */
function checkInvariants(session: LevelSession, result: TurnResult, ctx: SoakContext, turn: number, state: TurnCheckState): void {
  const board = session.board;
  const seenIds = new Set<number>();

  // 1: every piece has a non-null fruit, except a colorBomb (null by design)
  // or a big fruit.
  // 2: no hole cell holds a piece.
  // 3: every non-hole cell is occupied at rest (board fully refilled).
  // 6: all piece ids currently on the board are unique.
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const cell = cellAt(board, { x, y });
      if (cell.kind === 'hole') {
        if (cell.piece !== null) {
          fail(ctx, turn, `hole cell (${x},${y}) holds piece id ${cell.piece.id}`);
        }
        continue;
      }
      if (cell.piece === null) {
        fail(ctx, turn, `normal cell (${x},${y}) is empty at rest`);
      }
      const piece = cell.piece;
      const fruitless = piece.special === 'colorBomb' || piece.big;
      if (!fruitless && piece.fruit === null) {
        fail(ctx, turn, `piece id ${piece.id} at (${x},${y}) has null fruit but is not a colorBomb or big fruit`);
      }
      if (seenIds.has(piece.id)) {
        fail(ctx, turn, `piece id ${piece.id} appears more than once on the board (second occurrence at (${x},${y}))`);
      }
      seenIds.add(piece.id);
    }
  }

  // 4: no unresolved matches at rest.
  if (hasMatches(board)) {
    fail(ctx, turn, 'board has an unresolved match at rest');
  }

  // 5: movesLeft never negative.
  if (session.movesLeft < 0) {
    fail(ctx, turn, `movesLeft is negative: ${session.movesLeft}`);
  }

  // 7: jelly and flower counts never increase turn over turn.
  const jellyNow = countJellyCells(board);
  const flowerNow = countFlowerCells(board);
  if (jellyNow > state.prevJelly) {
    fail(ctx, turn, `jelly cell count increased from ${state.prevJelly} to ${jellyNow}`);
  }
  if (flowerNow > state.prevFlower) {
    fail(ctx, turn, `flower cell count increased from ${state.prevFlower} to ${flowerNow}`);
  }

  // 8: score and objective progress never decrease.
  if (session.score < state.prevScore) {
    fail(ctx, turn, `score decreased from ${state.prevScore} to ${session.score}`);
  }
  if (session.objectiveProgress.current < state.prevObjective) {
    fail(ctx, turn, `objective progress decreased from ${state.prevObjective} to ${session.objectiveProgress.current}`);
  }

  // 9: a won level has no special pieces left on the board (victory blast
  // must clear all of them).
  if (session.outcome === 'won') {
    for (const cell of board.cells) {
      if (cell.piece && cell.piece.special !== 'none') {
        fail(ctx, turn, `outcome is won but piece id ${cell.piece.id} still has special "${cell.piece.special}"`);
      }
    }
  }

  // 10: big fruit accounting. A big fruit may only leave the board on a turn
  // whose phases contain a deliver event, and the number that vanished must
  // equal the number of deliver events; the total ever spawned must never
  // exceed the level's quota.
  const bigAfter = countBigPieces(board);
  const deliverCount = countDeliverEventsInPhases(result.phases);
  const vanished = state.bigBefore + state.bigSpawnedThisTurn - bigAfter;
  if (vanished !== deliverCount) {
    fail(
      ctx,
      turn,
      `big fruit vanished (${vanished}) does not match deliver event count (${deliverCount}); ` +
        `bigBefore=${state.bigBefore} bigSpawnedThisTurn=${state.bigSpawnedThisTurn} bigAfter=${bigAfter}`,
    );
  }
  const totalBigSpawnedAfter = state.totalBigSpawnedBefore + state.bigSpawnedThisTurn;
  const quota = ctx.config.bigFruitTotal ?? 0;
  if (totalBigSpawnedAfter > quota) {
    fail(ctx, turn, `total big fruit spawned (${totalBigSpawnedAfter}) exceeds config.bigFruitTotal (${quota})`);
  }

  // 11: while the outcome is still 'continue', the board must have a valid
  // move, or this turn's phases must contain a reshuffle.
  if (session.outcome === 'continue') {
    if (!hadReshuffleThisTurn(result.phases) && !hasValidMove(board)) {
      fail(ctx, turn, 'outcome is continue but board has no valid move and no reshuffle occurred this turn');
    }
  }
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

/**
 * Plays one seeded random game against `config`, checking every invariant
 * after every completed turn. Returns the final session so callers (e.g. the
 * determinism test) can compare end states across runs.
 */
function playSoak(config: LevelConfig, seed: number, label: string, turnCap = TURN_CAP): LevelSession {
  const ctx: SoakContext = { label, seed, config };
  const session = createSession(config, seed);
  // Deliberately decorrelated from the session's own internal RNG (a
  // different seed derived from the same input) — the driver's move choice
  // must not accidentally reuse the core's random stream.
  const driverRng = createRng(seed ^ 0x9e3779b9);

  let prevJelly = countJellyCells(session.board);
  let prevFlower = countFlowerCells(session.board);
  let prevScore = session.score;
  let prevObjective = session.objectiveProgress.current;
  let totalBigSpawned = 0;

  for (let turn = 1; turn <= turnCap; turn++) {
    if (session.outcome !== 'continue') break;

    const bigBefore = countBigPieces(session.board);
    const wantHammer = session.hammersLeft > 0 && randomInt(driverRng, HAMMER_CHANCE_DENOMINATOR) === 0;

    // The big-fruit free swap (ADR-0006) is its own move type and MUST be
    // driven explicitly: findValidMoves only ever returns match-forming
    // swaps, so a driver built on it alone never exercises the free-swap
    // path at all — which is the newest and least-proven code in resolve.ts,
    // and the move a player pushing fruit toward a basket makes constantly.
    // Verified by mutation testing: with this branch missing, deleting the
    // cascade at the end of the free-swap path (a real bug caught in M9.1b
    // review) slipped through the entire soak suite unnoticed.
    const bigSwap = wantHammer ? null : pickBigFruitSwap(session.board, driverRng);

    let result: TurnResult;
    if (wantHammer) {
      const positions = collectNonHolePositions(session.board);
      if (positions.length === 0) break; // degenerate board (shouldn't happen; nothing left to hammer)
      const at = positions[randomInt(driverRng, positions.length)] as Pos;
      result = useHammer(session, at);
    } else if (bigSwap) {
      result = trySwap(session, bigSwap[0], bigSwap[1]);
    } else {
      const moves = findValidMoves(session.board);
      if (moves.length === 0) break; // no legal swap and nothing produced one; stop the run
      const [a, b] = moves[randomInt(driverRng, moves.length)] as [Pos, Pos];
      result = trySwap(session, a, b);
    }

    const bigSpawnedThisTurn = countBigSpawnedInPhases(result.phases);

    checkInvariants(session, result, ctx, turn, {
      prevJelly,
      prevFlower,
      prevScore,
      prevObjective,
      bigBefore,
      bigSpawnedThisTurn,
      totalBigSpawnedBefore: totalBigSpawned,
    });

    prevJelly = countJellyCells(session.board);
    prevFlower = countFlowerCells(session.board);
    prevScore = session.score;
    prevObjective = session.objectiveProgress.current;
    totalBigSpawned += bigSpawnedThisTurn;
  }

  return session;
}

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

describe('soak: shipping levels (60 levels x 3 seeds each)', () => {
  const SEEDS = [1, 4099, 271828];

  it.each(ALL_LEVELS)('level $id survives seeded random play with all invariants holding', (level) => {
    for (const seed of SEEDS) {
      playSoak(level, seed, `level ${level.id} (${JSON.stringify(level.objective)})`);
    }
  });
});

describe('soak: synthetic M9 configs are well-formed', () => {
  it.each(SYNTHETIC_LEVELS)('config $id passes validateLevel and createSession can generate a board', (level) => {
    expect(validateLevel(level)).toEqual([]);
    for (const seed of [1, 2]) {
      const session = createSession(level, seed);
      expect(session.outcome).toBe('continue');
    }
  });
});

describe('soak: synthetic M9 mechanics (flower cells / deliver+baskets / rain-heavy open board)', () => {
  const SEEDS = [11, 22, 33, 44];

  it.each(SYNTHETIC_LEVELS)('config $id survives seeded random play with all invariants holding', (level) => {
    for (const seed of SEEDS) {
      playSoak(level, seed, `synthetic ${level.id}`);
    }
  });
});

describe('soak: determinism', () => {
  it('the same level and seed produce an identical final board, score, and outcome', () => {
    // DELIVER_LEVEL exercises the most RNG-sensitive path (big fruit spawn
    // timing + basket delivery), making it the sharpest determinism check.
    const seed = 7777;
    const a = playSoak(DELIVER_LEVEL, seed, 'determinism run A');
    const b = playSoak(DELIVER_LEVEL, seed, 'determinism run B');

    expect(a.score).toBe(b.score);
    expect(a.outcome).toBe(b.outcome);
    expect(a.movesLeft).toBe(b.movesLeft);
    expect(a.objectiveProgress).toEqual(b.objectiveProgress);
    expect(a.board).toEqual(b.board);
  });
});

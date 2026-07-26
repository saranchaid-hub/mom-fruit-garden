import { canSwap, cellAt, swapPieces } from './board';
import { findMatches, type MatchGroup } from './match';
import { randomInt, type Rng } from './rng';
import {
  areaForSpecial,
  cellsOfFruit,
  classifySpawn,
  comboBlast,
  isSpecialSwap,
  pickRandomFruitOnBoard,
  pickSpawnCell,
} from './specials';
import type { Board, FallMove, FruitKind, Piece, Pos, ResolveResult, Spawn, SpecialType, TurnEvent } from './types';

const POINTS_PER_PIECE = 10;
const MAX_VICTORY_BLAST_ROUNDS = 10;

interface Activation {
  clearedCells: Pos[];
  fireEvents: TurnEvent[];
  byFruit: Partial<Record<FruitKind, number>>;
  jellyCells: Pos[];
  flowerCells: Pos[];
}

/**
 * Clears a seed set of cells, then BFS-activates any special piece caught in
 * that clear (its own area is enqueued too), so a chain of specials fires in
 * one pass. A color bomb caught passively this way (not deliberately
 * swapped) clears a random fruit present on the board.
 */
function activateAndClear(board: Board, seedCells: Pos[], rng: Rng, fruits: FruitKind[]): Activation {
  const toClear = new Set<string>();
  const queue: Pos[] = [];
  const fireEvents: TurnEvent[] = [];

  function enqueue(pos: Pos): void {
    const key = `${pos.x},${pos.y}`;
    if (!toClear.has(key)) {
      toClear.add(key);
      queue.push(pos);
    }
  }

  for (const pos of seedCells) enqueue(pos);

  while (queue.length > 0) {
    const pos = queue.shift() as Pos;
    const cell = cellAt(board, pos);
    const piece = cell.piece;
    if (!piece || piece.special === 'none') continue;

    if (piece.special === 'colorBomb') {
      const fruit = pickRandomFruitOnBoard(board, fruits, rng);
      const affected = fruit ? cellsOfFruit(board, fruit) : [];
      fireEvents.push({ kind: 'specialFire', at: pos, special: 'colorBomb', affected });
      for (const p of affected) enqueue(p);
    } else {
      const affected = areaForSpecial(board, pos, piece.special);
      fireEvents.push({ kind: 'specialFire', at: pos, special: piece.special, affected });
      for (const p of affected) enqueue(p);
    }
  }

  const clearedCells: Pos[] = [];
  const byFruit: Partial<Record<FruitKind, number>> = {};
  const jellyCells: Pos[] = [];
  const flowerCells: Pos[] = [];
  for (const key of toClear) {
    const [x, y] = key.split(',').map(Number);
    const pos = { x: x as number, y: y as number };
    const cell = cellAt(board, pos);

    // Big fruit is immune to every clear effect (ADR-0006): a striped/
    // wrapped/rain/colorBomb blast that covers its cell must not remove it,
    // score it, or clear jelly/flower underneath it — it leaves the board
    // only via a basket. Its position was still legitimately enqueued (the
    // BFS above doesn't need to know about it; a big fruit's special is
    // always 'none' so the chain-propagation check already skips it on its
    // own), so skipping it here only affects the *accounting* below, and
    // everything else caught in the same blast still clears normally.
    if (cell.piece?.big) {
      continue;
    }

    clearedCells.push(pos);
    if (cell.piece) {
      if (cell.piece.fruit) {
        byFruit[cell.piece.fruit] = (byFruit[cell.piece.fruit] ?? 0) + 1;
      }
      cell.piece = null;
    }
    if (cell.jelly) {
      cell.jelly = false;
      jellyCells.push(pos);
    }
    if (cell.flower) {
      cell.flower = false;
      flowerCells.push(pos);
    }
  }

  return { clearedCells, fireEvents, byFruit, jellyCells, flowerCells };
}

interface PendingSpawn {
  at: Pos;
  special: SpecialType;
  fruit: FruitKind | null;
}

function planMatchClears(
  board: Board,
  groups: MatchGroup[],
  preferredSpawnCells: Pos[],
): { seedCells: Pos[]; spawns: PendingSpawn[] } {
  const seedCells: Pos[] = [];
  const spawns: PendingSpawn[] = [];
  for (const group of groups) {
    const special = classifySpawn(group);
    let spawnCell: Pos | null = null;
    if (special !== 'none') {
      spawnCell = pickSpawnCell(group, preferredSpawnCells);
      // The spawn's fruit must be captured now, while the group's pieces are
      // still on the board. A special caught in this same clear can blast the
      // spawn cell before applySpawns runs; reading the fruit afterwards
      // would produce a fruit-less piece the renderer never draws — a
      // permanent-looking "hole" in the board.
      const groupFruit = cellAt(board, group.cells[0] as Pos).piece?.fruit ?? null;
      spawns.push({ at: spawnCell, special, fruit: special === 'colorBomb' ? null : groupFruit });
    }
    for (const cell of group.cells) {
      if (spawnCell && cell.x === spawnCell.x && cell.y === spawnCell.y) continue;
      seedCells.push(cell);
    }
  }
  return { seedCells, spawns };
}

function applySpawns(board: Board, spawns: PendingSpawn[], nextId: () => number): TurnEvent[] {
  const events: TurnEvent[] = [];
  for (const spawn of spawns) {
    const cell = cellAt(board, spawn.at);
    const piece: Piece = { id: nextId(), fruit: spawn.fruit, special: spawn.special, big: false };
    cell.piece = piece;
    events.push({ kind: 'specialSpawn', at: spawn.at, piece });
  }
  return events;
}

type DeliverEvent = Extract<TurnEvent, { kind: 'deliver' }>;

/**
 * `deliveries` is an out-parameter (mutated, not returned) so this keeps its
 * original `FallMove[]` return shape — every existing caller/test that
 * doesn't care about basket delivery is unaffected.
 *
 * Big fruit falls exactly like any other piece via the same write-pointer
 * pass. The basket check happens right where a piece's resting position is
 * finalized (both when it actually fell and when it was already there):
 * if that cell has `basket === true`, the piece is removed immediately and
 * a delivery is recorded. Crucially, `writeY` is *not* decremented when
 * that happens — the cell was just vacated again, so the next piece found
 * scanning upward in this column falls into that same row instead of
 * hanging one row higher, exactly as if the basket were a bottomless sink.
 * This also means several big fruit stacked directly above a basket can all
 * deliver in a single gravity pass.
 */
export function applyGravity(board: Board, deliveries: DeliverEvent[] = []): FallMove[] {
  const moves: FallMove[] = [];
  for (let x = 0; x < board.width; x++) {
    let writeY = board.height - 1;
    for (let y = board.height - 1; y >= 0; y--) {
      const cell = cellAt(board, { x, y });
      if (cell.kind === 'hole') {
        writeY = y - 1;
        continue;
      }
      if (cell.piece) {
        const piece = cell.piece;
        const restY = writeY;
        if (y !== restY) {
          const target = cellAt(board, { x, y: restY });
          target.piece = piece;
          moves.push({ pieceId: piece.id, from: { x, y }, to: { x, y: restY } });
          cell.piece = null;
        }
        const restCell = cellAt(board, { x, y: restY });
        if (piece.big && restCell.basket) {
          restCell.piece = null;
          deliveries.push({ kind: 'deliver', at: { x, y: restY }, pieceId: piece.id });
        } else {
          writeY--;
        }
      }
    }
  }
  return moves;
}

export function refillBoard(
  board: Board,
  fruits: FruitKind[],
  rng: Rng,
  nextId: () => number,
  bigFruitRemaining = 0,
): Spawn[] {
  if (fruits.length === 0) {
    throw new Error('Cannot refill a board with no fruit kinds configured');
  }
  const spawns: Spawn[] = [];
  // At most one big fruit spawns per refillBoard call (i.e. per settle
  // step), even if the level's quota and available top-row space would
  // allow more — releasing them one at a time is deliberate so the board
  // never floods with them (see BLUEPRINT-M9 M9.1).
  let bigFruitSpawnedThisCall = false;
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const cell = cellAt(board, { x, y });
      if (cell.kind === 'hole' || cell.piece) {
        continue;
      }
      let piece: Piece;
      if (y === 0 && bigFruitRemaining > 0 && !bigFruitSpawnedThisCall) {
        piece = { id: nextId(), fruit: null, special: 'none', big: true };
        bigFruitSpawnedThisCall = true;
      } else {
        const fruit = fruits[randomInt(rng, fruits.length)] as FruitKind;
        piece = { id: nextId(), fruit, special: 'none', big: false };
      }
      cell.piece = piece;
      spawns.push({ piece, at: { x, y } });
    }
  }
  return spawns;
}

/** Returns the big-fruit quota remaining after this settle step's refill. */
function settleBoard(
  board: Board,
  rng: Rng,
  nextId: () => number,
  fruits: FruitKind[],
  phases: TurnEvent[][],
  bigFruitRemaining: number,
): number {
  const deliveries: DeliverEvent[] = [];
  const fallMoves = applyGravity(board, deliveries);
  if (fallMoves.length > 0) {
    phases.push([{ kind: 'fall', moves: fallMoves }]);
  }
  if (deliveries.length > 0) {
    phases.push(deliveries);
  }
  const spawns = refillBoard(board, fruits, rng, nextId, bigFruitRemaining);
  if (spawns.length > 0) {
    phases.push([{ kind: 'refill', spawns }]);
  }
  const bigSpawned = spawns.reduce((n, s) => n + (s.piece.big ? 1 : 0), 0);
  return Math.max(0, bigFruitRemaining - bigSpawned);
}

function emitActivationPhase(
  activation: Activation,
  chain: number,
  phases: TurnEvent[][],
  extraEvents: TurnEvent[] = [],
): number {
  const clearPhase: TurnEvent[] = [...extraEvents, { kind: 'clear', cells: activation.clearedCells, byFruit: activation.byFruit }];
  if (activation.jellyCells.length > 0) {
    clearPhase.push({ kind: 'jellyClear', cells: activation.jellyCells });
  }
  if (activation.flowerCells.length > 0) {
    clearPhase.push({ kind: 'flowerBloom', cells: activation.flowerCells });
  }
  clearPhase.push(...activation.fireEvents);
  const points = activation.clearedCells.length * POINTS_PER_PIECE * chain;
  clearPhase.push({ kind: 'score', amount: points, chain });
  phases.push(clearPhase);
  return points;
}

interface CascadeResult {
  scoreDelta: number;
  bigFruitRemaining: number;
}

function runCascade(
  board: Board,
  rng: Rng,
  nextId: () => number,
  fruits: FruitKind[],
  phases: TurnEvent[][],
  startChain: number,
  firstIterationPreferredCells: Pos[],
  bigFruitRemaining: number,
): CascadeResult {
  let chain = startChain;
  let scoreDelta = 0;
  let remaining = bigFruitRemaining;
  let preferredCells = firstIterationPreferredCells;
  for (;;) {
    const groups = findMatches(board);
    if (groups.length === 0) {
      break;
    }
    const { seedCells, spawns } = planMatchClears(board, groups, preferredCells);
    preferredCells = [];

    const activation = activateAndClear(board, seedCells, rng, fruits);
    const spawnEvents = applySpawns(board, spawns, nextId);
    scoreDelta += emitActivationPhase(activation, chain, phases, spawnEvents);

    remaining = settleBoard(board, rng, nextId, fruits, phases, remaining);
    chain++;
  }
  return { scoreDelta, bigFruitRemaining: remaining };
}

export function resolveSwap(
  board: Board,
  a: Pos,
  b: Pos,
  rng: Rng,
  nextId: () => number,
  fruits: FruitKind[],
  bigFruitRemaining = 0,
): ResolveResult {
  const phases: TurnEvent[][] = [];
  if (!canSwap(board, a, b)) {
    phases.push([{ kind: 'swap', a, b, illegal: true }]);
    return { phases, scoreDelta: 0, movesUsed: 0, bigFruitRemaining };
  }

  const pieceA = cellAt(board, a).piece as Piece;
  const pieceB = cellAt(board, b).piece as Piece;

  // ============================================================
  // BIG FRUIT FREE-SWAP PATH (ADR-0006) — the one deliberate breach of the
  // M1 rule "a swap that forms no match bounces back and costs nothing".
  // A big fruit can always be swapped, in any direction, with no match
  // required, so it can never get stranded in a basket-less column. This
  // check runs BEFORE the special-swap combo check below on purpose: a big
  // fruit's own `special` is always 'none', so it would never itself
  // satisfy `isSpecialSwap` — but the pairing *would* if its neighbour is a
  // colorBomb (isSpecialSwap treats "either side is colorBomb" as true
  // regardless of the other side). That combo is deliberately routed
  // through this free path instead: a big fruit has no fruit kind for a
  // colorBomb to target, so there is no meaningful combo to fire anyway.
  //
  // This is the ONLY branch allowed to skip the match-forming check, and it
  // must be reachable ONLY when at least one piece is big — two ordinary
  // pieces must always fall through to the normal path below, where a
  // non-match still bounces back and costs nothing. Do not add another
  // early-return above this that two plain pieces could hit.
  if (pieceA.big || pieceB.big) {
    swapPieces(board, a, b);
    phases.push([{ kind: 'swap', a, b, illegal: false }]);
    // A big fruit itself never completes a match, but the ordinary piece it
    // swapped places might (e.g. sliding into a run of its own fruit) — so
    // this still checks for one and, if found, resolves it exactly like a
    // normal successful swap (same cascade machinery, same scoring).
    if (findMatches(board).length) {
      const cascade = runCascade(board, rng, nextId, fruits, phases, 1, [a, b], bigFruitRemaining);
      return { phases, scoreDelta: cascade.scoreDelta, movesUsed: 1, bigFruitRemaining: cascade.bigFruitRemaining };
    }
    // No match: still must settle unconditionally (not gated on a match),
    // because the swap alone can place the big fruit directly onto a
    // basket cell, and only a gravity pass (inside settleBoard) detects and
    // processes that delivery. The cascade afterwards is not optional
    // either: settling can itself line up a match — a delivered big fruit
    // collapses its whole column, and the refill drops fresh pieces in —
    // and every other path in this file ends by cascading until the board
    // is match-free. Leaving it out here would strand an obvious unexploded
    // run on screen until the player's next move.
    const settled = settleBoard(board, rng, nextId, fruits, phases, bigFruitRemaining);
    const cascade = runCascade(board, rng, nextId, fruits, phases, 1, [], settled);
    return { phases, scoreDelta: cascade.scoreDelta, movesUsed: 1, bigFruitRemaining: cascade.bigFruitRemaining };
  }
  // ============================================================
  // END BIG FRUIT FREE-SWAP PATH. Everything below requires a match.
  // ============================================================

  if (isSpecialSwap(pieceA, pieceB)) {
    swapPieces(board, a, b);
    phases.push([{ kind: 'swap', a, b, illegal: false }]);
    const { seedCells, comboEvent } = comboBlast(board, a, b, pieceA, pieceB);
    // The two swapped special pieces are always spent, even when a combo's
    // own blast geometry wouldn't otherwise reach them (e.g. color bomb +
    // plain fruit only clears the *other* fruit, never the bomb's own null-
    // fruit cell). The BFS Set dedupes, so including them is always safe.
    // For a color bomb this does mean it also fires its passive
    // catch-in-a-blast effect (a bonus random-fruit clear) on top of its
    // deliberate combo effect — treated as a harmless, even fun, side
    // effect rather than something worth extra machinery to suppress.
    const activation = activateAndClear(board, [a, b, ...seedCells], rng, fruits);
    const points = emitActivationPhase(activation, 1, phases, [comboEvent]);
    const settled = settleBoard(board, rng, nextId, fruits, phases, bigFruitRemaining);
    const cascade = runCascade(board, rng, nextId, fruits, phases, 2, [], settled);
    return { phases, scoreDelta: points + cascade.scoreDelta, movesUsed: 1, bigFruitRemaining: cascade.bigFruitRemaining };
  }

  swapPieces(board, a, b);
  if (!findMatches(board).length) {
    swapPieces(board, a, b);
    phases.push([{ kind: 'swap', a, b, illegal: true }]);
    return { phases, scoreDelta: 0, movesUsed: 0, bigFruitRemaining };
  }

  phases.push([{ kind: 'swap', a, b, illegal: false }]);
  const cascade = runCascade(board, rng, nextId, fruits, phases, 1, [a, b], bigFruitRemaining);
  return { phases, scoreDelta: cascade.scoreDelta, movesUsed: 1, bigFruitRemaining: cascade.bigFruitRemaining };
}

/**
 * Fires every special piece still on the board — the celebratory "victory
 * blast" after a level is won, so earned specials never feel wasted. Their
 * clears (and any cascade that follows) score normally on top of the win.
 *
 * A single pass isn't enough: the trailing cascade can itself assemble a new
 * 4+/L/T match as the board settles and refills, minting a fresh special via
 * planMatchClears/applySpawns that nothing has fired yet. So this keeps
 * looping — scan, fire, settle, cascade — round after round until a scan
 * turns up no specials at all, with a safety cap in case refill randomness
 * keeps re-seeding new ones forever.
 */
export function fireRemainingSpecials(
  board: Board,
  rng: Rng,
  nextId: () => number,
  fruits: FruitKind[],
): ResolveResult {
  const phases: TurnEvent[][] = [];
  let scoreDelta = 0;
  let firstRound = true;

  for (let round = 0; round < MAX_VICTORY_BLAST_ROUNDS; round++) {
    const seeds: Pos[] = [];
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const piece = cellAt(board, { x, y }).piece;
        if (piece && piece.special !== 'none') {
          seeds.push({ x, y });
        }
      }
    }
    if (seeds.length === 0) {
      break;
    }
    firstRound = false;

    const activation = activateAndClear(board, seeds, rng, fruits);
    scoreDelta += emitActivationPhase(activation, 1, phases);
    // The victory blast never spawns new big fruit (hardcoded 0): the level
    // is already won, so a fresh big fruit appearing mid-celebration would
    // be pointless and possibly unreachable before the screen moves on.
    const settled = settleBoard(board, rng, nextId, fruits, phases, 0);
    scoreDelta += runCascade(board, rng, nextId, fruits, phases, 2, [], settled).scoreDelta;
  }
  // Reaching the cap without exhausting specials is left alone rather than
  // thrown: the level is already won, and leftover specials after this many
  // rounds are astronomically unlikely and harmless.

  if (firstRound) {
    return { phases: [], scoreDelta: 0, movesUsed: 0, bigFruitRemaining: 0 };
  }
  return { phases, scoreDelta, movesUsed: 0, bigFruitRemaining: 0 };
}

export function resolveHammer(
  board: Board,
  at: Pos,
  rng: Rng,
  nextId: () => number,
  fruits: FruitKind[],
  bigFruitRemaining = 0,
): ResolveResult {
  const cell = cellAt(board, at);
  if (cell.kind === 'hole' || !cell.piece) {
    return { phases: [], scoreDelta: 0, movesUsed: 0, bigFruitRemaining };
  }
  // A big fruit is immune to the hammer (it leaves only via a basket), so
  // report "nothing happened" the same way an empty cell does. Returning no
  // phases is what makes useHammer keep the charge: tapping the hammer on
  // the big fruit is the first thing a player tries when they want to move
  // it, and silently burning one of only three free charges for no effect
  // is exactly the kind of small cruelty ADR-0003 exists to prevent.
  if (cell.piece.big) {
    return { phases: [], scoreDelta: 0, movesUsed: 0, bigFruitRemaining };
  }

  const phases: TurnEvent[][] = [];
  const activation = activateAndClear(board, [at], rng, fruits);
  // The hammer's own destroyed piece earns no score — it's a free unsticking
  // tool. Anything its special ability (or a resulting cascade) clears does.
  const bonusCells = Math.max(0, activation.clearedCells.length - 1);
  const clearPhase: TurnEvent[] = [{ kind: 'clear', cells: activation.clearedCells, byFruit: activation.byFruit }];
  if (activation.jellyCells.length > 0) {
    clearPhase.push({ kind: 'jellyClear', cells: activation.jellyCells });
  }
  if (activation.flowerCells.length > 0) {
    clearPhase.push({ kind: 'flowerBloom', cells: activation.flowerCells });
  }
  clearPhase.push(...activation.fireEvents);
  const points = bonusCells * POINTS_PER_PIECE;
  if (points > 0) {
    clearPhase.push({ kind: 'score', amount: points, chain: 1 });
  }
  phases.push(clearPhase);

  const settled = settleBoard(board, rng, nextId, fruits, phases, bigFruitRemaining);
  const cascade = runCascade(board, rng, nextId, fruits, phases, 2, [], settled);
  return { phases, scoreDelta: points + cascade.scoreDelta, movesUsed: 0, bigFruitRemaining: cascade.bigFruitRemaining };
}

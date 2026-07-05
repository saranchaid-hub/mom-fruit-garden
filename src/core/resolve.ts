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

interface Activation {
  clearedCells: Pos[];
  fireEvents: TurnEvent[];
  byFruit: Partial<Record<FruitKind, number>>;
  jellyCells: Pos[];
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

  const clearedCells = Array.from(toClear).map((key) => {
    const [x, y] = key.split(',').map(Number);
    return { x: x as number, y: y as number };
  });

  const byFruit: Partial<Record<FruitKind, number>> = {};
  const jellyCells: Pos[] = [];
  for (const pos of clearedCells) {
    const cell = cellAt(board, pos);
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
  }

  return { clearedCells, fireEvents, byFruit, jellyCells };
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
    const piece: Piece = { id: nextId(), fruit: spawn.fruit, special: spawn.special };
    cell.piece = piece;
    events.push({ kind: 'specialSpawn', at: spawn.at, piece });
  }
  return events;
}

export function applyGravity(board: Board): FallMove[] {
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
        if (y !== writeY) {
          const target = cellAt(board, { x, y: writeY });
          target.piece = cell.piece;
          moves.push({ pieceId: cell.piece.id, from: { x, y }, to: { x, y: writeY } });
          cell.piece = null;
        }
        writeY--;
      }
    }
  }
  return moves;
}

export function refillBoard(board: Board, fruits: FruitKind[], rng: Rng, nextId: () => number): Spawn[] {
  if (fruits.length === 0) {
    throw new Error('Cannot refill a board with no fruit kinds configured');
  }
  const spawns: Spawn[] = [];
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const cell = cellAt(board, { x, y });
      if (cell.kind === 'hole' || cell.piece) {
        continue;
      }
      const fruit = fruits[randomInt(rng, fruits.length)] as FruitKind;
      const piece = { id: nextId(), fruit, special: 'none' as const };
      cell.piece = piece;
      spawns.push({ piece, at: { x, y } });
    }
  }
  return spawns;
}

function settleBoard(board: Board, rng: Rng, nextId: () => number, fruits: FruitKind[], phases: TurnEvent[][]): void {
  const fallMoves = applyGravity(board);
  if (fallMoves.length > 0) {
    phases.push([{ kind: 'fall', moves: fallMoves }]);
  }
  const spawns = refillBoard(board, fruits, rng, nextId);
  if (spawns.length > 0) {
    phases.push([{ kind: 'refill', spawns }]);
  }
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
  clearPhase.push(...activation.fireEvents);
  const points = activation.clearedCells.length * POINTS_PER_PIECE * chain;
  clearPhase.push({ kind: 'score', amount: points, chain });
  phases.push(clearPhase);
  return points;
}

function runCascade(
  board: Board,
  rng: Rng,
  nextId: () => number,
  fruits: FruitKind[],
  phases: TurnEvent[][],
  startChain: number,
  firstIterationPreferredCells: Pos[],
): number {
  let chain = startChain;
  let scoreDelta = 0;
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

    settleBoard(board, rng, nextId, fruits, phases);
    chain++;
  }
  return scoreDelta;
}

export function resolveSwap(
  board: Board,
  a: Pos,
  b: Pos,
  rng: Rng,
  nextId: () => number,
  fruits: FruitKind[],
): ResolveResult {
  const phases: TurnEvent[][] = [];
  if (!canSwap(board, a, b)) {
    phases.push([{ kind: 'swap', a, b, illegal: true }]);
    return { phases, scoreDelta: 0, movesUsed: 0 };
  }

  const pieceA = cellAt(board, a).piece as Piece;
  const pieceB = cellAt(board, b).piece as Piece;

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
    settleBoard(board, rng, nextId, fruits, phases);
    const cascadeScore = runCascade(board, rng, nextId, fruits, phases, 2, []);
    return { phases, scoreDelta: points + cascadeScore, movesUsed: 1 };
  }

  swapPieces(board, a, b);
  if (!findMatches(board).length) {
    swapPieces(board, a, b);
    phases.push([{ kind: 'swap', a, b, illegal: true }]);
    return { phases, scoreDelta: 0, movesUsed: 0 };
  }

  phases.push([{ kind: 'swap', a, b, illegal: false }]);
  const scoreDelta = runCascade(board, rng, nextId, fruits, phases, 1, [a, b]);
  return { phases, scoreDelta, movesUsed: 1 };
}

/**
 * Fires every special piece still on the board — the celebratory "victory
 * blast" after a level is won, so earned specials never feel wasted. Their
 * clears (and any cascade that follows) score normally on top of the win.
 */
export function fireRemainingSpecials(
  board: Board,
  rng: Rng,
  nextId: () => number,
  fruits: FruitKind[],
): ResolveResult {
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
    return { phases: [], scoreDelta: 0, movesUsed: 0 };
  }

  const phases: TurnEvent[][] = [];
  const activation = activateAndClear(board, seeds, rng, fruits);
  const points = emitActivationPhase(activation, 1, phases);
  settleBoard(board, rng, nextId, fruits, phases);
  const cascadeScore = runCascade(board, rng, nextId, fruits, phases, 2, []);
  return { phases, scoreDelta: points + cascadeScore, movesUsed: 0 };
}

export function resolveHammer(
  board: Board,
  at: Pos,
  rng: Rng,
  nextId: () => number,
  fruits: FruitKind[],
): ResolveResult {
  const cell = cellAt(board, at);
  if (cell.kind === 'hole' || !cell.piece) {
    return { phases: [], scoreDelta: 0, movesUsed: 0 };
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
  clearPhase.push(...activation.fireEvents);
  const points = bonusCells * POINTS_PER_PIECE;
  if (points > 0) {
    clearPhase.push({ kind: 'score', amount: points, chain: 1 });
  }
  phases.push(clearPhase);

  settleBoard(board, rng, nextId, fruits, phases);
  const cascadeScore = runCascade(board, rng, nextId, fruits, phases, 2, []);
  return { phases, scoreDelta: points + cascadeScore, movesUsed: 0 };
}

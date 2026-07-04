import { canSwap, cellAt, swapPieces } from './board';
import { findMatches } from './match';
import { randomInt, type Rng } from './rng';
import type { Board, FallMove, FruitKind, Pos, ResolveResult, Spawn, TurnEvent } from './types';

const POINTS_PER_PIECE = 10;

function uniquePositions(cells: Pos[]): Pos[] {
  const seen = new Set<string>();
  const result: Pos[] = [];
  for (const pos of cells) {
    const key = `${pos.x},${pos.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(pos);
    }
  }
  return result;
}

function clearCells(board: Board, cellsToClear: Pos[]): { byFruit: Partial<Record<FruitKind, number>>; jellyCells: Pos[] } {
  const byFruit: Partial<Record<FruitKind, number>> = {};
  const jellyCells: Pos[] = [];
  for (const pos of cellsToClear) {
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
  return { byFruit, jellyCells };
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

function clearAndScore(board: Board, cellsToClear: Pos[], chain: number, phases: TurnEvent[][], awardScore: boolean): number {
  const { byFruit, jellyCells } = clearCells(board, cellsToClear);
  const clearPhase: TurnEvent[] = [{ kind: 'clear', cells: cellsToClear, byFruit }];
  if (jellyCells.length > 0) {
    clearPhase.push({ kind: 'jellyClear', cells: jellyCells });
  }
  const points = awardScore ? cellsToClear.length * POINTS_PER_PIECE * chain : 0;
  if (awardScore) {
    clearPhase.push({ kind: 'score', amount: points, chain });
  }
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
): number {
  let chain = startChain;
  let scoreDelta = 0;
  for (;;) {
    const groups = findMatches(board);
    if (groups.length === 0) {
      break;
    }
    const cells = uniquePositions(groups.flatMap((group) => group.cells));
    scoreDelta += clearAndScore(board, cells, chain, phases, true);
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

  swapPieces(board, a, b);
  if (!findMatches(board).length) {
    swapPieces(board, a, b);
    phases.push([{ kind: 'swap', a, b, illegal: true }]);
    return { phases, scoreDelta: 0, movesUsed: 0 };
  }

  phases.push([{ kind: 'swap', a, b, illegal: false }]);
  const scoreDelta = runCascade(board, rng, nextId, fruits, phases, 1);
  return { phases, scoreDelta, movesUsed: 1 };
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
  // The hammer's own destroyed piece earns no score — it's a free unsticking
  // tool, not a scoring move. Anything it happens to cascade into does score.
  clearAndScore(board, [at], 1, phases, false);
  settleBoard(board, rng, nextId, fruits, phases);
  const scoreDelta = runCascade(board, rng, nextId, fruits, phases, 1);
  return { phases, scoreDelta, movesUsed: 0 };
}

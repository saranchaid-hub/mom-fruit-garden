import { canSwap, cellAt, swapPieces } from './board';
import { findMatches } from './match';
import { randomInt, shuffle, type Rng } from './rng';
import type { Board, FruitKind, Piece, Pos, ReshuffleMove } from './types';

function wouldMatch(board: Board, a: Pos, b: Pos): boolean {
  swapPieces(board, a, b);
  const matched = findMatches(board).length > 0;
  swapPieces(board, a, b);
  return matched;
}

export function findValidMoves(board: Board): [Pos, Pos][] {
  const valid: [Pos, Pos][] = [];
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const pos = { x, y };
      const right = { x: x + 1, y };
      const down = { x, y: y + 1 };
      if (canSwap(board, pos, right) && wouldMatch(board, pos, right)) {
        valid.push([pos, right]);
      }
      if (canSwap(board, pos, down) && wouldMatch(board, pos, down)) {
        valid.push([pos, down]);
      }
    }
  }
  return valid;
}

export function hasValidMove(board: Board): boolean {
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const pos = { x, y };
      const right = { x: x + 1, y };
      const down = { x, y: y + 1 };
      if (canSwap(board, pos, right) && wouldMatch(board, pos, right)) {
        return true;
      }
      if (canSwap(board, pos, down) && wouldMatch(board, pos, down)) {
        return true;
      }
    }
  }
  return false;
}

const MAX_RESHUFFLE_ATTEMPTS = 50;

function collectFillablePositions(board: Board): Pos[] {
  const positions: Pos[] = [];
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const pos = { x, y };
      const cell = cellAt(board, pos);
      if (cell.kind !== 'hole' && cell.piece) {
        positions.push(pos);
      }
    }
  }
  return positions;
}

function applyAndCheck(board: Board, positions: Pos[], pieces: Piece[]): ReshuffleMove[] | null {
  positions.forEach((pos, i) => {
    cellAt(board, pos).piece = pieces[i] ?? null;
  });
  if (findMatches(board).length || !hasValidMove(board)) {
    return null;
  }
  return positions.map((pos, i) => {
    const piece = pieces[i];
    if (!piece) throw new Error('Reshuffle mapping length mismatch');
    return { pieceId: piece.id, to: pos };
  });
}

/**
 * Rearranges the existing pieces into a layout with no pre-existing match
 * and at least one valid move. If the current multiset of pieces simply
 * can't form such a layout (astronomically rare with a normal fruit mix,
 * but not impossible with a skewed one), falls back to regenerating fresh
 * random pieces rather than crashing the player's turn — the game must
 * never break just because a shuffle got unlucky.
 */
export function reshuffleBoard(board: Board, rng: Rng, fruits: FruitKind[], nextId: () => number): ReshuffleMove[] {
  const positions = collectFillablePositions(board);
  const pieces = positions.map((pos) => cellAt(board, pos).piece as Piece);

  for (let attempt = 0; attempt < MAX_RESHUFFLE_ATTEMPTS; attempt++) {
    const result = applyAndCheck(board, positions, shuffle(rng, pieces));
    if (result) return result;
  }

  for (let attempt = 0; attempt < MAX_RESHUFFLE_ATTEMPTS; attempt++) {
    const fresh = positions.map(() => ({
      id: nextId(),
      fruit: fruits[randomInt(rng, fruits.length)] as FruitKind,
      special: 'none' as const,
    }));
    const result = applyAndCheck(board, positions, fresh);
    if (result) return result;
  }

  throw new Error('Could not find a valid reshuffle after maximum attempts, including fresh regeneration');
}

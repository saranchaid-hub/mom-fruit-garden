import { canSwap, cellAt, swapPieces } from './board';
import { findMatches } from './match';
import { shuffle, type Rng } from './rng';
import type { Board, Piece, Pos, ReshuffleMove } from './types';

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

export function reshuffleBoard(board: Board, rng: Rng): ReshuffleMove[] {
  const positions: Pos[] = [];
  const pieces: Piece[] = [];
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const pos = { x, y };
      const cell = cellAt(board, pos);
      if (cell.kind !== 'hole' && cell.piece) {
        positions.push(pos);
        pieces.push(cell.piece);
      }
    }
  }

  for (let attempt = 0; attempt < MAX_RESHUFFLE_ATTEMPTS; attempt++) {
    const shuffled = shuffle(rng, pieces);
    positions.forEach((pos, i) => {
      cellAt(board, pos).piece = shuffled[i] ?? null;
    });
    if (!findMatches(board).length && hasValidMove(board)) {
      return positions.map((pos, i) => {
        const piece = shuffled[i];
        if (!piece) throw new Error('Reshuffle mapping length mismatch');
        return { pieceId: piece.id, to: pos };
      });
    }
  }
  throw new Error('Could not find a valid reshuffle after maximum attempts');
}

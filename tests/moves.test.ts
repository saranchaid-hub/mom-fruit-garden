import { beforeEach, describe, expect, it } from 'vitest';
import { findMatches } from '../src/core/match';
import { findValidMoves, hasValidMove, reshuffleBoard } from '../src/core/moves';
import { createRng } from '../src/core/rng';
import { parseTestBoard, resetAutoId } from './helpers';

beforeEach(() => resetAutoId());

describe('findValidMoves / hasValidMove', () => {
  it('finds a swap that would create a match', () => {
    const board = parseTestBoard(['O M M', 'M O G', 'G O M']);
    expect(hasValidMove(board)).toBe(true);
    const moves = findValidMoves(board);
    expect(moves.length).toBeGreaterThan(0);
  });

  it('reports no valid moves on a fully stuck board', () => {
    // Diagonal stripes of 3 fruits: no two same-fruit cells are ever adjacent
    // or one swap apart, so no swap anywhere on the board can create a match.
    const board = parseTestBoard(['M O G M', 'O G M O', 'G M O G', 'M O G M']);
    expect(hasValidMove(board)).toBe(false);
    expect(findValidMoves(board)).toEqual([]);
  });

  it('never proposes a swap across a hole', () => {
    const board = parseTestBoard(['M X M', 'O G O', 'M O M']);
    const moves = findValidMoves(board);
    for (const [a, b] of moves) {
      expect(a.x === 1 && a.y === 0).toBe(false);
      expect(b.x === 1 && b.y === 0).toBe(false);
    }
  });
});

describe('reshuffleBoard', () => {
  it('produces a board with the same pieces, no pre-existing match, and at least one valid move', () => {
    const board = parseTestBoard(['M O M O', 'O M O M', 'M O M O', 'O M O M']);
    const fruitsBefore = board.cells.map((c) => c.piece?.fruit).sort();

    reshuffleBoard(board, createRng(5));

    expect(findMatches(board)).toEqual([]);
    expect(hasValidMove(board)).toBe(true);
    const fruitsAfter = board.cells.map((c) => c.piece?.fruit).sort();
    expect(fruitsAfter).toEqual(fruitsBefore);
  });

  it('leaves holes untouched', () => {
    const board = parseTestBoard(['M X M O', 'O M O M', 'M O M O', 'O M O M']);
    reshuffleBoard(board, createRng(11));
    expect(board.cells[1]?.kind).toBe('hole');
  });
});

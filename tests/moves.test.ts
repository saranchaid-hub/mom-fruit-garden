import { beforeEach, describe, expect, it } from 'vitest';
import { findMatches } from '../src/core/match';
import { findValidMoves, hasValidMove, reshuffleBoard } from '../src/core/moves';
import { createRng } from '../src/core/rng';
import { parseTestBoard, resetAutoId } from './helpers';

beforeEach(() => resetAutoId());

const FOUR_FRUITS = ['mango', 'orange', 'grape', 'watermelon'] as const;

function idGen(start = 9000) {
  let id = start;
  return () => id++;
}

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

    reshuffleBoard(board, createRng(5), [...FOUR_FRUITS], idGen());

    expect(findMatches(board)).toEqual([]);
    expect(hasValidMove(board)).toBe(true);
    const fruitsAfter = board.cells.map((c) => c.piece?.fruit).sort();
    expect(fruitsAfter).toEqual(fruitsBefore);
  });

  it('leaves holes untouched', () => {
    const board = parseTestBoard(['M X M O', 'O M O M', 'M O M O', 'O M O M']);
    reshuffleBoard(board, createRng(11), [...FOUR_FRUITS], idGen());
    expect(board.cells[1]?.kind).toBe('hole');
  });

  it('falls back to fresh pieces when the existing multiset can never form a valid layout', () => {
    // All 36 pieces are the same fruit: literally every arrangement of this
    // multiset already contains a match (findMatches can never come back
    // empty), so the existing-piece-shuffle phase is guaranteed to exhaust
    // its attempts and the fresh-regeneration fallback must kick in.
    const board = parseTestBoard(Array.from({ length: 6 }, () => 'M M M M M M'));
    const nextId = idGen(5000);

    const mapping = reshuffleBoard(board, createRng(1), [...FOUR_FRUITS], nextId);

    expect(findMatches(board)).toEqual([]);
    expect(hasValidMove(board)).toBe(true);
    expect(mapping).toHaveLength(36);
    // Fallback pieces get fresh ids from nextId, not the original piece ids (1-36).
    expect(mapping.every((m) => m.pieceId >= 5000)).toBe(true);
  });

  it('throws rather than silently corrupting the board if even fresh regeneration cannot help', () => {
    // A single fruit kind can never produce a valid move (swapping two
    // identical pieces changes nothing), so even the fallback must exhaust
    // its attempts and this has to fail loudly rather than hang or return
    // a broken mapping.
    const board = parseTestBoard(Array.from({ length: 6 }, () => 'M M M M M M'));
    expect(() => reshuffleBoard(board, createRng(1), ['mango'], idGen())).toThrow();
  });
});

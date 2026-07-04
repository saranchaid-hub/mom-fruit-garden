import { beforeEach, describe, expect, it } from 'vitest';
import { applyGravity, refillBoard } from '../src/core/resolve';
import { createRng } from '../src/core/rng';
import { parseTestBoard, resetAutoId } from './helpers';

beforeEach(() => resetAutoId());

describe('applyGravity', () => {
  it('drops pieces straight down to fill empty cells below', () => {
    const board = parseTestBoard(['M . .', '. O .', '. . G']);
    const moves = applyGravity(board);
    expect(board.cells.map((c) => c.piece?.fruit ?? null)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      'mango',
      'orange',
      'grape',
    ]);
    expect(moves).toHaveLength(2); // the grape at (2,2) is already at the bottom
  });

  it('does not move pieces across a hole in the middle of a column', () => {
    const board = parseTestBoard(['M . .', 'X . .', '. . .']);
    applyGravity(board);
    // The mango is above a hole; it can only fall to just above the hole,
    // not past it into the segment below.
    expect(board.cells[0]?.piece?.fruit).toBe('mango');
    expect(board.cells[6]?.piece).toBeNull();
  });

  it('leaves a fully settled column untouched', () => {
    const board = parseTestBoard(['. . .', '. . .', 'M O G']);
    const moves = applyGravity(board);
    expect(moves).toEqual([]);
  });

  it('preserves piece identity across a fall', () => {
    const board = parseTestBoard(['M . .', '. . .', '. . .']);
    const pieceId = board.cells[0]?.piece?.id;
    applyGravity(board);
    expect(board.cells[6]?.piece?.id).toBe(pieceId);
  });
});

describe('refillBoard', () => {
  it('fills every empty normal cell and skips holes and filled cells', () => {
    const board = parseTestBoard(['. X M', '. . .', '. . .']);
    const rng = createRng(42);
    const nextId = (() => {
      let id = 1000;
      return () => id++;
    })();
    const spawns = refillBoard(board, ['mango', 'orange'], rng, nextId);
    expect(spawns).toHaveLength(7);
    expect(board.cells[1]?.piece).toBeNull(); // hole stays empty
    expect(board.cells[2]?.piece?.fruit).toBe('mango'); // untouched pre-filled cell
    for (const cell of board.cells) {
      if (cell.kind === 'normal') {
        expect(cell.piece).not.toBeNull();
      }
    }
  });

  it('throws if no fruit kinds are configured', () => {
    const board = parseTestBoard(['. .', '. .']);
    const rng = createRng(1);
    expect(() => refillBoard(board, [], rng, () => 1)).toThrow();
  });
});

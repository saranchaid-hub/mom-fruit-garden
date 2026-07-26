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

describe('applyGravity: big fruit and basket delivery (ADR-0006)', () => {
  it('a big fruit falls like any other piece when there is no basket in its column', () => {
    const board = parseTestBoard(['BG', '.', '.']);
    const deliveries: Parameters<typeof applyGravity>[1] = [];
    const moves = applyGravity(board, deliveries);
    expect(moves).toHaveLength(1);
    expect(deliveries).toEqual([]);
    expect(board.cells[2]?.piece?.big).toBe(true);
    expect(board.cells[2]?.piece?.fruit).toBeNull();
  });

  it('a big fruit resting directly above a basket falls in and emits deliver; the piece is gone from the board', () => {
    const board = parseTestBoard(['BG', '.', '.K']);
    const bgId = board.cells[0]?.piece?.id;
    const deliveries: Parameters<typeof applyGravity>[1] = [];
    applyGravity(board, deliveries);
    expect(deliveries).toEqual([{ kind: 'deliver', at: { x: 0, y: 2 }, pieceId: bgId }]);
    expect(board.cells[2]?.piece).toBeNull();
  });

  it('pieces stacked above a delivered big fruit settle with no gap left behind', () => {
    const board = parseTestBoard(['M', 'BG', '.', '.K']);
    const deliveries: Parameters<typeof applyGravity>[1] = [];
    applyGravity(board, deliveries);
    expect(deliveries).toHaveLength(1);
    // The basket consumed the big fruit, and the mango above it fell all
    // the way through to the now-empty basket cell — no row left hanging.
    expect(board.cells[0]?.piece).toBeNull();
    expect(board.cells[1]?.piece).toBeNull();
    expect(board.cells[2]?.piece).toBeNull();
    expect(board.cells[3]?.piece?.fruit).toBe('mango');
  });

  it('several big fruit stacked directly above a basket can all deliver in a single gravity pass', () => {
    const board = parseTestBoard(['BG', 'BG', '.K']);
    const deliveries: Parameters<typeof applyGravity>[1] = [];
    applyGravity(board, deliveries);
    expect(deliveries).toHaveLength(2);
    expect(board.cells[2]?.piece).toBeNull();
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

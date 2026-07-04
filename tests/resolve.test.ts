import { beforeEach, describe, expect, it } from 'vitest';
import { resolveHammer, resolveSwap } from '../src/core/resolve';
import { createRng } from '../src/core/rng';
import { cloneTestBoard, parseTestBoard, resetAutoId } from './helpers';

beforeEach(() => resetAutoId());

function idGen(start = 1000) {
  let id = start;
  return () => id++;
}

describe('resolveSwap', () => {
  it('rejects a swap that creates no match, leaving the board unchanged', () => {
    const board = parseTestBoard(['M O G', 'O G M', 'G M O']);
    const before = cloneTestBoard(board);
    const result = resolveSwap(board, { x: 0, y: 0 }, { x: 1, y: 0 }, createRng(1), idGen(), ['mango', 'orange', 'grape']);
    expect(result.movesUsed).toBe(0);
    expect(result.scoreDelta).toBe(0);
    expect(result.phases).toEqual([[{ kind: 'swap', a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, illegal: true }]]);
    expect(board.cells.map((c) => c.piece?.fruit)).toEqual(before.cells.map((c) => c.piece?.fruit));
  });

  it('rejects a swap between non-adjacent cells', () => {
    const board = parseTestBoard(['M O G', 'O G M', 'G M O']);
    const result = resolveSwap(board, { x: 0, y: 0 }, { x: 2, y: 2 }, createRng(1), idGen(), ['mango', 'orange', 'grape']);
    expect(result.movesUsed).toBe(0);
    expect(result.phases[0]?.[0]).toMatchObject({ illegal: true });
  });

  it('resolves a legal swap into a cascade with swap, clear, fall, and refill phases', () => {
    const board = parseTestBoard(['O M M', 'M O G', 'G O M']);
    const result = resolveSwap(board, { x: 0, y: 0 }, { x: 0, y: 1 }, createRng(7), idGen(), ['mango', 'orange', 'grape', 'watermelon']);
    expect(result.movesUsed).toBe(1);
    expect(result.scoreDelta).toBeGreaterThan(0);

    const kinds = result.phases.flat().map((e) => e.kind);
    expect(kinds[0]).toBe('swap');
    expect(kinds).toContain('clear');
    expect(kinds).toContain('refill');

    for (const cell of board.cells) {
      expect(cell.piece).not.toBeNull();
    }
  });

  it('is deterministic given the same seed and starting board', () => {
    const boardA = parseTestBoard(['O M M', 'M O G', 'G O M']);
    resetAutoId();
    const boardB = parseTestBoard(['O M M', 'M O G', 'G O M']);
    const fruits = ['mango', 'orange', 'grape', 'watermelon'] as const;

    const resultA = resolveSwap(boardA, { x: 0, y: 0 }, { x: 0, y: 1 }, createRng(99), idGen(), [...fruits]);
    const resultB = resolveSwap(boardB, { x: 0, y: 0 }, { x: 0, y: 1 }, createRng(99), idGen(), [...fruits]);

    expect(resultA.scoreDelta).toBe(resultB.scoreDelta);
    expect(boardA.cells.map((c) => c.piece?.fruit)).toEqual(boardB.cells.map((c) => c.piece?.fruit));
  });

  it('accumulates a higher chain multiplier on later cascade rounds', () => {
    const board = parseTestBoard(['O M M', 'M O G', 'G O M']);
    const result = resolveSwap(board, { x: 0, y: 0 }, { x: 0, y: 1 }, createRng(7), idGen(), ['mango', 'orange', 'grape', 'watermelon']);
    const scoreEvents = result.phases.flat().filter((e) => e.kind === 'score');
    const chains = scoreEvents.map((e) => (e as { chain: number }).chain);
    expect(chains[0]).toBe(1);
    for (let i = 1; i < chains.length; i++) {
      expect(chains[i]).toBeGreaterThan(chains[i - 1] as number);
    }
  });
});

describe('resolveHammer', () => {
  it('destroys the targeted piece for free, awarding no score for that clear', () => {
    const board = parseTestBoard(['M O G', 'O G W', 'G W O']);
    const result = resolveHammer(board, { x: 1, y: 1 }, createRng(3), idGen(), ['mango', 'orange', 'grape', 'watermelon']);
    expect(result.movesUsed).toBe(0);
    const firstClear = result.phases[0]?.[0];
    expect(firstClear).toMatchObject({ kind: 'clear', cells: [{ x: 1, y: 1 }] });
    expect(firstClear && 'amount' in firstClear).toBe(false);
  });

  it('is a no-op on a hole or already-empty cell', () => {
    const board = parseTestBoard(['X . M', '. . .', '. . .']);
    const result = resolveHammer(board, { x: 0, y: 0 }, createRng(3), idGen(), ['mango', 'orange']);
    expect(result.phases).toEqual([]);
    expect(result.movesUsed).toBe(0);
  });

  it('still clears jelly under the destroyed piece', () => {
    const board = parseTestBoard(['MJ O G', 'O G W', 'G W O']);
    const result = resolveHammer(board, { x: 0, y: 0 }, createRng(3), idGen(), ['mango', 'orange', 'grape', 'watermelon']);
    const jellyEvent = result.phases[0]?.find((e) => e.kind === 'jellyClear');
    expect(jellyEvent).toMatchObject({ cells: [{ x: 0, y: 0 }] });
  });
});

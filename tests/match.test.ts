import { beforeEach, describe, expect, it } from 'vitest';
import { findMatches, hasMatches } from '../src/core/match';
import { parseTestBoard, resetAutoId } from './helpers';

beforeEach(() => resetAutoId());

describe('findMatches', () => {
  it('finds no matches on a clean board', () => {
    const board = parseTestBoard(['M O G M', 'O G M O', 'G M O G']);
    expect(findMatches(board)).toEqual([]);
    expect(hasMatches(board)).toBe(false);
  });

  it('finds a horizontal run of 3', () => {
    const board = parseTestBoard(['M M M O', 'O G W G', 'G W O W']);
    const groups = findMatches(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.maxHorizontalRun).toBe(3);
    expect(groups[0]?.maxVerticalRun).toBe(0);
    expect(groups[0]?.cells).toEqual(
      expect.arrayContaining([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]),
    );
  });

  it('finds a vertical run of 3', () => {
    const board = parseTestBoard(['M O G', 'M W G', 'M O W']);
    const groups = findMatches(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.maxVerticalRun).toBe(3);
    expect(groups[0]?.maxHorizontalRun).toBe(0);
  });

  it('classifies a run of 4 as length 4, not two overlapping 3s', () => {
    const board = parseTestBoard(['M M M M O', 'O G W G B', 'G W O W B']);
    const groups = findMatches(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.maxHorizontalRun).toBe(4);
    expect(groups[0]?.cells).toHaveLength(4);
  });

  it('classifies a run of 5', () => {
    const board = parseTestBoard(['M M M M M', 'O G W G B', 'G W O W B']);
    const groups = findMatches(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.maxHorizontalRun).toBe(5);
  });

  it('merges an L-shape into one group with both orientations', () => {
    const board = parseTestBoard(['M O G', 'M W G', 'M M M']);
    const groups = findMatches(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.maxHorizontalRun).toBe(3);
    expect(groups[0]?.maxVerticalRun).toBe(3);
    expect(groups[0]?.cells).toHaveLength(5);
  });

  it('merges a T-shape into one group with both orientations', () => {
    const board = parseTestBoard(['M M M', 'O M W', 'G M B']);
    const groups = findMatches(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.maxHorizontalRun).toBe(3);
    expect(groups[0]?.maxVerticalRun).toBe(3);
    expect(groups[0]?.cells).toHaveLength(5);
  });

  it('finds two independent groups separately', () => {
    const board = parseTestBoard(['M M M O O O', 'G W B G W B', 'S S S B B B']);
    const groups = findMatches(board);
    expect(groups).toHaveLength(4);
  });

  it('ignores holes when scanning runs', () => {
    const board = parseTestBoard(['M M X M', 'O G W B', 'G W O W']);
    expect(hasMatches(board)).toBe(false);
  });

  it('treats special pieces as matching by fruit', () => {
    const board = parseTestBoard(['M M M O', 'O G W G', 'G W O W']);
    const cell = board.cells[0];
    if (cell?.piece) cell.piece.special = 'stripedH';
    const groups = findMatches(board);
    expect(groups).toHaveLength(1);
  });
});

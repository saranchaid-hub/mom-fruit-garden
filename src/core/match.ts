import { cellAt, indexToPos, posIndex } from './board';
import type { Board, FruitKind, Pos } from './types';

export interface MatchGroup {
  cells: Pos[];
  maxHorizontalRun: number;
  maxVerticalRun: number;
}

interface Run {
  cells: Pos[];
  orientation: 'h' | 'v';
}

function fruitAt(board: Board, pos: Pos): FruitKind | null {
  const cell = cellAt(board, pos);
  if (cell.kind === 'hole' || !cell.piece) {
    return null;
  }
  return cell.piece.fruit;
}

function scanRuns(board: Board, orientation: 'h' | 'v'): Run[] {
  const runs: Run[] = [];
  const outerLen = orientation === 'h' ? board.height : board.width;
  const innerLen = orientation === 'h' ? board.width : board.height;
  const posAt = (outer: number, inner: number): Pos =>
    orientation === 'h' ? { x: inner, y: outer } : { x: outer, y: inner };

  for (let outer = 0; outer < outerLen; outer++) {
    let inner = 0;
    while (inner < innerLen) {
      const fruit = fruitAt(board, posAt(outer, inner));
      if (fruit === null) {
        inner++;
        continue;
      }
      let end = inner;
      while (end + 1 < innerLen && fruitAt(board, posAt(outer, end + 1)) === fruit) {
        end++;
      }
      const length = end - inner + 1;
      if (length >= 3) {
        const cells: Pos[] = [];
        for (let k = inner; k <= end; k++) {
          cells.push(posAt(outer, k));
        }
        runs.push({ cells, orientation });
      }
      inner = end + 1;
    }
  }
  return runs;
}

class UnionFind {
  private readonly parent = new Map<number, number>();

  ensure(index: number): void {
    if (!this.parent.has(index)) {
      this.parent.set(index, index);
    }
  }

  find(index: number): number {
    let root = index;
    while (this.parent.get(root) !== root) {
      const next = this.parent.get(root);
      if (next === undefined) break;
      root = next;
    }
    let cursor = index;
    while (this.parent.get(cursor) !== root) {
      const next = this.parent.get(cursor);
      if (next === undefined) break;
      this.parent.set(cursor, root);
      cursor = next;
    }
    return root;
  }

  union(a: number, b: number): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootA, rootB);
    }
  }
}

export function findMatches(board: Board): MatchGroup[] {
  const runs = [...scanRuns(board, 'h'), ...scanRuns(board, 'v')];
  if (runs.length === 0) {
    return [];
  }

  const unionFind = new UnionFind();
  for (const run of runs) {
    const indices = run.cells.map((pos) => posIndex(board, pos));
    for (const index of indices) {
      unionFind.ensure(index);
    }
    const [first, ...rest] = indices;
    if (first === undefined) continue;
    for (const index of rest) {
      unionFind.union(first, index);
    }
  }

  const groups = new Map<number, { cellSet: Set<number>; hLens: number[]; vLens: number[] }>();
  for (const run of runs) {
    const indices = run.cells.map((pos) => posIndex(board, pos));
    const first = indices[0];
    if (first === undefined) continue;
    const root = unionFind.find(first);
    let group = groups.get(root);
    if (!group) {
      group = { cellSet: new Set(), hLens: [], vLens: [] };
      groups.set(root, group);
    }
    for (const index of indices) {
      group.cellSet.add(index);
    }
    (run.orientation === 'h' ? group.hLens : group.vLens).push(run.cells.length);
  }

  return Array.from(groups.values()).map((group) => ({
    cells: Array.from(group.cellSet).map((index) => indexToPos(board, index)),
    maxHorizontalRun: group.hLens.length > 0 ? Math.max(...group.hLens) : 0,
    maxVerticalRun: group.vLens.length > 0 ? Math.max(...group.vLens) : 0,
  }));
}

export function hasMatches(board: Board): boolean {
  return findMatches(board).length > 0;
}

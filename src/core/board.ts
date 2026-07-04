import type { Board, Cell, CellKind, Pos } from './types';

export function createBoardFromLayout(width: number, height: number, layout?: string[]): Board {
  const cells: Cell[] = [];
  for (let y = 0; y < height; y++) {
    const row = layout?.[y] ?? '.'.repeat(width);
    for (let x = 0; x < width; x++) {
      const symbol = row[x] ?? '.';
      const kind: CellKind = symbol === 'X' ? 'hole' : 'normal';
      cells.push({ kind, jelly: symbol === 'J', piece: null });
    }
  }
  return { width, height, cells };
}

export function posIndex(board: Board, pos: Pos): number {
  return pos.y * board.width + pos.x;
}

export function indexToPos(board: Board, index: number): Pos {
  return { x: index % board.width, y: Math.floor(index / board.width) };
}

export function inBounds(board: Board, pos: Pos): boolean {
  return pos.x >= 0 && pos.x < board.width && pos.y >= 0 && pos.y < board.height;
}

export function cellAt(board: Board, pos: Pos): Cell {
  if (!inBounds(board, pos)) {
    throw new Error(`Position out of bounds: (${pos.x}, ${pos.y})`);
  }
  const cell = board.cells[posIndex(board, pos)];
  if (!cell) {
    throw new Error(`Missing cell at (${pos.x}, ${pos.y})`);
  }
  return cell;
}

export function isAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

export function swapPieces(board: Board, a: Pos, b: Pos): void {
  const cellA = cellAt(board, a);
  const cellB = cellAt(board, b);
  const temp = cellA.piece;
  cellA.piece = cellB.piece;
  cellB.piece = temp;
}

export function canSwap(board: Board, a: Pos, b: Pos): boolean {
  if (!isAdjacent(a, b) || !inBounds(board, a) || !inBounds(board, b)) {
    return false;
  }
  const cellA = cellAt(board, a);
  const cellB = cellAt(board, b);
  return cellA.kind !== 'hole' && cellB.kind !== 'hole' && cellA.piece !== null && cellB.piece !== null;
}

export function countJellyCells(board: Board): number {
  return board.cells.filter((cell) => cell.jelly).length;
}

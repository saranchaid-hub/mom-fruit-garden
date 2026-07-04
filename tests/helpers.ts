import type { Board, Cell, FruitKind, Piece } from '../src/core/types';

const FRUIT_LETTERS: Record<string, FruitKind> = {
  M: 'mango',
  O: 'orange',
  G: 'grape',
  W: 'watermelon',
  S: 'mangosteen',
  B: 'banana',
};

let autoId = 1;

export function resetAutoId(start = 1): void {
  autoId = start;
}

export function nextTestId(): number {
  return autoId++;
}

/**
 * Parses rows of space-separated tokens into a Board for tests.
 * Tokens: a fruit letter (M/O/G/W/S/B), '.' for an empty normal cell,
 * 'X' for a hole, and a trailing 'J' for jelly (e.g. '.J' or 'MJ').
 */
export function parseTestBoard(rows: string[]): Board {
  const grid = rows.map((row) => row.trim().split(/\s+/));
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const cells: Cell[] = [];

  for (const row of grid) {
    if (row.length !== width) {
      throw new Error('All rows must have the same number of tokens');
    }
    for (const token of row) {
      if (token === 'X') {
        cells.push({ kind: 'hole', jelly: false, piece: null });
        continue;
      }
      const jelly = token.endsWith('J');
      const letter = jelly ? token.slice(0, -1) : token;
      if (letter === '.') {
        cells.push({ kind: 'normal', jelly, piece: null });
        continue;
      }
      const fruit = FRUIT_LETTERS[letter];
      if (!fruit) {
        throw new Error(`Unknown fruit letter: "${letter}"`);
      }
      const piece: Piece = { id: nextTestId(), fruit, special: 'none' };
      cells.push({ kind: 'normal', jelly, piece });
    }
  }

  return { width, height, cells };
}

export function cloneTestBoard(board: Board): Board {
  return {
    width: board.width,
    height: board.height,
    cells: board.cells.map((cell) => ({
      kind: cell.kind,
      jelly: cell.jelly,
      piece: cell.piece ? { ...cell.piece } : null,
    })),
  };
}

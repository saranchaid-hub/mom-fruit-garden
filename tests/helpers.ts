import type { Board, Cell, FruitKind, Piece, SpecialType } from '../src/core/types';

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

const SPECIAL_MODIFIERS: Record<string, SpecialType> = {
  h: 'stripedH',
  v: 'stripedV',
  w: 'wrapped',
};

/**
 * Parses rows of space-separated tokens into a Board for tests.
 * Tokens: a fruit letter (M/O/G/W/S/B) optionally followed by a special
 * modifier (h=stripedH, v=stripedV, w=wrapped), '.' for an empty normal
 * cell, 'X' for a hole, 'CB' for a color bomb (no fruit), and a trailing
 * 'J' for jelly (e.g. '.J', 'MJ', 'MhJ', 'CBJ').
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
      const rest = jelly ? token.slice(0, -1) : token;

      if (rest === '.') {
        cells.push({ kind: 'normal', jelly, piece: null });
        continue;
      }
      if (rest === 'CB') {
        const piece: Piece = { id: nextTestId(), fruit: null, special: 'colorBomb' };
        cells.push({ kind: 'normal', jelly, piece });
        continue;
      }

      const letter = rest[0] as string;
      const modifierChar = rest.slice(1);
      const fruit = FRUIT_LETTERS[letter];
      if (!fruit) {
        throw new Error(`Unknown fruit letter: "${letter}" in token "${token}"`);
      }
      let special: SpecialType = 'none';
      if (modifierChar) {
        const modifier = SPECIAL_MODIFIERS[modifierChar];
        if (!modifier) {
          throw new Error(`Unknown special modifier: "${modifierChar}" in token "${token}"`);
        }
        special = modifier;
      }
      const piece: Piece = { id: nextTestId(), fruit, special };
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

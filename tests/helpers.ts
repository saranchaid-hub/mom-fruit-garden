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
  r: 'rain',
};

/**
 * Parses rows of space-separated tokens into a Board for tests.
 * Tokens: a fruit letter (M/O/G/W/S/B) optionally followed by a special
 * modifier (h=stripedH, v=stripedV, w=wrapped, r=rain), '.' for an empty
 * normal cell, 'X' for a hole, 'CB' for a color bomb (no fruit), 'BG' for a
 * big fruit (no fruit, no special — see ADR-0006), and trailing status
 * letters 'J' for jelly, 'F' for flower, and/or 'K' for a basket cell, in
 * any order (e.g. '.J', 'MJ', 'MhJ', 'CBJ', '.F', 'MF', 'MhF', 'MJF', '.K',
 * 'BGK'). 'K' rather than 'B' is used for the basket modifier because 'B'
 * is already the banana fruit letter. Only one of each is supported (at
 * most one 'J', one 'F', and one 'K' per token) — a cell doesn't need more
 * than that today.
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
        cells.push({ kind: 'hole', jelly: false, flower: false, basket: false, piece: null });
        continue;
      }
      let rest = token;
      let jelly = false;
      let flower = false;
      let basket = false;
      for (let i = 0; i < 3; i++) {
        if (rest.endsWith('J') && !jelly) {
          jelly = true;
          rest = rest.slice(0, -1);
        } else if (rest.endsWith('F') && !flower) {
          flower = true;
          rest = rest.slice(0, -1);
        } else if (rest.endsWith('K') && !basket) {
          basket = true;
          rest = rest.slice(0, -1);
        } else {
          break;
        }
      }

      if (rest === '.') {
        cells.push({ kind: 'normal', jelly, flower, basket, piece: null });
        continue;
      }
      if (rest === 'CB') {
        const piece: Piece = { id: nextTestId(), fruit: null, special: 'colorBomb', big: false };
        cells.push({ kind: 'normal', jelly, flower, basket, piece });
        continue;
      }
      if (rest === 'BG') {
        const piece: Piece = { id: nextTestId(), fruit: null, special: 'none', big: true };
        cells.push({ kind: 'normal', jelly, flower, basket, piece });
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
      const piece: Piece = { id: nextTestId(), fruit, special, big: false };
      cells.push({ kind: 'normal', jelly, flower, basket, piece });
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
      flower: cell.flower,
      basket: cell.basket,
      piece: cell.piece ? { ...cell.piece } : null,
    })),
  };
}

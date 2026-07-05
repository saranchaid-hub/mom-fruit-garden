import { beforeEach, describe, expect, it } from 'vitest';
import {
  areaForSpecial,
  cellsOfFruit,
  classifySpawn,
  comboBlast,
  pickRandomFruitOnBoard,
  pickSpawnCell,
} from '../src/core/specials';
import type { MatchGroup } from '../src/core/match';
import { createRng } from '../src/core/rng';
import { resolveHammer, resolveSwap } from '../src/core/resolve';
import type { FruitKind, Piece, Pos, TurnEvent } from '../src/core/types';
import { cloneTestBoard, parseTestBoard, resetAutoId } from './helpers';

beforeEach(() => resetAutoId());

function idGen(start = 1000) {
  let id = start;
  return () => id++;
}

function fireEventsOf(phases: TurnEvent[][]): TurnEvent[] {
  return phases.flat().filter((e) => e.kind === 'specialFire' || e.kind === 'comboFire' || e.kind === 'specialSpawn');
}

describe('classifySpawn', () => {
  const group = (maxHorizontalRun: number, maxVerticalRun: number): MatchGroup => ({
    cells: [{ x: 0, y: 0 }],
    maxHorizontalRun,
    maxVerticalRun,
  });

  it('returns none for a plain 3-run', () => {
    expect(classifySpawn(group(3, 0))).toBe('none');
    expect(classifySpawn(group(0, 3))).toBe('none');
  });

  it('returns stripedV for a horizontal run of 4', () => {
    expect(classifySpawn(group(4, 0))).toBe('stripedV');
  });

  it('returns stripedH for a vertical run of 4', () => {
    expect(classifySpawn(group(0, 4))).toBe('stripedH');
  });

  it('returns colorBomb for a run of 5 or more', () => {
    expect(classifySpawn(group(5, 0))).toBe('colorBomb');
    expect(classifySpawn(group(0, 6))).toBe('colorBomb');
  });

  it('returns wrapped for an L/T shape with both orientations at least 3', () => {
    expect(classifySpawn(group(3, 3))).toBe('wrapped');
    expect(classifySpawn(group(4, 3))).toBe('wrapped');
  });

  it('prioritizes colorBomb over wrapped when a 5-run also has a perpendicular arm', () => {
    expect(classifySpawn(group(5, 3))).toBe('colorBomb');
  });
});

describe('pickSpawnCell', () => {
  it('prefers a swapped cell when it is part of the group', () => {
    const group: MatchGroup = {
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ],
      maxHorizontalRun: 4,
      maxVerticalRun: 0,
    };
    expect(pickSpawnCell(group, [{ x: 9, y: 9 }, { x: 2, y: 0 }])).toEqual({ x: 2, y: 0 });
  });

  it('falls back to the cell closest to the centroid when no preferred cell matches', () => {
    const group: MatchGroup = {
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
      maxHorizontalRun: 3,
      maxVerticalRun: 0,
    };
    expect(pickSpawnCell(group, [{ x: 9, y: 9 }])).toEqual({ x: 1, y: 0 });
  });
});

describe('areaForSpecial', () => {
  const board = parseTestBoard(['. . .', '. . .', '. . .']);

  it('stripedH clears the whole row', () => {
    expect(areaForSpecial(board, { x: 1, y: 1 }, 'stripedH')).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
  });

  it('stripedV clears the whole column', () => {
    expect(areaForSpecial(board, { x: 1, y: 1 }, 'stripedV')).toEqual([
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ]);
  });

  it('wrapped clears a 3x3 block, clipped to board bounds at a corner', () => {
    expect(areaForSpecial(board, { x: 0, y: 0 }, 'wrapped')).toHaveLength(4);
    expect(areaForSpecial(board, { x: 1, y: 1 }, 'wrapped')).toHaveLength(9);
  });

  it('colorBomb has no inherent area of its own', () => {
    expect(areaForSpecial(board, { x: 0, y: 0 }, 'colorBomb')).toEqual([]);
  });
});

describe('cellsOfFruit / pickRandomFruitOnBoard', () => {
  it('finds every cell of a given fruit, special or not', () => {
    const board = parseTestBoard(['M Oh M', 'G M O']);
    expect(cellsOfFruit(board, 'mango')).toEqual(
      expect.arrayContaining([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 1 },
      ]),
    );
  });

  it('only picks fruits actually present on the board', () => {
    const board = parseTestBoard(['M M', 'M M']);
    const rng = createRng(1);
    for (let i = 0; i < 10; i++) {
      expect(pickRandomFruitOnBoard(board, ['mango', 'orange', 'grape'], rng)).toBe('mango');
    }
  });

  it('returns null when no configured fruit is present', () => {
    const board = parseTestBoard(['X X', 'X X']);
    expect(pickRandomFruitOnBoard(board, ['mango'], createRng(1))).toBeNull();
  });
});

describe('comboBlast', () => {
  it('striped + striped clears both crosses through the swapped positions', () => {
    const board = parseTestBoard(['. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .']);
    const pieceA: Piece = { id: 1, fruit: 'mango', special: 'stripedH' };
    const pieceB: Piece = { id: 2, fruit: 'mango', special: 'stripedV' };
    const a: Pos = { x: 1, y: 1 };
    const b: Pos = { x: 2, y: 1 };
    const { seedCells, comboEvent } = comboBlast(board, a, b, pieceA, pieceB);
    expect(seedCells).toHaveLength(13);
    expect(seedCells).toEqual(expect.arrayContaining([{ x: 4, y: 1 }, { x: 1, y: 4 }, { x: 2, y: 4 }]));
    expect(seedCells).not.toEqual(expect.arrayContaining([{ x: 0, y: 0 }]));
    expect(comboEvent).toMatchObject({ kind: 'comboFire', a, b });
  });

  it('striped + wrapped clears a giant cross of 3 rows and 3 columns', () => {
    const board = parseTestBoard(['. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .']);
    const pieceA: Piece = { id: 1, fruit: 'mango', special: 'stripedH' };
    const pieceB: Piece = { id: 2, fruit: 'mango', special: 'wrapped' };
    const { seedCells } = comboBlast(board, { x: 1, y: 1 }, { x: 2, y: 1 }, pieceA, pieceB);
    // center is the wrapped piece's position (2,1): rows y=0,1,2 (full width)
    // plus columns x=1,2,3 (full height), overlap counted once.
    expect(seedCells).toHaveLength(21);
    expect(seedCells).toEqual(expect.arrayContaining([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 1, y: 4 }, { x: 3, y: 4 }]));
    expect(seedCells).not.toEqual(expect.arrayContaining([{ x: 4, y: 4 }, { x: 0, y: 4 }]));
  });

  it('wrapped + wrapped clears two overlapping 5x5 blocks', () => {
    const board = parseTestBoard(Array.from({ length: 7 }, () => '. . . . . . .'));
    const pieceA: Piece = { id: 1, fruit: 'mango', special: 'wrapped' };
    const pieceB: Piece = { id: 2, fruit: 'mango', special: 'wrapped' };
    const { seedCells } = comboBlast(board, { x: 3, y: 3 }, { x: 4, y: 3 }, pieceA, pieceB);
    expect(seedCells).toHaveLength(30);
  });

  it('color bomb + plain fruit clears every cell of that fruit', () => {
    const board = parseTestBoard(['CB M O', 'O G M', 'G O M']);
    const pieceA = board.cells[0]?.piece as Piece;
    const pieceB = board.cells[1]?.piece as Piece;
    const { seedCells } = comboBlast(board, { x: 0, y: 0 }, { x: 1, y: 0 }, pieceA, pieceB);
    expect(seedCells).toEqual(
      expect.arrayContaining([
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
      ]),
    );
    expect(seedCells).toHaveLength(3);
  });

  it('color bomb + wrapped clears every cell of the wrapped piece\'s own fruit', () => {
    const board = parseTestBoard(['CB Mw O', 'O G M', 'G O M']);
    const pieceA = board.cells[0]?.piece as Piece;
    const pieceB = board.cells[1]?.piece as Piece;
    const { seedCells } = comboBlast(board, { x: 0, y: 0 }, { x: 1, y: 0 }, pieceA, pieceB);
    expect(seedCells).toEqual(
      expect.arrayContaining([
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
      ]),
    );
    expect(seedCells).toHaveLength(3);
  });

  it('color bomb + striped converts that fruit to the same orientation and fires them all', () => {
    const board = parseTestBoard(['CB Mh O', 'O G M', 'G O M']);
    const pieceA = board.cells[0]?.piece as Piece;
    const pieceB = board.cells[1]?.piece as Piece;
    const { seedCells } = comboBlast(board, { x: 0, y: 0 }, { x: 1, y: 0 }, pieceA, pieceB);
    // Every mango (at (1,0), (2,1), (2,2)) is converted to stripedH and
    // fires its whole row: row0, row1, row2 entirely.
    expect(seedCells).toHaveLength(9);
    expect(board.cells[1]?.piece?.special).toBe('stripedH');
    expect(board.cells[2 * 3 + 2]?.piece?.special).toBe('stripedH');
  });

  it('color bomb + color bomb clears the entire board', () => {
    const board = parseTestBoard(['CB M O', 'O G CB', 'G O M']);
    const pieceA = board.cells[0]?.piece as Piece;
    const pieceB = board.cells[5]?.piece as Piece;
    const { seedCells } = comboBlast(board, { x: 0, y: 0 }, { x: 2, y: 1 }, pieceA, pieceB);
    expect(seedCells).toHaveLength(9);
  });
});

describe('specials integration via resolveSwap', () => {
  it('spawns a stripedV special at the swapped-in cell for a horizontal run of 4', () => {
    const board = parseTestBoard(['M M M O', 'O O G M', 'G M O G', 'O G M O']);
    const result = resolveSwap(board, { x: 3, y: 1 }, { x: 3, y: 0 }, createRng(1), idGen(), ['mango', 'orange', 'grape']);
    const spawn = result.phases.flat().find((e) => e.kind === 'specialSpawn');
    expect(spawn).toMatchObject({ kind: 'specialSpawn', at: { x: 3, y: 0 }, piece: { fruit: 'mango', special: 'stripedV' } });
  });

  it('spawns a colorBomb (no fruit) for a run of 5', () => {
    const board = parseTestBoard(['M M M M O', 'O G W B M']);
    const result = resolveSwap(board, { x: 4, y: 1 }, { x: 4, y: 0 }, createRng(1), idGen(), [
      'mango',
      'orange',
      'grape',
      'watermelon',
      'banana',
    ]);
    const spawn = result.phases.flat().find((e) => e.kind === 'specialSpawn');
    expect(spawn).toMatchObject({ kind: 'specialSpawn', at: { x: 4, y: 0 }, piece: { fruit: null, special: 'colorBomb' } });
  });

  it('spawns a wrapped special for an L-shaped match', () => {
    const board = parseTestBoard(['O G M', 'G O M', 'M M O', 'O G M']);
    const result = resolveSwap(board, { x: 2, y: 2 }, { x: 2, y: 3 }, createRng(1), idGen(), ['mango', 'orange', 'grape']);
    const spawn = result.phases.flat().find((e) => e.kind === 'specialSpawn');
    expect(spawn).toMatchObject({ kind: 'specialSpawn', at: { x: 2, y: 2 }, piece: { fruit: 'mango', special: 'wrapped' } });
  });

  it('firing a pre-placed stripedH reaches beyond the triggering match to clear its whole row', () => {
    const board = parseTestBoard(['Oh O G M B', 'M W O G B']);
    const result = resolveSwap(board, { x: 2, y: 0 }, { x: 2, y: 1 }, createRng(1), idGen(), [
      'mango',
      'orange',
      'grape',
      'watermelon',
      'banana',
    ]);
    const fire = result.phases.flat().find((e) => e.kind === 'specialFire');
    expect(fire).toMatchObject({ kind: 'specialFire', special: 'stripedH', at: { x: 0, y: 0 } });
    const clear = result.phases.flat().find((e) => e.kind === 'clear');
    expect(clear && 'cells' in clear ? clear.cells : []).toEqual(
      expect.arrayContaining([{ x: 3, y: 0 }, { x: 4, y: 0 }]),
    );
  });

  it('a wrapped explosion chains into a color bomb caught in its blast radius', () => {
    const board = parseTestBoard(['G B M W', 'CB M W G', 'O Ow G B', 'W G O M']);
    const result = resolveSwap(board, { x: 2, y: 2 }, { x: 2, y: 3 }, createRng(1), idGen(), [
      'mango',
      'orange',
      'grape',
      'watermelon',
      'banana',
    ]);
    const events = fireEventsOf(result.phases);
    expect(events.some((e) => e.kind === 'specialFire' && e.special === 'wrapped')).toBe(true);
    const colorBombFire = events.find((e) => e.kind === 'specialFire' && e.special === 'colorBomb');
    expect(colorBombFire).toBeDefined();
    const affected = (colorBombFire as Extract<TurnEvent, { kind: 'specialFire' }>).affected;
    expect(affected.length).toBeGreaterThan(0);
  });

  it('a special-swap combo counts as one move and continues the cascade afterward', () => {
    const board = parseTestBoard(['Mh Mv O G', 'O G W B', 'G W O M', 'W O G M']);
    const before = cloneTestBoard(board);
    const result = resolveSwap(board, { x: 0, y: 0 }, { x: 1, y: 0 }, createRng(2), idGen(), [
      'mango',
      'orange',
      'grape',
      'watermelon',
      'banana',
    ]);
    expect(result.movesUsed).toBe(1);
    const combo = result.phases.flat().find((e) => e.kind === 'comboFire');
    expect(combo).toBeDefined();
    expect(result.scoreDelta).toBeGreaterThan(0);
    void before;
  });
});

describe('combo consumes both swapped special pieces', () => {
  // Regression: color bomb combos used to only clear the *other* fruit's
  // cells, leaving the spent color bomb (or its partner) alive on the board.
  const fruits: FruitKind[] = ['mango', 'orange', 'grape', 'watermelon'];

  it.each<{ name: string; row: string }>([
    { name: 'striped + striped', row: 'Mh Mv O G' },
    { name: 'striped + wrapped', row: 'Mh Mw O G' },
    { name: 'wrapped + wrapped', row: 'Mw Ow O G' },
    { name: 'color bomb + plain fruit', row: 'CB M O G' },
    { name: 'color bomb + striped', row: 'CB Mh O G' },
    { name: 'color bomb + wrapped', row: 'CB Mw O G' },
  ])('$name leaves neither swapped piece on the board', ({ row }) => {
    resetAutoId();
    const board = parseTestBoard([row, '. . . .', '. . . .', '. . . .']);
    const pieceA = board.cells[0]?.piece as Piece;
    const pieceB = board.cells[1]?.piece as Piece;
    resolveSwap(board, { x: 0, y: 0 }, { x: 1, y: 0 }, createRng(1), idGen(), fruits);
    const survivingIds = board.cells.map((c) => c.piece?.id);
    expect(survivingIds).not.toContain(pieceA.id);
    expect(survivingIds).not.toContain(pieceB.id);
  });

  it('color bomb + color bomb leaves neither swapped piece (whole board clears anyway)', () => {
    const board = parseTestBoard(['CB CB O G', '. . . .', '. . . .', '. . . .']);
    const pieceA = board.cells[0]?.piece as Piece;
    const pieceB = board.cells[1]?.piece as Piece;
    resolveSwap(board, { x: 0, y: 0 }, { x: 1, y: 0 }, createRng(1), idGen(), fruits);
    const survivingIds = board.cells.map((c) => c.piece?.id);
    expect(survivingIds).not.toContain(pieceA.id);
    expect(survivingIds).not.toContain(pieceB.id);
  });
});

describe('hammer and specials', () => {
  it('destroying a special with the hammer still activates its effect', () => {
    const board = parseTestBoard(['Oh O G M', 'M G O B', 'G O M W']);
    const result = resolveHammer(board, { x: 0, y: 0 }, createRng(1), idGen(), ['mango', 'orange', 'grape', 'watermelon', 'banana']);
    const fire = result.phases.flat().find((e) => e.kind === 'specialFire');
    expect(fire).toMatchObject({ kind: 'specialFire', special: 'stripedH', at: { x: 0, y: 0 } });
  });
});

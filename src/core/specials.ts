import { cellAt, inBounds } from './board';
import type { MatchGroup } from './match';
import { randomInt, type Rng } from './rng';
import type { Board, FruitKind, Piece, Pos, SpecialType, TurnEvent } from './types';

/**
 * Classifies what special (if any) a matched group earns. Checked in this
 * priority order: a run of 5+ always wins (colorBomb), then any group with
 * both a horizontal and vertical run (an L/T shape) becomes wrapped even if
 * one arm is long, and only a plain single-orientation run of 4 becomes
 * striped. A run of exactly 3 earns nothing.
 */
export function classifySpawn(group: MatchGroup): SpecialType {
  if (group.maxHorizontalRun >= 5 || group.maxVerticalRun >= 5) {
    return 'colorBomb';
  }
  if (group.maxHorizontalRun >= 3 && group.maxVerticalRun >= 3) {
    return 'wrapped';
  }
  if (group.maxHorizontalRun >= 4) {
    return 'stripedV';
  }
  if (group.maxVerticalRun >= 4) {
    return 'stripedH';
  }
  return 'none';
}

/**
 * Picks where the new special piece appears: the swapped-in cell when it's
 * part of this group (so the piece the player actually moved becomes the
 * special), otherwise the group's cell closest to its own centroid.
 */
export function pickSpawnCell(group: MatchGroup, preferredCells: Pos[] = []): Pos {
  for (const preferred of preferredCells) {
    if (group.cells.some((c) => c.x === preferred.x && c.y === preferred.y)) {
      return preferred;
    }
  }
  const centroidX = group.cells.reduce((sum, c) => sum + c.x, 0) / group.cells.length;
  const centroidY = group.cells.reduce((sum, c) => sum + c.y, 0) / group.cells.length;
  let best = group.cells[0] as Pos;
  let bestDistance = Infinity;
  for (const cell of group.cells) {
    const distance = (cell.x - centroidX) ** 2 + (cell.y - centroidY) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = cell;
    }
  }
  return best;
}

export function rowCells(board: Board, y: number): Pos[] {
  const cells: Pos[] = [];
  for (let x = 0; x < board.width; x++) {
    cells.push({ x, y });
  }
  return cells;
}

export function columnCells(board: Board, x: number): Pos[] {
  const cells: Pos[] = [];
  for (let y = 0; y < board.height; y++) {
    cells.push({ x, y });
  }
  return cells;
}

export function blockCells(board: Board, at: Pos, radius: number): Pos[] {
  const cells: Pos[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const pos = { x: at.x + dx, y: at.y + dy };
      if (inBounds(board, pos)) {
        cells.push(pos);
      }
    }
  }
  return cells;
}

export function threeRowsThreeCols(board: Board, center: Pos): Pos[] {
  const seen = new Set<string>();
  const cells: Pos[] = [];
  const add = (pos: Pos): void => {
    const key = `${pos.x},${pos.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      cells.push(pos);
    }
  };
  for (let dy = -1; dy <= 1; dy++) {
    const y = center.y + dy;
    if (y >= 0 && y < board.height) {
      for (const pos of rowCells(board, y)) add(pos);
    }
  }
  for (let dx = -1; dx <= 1; dx++) {
    const x = center.x + dx;
    if (x >= 0 && x < board.width) {
      for (const pos of columnCells(board, x)) add(pos);
    }
  }
  return cells;
}

export function allBoardCells(board: Board): Pos[] {
  const cells: Pos[] = [];
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      cells.push({ x, y });
    }
  }
  return cells;
}

export function cellsOfFruit(board: Board, fruit: FruitKind): Pos[] {
  const cells: Pos[] = [];
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const pos = { x, y };
      const cell = cellAt(board, pos);
      if (cell.kind !== 'hole' && cell.piece?.fruit === fruit) {
        cells.push(pos);
      }
    }
  }
  return cells;
}

export function pickRandomFruitOnBoard(board: Board, fruits: FruitKind[], rng: Rng): FruitKind | null {
  const present = fruits.filter((fruit) => cellsOfFruit(board, fruit).length > 0);
  if (present.length === 0) {
    return null;
  }
  return present[randomInt(rng, present.length)] as FruitKind;
}

/** The area a special clears when it fires on its own (not as part of a combo). */
export function areaForSpecial(board: Board, at: Pos, special: SpecialType): Pos[] {
  switch (special) {
    case 'stripedH':
      return rowCells(board, at.y);
    case 'stripedV':
      return columnCells(board, at.x);
    case 'wrapped':
      return blockCells(board, at, 1);
    case 'colorBomb':
    case 'none':
      return [];
  }
}

export function isSpecialSwap(pieceA: Piece, pieceB: Piece): boolean {
  if (pieceA.special === 'colorBomb' || pieceB.special === 'colorBomb') {
    return true;
  }
  return pieceA.special !== 'none' && pieceB.special !== 'none';
}

function uniquePositions(cells: Pos[]): Pos[] {
  const seen = new Set<string>();
  const result: Pos[] = [];
  for (const pos of cells) {
    const key = `${pos.x},${pos.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(pos);
    }
  }
  return result;
}

export interface ComboResult {
  seedCells: Pos[];
  comboEvent: Extract<TurnEvent, { kind: 'comboFire' }>;
}

/**
 * Resolves what happens when the player deliberately swaps two special
 * pieces together (or a color bomb with anything). Simplified from the
 * original design's "wrapped explodes twice" and "color bomb + wrapped
 * clears that fruit twice" — this fires each effect once. The double-fire
 * flourish is easy to layer on later (wrap the call site in a repeat) but
 * wasn't worth the added cascade-loop complexity for a first pass.
 */
export function comboBlast(board: Board, a: Pos, b: Pos, pieceA: Piece, pieceB: Piece): ComboResult {
  const event = (affected: Pos[]): Extract<TurnEvent, { kind: 'comboFire' }> => ({ kind: 'comboFire', a, b, affected });

  if (pieceA.special === 'colorBomb' && pieceB.special === 'colorBomb') {
    const affected = allBoardCells(board);
    return { seedCells: affected, comboEvent: event(affected) };
  }

  if (pieceA.special === 'colorBomb' || pieceB.special === 'colorBomb') {
    const other = pieceA.special === 'colorBomb' ? pieceB : pieceA;

    if (other.special === 'none') {
      const affected = other.fruit ? cellsOfFruit(board, other.fruit) : [];
      return { seedCells: affected, comboEvent: event(affected) };
    }

    if (other.special === 'wrapped') {
      // Targets the wrapped piece's own fruit (its "flavor"), not a random
      // one — the color bomb senses its partner's identity.
      const affected = other.fruit ? cellsOfFruit(board, other.fruit) : [];
      return { seedCells: affected, comboEvent: event(affected) };
    }

    // other.special is stripedH or stripedV: convert every piece of that
    // same fruit to match this orientation, then fire all of them at once.
    const orientation = other.special;
    const targets = other.fruit ? cellsOfFruit(board, other.fruit) : [];
    const affectedSets: Pos[] = [];
    for (const pos of targets) {
      const cell = cellAt(board, pos);
      if (cell.piece) {
        cell.piece.special = orientation;
      }
      affectedSets.push(...areaForSpecial(board, pos, orientation));
    }
    const affected = uniquePositions(affectedSets);
    return { seedCells: affected, comboEvent: event(affected) };
  }

  if (pieceA.special === 'wrapped' && pieceB.special === 'wrapped') {
    const affected = uniquePositions([...blockCells(board, a, 2), ...blockCells(board, b, 2)]);
    return { seedCells: affected, comboEvent: event(affected) };
  }

  if (pieceA.special === 'wrapped' || pieceB.special === 'wrapped') {
    const center = pieceA.special === 'wrapped' ? a : b;
    const affected = threeRowsThreeCols(board, center);
    return { seedCells: affected, comboEvent: event(affected) };
  }

  // Both striped, either orientation.
  const affected = uniquePositions([
    ...rowCells(board, a.y),
    ...columnCells(board, a.x),
    ...rowCells(board, b.y),
    ...columnCells(board, b.x),
  ]);
  return { seedCells: affected, comboEvent: event(affected) };
}

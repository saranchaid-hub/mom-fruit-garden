export type FruitKind = 'mango' | 'orange' | 'grape' | 'watermelon' | 'mangosteen' | 'banana';

export type SpecialType = 'none' | 'stripedH' | 'stripedV' | 'wrapped' | 'colorBomb';

export interface Piece {
  id: number;
  fruit: FruitKind | null;
  special: SpecialType;
}

export type CellKind = 'normal' | 'hole';

export interface Cell {
  kind: CellKind;
  jelly: boolean;
  piece: Piece | null;
}

export interface Board {
  width: number;
  height: number;
  cells: Cell[];
}

export interface Pos {
  x: number;
  y: number;
}

export type Objective =
  | { type: 'collect'; fruit: FruitKind; count: number }
  | { type: 'jelly' }
  | { type: 'score'; target: number };

export interface LevelConfig {
  width: number;
  height: number;
  layout?: string[];
  fruits: FruitKind[];
  moves: number;
  objective: Objective;
  starScores: [number, number];
}

export interface FallMove {
  pieceId: number;
  from: Pos;
  to: Pos;
}

export interface Spawn {
  piece: Piece;
  at: Pos;
}

export interface ReshuffleMove {
  pieceId: number;
  to: Pos;
}

export type TurnEvent =
  | { kind: 'swap'; a: Pos; b: Pos; illegal: boolean }
  | { kind: 'clear'; cells: Pos[]; byFruit: Partial<Record<FruitKind, number>> }
  | { kind: 'jellyClear'; cells: Pos[] }
  | { kind: 'fall'; moves: FallMove[] }
  | { kind: 'refill'; spawns: Spawn[] }
  | { kind: 'score'; amount: number; chain: number }
  | { kind: 'reshuffle'; mapping: ReshuffleMove[] };

export interface ResolveResult {
  phases: TurnEvent[][];
  scoreDelta: number;
  movesUsed: 0 | 1;
}

export interface ObjectiveProgress {
  current: number;
  target: number;
}

export interface TurnResult {
  phases: TurnEvent[][];
  boardAfter: Board;
  scoreDelta: number;
  movesUsed: 0 | 1;
  outcome: 'continue' | 'won' | 'lost';
  movesLeft: number;
  objectiveProgress: ObjectiveProgress;
}

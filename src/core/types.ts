export type FruitKind = 'mango' | 'orange' | 'grape' | 'watermelon' | 'mangosteen' | 'banana';

export type SpecialType = 'none' | 'stripedH' | 'stripedV' | 'wrapped' | 'colorBomb' | 'rain';

export interface Piece {
  id: number;
  fruit: FruitKind | null;
  special: SpecialType;
  // A big fruit (ผลไม้ลูกใหญ่, ADR-0006) is `{ fruit: null, special: 'none',
  // big: true }` — unmatchable, immune to special-piece clearing, and only
  // leaves the board via a basket cell. Every other piece is `big: false`.
  big: boolean;
}

export type CellKind = 'normal' | 'hole';

export interface Cell {
  kind: CellKind;
  jelly: boolean;
  flower: boolean;
  // A basket cell (ตะกร้า) collects a big fruit that comes to rest on it.
  // Only ever true on the bottom layout row — validateLevel enforces this,
  // since a big fruit only falls straight down and could never reach one
  // placed anywhere else.
  basket: boolean;
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
  | { type: 'score'; target: number }
  | { type: 'deliver'; count: number };

export interface LevelConfig {
  width: number;
  height: number;
  layout?: string[];
  fruits: FruitKind[];
  moves: number;
  objective: Objective;
  starScores: [number, number];
  // How many big fruit this level releases in total across its refills.
  // Only meaningful when the level has basket cells; undefined/omitted
  // means the level never spawns any (the common case pre-M9).
  bigFruitTotal?: number;
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
  | { kind: 'flowerBloom'; cells: Pos[] }
  | { kind: 'deliver'; at: Pos; pieceId: number }
  | { kind: 'specialSpawn'; at: Pos; piece: Piece }
  | { kind: 'specialFire'; at: Pos; special: SpecialType; affected: Pos[] }
  | { kind: 'comboFire'; a: Pos; b: Pos; affected: Pos[] }
  | { kind: 'fall'; moves: FallMove[] }
  | { kind: 'refill'; spawns: Spawn[] }
  | { kind: 'score'; amount: number; chain: number }
  | { kind: 'reshuffle'; mapping: ReshuffleMove[] };

export interface ResolveResult {
  phases: TurnEvent[][];
  scoreDelta: number;
  movesUsed: 0 | 1;
  // Big fruit remaining to be released via future refills, after this
  // resolve call consumed whatever it spawned this turn. Threaded through
  // rather than tracked as module-level state, so the core stays pure.
  bigFruitRemaining: number;
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

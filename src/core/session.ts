import { createBoardFromLayout } from './board';
import { findMatches } from './match';
import { hasValidMove, reshuffleBoard } from './moves';
import { advanceObjective, createObjectiveProgress, isObjectiveComplete } from './objectives';
import { refillBoard, resolveHammer, resolveSwap } from './resolve';
import { createRng, type Rng } from './rng';
import type { Board, FruitKind, LevelConfig, ObjectiveProgress, Pos, ResolveResult, TurnEvent, TurnResult } from './types';

export interface LevelSession {
  board: Board;
  config: LevelConfig;
  rng: Rng;
  nextIdCounter: number;
  movesLeft: number;
  hammersLeft: number;
  score: number;
  objectiveProgress: ObjectiveProgress;
  outcome: 'continue' | 'won' | 'lost';
}

const MAX_BOARD_GEN_ATTEMPTS = 200;
const DEFAULT_HAMMERS = 3;

function generateInitialBoard(config: LevelConfig, rng: Rng, nextId: () => number): Board {
  for (let attempt = 0; attempt < MAX_BOARD_GEN_ATTEMPTS; attempt++) {
    const board = createBoardFromLayout(config.width, config.height, config.layout);
    refillBoard(board, config.fruits, rng, nextId);
    if (!findMatches(board).length && hasValidMove(board)) {
      return board;
    }
  }
  throw new Error('Failed to generate a solvable board after maximum attempts');
}

export function createSession(config: LevelConfig, seed: number, hammerCount = DEFAULT_HAMMERS): LevelSession {
  const rng = createRng(seed);
  let idCounter = 0;
  const nextId = () => ++idCounter;
  const board = generateInitialBoard(config, rng, nextId);
  return {
    board,
    config,
    rng,
    nextIdCounter: idCounter,
    movesLeft: config.moves,
    hammersLeft: hammerCount,
    score: 0,
    objectiveProgress: createObjectiveProgress(config.objective, board),
    outcome: 'continue',
  };
}

function tallyClear(phases: TurnEvent[][]): { byFruit: Partial<Record<FruitKind, number>>; jellyClearedCount: number } {
  const byFruit: Partial<Record<FruitKind, number>> = {};
  let jellyClearedCount = 0;
  for (const phase of phases) {
    for (const event of phase) {
      if (event.kind === 'clear') {
        for (const [fruit, count] of Object.entries(event.byFruit)) {
          byFruit[fruit as FruitKind] = (byFruit[fruit as FruitKind] ?? 0) + (count ?? 0);
        }
      } else if (event.kind === 'jellyClear') {
        jellyClearedCount += event.cells.length;
      }
    }
  }
  return { byFruit, jellyClearedCount };
}

function finalize(session: LevelSession, result: ResolveResult): TurnResult {
  session.score += result.scoreDelta;
  const { byFruit, jellyClearedCount } = tallyClear(result.phases);
  session.objectiveProgress = advanceObjective(session.objectiveProgress, session.config.objective, {
    byFruit,
    jellyClearedCount,
    totalScore: session.score,
  });
  session.movesLeft = Math.max(0, session.movesLeft - result.movesUsed);

  if (session.outcome === 'continue') {
    // Win is checked before out-of-moves: completing the objective on the
    // very last move (or the last hammer, which costs no move) must win,
    // never lose. Do not swap this order.
    if (isObjectiveComplete(session.objectiveProgress)) {
      session.outcome = 'won';
    } else if (session.movesLeft <= 0) {
      session.outcome = 'lost';
    }
  }

  const phases = [...result.phases];
  if (session.outcome === 'continue' && !hasValidMove(session.board)) {
    const mapping = reshuffleBoard(session.board, session.rng);
    phases.push([{ kind: 'reshuffle', mapping }]);
  }

  return {
    phases,
    boardAfter: session.board,
    scoreDelta: result.scoreDelta,
    movesUsed: result.movesUsed,
    outcome: session.outcome,
    movesLeft: session.movesLeft,
    objectiveProgress: session.objectiveProgress,
  };
}

function staleResult(session: LevelSession): TurnResult {
  return {
    phases: [],
    boardAfter: session.board,
    scoreDelta: 0,
    movesUsed: 0,
    outcome: session.outcome,
    movesLeft: session.movesLeft,
    objectiveProgress: session.objectiveProgress,
  };
}

export function trySwap(session: LevelSession, a: Pos, b: Pos): TurnResult {
  if (session.outcome !== 'continue') {
    return staleResult(session);
  }
  const nextId = () => ++session.nextIdCounter;
  const result = resolveSwap(session.board, a, b, session.rng, nextId, session.config.fruits);
  return finalize(session, result);
}

export function useHammer(session: LevelSession, at: Pos): TurnResult {
  if (session.outcome !== 'continue' || session.hammersLeft <= 0) {
    return staleResult(session);
  }
  const nextId = () => ++session.nextIdCounter;
  const result = resolveHammer(session.board, at, session.rng, nextId, session.config.fruits);
  if (result.phases.length === 0) {
    return staleResult(session);
  }
  session.hammersLeft -= 1;
  return finalize(session, result);
}

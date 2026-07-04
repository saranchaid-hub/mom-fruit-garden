import { countJellyCells } from './board';
import type { Board, FruitKind, Objective, ObjectiveProgress } from './types';

export function createObjectiveProgress(objective: Objective, board: Board): ObjectiveProgress {
  switch (objective.type) {
    case 'collect':
      return { current: 0, target: objective.count };
    case 'score':
      return { current: 0, target: objective.target };
    case 'jelly':
      return { current: 0, target: countJellyCells(board) };
  }
}

export interface ClearTally {
  byFruit: Partial<Record<FruitKind, number>>;
  jellyClearedCount: number;
  totalScore: number;
}

export function advanceObjective(
  progress: ObjectiveProgress,
  objective: Objective,
  cleared: ClearTally,
): ObjectiveProgress {
  if (objective.type === 'score') {
    // Reads from the authoritative running total (session.score) instead of
    // re-summing deltas here, so this can never drift from it even if a
    // future score source (e.g. a special-candy bonus) bypasses this call.
    return { ...progress, current: Math.min(progress.target, cleared.totalScore) };
  }
  const gained = objective.type === 'collect' ? (cleared.byFruit[objective.fruit] ?? 0) : cleared.jellyClearedCount;
  return { ...progress, current: Math.min(progress.target, progress.current + gained) };
}

export function isObjectiveComplete(progress: ObjectiveProgress): boolean {
  // target === 0 means a misconfigured level (e.g. a jelly objective on a
  // board with no jelly) — fail loud via "never completes" rather than
  // silently auto-winning at turn zero.
  return progress.target > 0 && progress.current >= progress.target;
}

export function starsForScore(score: number, starScores: [number, number]): 1 | 2 | 3 {
  const [twoStar, threeStar] = starScores;
  if (score >= threeStar) return 3;
  if (score >= twoStar) return 2;
  return 1;
}

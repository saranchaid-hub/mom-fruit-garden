import type { LevelDef } from './schema';

const FIVE_FRUITS = ['mango', 'orange', 'grape', 'watermelon', 'mangosteen'] as const;
const SIX_FRUITS = [...FIVE_FRUITS, 'banana'] as const;

const JELLY_BLOCK_8 = [
  '........',
  '........',
  '..JJJJ..',
  '..JJJJ..',
  '..JJJJ..',
  '..JJJJ..',
  '........',
  '........',
];

const JELLY_RING_8 = [
  '........',
  '.JJJJJJ.',
  '.J....J.',
  '.J....J.',
  '.J....J.',
  '.J....J.',
  '.JJJJJJ.',
  '........',
];

const CORNERS_CUT_8 = [
  'X......X',
  '........',
  '........',
  '........',
  '........',
  '........',
  '........',
  'X......X',
];

// "Graduation garden": a victory lap, not a wall. Every level here stays at
// or below the difficulty of the high-30s/40s — no new mechanics, just a
// pleasant, varied send-off. Level 60 is deliberately the easiest of all.
export const LEVELS_49_60: LevelDef[] = [
  {
    id: 49,
    width: 8,
    height: 8,
    fruits: [...SIX_FRUITS],
    moves: 30,
    objective: { type: 'collect', fruit: 'mango', count: 30 },
    starScores: [1400, 2300],
  },
  {
    id: 50,
    width: 8,
    height: 8,
    layout: JELLY_BLOCK_8,
    fruits: [...FIVE_FRUITS],
    moves: 30,
    objective: { type: 'jelly' },
    starScores: [2200, 3500],
  },
  {
    id: 51,
    width: 8,
    height: 8,
    fruits: [...SIX_FRUITS],
    moves: 28,
    objective: { type: 'score', target: 2200 },
    starScores: [3200, 4800],
  },
  {
    id: 52,
    width: 8,
    height: 8,
    layout: CORNERS_CUT_8,
    fruits: [...SIX_FRUITS],
    moves: 30,
    objective: { type: 'collect', fruit: 'orange', count: 30 },
    starScores: [1400, 2300],
  },
  {
    id: 53,
    width: 8,
    height: 8,
    fruits: [...FIVE_FRUITS],
    moves: 28,
    objective: { type: 'score', target: 2300 },
    starScores: [3300, 4900],
  },
  {
    id: 54,
    width: 8,
    height: 8,
    layout: JELLY_RING_8,
    fruits: [...SIX_FRUITS],
    moves: 32,
    objective: { type: 'jelly' },
    starScores: [2300, 3600],
  },
  {
    id: 55,
    width: 8,
    height: 8,
    fruits: [...SIX_FRUITS],
    moves: 30,
    objective: { type: 'collect', fruit: 'grape', count: 32 },
    starScores: [1500, 2400],
  },
  {
    id: 56,
    width: 8,
    height: 8,
    fruits: [...FIVE_FRUITS],
    moves: 28,
    objective: { type: 'score', target: 2300 },
    starScores: [3300, 4900],
  },
  {
    id: 57,
    width: 8,
    height: 8,
    layout: JELLY_BLOCK_8,
    fruits: [...SIX_FRUITS],
    moves: 32,
    objective: { type: 'jelly' },
    starScores: [2300, 3600],
  },
  {
    id: 58,
    width: 8,
    height: 8,
    fruits: [...SIX_FRUITS],
    moves: 30,
    objective: { type: 'collect', fruit: 'watermelon', count: 32 },
    starScores: [1500, 2400],
  },
  {
    id: 59,
    width: 8,
    height: 8,
    fruits: [...FIVE_FRUITS],
    moves: 30,
    objective: { type: 'score', target: 2200 },
    starScores: [3200, 4800],
  },
  {
    id: 60,
    width: 7,
    height: 7,
    // The finale: a smaller, friendlier board, generous moves, and a low
    // bar — this level exists to be won, not to be a final gauntlet.
    fruits: [...FIVE_FRUITS],
    moves: 26,
    objective: { type: 'collect', fruit: 'mangosteen', count: 16 },
    starScores: [900, 1500],
  },
];

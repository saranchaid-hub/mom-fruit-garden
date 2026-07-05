import type { LevelDef } from './schema';

const CORE_FRUITS = ['mango', 'orange', 'grape', 'watermelon'] as const;
const FIVE_FRUITS = [...CORE_FRUITS, 'mangosteen'] as const;

const JELLY_BLOCK = ['.......', '.......', '..JJJ..', '..JJJ..', '..JJJ..', '.......', '.......'];

const JELLY_RING = ['.......', '.JJJJJ.', '.J...J.', '.J...J.', '.J...J.', '.JJJJJ.', '.......'];

const JELLY_CROSS = ['...J...', '...J...', '..JJJ..', 'JJJJJJJ', '..JJJ..', '...J...', '...J...'];

export const LEVELS_01_12: LevelDef[] = [
  {
    id: 1,
    width: 6,
    height: 6,
    fruits: [...CORE_FRUITS],
    moves: 18,
    objective: { type: 'collect', fruit: 'mango', count: 12 },
    starScores: [400, 700],
  },
  {
    id: 2,
    width: 6,
    height: 6,
    fruits: [...CORE_FRUITS],
    moves: 18,
    objective: { type: 'collect', fruit: 'orange', count: 14 },
    starScores: [450, 750],
  },
  {
    id: 3,
    width: 6,
    height: 6,
    fruits: [...CORE_FRUITS],
    moves: 20,
    objective: { type: 'collect', fruit: 'grape', count: 16 },
    starScores: [500, 850],
  },
  {
    id: 4,
    width: 6,
    height: 6,
    fruits: [...CORE_FRUITS],
    moves: 18,
    objective: { type: 'collect', fruit: 'watermelon', count: 16 },
    starScores: [500, 850],
  },
  {
    id: 5,
    width: 6,
    height: 6,
    fruits: [...CORE_FRUITS],
    moves: 20,
    objective: { type: 'collect', fruit: 'mango', count: 20 },
    starScores: [600, 1000],
  },
  {
    id: 6,
    width: 6,
    height: 6,
    fruits: [...CORE_FRUITS],
    moves: 16,
    objective: { type: 'score', target: 900 },
    starScores: [1400, 2200],
  },
  {
    id: 7,
    width: 6,
    height: 6,
    fruits: [...CORE_FRUITS],
    moves: 18,
    objective: { type: 'score', target: 1100 },
    starScores: [1700, 2600],
  },
  {
    id: 8,
    width: 7,
    height: 7,
    layout: JELLY_BLOCK,
    fruits: [...CORE_FRUITS],
    moves: 22,
    objective: { type: 'jelly' },
    starScores: [1200, 2000],
  },
  {
    id: 9,
    width: 6,
    height: 6,
    fruits: [...CORE_FRUITS],
    moves: 18,
    objective: { type: 'score', target: 1300 },
    starScores: [2000, 3000],
  },
  {
    id: 10,
    width: 7,
    height: 7,
    layout: JELLY_RING,
    fruits: [...CORE_FRUITS],
    moves: 24,
    objective: { type: 'jelly' },
    starScores: [1500, 2400],
  },
  {
    id: 11,
    width: 7,
    height: 7,
    fruits: [...CORE_FRUITS],
    moves: 22,
    objective: { type: 'collect', fruit: 'watermelon', count: 24 },
    starScores: [900, 1500],
  },
  {
    id: 12,
    width: 7,
    height: 7,
    layout: JELLY_CROSS,
    fruits: [...FIVE_FRUITS],
    moves: 26,
    objective: { type: 'jelly' },
    starScores: [1800, 2800],
  },
];

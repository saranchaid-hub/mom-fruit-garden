import type { LevelDef } from './schema';

const FOUR_FRUITS = ['mango', 'orange', 'grape', 'watermelon'] as const;
const FIVE_FRUITS = [...FOUR_FRUITS, 'mangosteen'] as const;
const SIX_FRUITS = [...FIVE_FRUITS, 'banana'] as const;

// ---------------------------------------------------------------------------
// 61-64 — flowers (M9.3 BLUEPRINT: "the gentlest introduction"). Familiar
// objectives (collect/jelly/score) on otherwise-ordinary boards, with flower
// cells scattered widely enough that an ordinary match lands on one without
// any special effort. A bloom is pure upside (+1 move), so no move-budget
// compensation is needed for it — these levels are tuned exactly like their
// flower-less equivalents a few levels back.
// ---------------------------------------------------------------------------

// Eight flowers spread edge-to-edge and corner-to-corner across an open
// board — wherever a beginner's first few matches happen to land, one is
// close by.
const FLOWER_OPEN_8 = [
  '...F.F..',
  '........',
  '.F....F.',
  '........',
  '........',
  '.F....F.',
  '........',
  '..F.F...',
];

// Same jelly ring the player already knows from levels 33/45, with four
// flowers sitting in the open corners the ring doesn't cover.
const FLOWER_JELLY_RING_8 = [
  'F......F',
  '.JJJJJJ.',
  '.J....J.',
  '.J....J.',
  '.J....J.',
  '.J....J.',
  '.JJJJJJ.',
  'F......F',
];

// A denser scatter for a plain score level — twelve flowers, still no shape
// tricks, so every cascade has good odds of blooming one or two.
const FLOWER_DENSE_8 = [
  '.F.F.F.F',
  '........',
  'F......F',
  '........',
  '........',
  'F......F',
  '........',
  '.F.F.F.F',
];

// Corners cut (familiar from level 34/52) plus a generous ring of flowers
// just inside the cut corners — the tier's most flower-rich board, a little
// celebration before the mechanic goes quiet until it resurfaces at 76+.
const FLOWER_CORNERS_CUT_8 = [
  'X.F..F.X',
  '........',
  'F......F',
  '........',
  '........',
  'F......F',
  '........',
  'X.F..F.X',
];

export const LEVELS_61_80: LevelDef[] = [
  {
    id: 61,
    width: 8,
    height: 8,
    // First-ever flower cells. A familiar collect objective at a familiar
    // pace — nothing here should feel new except the pleasant surprise of a
    // bloom and a free extra move.
    layout: FLOWER_OPEN_8,
    fruits: [...FIVE_FRUITS],
    moves: 28,
    objective: { type: 'collect', fruit: 'mango', count: 24 },
    starScores: [1000, 1700],
  },
  {
    id: 62,
    width: 8,
    height: 8,
    // Five fruit kinds, not six: this is the gentlest tier in the whole set,
    // so the ring keeps the easier fruit count even though later levels
    // reintroduce the sixth kind on this same shape.
    layout: FLOWER_JELLY_RING_8,
    fruits: [...FIVE_FRUITS],
    moves: 34,
    objective: { type: 'jelly' },
    starScores: [2000, 3200],
  },
  {
    id: 63,
    width: 8,
    height: 8,
    layout: FLOWER_DENSE_8,
    fruits: [...FIVE_FRUITS],
    moves: 26,
    objective: { type: 'score', target: 1900 },
    starScores: [2800, 4200],
  },
  {
    id: 64,
    width: 8,
    height: 8,
    // The flower tier's send-off: the most blooms of any level so far, on a
    // shape she already knows well.
    layout: FLOWER_CORNERS_CUT_8,
    fruits: [...SIX_FRUITS],
    moves: 33,
    objective: { type: 'collect', fruit: 'orange', count: 30 },
    starScores: [1400, 2300],
  },

  // -------------------------------------------------------------------------
  // TEACHING RISK, do not lose this: from 67 onward these levels are only
  // winnable if the player knows a big fruit can be swapped sideways with no
  // match (ADR-0006). Simulated pure-random play that never nudges once wins
  // 65 and 66 comfortably but wins 69 zero times out of sixty. So the
  // mechanic cannot be left to be discovered — the M9.5 tutorial must teach
  // the nudge explicitly at 65, and again at 67 where it first becomes
  // mandatory. Without that, 69 and 70 are a silent wall.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // 65-70 — baskets and big fruit (deliver). Move budgets are deliberately
  // padded well beyond the collect-objective norm: every sideways nudge of a
  // big fruit costs a full move (ADR-0006), so a delivery count needs far
  // more slack than an equivalent collect count. Baskets start covering
  // nearly the whole bottom row and narrow gradually; big fruit count climbs
  // from one to three.
  // -------------------------------------------------------------------------

  {
    id: 65,
    width: 8,
    height: 8,
    // Every column has its own basket: whichever column a big fruit lands
    // in, it only ever needs to fall — never be nudged sideways. As close to
    // unloseable as a deliver level gets, by design (BLUEPRINT-M9 M9.3: "65
    // should be nearly impossible to fail").
    // Move budget sized for a player who has not yet realised a big fruit can
    // be nudged sideways at all: simulated pure-random play (never nudging
    // once) wins this only 36/60 at 20 moves, which is not "nearly impossible
    // to fail" for the level that introduces the mechanic. It is the teaching
    // level; generosity here costs nothing.
    layout: ['........', '........', '........', '........', '........', '........', '........', 'BBBBBBBB'],
    fruits: [...FOUR_FRUITS],
    moves: 28,
    objective: { type: 'deliver', count: 1 },
    bigFruitTotal: 1,
    starScores: [500, 1000],
  },
  {
    id: 66,
    width: 8,
    height: 8,
    // Six of eight columns still have a basket — a big fruit needs at most
    // one sideways nudge to reach one.
    // Same reasoning as 65 — still a teaching level, still budgeted for
    // someone who has not yet learned to nudge.
    layout: ['........', '........', '........', '........', '........', '........', '........', 'BB.BB.BB'],
    fruits: [...FOUR_FRUITS],
    moves: 28,
    objective: { type: 'deliver', count: 1 },
    bigFruitTotal: 2,
    starScores: [600, 1200],
  },
  {
    id: 67,
    width: 8,
    height: 8,
    // Down to four baskets and two deliveries required — the first level
    // where nudging sideways actually matters. Extra moves cover it.
    layout: ['........', '........', '........', '........', '........', '........', '........', 'B..BB..B'],
    fruits: [...FIVE_FRUITS],
    moves: 32,
    objective: { type: 'deliver', count: 2 },
    bigFruitTotal: 3,
    starScores: [900, 1800],
  },
  {
    id: 68,
    width: 8,
    height: 8,
    // Fewer baskets than 67 (three, not four) but the same target and a
    // larger move budget to compensate — a deliberate breather, not a step
    // up, right after the tier's first real test.
    layout: ['........', '........', '........', '........', '........', '........', '........', '..B.B.B.'],
    fruits: [...FIVE_FRUITS],
    moves: 36,
    objective: { type: 'deliver', count: 2 },
    bigFruitTotal: 3,
    starScores: [900, 1800],
  },
  {
    id: 69,
    width: 8,
    height: 8,
    // Three deliveries, only two baskets — most of the tier's sideways
    // nudging lives here. Move budget scales up accordingly.
    layout: ['........', '........', '........', '........', '........', '........', '........', '..B...B.'],
    fruits: [...FIVE_FRUITS],
    moves: 46,
    objective: { type: 'deliver', count: 3 },
    bigFruitTotal: 4,
    starScores: [1200, 2400],
  },
  {
    id: 70,
    width: 8,
    height: 8,
    // Tier send-off: same shape as 69 but an even larger cushion, so the
    // deliver tier ends on an easy note before the rain tier begins.
    layout: ['........', '........', '........', '........', '........', '........', '........', '..B...B.'],
    fruits: [...SIX_FRUITS],
    moves: 50,
    objective: { type: 'deliver', count: 3 },
    bigFruitTotal: 4,
    starScores: [1200, 2400],
  },

  // -------------------------------------------------------------------------
  // 71-75 — rain. Open (or lightly-shaped) boards with only four fruit
  // kinds, so a same-fruit blob of 6+ cells — the rain trigger
  // (specials.ts classifySpawn) — comes up often instead of being a rare
  // fluke. This is the same "few kinds, open board" shape flagged as a board-
  // generation danger zone (level 26 historically, ~1.5% seed failure rate),
  // so every level here was verified across 200+ seeds (see report).
  // -------------------------------------------------------------------------

  {
    id: 71,
    width: 8,
    height: 8,
    fruits: [...FOUR_FRUITS],
    moves: 34,
    objective: { type: 'score', target: 3000 },
    starScores: [4200, 6800],
  },
  {
    id: 72,
    width: 8,
    height: 8,
    // Four kinds means whichever fruit is picked is already abundant; rain's
    // row+column sweep makes a high count comfortably reachable.
    fruits: [...FOUR_FRUITS],
    moves: 30,
    objective: { type: 'collect', fruit: 'grape', count: 40 },
    starScores: [1800, 3000],
  },
  {
    id: 73,
    width: 7,
    height: 7,
    // Smaller board than the rest of the tier: fewer open cells means fewer
    // chances at a 6-cell blob per cascade. Verified across 250 seeds (see
    // report) with a clean 100% generation success rate before shipping.
    layout: ['X.....X', '.......', '.......', '.......', '.......', '.......', 'X.....X'],
    fruits: [...FOUR_FRUITS],
    moves: 30,
    objective: { type: 'score', target: 2200 },
    starScores: [3000, 4800],
  },
  {
    id: 74,
    width: 8,
    height: 8,
    // Fifth fruit kind added back in as a breather — rain still happens, just
    // less constantly, and the objective (a smaller collect count) doesn't
    // depend on it.
    fruits: [...FIVE_FRUITS],
    moves: 28,
    objective: { type: 'collect', fruit: 'watermelon', count: 32 },
    starScores: [1500, 2400],
  },
  {
    id: 75,
    width: 8,
    height: 8,
    // Tier capstone: back to four kinds and the tier's highest score target,
    // but with the tier's most generous move budget too.
    fruits: [...FOUR_FRUITS],
    moves: 36,
    objective: { type: 'score', target: 3400 },
    starScores: [4600, 7400],
  },

  // -------------------------------------------------------------------------
  // 76-80 — mixture. Flowers, baskets/big fruit, and open rain-friendly
  // shapes combine, but nothing here is harder than the high-30s/low-40s.
  // Level 80 is the finale and the easiest level of the whole set.
  // -------------------------------------------------------------------------

  {
    id: 76,
    width: 8,
    height: 8,
    // Jelly + flowers: the familiar jelly ring, with flowers in its open
    // corners just like level 62, so a bloom or two lands along the way.
    layout: FLOWER_JELLY_RING_8,
    fruits: [...FIVE_FRUITS],
    moves: 34,
    objective: { type: 'jelly' },
    starScores: [2000, 3200],
  },
  {
    id: 77,
    width: 8,
    height: 8,
    // Baskets + flowers: a deliver level with the same generous four-basket
    // shape as level 67, plus flowers scattered in the open middle rows.
    layout: ['...F.F..', '........', 'F......F', '........', '........', 'F......F', '........', 'B..BB..B'],
    fruits: [...FOUR_FRUITS],
    moves: 32,
    objective: { type: 'deliver', count: 2 },
    bigFruitTotal: 3,
    starScores: [900, 1800],
  },
  {
    id: 78,
    width: 8,
    height: 8,
    // Rain-friendly open board (four kinds) + flowers: a score objective
    // that a big rain clear meaningfully helps, sweetened with blooms.
    layout: ['..F...F.', '........', '........', 'F......F', '........', '........', '..F...F.', '........'],
    fruits: [...FOUR_FRUITS],
    moves: 32,
    objective: { type: 'score', target: 2600 },
    starScores: [3600, 5600],
  },
  {
    id: 79,
    width: 8,
    height: 8,
    // All three at once: a jelly objective on a board that's still open
    // enough for the occasional rain clear, with flowers along the border.
    layout: [
      'F......F',
      '.JJJJJJ.',
      '.J....J.',
      '.J....J.',
      '.J....J.',
      '.J....J.',
      '.JJJJJJ.',
      'F......F',
    ],
    fruits: [...FOUR_FRUITS],
    moves: 32,
    objective: { type: 'jelly' },
    starScores: [2100, 3400],
  },
  {
    id: 80,
    width: 6,
    height: 6,
    // The finale: smallest board in the set, an easy familiar objective, a
    // pair of flowers for one last free bloom, and a move budget she will
    // never come close to using. A short, pretty victory lap, not a final
    // gauntlet — deliberately the easiest level of the whole 80.
    layout: ['......', '.F....', '......', '......', '....F.', '......'],
    fruits: [...FOUR_FRUITS],
    moves: 22,
    objective: { type: 'collect', fruit: 'grape', count: 14 },
    starScores: [500, 900],
  },
];

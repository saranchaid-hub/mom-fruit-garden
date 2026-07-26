import type { FruitKind, Objective } from './types';
import type { LevelDef } from './levels/schema';
import { createRng, randomInt, shuffle, type Rng } from './rng';

// ---------------------------------------------------------------------------
// สวนประจำวัน (Daily Garden — ADR-0005, BLUEPRINT-M9 M9.4). One fresh board
// per calendar day, generated purely from the date string: no server, no
// Date/locale APIs, no Math.random anywhere in this file. The same dateKey
// must always produce the byte-identical LevelDef, on any device, forever —
// mom's phone and mom's laptop must show the same board for the same day.
//
// Randomised "within kind bounds" per ADR-0003 / the grilling decision
// "สุ่มในกรอบใจดี": board 6x6..8x8, 4..6 fruit kinds, one of the four
// objective types, and the M9 mechanics (flower cells, baskets + big fruit,
// rain-friendly shapes) each get their own independent roll so that, across
// many days, all of them keep turning up — see the branches of
// `dailyLevelFor` below for exactly how each maps to a mechanic.
// ---------------------------------------------------------------------------

const ALL_FRUIT_KINDS: FruitKind[] = ['mango', 'orange', 'grape', 'watermelon', 'mangosteen', 'banana'];

const MIN_BOARD_SIDE = 6;
const BOARD_SIDE_SPREAD = 3; // randomInt gives 0..2, so width/height land on 6, 7, or 8

const MIN_FRUITS = 4;
const FRUIT_SPREAD = 3; // 4, 5, or 6

const MIN_MOVES = 10;

// The M9.4 "+40% on top" of the ordinary ADR-0003 move-limit kindness padding
// (BLUEPRINT-M9 M9.4 / ADR-0005): a hand-authored level got seed-tested by a
// human before shipping; a daily board never does, so it needs an extra
// cushion the hand-authored 1..80 levels don't. The per-objective baseMoves
// formulas below are already modelled on the hand-tuned 61-80 levels (i.e.
// they already include the *ordinary* kindness padding) — this constant is
// the *additional* multiplier on top of that.
const DAILY_MOVES_BONUS = 1.4;

/**
 * Deterministic string hash (djb2 variant, folded to an unsigned 32-bit
 * int). This is the *only* source of randomness for a given day — no Date,
 * no locale, no Math.random — so the same dateKey always yields the same
 * seed, on any device, forever.
 */
function hashDateKey(dateKey: string): number {
  let hash = 5381;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (Math.imul(hash, 33) + dateKey.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

type Grid = string[][];

function makeGrid(width: number, height: number): Grid {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => '.'));
}

function gridToLayout(grid: Grid): string[] {
  return grid.map((row) => row.join(''));
}

/**
 * Paints a hollow-rectangle ring of jelly cells: the perimeter of the inner
 * rectangle [1, width-2] x [1, height-2]. This generalises the hand-authored
 * jelly ring shape (levels-61-80.ts FLOWER_JELLY_RING_8) to any width/height
 * >= 6, where the inner rectangle is always at least 4x4 — so the ring is
 * never empty and a jelly objective always has at least one 'J' cell to
 * clear, by construction.
 */
function paintJellyRing(grid: Grid, width: number, height: number): void {
  const left = 1;
  const right = width - 2;
  const top = 1;
  const bottom = height - 2;
  for (let y = top; y <= bottom; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = left; x <= right; x++) {
      if (y === top || y === bottom || x === left || x === right) {
        row[x] = 'J';
      }
    }
  }
}

function countChar(grid: Grid, ch: string): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell === ch) count++;
    }
  }
  return count;
}

/**
 * Scatters a handful of flower cells onto still-plain ('.') cells. The
 * flower mechanic (ช่องดอกไม้) is pure upside — a bloom only ever grants a
 * bonus move — so it can be layered onto any objective/layout without
 * touching balance, unlike jelly or baskets which the objective must be
 * built around.
 */
function scatterFlowers(grid: Grid, width: number, height: number, rng: Rng): void {
  const candidates: [number, number][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y]?.[x] === '.') candidates.push([x, y]);
    }
  }
  if (candidates.length === 0) return;
  const flowerCount = Math.min(candidates.length, 2 + randomInt(rng, 8));
  const shuffled = shuffle(rng, candidates);
  for (let i = 0; i < flowerCount; i++) {
    const spot = shuffled[i];
    if (!spot) continue;
    const [x, y] = spot;
    const row = grid[y];
    if (row) row[x] = 'F';
  }
}

/**
 * Places baskets on 1..width distinct columns of the bottom row (the only
 * row validateLevel accepts a basket on, since a big fruit only ever falls
 * straight down). Always places at least one, so a deliver objective always
 * has somewhere for its big fruit to land, by construction.
 */
function paintBaskets(grid: Grid, width: number, height: number, rng: Rng): number {
  const bottom = height - 1;
  const columns = shuffle(rng, Array.from({ length: width }, (_, x) => x));
  const basketCount = 1 + randomInt(rng, width);
  const row = grid[bottom];
  for (let i = 0; i < basketCount; i++) {
    const x = columns[i];
    if (x === undefined || !row) continue;
    row[x] = 'B';
  }
  return basketCount;
}

/**
 * Star thresholds aren't surfaced anywhere for the Daily Garden today — per
 * CONTEXT.md ("ดอกไม้ประจำวัน"/"สวนประจำวัน": no stars, nothing to unlock —
 * the M9.4b calendar screen tracks blooms, not stars) — but `LevelConfig`
 * requires the field structurally since it's shared with real levels, and
 * `validateLevel` requires it strictly ascending. `proxyScore` is a rough,
 * not hand-tuned, stand-in for "score this board's objective roughly earns".
 * The "+gap" construction (add a positive amount, rather than round two
 * independent fractions of proxyScore and hope they differ) is what
 * guarantees strictly-ascending thresholds for every possible proxyScore,
 * including very small ones, without a special case.
 */
function starThresholds(proxyScore: number): [number, number] {
  const twoStar = Math.max(100, Math.round(proxyScore * 0.6));
  const threeStar = twoStar + Math.max(150, Math.round(proxyScore * 0.3));
  return [twoStar, threeStar];
}

export function dailyLevelFor(dateKey: string): LevelDef {
  const seed = hashDateKey(dateKey);
  const rng = createRng(seed);

  const width = MIN_BOARD_SIDE + randomInt(rng, BOARD_SIDE_SPREAD);
  const height = MIN_BOARD_SIDE + randomInt(rng, BOARD_SIDE_SPREAD);

  let fruitCount = MIN_FRUITS + randomInt(rng, FRUIT_SPREAD);
  // The one historically dangerous combination (BLUEPRINT-M9 M9.1c soak
  // notes; levels-61-80.ts 71-75 comments): the fewest fruit kinds on the
  // largest, fully open board — createSession's generation retry loop makes
  // an eventual failure astronomically unlikely, but every hand-authored
  // level in that danger zone was seed-verified by a human before shipping
  // (200-250 seeds each) and nothing here can be eyeballed board-by-board
  // across ~1100+ days, so the generator steers away from the combination
  // entirely rather than leaning on the retry budget.
  if (fruitCount === MIN_FRUITS && width * height >= 56) {
    fruitCount = MIN_FRUITS + 1;
  }
  const fruits = shuffle(rng, ALL_FRUIT_KINDS).slice(0, fruitCount);

  const addFlowers = rng() < 0.6;
  const objectiveRoll = randomInt(rng, 4);

  const grid = makeGrid(width, height);
  let objective: Objective;
  let bigFruitTotal: number | undefined;
  let baseMoves: number;
  let proxyScore: number;

  if (objectiveRoll === 0) {
    // collect
    const fruit = fruits[randomInt(rng, fruits.length)] as FruitKind;
    const count = Math.round(width * height * (0.35 + rng() * 0.25));
    objective = { type: 'collect', fruit, count };
    baseMoves = count * 1.2;
    proxyScore = count * 70;
    if (addFlowers) scatterFlowers(grid, width, height, rng);
  } else if (objectiveRoll === 1) {
    // jelly — baskets/deliver aren't the only mechanic that needs its own
    // layout built around it; the ring is painted before flowers are
    // scattered so flowers only ever land on cells the ring didn't claim
    // (a layout cell can carry exactly one status character — see board.ts).
    paintJellyRing(grid, width, height);
    if (addFlowers) scatterFlowers(grid, width, height, rng);
    const jellyCount = countChar(grid, 'J');
    objective = { type: 'jelly' };
    baseMoves = jellyCount * 1.7;
    proxyScore = jellyCount * 130;
  } else if (objectiveRoll === 2) {
    // score
    const target = Math.round(width * height * (18 + rng() * 32));
    objective = { type: 'score', target };
    baseMoves = target / 82;
    proxyScore = target * 1.3;
    if (addFlowers) scatterFlowers(grid, width, height, rng);
  } else {
    // deliver — baskets and big fruit (ADR-0006). Fewer baskets means more
    // sideways nudging, so the basket count feeds back into the move budget
    // the same way it does for the hand-authored 65-70 tier.
    const basketCount = paintBaskets(grid, width, height, rng);
    if (addFlowers) scatterFlowers(grid, width, height, rng);
    const count = 1 + randomInt(rng, 3);
    // Always at least `count`, per validateLevel — the extra 0..2 is slack
    // so a big fruit lost to a reshuffle-unfriendly corner isn't fatal.
    bigFruitTotal = count + randomInt(rng, 3);
    objective = { type: 'deliver', count };
    baseMoves = 18 + count * 9 - (basketCount - 1) * 1.2;
    proxyScore = count * 500;
  }

  const moves = Math.max(MIN_MOVES, Math.ceil(baseMoves * DAILY_MOVES_BONUS));

  return {
    // Reserved id for every Daily Garden board — never a real level, since
    // those are numbered 1..80. This is deliberate: it lets the existing
    // single-slot `failStreak` in save.ts grant Mercy Moves to a repeatedly-
    // failed daily board the exact same way it already does for a real
    // level, with no change to that mechanism at all.
    id: 0,
    width,
    height,
    layout: gridToLayout(grid),
    fruits,
    moves,
    objective,
    starScores: starThresholds(proxyScore),
    bigFruitTotal,
  };
}

import type { LevelConfig } from '../types';

export interface LevelDef extends LevelConfig {
  id: number;
}

function countJellyInLayout(layout: string[]): number {
  return layout.reduce((sum, row) => sum + (row.match(/J/g)?.length ?? 0), 0);
}

/** Returns a list of human-readable problems; an empty list means the level is valid. */
export function validateLevel(level: LevelDef): string[] {
  const errors: string[] = [];
  const tag = `level ${level.id}`;

  if (level.width < 1 || level.width > 8) {
    errors.push(`${tag}: width ${level.width} must be between 1 and 8`);
  }
  if (level.height < 1 || level.height > 8) {
    errors.push(`${tag}: height ${level.height} must be between 1 and 8`);
  }
  if (level.layout) {
    if (level.layout.length !== level.height) {
      errors.push(`${tag}: layout has ${level.layout.length} rows, expected ${level.height}`);
    }
    for (const [i, row] of level.layout.entries()) {
      if (row.length !== level.width) {
        errors.push(`${tag}: layout row ${i} has length ${row.length}, expected ${level.width}`);
      }
      if (/[^.XJFB]/.test(row)) {
        errors.push(`${tag}: layout row ${i} has an invalid character (only '.', 'X', 'J', 'F', 'B' allowed)`);
      }
      // A basket only makes sense on the bottom row: big fruit only falls
      // straight down, so a basket anywhere else could never be reached.
      if (row.includes('B') && i !== level.layout.length - 1) {
        errors.push(`${tag}: layout row ${i} has a basket 'B' outside the bottom row`);
      }
    }
  }
  if (level.fruits.length < 4 || level.fruits.length > 6) {
    errors.push(`${tag}: fruits count ${level.fruits.length} must be between 4 and 6`);
  }
  if (new Set(level.fruits).size !== level.fruits.length) {
    errors.push(`${tag}: fruits list has duplicates`);
  }
  if (level.moves <= 0) {
    errors.push(`${tag}: moves must be positive`);
  }
  if (level.starScores[0] >= level.starScores[1]) {
    errors.push(`${tag}: starScores must be strictly increasing`);
  }
  if (level.objective.type === 'jelly') {
    const jellyCount = level.layout ? countJellyInLayout(level.layout) : 0;
    if (jellyCount === 0) {
      errors.push(`${tag}: jelly objective but layout has no 'J' cells`);
    }
  }
  if (level.objective.type === 'collect' && !level.fruits.includes(level.objective.fruit)) {
    errors.push(`${tag}: collect objective targets a fruit not in this level's fruit list`);
  }
  if (level.objective.type === 'deliver') {
    const hasBasket = level.layout?.some((row) => row.includes('B')) ?? false;
    if (!hasBasket) {
      errors.push(`${tag}: deliver objective but layout has no 'B' (basket) cells`);
    }
    if ((level.bigFruitTotal ?? 0) < level.objective.count) {
      errors.push(
        `${tag}: deliver objective needs ${level.objective.count} but bigFruitTotal is only ${level.bigFruitTotal ?? 0}`,
      );
    }
  }

  return errors;
}

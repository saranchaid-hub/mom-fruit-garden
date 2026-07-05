import { LEVELS_01_12 } from './levels-01-12';
import { LEVELS_13_30 } from './levels-13-30';
import { LEVELS_31_48 } from './levels-31-48';
import { LEVELS_49_60 } from './levels-49-60';
import type { LevelDef } from './schema';

export type { LevelDef } from './schema';
export { validateLevel } from './schema';

export const ALL_LEVELS: LevelDef[] = [...LEVELS_01_12, ...LEVELS_13_30, ...LEVELS_31_48, ...LEVELS_49_60];

export const LEVEL_COUNT = ALL_LEVELS.length;

export function getLevel(id: number): LevelDef {
  const level = ALL_LEVELS.find((l) => l.id === id);
  if (!level) {
    throw new Error(`No level with id ${id}`);
  }
  return level;
}

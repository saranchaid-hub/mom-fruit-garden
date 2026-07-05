import { LEVELS_01_12 } from './levels-01-12';
import type { LevelDef } from './schema';

export type { LevelDef } from './schema';
export { validateLevel } from './schema';

export const ALL_LEVELS: LevelDef[] = [...LEVELS_01_12];

export const LEVEL_COUNT = ALL_LEVELS.length;

export function getLevel(id: number): LevelDef {
  const level = ALL_LEVELS.find((l) => l.id === id);
  if (!level) {
    throw new Error(`No level with id ${id}`);
  }
  return level;
}

import type { Unit } from './Unit';

/** Flat registry of all live units, used for local separation steering during movement. */
export const allUnits: Unit[] = [];

export function registerUnit(unit: Unit): void {
  allUnits.push(unit);
}

export function unregisterUnit(unit: Unit): void {
  const index = allUnits.indexOf(unit);
  if (index !== -1) allUnits.splice(index, 1);
}

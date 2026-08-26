/**
 * Rock-paper-scissors combat classes (per user request): every combat unit is Light, Heavy, or Air, in a
 * three-way cycle — Light beats Air, Air beats Heavy, Heavy beats Light — so no single unit type dominates
 * everything and army composition matters. Light = the game's existing "basic infantry" and "special
 * support" tiers (fast, cheap, fragile) plus fast/swarm-flavored Convergence outputs. Heavy = the "heavy
 * infantry/tank" tier plus armored/titan-flavored Convergence outputs (slow, costly, tanky). Air = the
 * handful of units explicitly flavored as flying (only Pyroliths has any, per the existing roster).
 * Harvesters and buildings have no class and are unaffected (multiplier always 1).
 */
export type UnitClass = 'light' | 'heavy' | 'air';

export const UNIT_CLASS_BY_ID: Record<string, UnitClass> = {
  // Cyber-Nexus
  'nexus-striker': 'light',
  'nanite-weaver': 'light',
  'tesla-archon': 'heavy',
  'hive-construct': 'light',
  'storm-grid-colossus': 'heavy',
  // Pyroliths
  'magma-imp': 'light',
  'ignis-priest': 'light',
  'acid-drake': 'air',
  'molten-behemoth': 'heavy',
  'obsidian-chimera': 'air',
  // Solari Archons
  'solar-zealot': 'light',
  'astral-frost-scribe': 'light',
  'void-arbiter': 'heavy',
  'ascended-zealot': 'light',
  'eclipse-titan': 'heavy',
  // Frost-Forged
  'steam-scrapper': 'light',
  'cryo-thrower-mech': 'heavy',
  'boiler-juggernaut': 'heavy',
  'forge-walker': 'heavy',
  'thermal-shock-engine': 'heavy',
  // Verdant Wilds
  'thorn-skitterling': 'light',
  'spore-mystic': 'light',
  'bramble-colossus': 'heavy',
  'bramblehive-matron': 'light',
  'verdant-devourer': 'heavy',
  // Umbral Voidkin
  'shade-stalker': 'light',
  'nullweaver': 'light',
  'voidmaw-horror': 'heavy',
  'shade-legion': 'light',
  'oblivion-warden': 'heavy',
};

/** What each class beats — a 3-cycle, so "loses to" is just this map read in reverse. */
const BEATS: Record<UnitClass, UnitClass> = { light: 'air', air: 'heavy', heavy: 'light' };

const ADVANTAGE_MULTIPLIER = 1.4;
const DISADVANTAGE_MULTIPLIER = 0.75;

/** Damage multiplier for `attackerId` hitting `defenderId`, from the class triangle. 1 (neutral) whenever either side has no class — buildings, harvesters, and anything not in the table. */
export function classDamageMultiplier(attackerId: string, defenderId: string): number {
  const attacker = UNIT_CLASS_BY_ID[attackerId];
  const defender = UNIT_CLASS_BY_ID[defenderId];
  if (!attacker || !defender || attacker === defender) return 1;
  if (BEATS[attacker] === defender) return ADVANTAGE_MULTIPLIER;
  if (BEATS[defender] === attacker) return DISADVANTAGE_MULTIPLIER;
  return 1;
}

const CLASS_LABEL: Record<UnitClass, string> = { light: '🪽 Light', heavy: '🛡️ Heavy', air: '☁️ Air' };

export function classLabel(unitId: string): string | null {
  const cls = UNIT_CLASS_BY_ID[unitId];
  return cls ? CLASS_LABEL[cls] : null;
}

/** "Strong vs: ... · Weak vs: ..." text for the unit's class, per user request — null for classless units (harvesters). */
export function classMatchupText(unitId: string): { strongVs: string; weakVs: string } | null {
  const cls = UNIT_CLASS_BY_ID[unitId];
  if (!cls) return null;
  const beats = BEATS[cls];
  const loses = (Object.keys(BEATS) as UnitClass[]).find((c) => BEATS[c] === cls)!;
  return { strongVs: CLASS_LABEL[beats], weakVs: CLASS_LABEL[loses] };
}

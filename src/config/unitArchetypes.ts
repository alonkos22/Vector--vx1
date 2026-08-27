/**
 * Generic archetype label per unit (per user request: every unit should show both its own flavor
 * name — "Solar Zealot" — and a familiar role name — "Warrior" — together). Curated by hand rather
 * than derived from UnitConfig.role text: role strings are free-form flavor ("air unit - toxic acid",
 * "heavy tank - steam/heat", "scout / economy") and don't share a consistent keyword across factions,
 * so a keyword match (e.g. ".includes('heavy')") silently misclassifies units whose flavor text
 * doesn't mention their structural tier. Each faction's roster follows the same fixed structure —
 * confirmed against config/units.ts and config/convergence.ts — which is what this map actually encodes:
 *   - Harvester: the faction's economy unit (harvesterUnitId in config/factions.ts), absent for
 *     Solari Archons' passive economy.
 *   - Warrior: the basic-infantry unit (role === 'basic infantry' for all six factions).
 *   - Support: the faction's special/support-tier unit.
 *   - Tank: the faction's heavy-tier unit.
 *   - Champion: the Convergence output fused from 3x the basic-infantry unit.
 *   - Titan: the Convergence output fused from 1x Tank + 1x Support (the faction's strongest unit).
 */
export const UNIT_ARCHETYPE_BY_ID: Record<string, string> = {
  // Cyber-Nexus
  'flux-harvester': 'Harvester',
  'nexus-striker': 'Warrior',
  'nanite-weaver': 'Support',
  'tesla-archon': 'Tank',
  'hive-construct': 'Champion',
  'storm-grid-colossus': 'Titan',

  // Ember faction
  'cinder-grub': 'Harvester',
  'magma-imp': 'Warrior',
  'ignis-priest': 'Support',
  'acid-drake': 'Tank',
  'molten-behemoth': 'Champion',
  'obsidian-chimera': 'Titan',

  // Solari Archons (no harvester — passive economy)
  'solar-zealot': 'Warrior',
  'astral-frost-scribe': 'Support',
  'void-arbiter': 'Tank',
  'ascended-zealot': 'Champion',
  'eclipse-titan': 'Titan',

  // Steam faction
  rustling: 'Harvester',
  'steam-scrapper': 'Warrior',
  'cryo-thrower-mech': 'Support',
  'boiler-juggernaut': 'Tank',
  'forge-walker': 'Champion',
  'thermal-shock-engine': 'Titan',

  // Verdant Wilds
  'root-tender': 'Harvester',
  'thorn-skitterling': 'Warrior',
  'spore-mystic': 'Support',
  'bramble-colossus': 'Tank',
  'bramblehive-matron': 'Champion',
  'verdant-devourer': 'Titan',

  // Umbral Voidkin
  'husk-drifter': 'Harvester',
  'shade-stalker': 'Warrior',
  nullweaver: 'Support',
  'voidmaw-horror': 'Tank',
  'shade-legion': 'Champion',
  'oblivion-warden': 'Titan',
};

export function archetypeLabel(unitId: string): string {
  return UNIT_ARCHETYPE_BY_ID[unitId] ?? 'Unit';
}

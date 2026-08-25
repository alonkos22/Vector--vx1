/**
 * Convergence (fusion) recipes, per design doc §3. Data-driven and
 * faction-agnostic: "N units of type X [+ M of type Y] [near a structure]
 * -> despawn inputs, spawn output after channel time T". Adding another
 * faction's recipes is purely a new array here, never a change to
 * ConvergenceManager.
 *
 * The 2-input recipe per faction follows the exact fusion pairing named in
 * the master prompt (e.g. "Tesla Archon + Nanite Weaver = Storm-Grid
 * Colossus"); the 3x-basic-unit recipe keeps a new homebrew output name
 * since only one fusion per faction was specified there.
 */
export interface ConvergenceRecipe {
  id: string;
  name: string;
  /** The faction's flavor name for its fusion mechanic (e.g. "Synchronization"). */
  mechanicName: string;
  /** unitTypeId -> exact count consumed. The selection must match this exactly (no extra units of other types). */
  inputs: Record<string, number>;
  outputUnitId: string;
  /** Extra Core Energy cost beyond the consumed units (30-50 per §3). */
  extraCoreEnergyCost: number;
  /** Channel time in seconds, per the §6 VFX spec for the faction's mechanic. */
  channelTimeSec: number;
  /** If set, fusion may only start within `requiresBuildingRadius` of a completed building of this id. Null = anywhere (Cyber-Nexus's Synchronization needs no structure). */
  requiresBuildingId: string | null;
  requiresBuildingRadius: number;
}

export const CONVERGENCE_BY_FACTION: Record<string, ConvergenceRecipe[]> = {
  'cyber-nexus': [
    {
      id: 'hive-construct',
      name: 'Hive Construct',
      mechanicName: 'Synchronization',
      inputs: { 'nexus-striker': 3 },
      outputUnitId: 'hive-construct',
      extraCoreEnergyCost: 30,
      channelTimeSec: 1.5,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
    {
      id: 'storm-grid-colossus',
      name: 'Storm-Grid Colossus',
      mechanicName: 'Synchronization',
      inputs: { 'tesla-archon': 1, 'nanite-weaver': 1 },
      outputUnitId: 'storm-grid-colossus',
      extraCoreEnergyCost: 40,
      channelTimeSec: 1.5,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
  ],

  pyroliths: [
    {
      id: 'molten-behemoth',
      name: 'Molten Behemoth',
      mechanicName: 'Conglomeration',
      inputs: { 'magma-imp': 3 },
      outputUnitId: 'molten-behemoth',
      extraCoreEnergyCost: 35,
      channelTimeSec: 4,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
    {
      id: 'obsidian-chimera',
      name: 'Obsidian Chimera',
      mechanicName: 'Conglomeration',
      inputs: { 'magma-imp': 1, 'acid-drake': 1 },
      outputUnitId: 'obsidian-chimera',
      extraCoreEnergyCost: 50,
      channelTimeSec: 4,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
  ],

  'solari-archons': [
    {
      id: 'ascended-zealot',
      name: 'Ascended Zealot',
      mechanicName: 'Ascension',
      inputs: { 'solar-zealot': 3 },
      outputUnitId: 'ascended-zealot',
      extraCoreEnergyCost: 30,
      channelTimeSec: 2,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
    {
      id: 'eclipse-titan',
      name: 'Eclipse Titan',
      mechanicName: 'Ascension',
      inputs: { 'solar-zealot': 1, 'void-arbiter': 1 },
      outputUnitId: 'eclipse-titan',
      extraCoreEnergyCost: 45,
      channelTimeSec: 2,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
  ],

  'frost-forged': [
    {
      id: 'forge-walker',
      name: 'Forge Walker',
      mechanicName: 'Forge-Weld',
      inputs: { 'steam-scrapper': 3 },
      outputUnitId: 'forge-walker',
      extraCoreEnergyCost: 35,
      channelTimeSec: 5,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
    {
      id: 'thermal-shock-engine',
      name: 'Thermal Shock Engine',
      mechanicName: 'Forge-Weld',
      inputs: { 'cryo-thrower-mech': 1, 'steam-scrapper': 1 },
      outputUnitId: 'thermal-shock-engine',
      extraCoreEnergyCost: 50,
      channelTimeSec: 5,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
  ],
};

/** Kept for the player-facing UI which always plays Cyber-Nexus. */
export const CYBER_NEXUS_CONVERGENCE: ConvergenceRecipe[] = CONVERGENCE_BY_FACTION['cyber-nexus'];

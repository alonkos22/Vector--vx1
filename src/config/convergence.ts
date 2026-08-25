/**
 * Convergence (fusion) recipes, per design doc §3. Data-driven and
 * faction-agnostic: "N units of type X [+ M of type Y] [near a structure]
 * -> despawn inputs, spawn output after channel time T". Adding another
 * faction's recipes is purely a new array here, never a change to
 * ConvergenceManager.
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
      inputs: { 'sentinel-drone': 3 },
      outputUnitId: 'hive-construct',
      extraCoreEnergyCost: 30,
      channelTimeSec: 1.5,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
    {
      id: 'vanguard-executioner',
      name: 'Vanguard Executioner',
      mechanicName: 'Synchronization',
      inputs: { 'phase-trooper': 2, 'arc-walker': 1 },
      outputUnitId: 'vanguard-executioner',
      extraCoreEnergyCost: 40,
      channelTimeSec: 1.5,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
  ],

  pyroliths: [
    {
      id: 'basalt-brute-converged',
      name: 'Basalt Brute (Conglomerated)',
      mechanicName: 'Conglomeration',
      inputs: { 'ember-whelp': 3 },
      outputUnitId: 'basalt-brute-converged',
      extraCoreEnergyCost: 35,
      channelTimeSec: 4,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
    {
      id: 'magma-colossus',
      name: 'Magma Colossus',
      mechanicName: 'Conglomeration',
      inputs: { 'basalt-brute': 2, 'cinder-hurler': 1 },
      outputUnitId: 'magma-colossus',
      extraCoreEnergyCost: 50,
      channelTimeSec: 4,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
  ],

  'solari-archons': [
    {
      id: 'solar-acolyte-converged',
      name: 'Solar Acolyte (Ascended)',
      mechanicName: 'Ascension',
      inputs: { 'lumen-wisp': 3 },
      outputUnitId: 'solar-acolyte-converged',
      extraCoreEnergyCost: 30,
      channelTimeSec: 2,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
    {
      id: 'radiant-ascendant',
      name: 'Radiant Ascendant',
      mechanicName: 'Ascension',
      inputs: { 'solar-acolyte': 2, 'halo-seraph': 1 },
      outputUnitId: 'radiant-ascendant',
      extraCoreEnergyCost: 45,
      channelTimeSec: 2,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
  ],

  'frost-forged': [
    {
      id: 'piston-crusher-converged',
      name: 'Piston Crusher (Forge-Welded)',
      mechanicName: 'Forge-Weld',
      inputs: { 'frost-trooper': 3 },
      outputUnitId: 'piston-crusher-converged',
      extraCoreEnergyCost: 35,
      channelTimeSec: 5,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
    {
      id: 'juggernaut-rig',
      name: 'Juggernaut Rig',
      mechanicName: 'Forge-Weld',
      inputs: { 'piston-crusher': 2, 'ice-howitzer': 1 },
      outputUnitId: 'juggernaut-rig',
      extraCoreEnergyCost: 50,
      channelTimeSec: 5,
      requiresBuildingId: null,
      requiresBuildingRadius: 0,
    },
  ],
};

/** Kept for the player-facing UI which always plays Cyber-Nexus. */
export const CYBER_NEXUS_CONVERGENCE: ConvergenceRecipe[] = CONVERGENCE_BY_FACTION['cyber-nexus'];

/**
 * Convergence (fusion) recipes, per design doc §3. Data-driven and
 * faction-agnostic: "N units of type X [+ M of type Y] [near a structure]
 * -> despawn inputs, spawn output after channel time T". Adding another
 * faction's recipes (Milestone 9) is purely a new array here, never a
 * change to ConvergenceManager.
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

export const CYBER_NEXUS_CONVERGENCE: ConvergenceRecipe[] = [
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
];

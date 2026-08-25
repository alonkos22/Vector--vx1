/** Per-faction unit definitions. Costs/times are canon from the design doc §2. */
export interface UnitConfig {
  id: string;
  name: string;
  role: string;
  costCoreEnergy: number;
  costFactionResource: number;
  supply: number;
  buildTimeSec: number;
  /** Engine-only movement stat, not part of the design doc's cost tables. */
  moveSpeed: number;
  color: number;
}

export const CYBER_NEXUS_UNITS: Record<string, UnitConfig> = {
  'flux-harvester': {
    id: 'flux-harvester',
    name: 'Flux Harvester',
    role: 'economy',
    costCoreEnergy: 30,
    costFactionResource: 0,
    supply: 1,
    buildTimeSec: 9,
    moveSpeed: 6,
    color: 0x4fc3ff,
  },
};

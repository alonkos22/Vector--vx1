/** Per-faction building definitions. Costs/times are canon from the design doc §2. */
export interface BuildingConfig {
  id: string;
  name: string;
  costCoreEnergy: number;
  costFactionResource: number;
  buildTimeSec: number;
  /** Placeholder footprint radius for the placeholder mesh/placement radius. */
  footprint: number;
  color: number;
  /** Unit ids this building can produce. Empty = no production (e.g. a defense tower). */
  produces: string[];
  /** Which resource harvesters deposit here, if any. */
  dropoffResource: 'coreEnergy' | 'factionResource' | null;
}

export const CYBER_NEXUS_BUILDINGS: Record<string, BuildingConfig> = {
  'core-spire': {
    id: 'core-spire',
    name: 'Core Spire',
    costCoreEnergy: 0,
    costFactionResource: 400,
    buildTimeSec: 90,
    footprint: 3,
    color: 0x9fd8ff,
    produces: ['flux-harvester'],
    dropoffResource: 'coreEnergy',
  },
  'flux-siphon': {
    id: 'flux-siphon',
    name: 'Flux Siphon',
    costCoreEnergy: 50,
    costFactionResource: 0,
    buildTimeSec: 25,
    footprint: 2,
    color: 0x2ea3ff,
    produces: [],
    dropoffResource: 'factionResource',
  },
};

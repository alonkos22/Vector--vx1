/** Per-faction building definitions. Costs/times are canon from the design doc §2. */
export interface BuildingConfig {
  id: string;
  name: string;
  costCoreEnergy: number;
  costFactionResource: number;
  buildTimeSec: number;
  /** Placeholder footprint radius for the placeholder mesh/placement radius. */
  footprint: number;
  /** Engine-only vision/HP stats, not part of the design doc's cost tables. */
  visionRadius: number;
  maxHp: number;
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
    visionRadius: 16,
    maxHp: 800,
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
    visionRadius: 10,
    maxHp: 200,
    color: 0x2ea3ff,
    produces: [],
    dropoffResource: 'factionResource',
  },
  'fabrication-node': {
    id: 'fabrication-node',
    name: 'Fabrication Node',
    costCoreEnergy: 100,
    costFactionResource: 100,
    buildTimeSec: 35,
    footprint: 2.5,
    visionRadius: 10,
    maxHp: 250,
    color: 0x3fb0ff,
    produces: ['sentinel-drone', 'phase-trooper'],
    dropoffResource: null,
  },
  'drone-foundry': {
    id: 'drone-foundry',
    name: 'Drone Foundry',
    costCoreEnergy: 150,
    costFactionResource: 150,
    buildTimeSec: 45,
    footprint: 3,
    visionRadius: 10,
    maxHp: 300,
    color: 0x1f7fcc,
    produces: ['arc-walker'],
    dropoffResource: null,
  },
};

/**
 * Per-faction building definitions. Costs/times are canon from the design
 * doc §2. Every faction defines exactly the same four canonical roles
 * (main structure, resource dropoff, basic production, heavy production) -
 * the only building types the engine actually implements (no defense
 * towers/research/teleport systems exist yet, so those doc buildings are
 * intentionally omitted for every faction, not just Cyber-Nexus). Engine
 * code (PlayerBase, AIController) addresses buildings by role, never by a
 * faction-specific id, so it never needs to know which faction it's
 * running.
 */
export type BuildingRole = 'main' | 'resourceDropoff' | 'basicProduction' | 'heavyProduction';
export const BUILDING_ROLES: BuildingRole[] = ['main', 'resourceDropoff', 'basicProduction', 'heavyProduction'];

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
  /** Unit ids this building can produce. Empty = no production. */
  produces: string[];
  /** Which resource harvesters deposit here, if any. */
  dropoffResource: 'coreEnergy' | 'factionResource' | null;
}

export const BUILDINGS_BY_FACTION: Record<string, Record<BuildingRole, BuildingConfig>> = {
  'cyber-nexus': {
    main: {
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
    resourceDropoff: {
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
    basicProduction: {
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
    heavyProduction: {
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
  },

  pyroliths: {
    main: {
      id: 'magma-heart',
      name: 'Magma Heart',
      costCoreEnergy: 0,
      costFactionResource: 400,
      buildTimeSec: 90,
      footprint: 3.2,
      visionRadius: 15,
      maxHp: 900,
      color: 0xff6a1a,
      produces: ['cinder-grub'],
      dropoffResource: 'coreEnergy',
    },
    resourceDropoff: {
      id: 'ember-well',
      name: 'Ember Well',
      costCoreEnergy: 50,
      costFactionResource: 0,
      buildTimeSec: 25,
      footprint: 2,
      visionRadius: 9,
      maxHp: 220,
      color: 0xff8c42,
      produces: [],
      dropoffResource: 'factionResource',
    },
    basicProduction: {
      id: 'ash-spire',
      name: 'Ash Spire',
      costCoreEnergy: 100,
      costFactionResource: 100,
      buildTimeSec: 35,
      footprint: 2.5,
      visionRadius: 9,
      maxHp: 280,
      color: 0xcc4a10,
      produces: ['ember-whelp', 'cinder-hurler'],
      dropoffResource: null,
    },
    heavyProduction: {
      id: 'cinder-forge',
      name: 'Cinder Forge',
      costCoreEnergy: 150,
      costFactionResource: 150,
      buildTimeSec: 45,
      footprint: 3.2,
      visionRadius: 9,
      maxHp: 340,
      color: 0x8a2f10,
      produces: ['basalt-brute'],
      dropoffResource: null,
    },
  },

  'solari-archons': {
    main: {
      id: 'sun-spire',
      name: 'Sun Spire',
      costCoreEnergy: 0,
      costFactionResource: 400,
      buildTimeSec: 90,
      footprint: 3,
      visionRadius: 18,
      maxHp: 650,
      color: 0xf4c542,
      produces: [],
      dropoffResource: 'coreEnergy',
    },
    resourceDropoff: {
      id: 'radiant-well',
      name: 'Radiant Well',
      costCoreEnergy: 50,
      costFactionResource: 0,
      buildTimeSec: 25,
      footprint: 2,
      visionRadius: 12,
      maxHp: 160,
      color: 0xffe08a,
      produces: [],
      dropoffResource: null,
    },
    basicProduction: {
      id: 'halo-sanctum',
      name: 'Halo Sanctum',
      costCoreEnergy: 100,
      costFactionResource: 100,
      buildTimeSec: 35,
      footprint: 2.5,
      visionRadius: 12,
      maxHp: 200,
      color: 0xd9a834,
      produces: ['lumen-wisp', 'solar-acolyte'],
      dropoffResource: null,
    },
    heavyProduction: {
      id: 'prism-conclave',
      name: 'Prism Conclave',
      costCoreEnergy: 150,
      costFactionResource: 150,
      buildTimeSec: 45,
      footprint: 3,
      visionRadius: 12,
      maxHp: 230,
      color: 0x9b5de5,
      produces: ['halo-seraph'],
      dropoffResource: null,
    },
  },

  'frost-forged': {
    main: {
      id: 'foundry-bastion',
      name: 'Foundry Bastion',
      costCoreEnergy: 0,
      costFactionResource: 400,
      buildTimeSec: 90,
      footprint: 3.2,
      visionRadius: 15,
      maxHp: 950,
      color: 0xb5651d,
      produces: ['rustling'],
      dropoffResource: 'coreEnergy',
    },
    resourceDropoff: {
      id: 'coal-depot',
      name: 'Coal Depot',
      costCoreEnergy: 50,
      costFactionResource: 0,
      buildTimeSec: 25,
      footprint: 2,
      visionRadius: 9,
      maxHp: 240,
      color: 0x8a4a17,
      produces: [],
      dropoffResource: 'factionResource',
    },
    basicProduction: {
      id: 'assembly-yard',
      name: 'Assembly Yard',
      costCoreEnergy: 100,
      costFactionResource: 100,
      buildTimeSec: 35,
      footprint: 2.5,
      visionRadius: 9,
      maxHp: 320,
      color: 0x6f7a80,
      produces: ['frost-trooper', 'piston-crusher'],
      dropoffResource: null,
    },
    heavyProduction: {
      id: 'heavy-works',
      name: 'Heavy Works',
      costCoreEnergy: 150,
      costFactionResource: 150,
      buildTimeSec: 45,
      footprint: 3.2,
      visionRadius: 9,
      maxHp: 380,
      color: 0x4fd8e0,
      produces: ['ice-howitzer'],
      dropoffResource: null,
    },
  },
};

/** Flat id-keyed view for Cyber-Nexus, kept for the player-facing UI which always plays Cyber-Nexus. */
export const CYBER_NEXUS_BUILDINGS: Record<string, BuildingConfig> = Object.fromEntries(
  BUILDING_ROLES.map((role) => [BUILDINGS_BY_FACTION['cyber-nexus'][role].id, BUILDINGS_BY_FACTION['cyber-nexus'][role]]),
);

/** Building id -> canonical role, for picking a building's procedural visual archetype (buildingVisuals.ts) from any faction's config. */
export const BUILDING_ROLE_BY_ID: Record<string, BuildingRole> = Object.fromEntries(
  Object.values(BUILDINGS_BY_FACTION).flatMap((byRole) => BUILDING_ROLES.map((role) => [byRole[role].id, role] as const)),
);

/**
 * Per-faction unit definitions. Cost/supply/build-time are canon from the
 * design doc §2. `combat` stats (hp/damage/range/timing) aren't specified
 * in the doc — only costs are — so these are homebrew placeholder balance
 * numbers, tunable later without touching any engine code.
 *
 * Each faction implements 3 producible combat units + 1 harvester (Solari
 * Archons has none) + 2 Convergence-fusion outputs, matching the same
 * scope Cyber-Nexus already uses (the doc lists more per faction — support/
 * air/late-game units and a research/defense/teleport building tier - all
 * omitted consistently for every faction since those systems don't exist
 * yet, not just for Cyber-Nexus).
 */
export interface CombatStats {
  hp: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  windupTime: number;
  healthBarYOffset: number;
  /** Simultaneous targets per attack (Hive Construct's spread-fire). Omit/1 = single target. */
  multiTargetCount?: number;
}

export interface UnitConfig {
  id: string;
  name: string;
  role: string;
  costCoreEnergy: number;
  costFactionResource: number;
  supply: number;
  buildTimeSec: number;
  /** Engine-only movement/selection/vision stats, not part of the design doc's cost tables. */
  moveSpeed: number;
  selectionRadius: number;
  visionRadius: number;
  color: number;
  /** Present only on combat-capable units (economy units like the harvester omit this). */
  combat?: CombatStats;
}

export const UNITS_BY_FACTION: Record<string, Record<string, UnitConfig>> = {
  'cyber-nexus': {
    'flux-harvester': {
      id: 'flux-harvester',
      name: 'Flux Harvester',
      role: 'economy',
      costCoreEnergy: 30,
      costFactionResource: 0,
      supply: 1,
      buildTimeSec: 9,
      moveSpeed: 6,
      selectionRadius: 0.9,
      visionRadius: 9,
      color: 0x4fc3ff,
    },
    'sentinel-drone': {
      id: 'sentinel-drone',
      name: 'Sentinel Drone',
      role: 'basic / ranged',
      costCoreEnergy: 25,
      costFactionResource: 10,
      supply: 1,
      buildTimeSec: 8,
      moveSpeed: 7,
      selectionRadius: 0.8,
      visionRadius: 10,
      color: 0x4fc3ff,
      combat: { hp: 40, damage: 4, attackRange: 8, attackCooldown: 0.6, windupTime: 0.1, healthBarYOffset: 2.0 },
    },
    'phase-trooper': {
      id: 'phase-trooper',
      name: 'Phase Trooper',
      role: 'melee infantry',
      costCoreEnergy: 50,
      costFactionResource: 25,
      supply: 2,
      buildTimeSec: 14,
      moveSpeed: 6,
      selectionRadius: 0.7,
      visionRadius: 8,
      color: 0x6fd2ff,
      combat: { hp: 80, damage: 12, attackRange: 1.8, attackCooldown: 1.0, windupTime: 0.15, healthBarYOffset: 2.1 },
    },
    'arc-walker': {
      id: 'arc-walker',
      name: 'Arc Walker',
      role: 'mid-tier',
      costCoreEnergy: 100,
      costFactionResource: 50,
      supply: 3,
      buildTimeSec: 22,
      moveSpeed: 5,
      selectionRadius: 1.1,
      visionRadius: 12,
      color: 0x2ea3ff,
      combat: { hp: 140, damage: 20, attackRange: 10, attackCooldown: 1.3, windupTime: 0.2, healthBarYOffset: 2.7 },
    },
    // --- Convergence (Synchronization) outputs ---
    'hive-construct': {
      id: 'hive-construct',
      name: 'Hive Construct',
      role: 'converged / swarm',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 4,
      buildTimeSec: 0,
      moveSpeed: 6,
      selectionRadius: 1.3,
      visionRadius: 12,
      color: 0x4fc3ff,
      combat: { hp: 150, damage: 6, attackRange: 10, attackCooldown: 0.6, windupTime: 0.1, healthBarYOffset: 2.6, multiTargetCount: 4 },
    },
    'vanguard-executioner': {
      id: 'vanguard-executioner',
      name: 'Vanguard Executioner',
      role: 'converged / heavy melee',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 6,
      buildTimeSec: 0,
      moveSpeed: 5.5,
      selectionRadius: 1.2,
      visionRadius: 10,
      color: 0x2ea3ff,
      combat: { hp: 260, damage: 30, attackRange: 3.6, attackCooldown: 1.0, windupTime: 0.15, healthBarYOffset: 2.8 },
    },
  },

  pyroliths: {
    'cinder-grub': {
      id: 'cinder-grub',
      name: 'Cinder Grub',
      role: 'economy',
      costCoreEnergy: 25,
      costFactionResource: 0,
      supply: 1,
      buildTimeSec: 8,
      moveSpeed: 5,
      selectionRadius: 0.9,
      visionRadius: 8,
      color: 0xff8c42,
    },
    'ember-whelp': {
      id: 'ember-whelp',
      name: 'Ember Whelp',
      role: 'basic',
      costCoreEnergy: 20,
      costFactionResource: 15,
      supply: 1,
      buildTimeSec: 7,
      moveSpeed: 7,
      selectionRadius: 0.7,
      visionRadius: 8,
      color: 0xff6a1a,
      combat: { hp: 35, damage: 8, attackRange: 1.4, attackCooldown: 0.8, windupTime: 0.35, healthBarYOffset: 1.8 },
    },
    'cinder-hurler': {
      id: 'cinder-hurler',
      name: 'Cinder Hurler',
      role: 'ranged',
      costCoreEnergy: 90,
      costFactionResource: 60,
      supply: 3,
      buildTimeSec: 20,
      moveSpeed: 4,
      selectionRadius: 1.0,
      visionRadius: 10,
      color: 0xcc4a10,
      combat: { hp: 90, damage: 16, attackRange: 9, attackCooldown: 1.4, windupTime: 0.5, healthBarYOffset: 2.3 },
    },
    'basalt-brute': {
      id: 'basalt-brute',
      name: 'Basalt Brute',
      role: 'heavy melee',
      costCoreEnergy: 60,
      costFactionResource: 40,
      supply: 2,
      buildTimeSec: 16,
      moveSpeed: 4,
      selectionRadius: 1.0,
      visionRadius: 8,
      color: 0x8a2f10,
      combat: { hp: 150, damage: 18, attackRange: 1.8, attackCooldown: 1.1, windupTime: 0.45, healthBarYOffset: 2.4 },
    },
    // --- Convergence (Conglomeration) outputs ---
    'basalt-brute-converged': {
      id: 'basalt-brute-converged',
      name: 'Basalt Brute (Conglomerated)',
      role: 'converged / heavy melee',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 3,
      buildTimeSec: 0,
      moveSpeed: 4,
      selectionRadius: 1.15,
      visionRadius: 8,
      color: 0x8a2f10,
      combat: { hp: 210, damage: 18, attackRange: 1.8, attackCooldown: 1.1, windupTime: 0.45, healthBarYOffset: 2.6 },
    },
    'magma-colossus': {
      id: 'magma-colossus',
      name: 'Magma Colossus',
      role: 'converged / colossus',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 7,
      buildTimeSec: 0,
      moveSpeed: 2.5,
      selectionRadius: 1.6,
      visionRadius: 9,
      color: 0xff4500,
      combat: { hp: 420, damage: 28, attackRange: 2.2, attackCooldown: 1.2, windupTime: 0.5, healthBarYOffset: 3.4 },
    },
  },

  'solari-archons': {
    'lumen-wisp': {
      id: 'lumen-wisp',
      name: 'Lumen Wisp',
      role: 'basic / scout',
      costCoreEnergy: 15,
      costFactionResource: 20,
      supply: 1,
      buildTimeSec: 7,
      moveSpeed: 8,
      selectionRadius: 0.6,
      visionRadius: 14,
      color: 0xffe08a,
      combat: { hp: 22, damage: 3, attackRange: 6, attackCooldown: 0.5, windupTime: 0.2, healthBarYOffset: 1.6 },
    },
    'solar-acolyte': {
      id: 'solar-acolyte',
      name: 'Solar Acolyte',
      role: 'ranged',
      costCoreEnergy: 45,
      costFactionResource: 55,
      supply: 2,
      buildTimeSec: 15,
      moveSpeed: 5,
      selectionRadius: 0.75,
      visionRadius: 11,
      color: 0xf4c542,
      combat: { hp: 45, damage: 16, attackRange: 9, attackCooldown: 1.0, windupTime: 0.4, healthBarYOffset: 2.1 },
    },
    'halo-seraph': {
      id: 'halo-seraph',
      name: 'Halo Seraph',
      role: 'support / air',
      costCoreEnergy: 90,
      costFactionResource: 110,
      supply: 3,
      buildTimeSec: 23,
      moveSpeed: 6,
      selectionRadius: 0.9,
      visionRadius: 13,
      color: 0x9b5de5,
      combat: { hp: 70, damage: 10, attackRange: 8, attackCooldown: 0.9, windupTime: 0.3, healthBarYOffset: 2.4 },
    },
    // --- Convergence (Ascension) outputs ---
    'solar-acolyte-converged': {
      id: 'solar-acolyte-converged',
      name: 'Solar Acolyte (Ascended)',
      role: 'converged / ranged',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 3,
      buildTimeSec: 0,
      moveSpeed: 5,
      selectionRadius: 0.85,
      visionRadius: 12,
      color: 0xf4c542,
      combat: { hp: 55, damage: 16, attackRange: 11.25, attackCooldown: 1.0, windupTime: 0.4, healthBarYOffset: 2.3 },
    },
    'radiant-ascendant': {
      id: 'radiant-ascendant',
      name: 'Radiant Ascendant',
      role: 'converged / support-ranged',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 6,
      buildTimeSec: 0,
      moveSpeed: 5,
      selectionRadius: 1.1,
      visionRadius: 13,
      color: 0xffd700,
      combat: { hp: 160, damage: 24, attackRange: 10, attackCooldown: 0.9, windupTime: 0.35, healthBarYOffset: 2.9 },
    },
  },

  'frost-forged': {
    rustling: {
      id: 'rustling',
      name: 'Rustling',
      role: 'scout / economy',
      costCoreEnergy: 20,
      costFactionResource: 15,
      supply: 1,
      buildTimeSec: 7,
      moveSpeed: 5,
      selectionRadius: 0.7,
      visionRadius: 12,
      color: 0x4fd8e0,
    },
    'frost-trooper': {
      id: 'frost-trooper',
      name: 'Frost Trooper',
      role: 'basic infantry',
      costCoreEnergy: 45,
      costFactionResource: 35,
      supply: 2,
      buildTimeSec: 15,
      moveSpeed: 4.5,
      selectionRadius: 0.7,
      visionRadius: 8,
      color: 0xb5651d,
      combat: { hp: 75, damage: 11, attackRange: 7, attackCooldown: 0.9, windupTime: 0.3, healthBarYOffset: 2.0 },
    },
    'piston-crusher': {
      id: 'piston-crusher',
      name: 'Piston Crusher',
      role: 'heavy melee',
      costCoreEnergy: 85,
      costFactionResource: 65,
      supply: 3,
      buildTimeSec: 21,
      moveSpeed: 3.5,
      selectionRadius: 1.05,
      visionRadius: 8,
      color: 0x8a4a17,
      combat: { hp: 170, damage: 22, attackRange: 1.9, attackCooldown: 1.2, windupTime: 0.55, healthBarYOffset: 2.6 },
    },
    'ice-howitzer': {
      id: 'ice-howitzer',
      name: 'Ice Howitzer',
      role: 'siege',
      costCoreEnergy: 130,
      costFactionResource: 90,
      supply: 4,
      buildTimeSec: 27,
      moveSpeed: 2.5,
      selectionRadius: 1.2,
      visionRadius: 10,
      color: 0x6f7a80,
      combat: { hp: 130, damage: 34, attackRange: 12, attackCooldown: 1.8, windupTime: 0.7, healthBarYOffset: 2.6 },
    },
    // --- Convergence (Forge-Weld) outputs ---
    'piston-crusher-converged': {
      id: 'piston-crusher-converged',
      name: 'Piston Crusher (Forge-Welded)',
      role: 'converged / heavy melee',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 4,
      buildTimeSec: 0,
      moveSpeed: 3.5,
      selectionRadius: 1.15,
      visionRadius: 8,
      // Dual-arm: fires twice as often instead of a separate multi-hit mechanic.
      color: 0x8a4a17,
      combat: { hp: 220, damage: 22, attackRange: 1.9, attackCooldown: 0.6, windupTime: 0.55, healthBarYOffset: 2.8 },
    },
    'juggernaut-rig': {
      id: 'juggernaut-rig',
      name: 'Juggernaut Rig',
      role: 'converged / siege',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 8,
      buildTimeSec: 0,
      moveSpeed: 3,
      selectionRadius: 1.5,
      visionRadius: 10,
      color: 0x4fd8e0,
      combat: { hp: 380, damage: 36, attackRange: 9, attackCooldown: 1.6, windupTime: 0.6, healthBarYOffset: 3.3 },
    },
  },
};

/** Flat id-keyed view for Cyber-Nexus, kept for the player-facing UI which always plays Cyber-Nexus. */
export const CYBER_NEXUS_UNITS: Record<string, UnitConfig> = UNITS_BY_FACTION['cyber-nexus'];

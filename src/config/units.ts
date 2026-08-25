/**
 * Per-faction unit definitions. Cost/supply/build-time are canon from the
 * design doc §2. `combat` stats (hp/damage/range/timing) aren't specified
 * in the doc — only costs are — so these are homebrew placeholder balance
 * numbers, tunable later without touching any engine code.
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
  /** Engine-only movement/selection stats, not part of the design doc's cost tables. */
  moveSpeed: number;
  selectionRadius: number;
  color: number;
  /** Present only on combat-capable units (economy units like the harvester omit this). */
  combat?: CombatStats;
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
    selectionRadius: 0.9,
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
    color: 0x2ea3ff,
    combat: { hp: 140, damage: 20, attackRange: 10, attackCooldown: 1.3, windupTime: 0.2, healthBarYOffset: 2.7 },
  },
  // --- Convergence (fusion) outputs — not directly producible, only reached via §3 recipes. ---
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
    color: 0x2ea3ff,
    combat: { hp: 260, damage: 30, attackRange: 3.6, attackCooldown: 1.0, windupTime: 0.15, healthBarYOffset: 2.8 },
  },
};

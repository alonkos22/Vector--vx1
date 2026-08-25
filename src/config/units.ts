/**
 * Per-faction unit definitions, matching the detailed unit catalog (Nexus
 * Striker, Tesla Archon, Nanite Weaver, ...). `combat` stats (hp/damage/
 * range/timing) aren't specified by that catalog either - only flavor and
 * abilities are - so these stay the same homebrew placeholder balance
 * numbers used since Milestone 9, just re-labelled onto the new names by
 * cost tier (cheapest -> Basic, middle -> Special/Support, priciest ->
 * Heavy), with a couple of stat tweaks where an ability text maps directly
 * onto an existing engine mechanic (Chain Lightning/Kinetic Crush/Boiler
 * Blast -> multiTargetCount; melee/spray abilities -> adjusted range).
 *
 * Each faction implements 3 producible combat units + 1 harvester (Solari
 * Archons has none) + 2 Convergence-fusion outputs. Fusion output names
 * follow the master-prompt's per-faction fusion pairing where one was
 * given (e.g. Tesla Archon + Nanite Weaver = Storm-Grid Colossus); the
 * other (3x-basic-unit) fusion per faction keeps a new homebrew name since
 * the source material only specified one fusion per faction.
 */
export interface CombatStats {
  hp: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  windupTime: number;
  healthBarYOffset: number;
  /** Simultaneous targets per attack (Chain Lightning, Kinetic Crush, Boiler Blast, ...). Omit/1 = single target. */
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
    'nexus-striker': {
      id: 'nexus-striker',
      name: 'Nexus Striker',
      role: 'basic infantry',
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
    'nanite-weaver': {
      id: 'nanite-weaver',
      name: 'Nanite Weaver',
      role: 'special support - acid',
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
    'tesla-archon': {
      id: 'tesla-archon',
      name: 'Tesla Archon',
      role: 'heavy infantry - electric',
      costCoreEnergy: 100,
      costFactionResource: 50,
      supply: 3,
      buildTimeSec: 22,
      moveSpeed: 5,
      selectionRadius: 1.1,
      visionRadius: 12,
      color: 0x2ea3ff,
      // Chain Lightning: bounces between multiple targets, so a lower per-hit damage across multiTargetCount rather than one big single-target hit.
      combat: { hp: 140, damage: 10, attackRange: 10, attackCooldown: 1.3, windupTime: 0.2, healthBarYOffset: 2.7, multiTargetCount: 3 },
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
    'storm-grid-colossus': {
      id: 'storm-grid-colossus',
      name: 'Storm-Grid Colossus',
      role: 'converged / siege mech',
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
    'magma-imp': {
      id: 'magma-imp',
      name: 'Magma Imp',
      role: 'basic infantry',
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
    'ignis-priest': {
      id: 'ignis-priest',
      name: 'Ignis Priest',
      role: 'special shaman - fire magic',
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
    'acid-drake': {
      id: 'acid-drake',
      name: 'Acid Drake',
      role: 'air unit - toxic acid',
      costCoreEnergy: 90,
      costFactionResource: 60,
      supply: 3,
      buildTimeSec: 20,
      moveSpeed: 6,
      selectionRadius: 1.0,
      visionRadius: 10,
      color: 0xcc4a10,
      combat: { hp: 90, damage: 16, attackRange: 9, attackCooldown: 1.4, windupTime: 0.5, healthBarYOffset: 2.3 },
    },
    // --- Convergence (Conglomeration) outputs ---
    'molten-behemoth': {
      id: 'molten-behemoth',
      name: 'Molten Behemoth',
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
    'obsidian-chimera': {
      id: 'obsidian-chimera',
      name: 'Obsidian Chimera',
      role: 'converged / flying chimera',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 7,
      buildTimeSec: 0,
      moveSpeed: 5,
      selectionRadius: 1.6,
      visionRadius: 9,
      color: 0xff4500,
      // Three heads breathing fire, lava and acid simultaneously -> hits multiple targets at range.
      combat: { hp: 420, damage: 28, attackRange: 6, attackCooldown: 1.2, windupTime: 0.5, healthBarYOffset: 3.4, multiTargetCount: 2 },
    },
  },

  'solari-archons': {
    'solar-zealot': {
      id: 'solar-zealot',
      name: 'Solar Zealot',
      role: 'basic infantry',
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
    'astral-frost-scribe': {
      id: 'astral-frost-scribe',
      name: 'Astral Frost Scribe',
      role: 'support unit - cosmic ice',
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
    'void-arbiter': {
      id: 'void-arbiter',
      name: 'Void Arbiter',
      role: 'heavy infantry - telekinesis',
      costCoreEnergy: 90,
      costFactionResource: 110,
      supply: 3,
      buildTimeSec: 23,
      moveSpeed: 6,
      selectionRadius: 0.9,
      visionRadius: 13,
      color: 0x9b5de5,
      // Kinetic Crush: re-tuned up from the old "support/air" numbers now that this is the faction's heavy-tier unit.
      combat: { hp: 90, damage: 22, attackRange: 8, attackCooldown: 0.9, windupTime: 0.3, healthBarYOffset: 2.4 },
    },
    // --- Convergence (Ascension) outputs ---
    'ascended-zealot': {
      id: 'ascended-zealot',
      name: 'Ascended Zealot',
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
    'eclipse-titan': {
      id: 'eclipse-titan',
      name: 'Eclipse Titan',
      role: 'converged / divine titan',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 6,
      buildTimeSec: 0,
      moveSpeed: 5,
      selectionRadius: 1.1,
      visionRadius: 13,
      color: 0xffd700,
      // Spawns a miniature black hole -> pulls in and hits several targets at once.
      combat: { hp: 160, damage: 24, attackRange: 10, attackCooldown: 0.9, windupTime: 0.35, healthBarYOffset: 2.9, multiTargetCount: 3 },
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
    'steam-scrapper': {
      id: 'steam-scrapper',
      name: 'Steam Scrapper',
      role: 'basic infantry',
      costCoreEnergy: 45,
      costFactionResource: 35,
      supply: 2,
      buildTimeSec: 15,
      moveSpeed: 4.5,
      selectionRadius: 0.7,
      visionRadius: 8,
      color: 0xb5651d,
      // Drill Charge: a ramming melee attack, not the old rifle's long range.
      combat: { hp: 75, damage: 11, attackRange: 1.6, attackCooldown: 0.9, windupTime: 0.3, healthBarYOffset: 2.0 },
    },
    'cryo-thrower-mech': {
      id: 'cryo-thrower-mech',
      name: 'Cryo-Thrower Mech',
      role: 'heavy unit - frost',
      costCoreEnergy: 85,
      costFactionResource: 65,
      supply: 3,
      buildTimeSec: 21,
      moveSpeed: 3.5,
      selectionRadius: 1.05,
      visionRadius: 8,
      color: 0x8a4a17,
      // Sub-Zero Jet: a sprayed freeze stream, so a longer reach than the old melee claw.
      combat: { hp: 170, damage: 22, attackRange: 5, attackCooldown: 1.2, windupTime: 0.55, healthBarYOffset: 2.6 },
    },
    'boiler-juggernaut': {
      id: 'boiler-juggernaut',
      name: 'Boiler Juggernaut',
      role: 'heavy tank - steam/heat',
      costCoreEnergy: 130,
      costFactionResource: 90,
      supply: 4,
      buildTimeSec: 27,
      moveSpeed: 2.5,
      selectionRadius: 1.2,
      visionRadius: 10,
      color: 0x6f7a80,
      // Boiler Blast: a 360-degree steam wave hitting everyone nearby.
      combat: { hp: 130, damage: 34, attackRange: 12, attackCooldown: 1.8, windupTime: 0.7, healthBarYOffset: 2.6, multiTargetCount: 3 },
    },
    // --- Convergence (Forge-Weld) outputs ---
    'forge-walker': {
      id: 'forge-walker',
      name: 'Forge Walker',
      role: 'converged / heavy melee',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 4,
      buildTimeSec: 0,
      moveSpeed: 3.5,
      selectionRadius: 1.15,
      visionRadius: 8,
      color: 0x8a4a17,
      combat: { hp: 220, damage: 22, attackRange: 1.9, attackCooldown: 0.6, windupTime: 0.55, healthBarYOffset: 2.8 },
    },
    'thermal-shock-engine': {
      id: 'thermal-shock-engine',
      name: 'Thermal Shock Engine',
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

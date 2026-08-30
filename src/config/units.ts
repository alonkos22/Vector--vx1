import { tierCostMultiplier, tierBuildTimeMultiplier, tierPowerMultiplier } from './factionTiers';

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
 *
 * Verdant Wilds and Umbral Voidkin (added after the original 4) are
 * homebrew factions built to the same shape and follow a balance pass
 * across every faction: each unit's rough "value" was scored as
 * (hp + effectiveDps * 5) / totalCost and tuned so every tier (basic ~1.0-2.1,
 * special ~1.25-2.4, heavy ~1.5-1.9, fusion ~1.5-2.6) lands in the same band
 * as its counterparts on the other factions, rather than eyeballing numbers
 * per-faction in isolation.
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

/** Written at Cyber-Nexus's tier (tier 4, the unscaled baseline) — see config/factionTiers.ts for how every other faction's copy gets scaled from these numbers. */
const RAW_UNITS_BY_FACTION: Record<string, Record<string, UnitConfig>> = {
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
      // Balance pass: was the strongest special-tier unit in the game for its cost; trimmed hp/damage.
      combat: { hp: 110, damage: 16, attackRange: 1.8, attackCooldown: 1.1, windupTime: 0.45, healthBarYOffset: 2.4 },
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
      // Balance pass: was the weakest heavy-tier unit in the game for its cost (breathes acid on a wide arc, so hits 2 targets now).
      combat: { hp: 110, damage: 19, attackRange: 9, attackCooldown: 1.4, windupTime: 0.5, healthBarYOffset: 2.3, multiTargetCount: 2 },
    },
    // Imported from an uploaded lava-hound scan (per user request: a 4-legged unit with "vehicle speed" —
    // moveSpeed 9.5 is the fastest unit in the game, faster than the previous record-holders (Solar
    // Zealot/Shade Stalker at 8). Every faction's own heavy already checks it via the light/heavy/air
    // triangle (heavy beats light) — no separate "limiter" unit needed for that.
    'ashfang-hound': {
      id: 'ashfang-hound',
      name: 'Ashfang Hound',
      role: 'light skirmisher - fire beast',
      costCoreEnergy: 22,
      costFactionResource: 12,
      supply: 1,
      buildTimeSec: 7,
      moveSpeed: 9.5,
      selectionRadius: 0.6,
      visionRadius: 9,
      color: 0xff6a1a,
      combat: { hp: 30, damage: 5, attackRange: 1.3, attackCooldown: 0.6, windupTime: 0.2, healthBarYOffset: 1.3 },
    },
    // Imported from an uploaded kaiju scan — Pyroliths' first producible ground-heavy (Acid Drake, their
    // only other heavy-tier producible unit, is air-classed).
    'cinder-kaiju': {
      id: 'cinder-kaiju',
      name: 'Cinder Kaiju',
      role: 'heavy beast - eldritch flame',
      costCoreEnergy: 110,
      costFactionResource: 70,
      supply: 3,
      buildTimeSec: 23,
      moveSpeed: 4,
      selectionRadius: 1.3,
      visionRadius: 9,
      color: 0xff4500,
      combat: { hp: 190, damage: 20, attackRange: 2.0, attackCooldown: 1.0, windupTime: 0.35, healthBarYOffset: 2.9 },
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
      // Balance pass: was noticeably stronger per investment than every other faction's 2-input fusion; trimmed hp/damage.
      combat: { hp: 320, damage: 24, attackRange: 6, attackCooldown: 1.2, windupTime: 0.5, healthBarYOffset: 3.4, multiTargetCount: 2 },
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
      // Balance pass: was the weakest special-tier unit in the game for its cost; raised hp/damage.
      combat: { hp: 60, damage: 18, attackRange: 9, attackCooldown: 1.0, windupTime: 0.4, healthBarYOffset: 2.1 },
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
      // Balance pass: still underweight vs. other heavy units at this cost; raised hp/damage further.
      combat: { hp: 160, damage: 26, attackRange: 8, attackCooldown: 0.9, windupTime: 0.3, healthBarYOffset: 2.4 },
    },
    // Imported from an uploaded monster-sculpt scan — a void-touched aberration the Archons bind to their
    // service, matching their existing cosmic-horror-adjacent lore (Eclipse Titan, Void Arbiter).
    'voidscar-aberration': {
      id: 'voidscar-aberration',
      name: 'Voidscar Aberration',
      role: 'light aberration - void-touched',
      costCoreEnergy: 18,
      costFactionResource: 24,
      supply: 1,
      buildTimeSec: 8,
      moveSpeed: 6,
      selectionRadius: 0.8,
      visionRadius: 10,
      color: 0x9b5de5,
      combat: { hp: 40, damage: 6, attackRange: 1.6, attackCooldown: 0.7, windupTime: 0.25, healthBarYOffset: 1.8 },
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
      // Balance pass: was the weakest 3x-basic fusion output in the game for its investment; raised hp/damage.
      combat: { hp: 100, damage: 28, attackRange: 11.25, attackCooldown: 1.0, windupTime: 0.4, healthBarYOffset: 2.3 },
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
    // Imported from an uploaded dragon scan — Frost-Forged's first air unit (they previously had none, and
    // already have two producible ground-heavies, so this fills their one real gap rather than adding more).
    'war-drake': {
      id: 'war-drake',
      name: 'War Drake',
      role: 'heavy air - fire drake',
      costCoreEnergy: 115,
      costFactionResource: 75,
      supply: 3,
      buildTimeSec: 24,
      moveSpeed: 6,
      selectionRadius: 1.2,
      visionRadius: 11,
      color: 0x8a4a17,
      combat: { hp: 190, damage: 26, attackRange: 8, attackCooldown: 1.3, windupTime: 0.4, healthBarYOffset: 2.8, multiTargetCount: 2 },
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

  'verdant-wilds': {
    'root-tender': {
      id: 'root-tender',
      name: 'Root Tender',
      role: 'economy',
      costCoreEnergy: 22,
      costFactionResource: 0,
      supply: 1,
      buildTimeSec: 7.5,
      moveSpeed: 5.5,
      selectionRadius: 0.85,
      visionRadius: 8,
      color: 0x6b9b4f,
    },
    'thorn-skitterling': {
      id: 'thorn-skitterling',
      name: 'Thorn Skitterling',
      role: 'basic infantry',
      costCoreEnergy: 20,
      costFactionResource: 15,
      supply: 1,
      buildTimeSec: 7,
      moveSpeed: 7.5,
      selectionRadius: 0.65,
      visionRadius: 8,
      color: 0x6b9b4f,
      combat: { hp: 32, damage: 5, attackRange: 1.4, attackCooldown: 0.7, windupTime: 0.25, healthBarYOffset: 1.6 },
    },
    'spore-mystic': {
      id: 'spore-mystic',
      name: 'Spore Mystic',
      role: 'special support - toxic spores',
      costCoreEnergy: 55,
      costFactionResource: 30,
      supply: 2,
      buildTimeSec: 15,
      moveSpeed: 5,
      selectionRadius: 0.75,
      visionRadius: 9,
      color: 0x8fd45f,
      combat: { hp: 60, damage: 14, attackRange: 8, attackCooldown: 1.1, windupTime: 0.4, healthBarYOffset: 2.0 },
    },
    'bramble-colossus': {
      id: 'bramble-colossus',
      name: 'Bramble Colossus',
      role: 'heavy infantry - thorn beast',
      costCoreEnergy: 110,
      costFactionResource: 70,
      supply: 3,
      buildTimeSec: 24,
      moveSpeed: 3.5,
      selectionRadius: 1.15,
      visionRadius: 8,
      color: 0x355e28,
      // Whirling thorn swipe hits two targets at once.
      combat: { hp: 190, damage: 14, attackRange: 1.9, attackCooldown: 0.9, windupTime: 0.4, healthBarYOffset: 2.8, multiTargetCount: 2 },
    },
    // Imported from an uploaded minotaur-berserker scan — a beast-warrior diversifying Verdant Wilds'
    // light-tier roster.
    'thornhide-minotaur': {
      id: 'thornhide-minotaur',
      name: 'Thornhide Minotaur',
      role: 'light brute - beast warrior',
      costCoreEnergy: 24,
      costFactionResource: 18,
      supply: 1,
      buildTimeSec: 8,
      moveSpeed: 6.5,
      selectionRadius: 0.85,
      visionRadius: 8,
      color: 0x6b9b4f,
      combat: { hp: 45, damage: 7, attackRange: 1.6, attackCooldown: 0.8, windupTime: 0.3, healthBarYOffset: 1.9 },
    },
    // --- Convergence (Symbiosis) outputs ---
    'bramblehive-matron': {
      id: 'bramblehive-matron',
      name: 'Bramblehive Matron',
      role: 'converged / swarm queen',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 3,
      buildTimeSec: 0,
      moveSpeed: 4.5,
      selectionRadius: 1.2,
      visionRadius: 9,
      color: 0x6b9b4f,
      combat: { hp: 180, damage: 10, attackRange: 1.9, attackCooldown: 0.9, windupTime: 0.4, healthBarYOffset: 2.5, multiTargetCount: 2 },
    },
    'verdant-devourer': {
      id: 'verdant-devourer',
      name: 'Verdant Devourer',
      role: 'converged / apex predator',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 7,
      buildTimeSec: 0,
      moveSpeed: 3.5,
      selectionRadius: 1.6,
      visionRadius: 9,
      color: 0x2d5a20,
      combat: { hp: 380, damage: 30, attackRange: 5, attackCooldown: 1.1, windupTime: 0.5, healthBarYOffset: 3.2, multiTargetCount: 2 },
    },
  },

  'umbral-voidkin': {
    'husk-drifter': {
      id: 'husk-drifter',
      name: 'Husk Drifter',
      role: 'economy',
      costCoreEnergy: 25,
      costFactionResource: 0,
      supply: 1,
      buildTimeSec: 8,
      moveSpeed: 5.5,
      selectionRadius: 0.85,
      visionRadius: 9,
      color: 0x7a3fb0,
    },
    'shade-stalker': {
      id: 'shade-stalker',
      name: 'Shade Stalker',
      role: 'basic infantry',
      costCoreEnergy: 18,
      costFactionResource: 17,
      supply: 1,
      buildTimeSec: 7,
      moveSpeed: 8,
      selectionRadius: 0.65,
      visionRadius: 9,
      color: 0x7a3fb0,
      combat: { hp: 26, damage: 5, attackRange: 1.3, attackCooldown: 0.7, windupTime: 0.2, healthBarYOffset: 1.5 },
    },
    nullweaver: {
      id: 'nullweaver',
      name: 'Nullweaver',
      role: 'special support - void magic',
      costCoreEnergy: 50,
      costFactionResource: 35,
      supply: 2,
      buildTimeSec: 15,
      moveSpeed: 5,
      selectionRadius: 0.75,
      visionRadius: 10,
      color: 0x9f6fd0,
      combat: { hp: 55, damage: 15, attackRange: 9, attackCooldown: 1.0, windupTime: 0.4, healthBarYOffset: 2.0 },
    },
    'voidmaw-horror': {
      id: 'voidmaw-horror',
      name: 'Voidmaw Horror',
      role: 'heavy infantry - void beast',
      costCoreEnergy: 100,
      costFactionResource: 90,
      supply: 3,
      buildTimeSec: 24,
      moveSpeed: 4,
      selectionRadius: 1.1,
      visionRadius: 9,
      color: 0x3a1a5a,
      combat: { hp: 180, damage: 30, attackRange: 6, attackCooldown: 1.3, windupTime: 0.5, healthBarYOffset: 2.7 },
    },
    // Imported from an uploaded werewolf (lycan) scan — a fast night predator diversifying Umbral Voidkin's
    // light-tier roster.
    nightfang: {
      id: 'nightfang',
      name: 'Nightfang',
      role: 'light predator - shadow beast',
      costCoreEnergy: 20,
      costFactionResource: 16,
      supply: 1,
      buildTimeSec: 7,
      moveSpeed: 8.5,
      selectionRadius: 0.65,
      visionRadius: 9,
      color: 0x7a3fb0,
      combat: { hp: 32, damage: 5, attackRange: 1.3, attackCooldown: 0.6, windupTime: 0.2, healthBarYOffset: 1.5 },
    },
    // --- Convergence (Assimilation) outputs ---
    'shade-legion': {
      id: 'shade-legion',
      name: 'Shade Legion',
      role: 'converged / assassin swarm',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 3,
      buildTimeSec: 0,
      moveSpeed: 6.5,
      selectionRadius: 1.1,
      visionRadius: 10,
      color: 0x7a3fb0,
      combat: { hp: 160, damage: 16, attackRange: 1.4, attackCooldown: 0.7, windupTime: 0.25, healthBarYOffset: 2.4 },
    },
    'oblivion-warden': {
      id: 'oblivion-warden',
      name: 'Oblivion Warden',
      role: 'converged / void titan',
      costCoreEnergy: 0,
      costFactionResource: 0,
      supply: 7,
      buildTimeSec: 0,
      moveSpeed: 4,
      selectionRadius: 1.5,
      visionRadius: 11,
      color: 0x2d0f4a,
      combat: { hp: 380, damage: 50, attackRange: 9, attackCooldown: 1.3, windupTime: 0.5, healthBarYOffset: 3.3 },
    },
  },
};

/** Applies this faction's tier scaling (config/factionTiers.ts) to one unit's stats — hp/damage scale by the combat-power step, cost/build time by their own shallower steps. Economy units (no `combat`) only get the cost/build-time scaling. */
function applyFactionTier(factionId: string, config: UnitConfig): UnitConfig {
  const costMult = tierCostMultiplier(factionId);
  const scaled: UnitConfig = {
    ...config,
    costCoreEnergy: Math.round(config.costCoreEnergy * costMult),
    costFactionResource: Math.round(config.costFactionResource * costMult),
    buildTimeSec: Math.round(config.buildTimeSec * tierBuildTimeMultiplier(factionId) * 10) / 10,
  };
  if (!config.combat) return scaled;
  const powerMult = tierPowerMultiplier(factionId);
  scaled.combat = {
    ...config.combat,
    hp: Math.round(config.combat.hp * powerMult),
    damage: Math.round(config.combat.damage * powerMult * 10) / 10,
  };
  return scaled;
}

export const UNITS_BY_FACTION: Record<string, Record<string, UnitConfig>> = Object.fromEntries(
  Object.entries(RAW_UNITS_BY_FACTION).map(([factionId, units]) => [
    factionId,
    Object.fromEntries(Object.entries(units).map(([unitId, config]) => [unitId, applyFactionTier(factionId, config)])),
  ]),
);

/** Flat id-keyed view for Cyber-Nexus, kept for the player-facing UI which always plays Cyber-Nexus. */
export const CYBER_NEXUS_UNITS: Record<string, UnitConfig> = UNITS_BY_FACTION['cyber-nexus'];

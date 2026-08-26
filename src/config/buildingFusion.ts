import type { BuildingRole } from './buildings';

/**
 * Building Fusion (per user request): a physical merge of the
 * basicProduction + heavyProduction buildings into one upgraded structure
 * that produces everything both parents did. Consumes both buildings (their
 * footprint tiles stay blocked, same as any other destroyed building — the
 * engine has no path-unblock step) and constructs the fused building at the
 * heavyProduction building's spot, using the same construction-progress
 * animation as any other building.
 */
export interface BuildingFusionRecipe {
  id: string;
  name: string;
  color: number;
  materialRoughness: number;
  materialMetalness: number;
  footprint: number;
  maxHp: number;
  visionRadius: number;
  /** Acts as the merge's construction/channel time. */
  buildTimeSec: number;
  extraCoreEnergyCost: number;
  extraFactionResourceCost: number;
  /** Union of both parent buildings' producible unit ids. */
  produces: string[];
}

export const BUILDING_FUSION_BY_FACTION: Record<string, BuildingFusionRecipe> = {
  'cyber-nexus': {
    id: 'nexus-foundry',
    name: 'Nexus Foundry',
    color: 0x7fc4ff,
    materialRoughness: 0.15,
    materialMetalness: 0.9,
    footprint: 3.6,
    maxHp: 500,
    visionRadius: 11,
    buildTimeSec: 40,
    extraCoreEnergyCost: 200,
    extraFactionResourceCost: 200,
    produces: ['nexus-striker', 'nanite-weaver', 'tesla-archon'],
  },
  pyroliths: {
    id: 'magma-bastion',
    name: 'Magma Bastion',
    color: 0xdd5010,
    materialRoughness: 0.9,
    materialMetalness: 0.05,
    footprint: 3.7,
    maxHp: 560,
    visionRadius: 10,
    buildTimeSec: 40,
    extraCoreEnergyCost: 200,
    extraFactionResourceCost: 200,
    produces: ['magma-imp', 'ignis-priest', 'acid-drake'],
  },
  'solari-archons': {
    id: 'radiant-cathedral',
    name: 'Radiant Cathedral',
    color: 0xe8c04a,
    materialRoughness: 0.25,
    materialMetalness: 0.6,
    footprint: 3.6,
    maxHp: 400,
    visionRadius: 13,
    buildTimeSec: 40,
    extraCoreEnergyCost: 200,
    extraFactionResourceCost: 200,
    produces: ['solar-zealot', 'astral-frost-scribe', 'void-arbiter'],
  },
  'frost-forged': {
    id: 'ironclad-forge',
    name: 'Ironclad Forge',
    color: 0x7a6048,
    materialRoughness: 0.55,
    materialMetalness: 0.55,
    footprint: 3.8,
    maxHp: 640,
    visionRadius: 10,
    buildTimeSec: 40,
    extraCoreEnergyCost: 200,
    extraFactionResourceCost: 200,
    produces: ['steam-scrapper', 'cryo-thrower-mech', 'boiler-juggernaut'],
  },
  'verdant-wilds': {
    id: 'thornheart-grove',
    name: 'Thornheart Grove',
    color: 0x33591f,
    materialRoughness: 0.8,
    materialMetalness: 0.05,
    footprint: 3.6,
    maxHp: 520,
    visionRadius: 10,
    buildTimeSec: 40,
    extraCoreEnergyCost: 200,
    extraFactionResourceCost: 200,
    produces: ['thorn-skitterling', 'spore-mystic', 'bramble-colossus'],
  },
  'umbral-voidkin': {
    id: 'void-nexus',
    name: 'Void Nexus',
    color: 0x4a1f70,
    materialRoughness: 0.2,
    materialMetalness: 0.3,
    footprint: 3.6,
    maxHp: 480,
    visionRadius: 11,
    buildTimeSec: 40,
    extraCoreEnergyCost: 200,
    extraFactionResourceCost: 200,
    produces: ['shade-stalker', 'nullweaver', 'voidmaw-horror'],
  },
};

/** Every fusion result renders as the heavyProduction archetype (bigger box + twin towers) — a visibly "upgraded" silhouette. */
export const BUILDING_FUSION_ROLE_BY_ID: Record<string, BuildingRole> = Object.fromEntries(
  Object.values(BUILDING_FUSION_BY_FACTION).map((recipe) => [recipe.id, 'heavyProduction' as const]),
);

import * as THREE from 'three';
import type { ConvergenceRecipe } from '../config/convergence';
import type { CombatUnit } from './units/CombatUnit';
import type { EffectManager } from './CombatVFX';
import type { PlayerEconomy } from './Economy';
import type { Building } from './Building';

interface ActiveFusion {
  recipe: ConvergenceRecipe;
  units: CombatUnit[];
  center: THREE.Vector3;
  remaining: number;
}

/**
 * Generic Convergence (fusion) engine per §3: "N units of type X [+ M of
 * type Y] [near a structure] -> despawn inputs, spawn output after channel
 * time T". Recipes are pure data (config/convergence.ts) - this class never
 * references a faction or unit type by name, so adding another faction's
 * fusions (Milestone 9) is a data change only.
 */
export class ConvergenceManager {
  private readonly scene: THREE.Scene;
  private readonly effects: EffectManager;
  private readonly onFusionComplete: (outputUnitId: string, position: THREE.Vector3) => void;
  private readonly active: ActiveFusion[] = [];

  constructor(scene: THREE.Scene, effects: EffectManager, onFusionComplete: (outputUnitId: string, position: THREE.Vector3) => void) {
    this.scene = scene;
    this.effects = effects;
    this.onFusionComplete = onFusionComplete;
  }

  /** A recipe matches only when the selection's composition is exactly the recipe's inputs — no ambiguity about which units get consumed. */
  findMatchingRecipe(recipes: ConvergenceRecipe[], selectedUnits: CombatUnit[]): ConvergenceRecipe | null {
    if (selectedUnits.length === 0) return null;
    const counts = new Map<string, number>();
    for (const unit of selectedUnits) counts.set(unit.unitTypeId, (counts.get(unit.unitTypeId) ?? 0) + 1);

    for (const recipe of recipes) {
      const requiredTypes = Object.keys(recipe.inputs);
      if (counts.size !== requiredTypes.length) continue;
      const matches = requiredTypes.every((type) => counts.get(type) === recipe.inputs[type]);
      if (matches) return recipe;
    }
    return null;
  }

  canAffordAndPlace(recipe: ConvergenceRecipe, center: THREE.Vector3, economy: PlayerEconomy, nearbyBuildings: Building[]): boolean {
    if (!economy.canAfford(recipe.extraCoreEnergyCost, 0)) return false;
    if (!recipe.requiresBuildingId) return true;
    return nearbyBuildings.some(
      (b) => b.config.id === recipe.requiresBuildingId && b.isComplete && b.position.distanceTo(center) <= recipe.requiresBuildingRadius,
    );
  }

  /** Starts the fusion channel: spends the extra cost, freezes the consumed units, and plays the Synchronization link VFX. */
  beginFusion(recipe: ConvergenceRecipe, units: CombatUnit[], economy: PlayerEconomy, nearbyBuildings: Building[]): boolean {
    const center = new THREE.Vector3();
    for (const unit of units) center.add(unit.position);
    center.divideScalar(units.length);

    if (!this.canAffordAndPlace(recipe, center, economy, nearbyBuildings)) return false;

    economy.spend(recipe.extraCoreEnergyCost, 0);
    for (const unit of units) unit.beginFusing();

    this.effects.spawnSynchronizationLinks(
      units.map((u) => u.position.clone()),
      center,
      recipe.channelTimeSec,
    );

    this.active.push({ recipe, units, center, remaining: recipe.channelTimeSec });
    return true;
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fusion = this.active[i];
      fusion.remaining -= dt;
      if (fusion.remaining > 0) continue;

      for (const unit of fusion.units) {
        this.scene.remove(unit.mesh);
        unit.consumeForFusion();
      }
      this.effects.spawnSynchronizationBurst(fusion.center);
      this.onFusionComplete(fusion.recipe.outputUnitId, fusion.center);
      this.active.splice(i, 1);
    }
  }
}

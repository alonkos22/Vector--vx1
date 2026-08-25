import * as THREE from 'three';
import type { Targetable } from '../Targetable';

const HAZARD_RADIUS = 11;
const DWELL_THRESHOLD_SEC = 15;
const BASE_DAMAGE_PER_SEC = 6;
const GROWTH_PER_SEC_OVER = 0.15;

/**
 * §5 environmental hazard: "An expanding ring of light from the Core
 * itself... Growing damage to units that linger near the Core for 15+
 * continuous seconds." Punishes over-aggression near the Core; resets a
 * unit's dwell clock the moment it leaves the hazard radius.
 */
export class CoreEnergyWave {
  private readonly dwellTime = new Map<Targetable, number>();

  update(dt: number, targetables: Targetable[], coreCenter: THREE.Vector3, intensityMultiplier = 1): void {
    const stillNear = new Set<Targetable>();

    for (const target of targetables) {
      if (!target.isAlive()) continue;
      if (target.position.distanceTo(coreCenter) > HAZARD_RADIUS) continue;
      stillNear.add(target);

      const dwell = (this.dwellTime.get(target) ?? 0) + dt;
      this.dwellTime.set(target, dwell);

      if (dwell > DWELL_THRESHOLD_SEC) {
        const overage = dwell - DWELL_THRESHOLD_SEC;
        const growth = 1 + overage * GROWTH_PER_SEC_OVER;
        target.takeDamage(BASE_DAMAGE_PER_SEC * growth * intensityMultiplier * dt);
      }
    }

    for (const key of this.dwellTime.keys()) {
      if (!stillNear.has(key)) this.dwellTime.delete(key);
    }
  }
}

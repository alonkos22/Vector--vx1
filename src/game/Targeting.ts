import * as THREE from 'three';
import type { Targetable } from './Targetable';

export type TargetingMode = 'nearest' | 'lowestHp';

/** Resolves which enemy an attacker should engage, per the design doc's targeting modes. */
export function acquireTarget(
  from: THREE.Vector3,
  ownerId: string,
  candidates: Targetable[],
  mode: TargetingMode = 'nearest',
  maxRange = Infinity,
): Targetable | null {
  let best: Targetable | null = null;
  let bestScore = Infinity;
  for (const candidate of candidates) {
    if (!candidate.isAlive() || candidate.ownerId === ownerId) continue;
    const dist = from.distanceTo(candidate.position);
    if (dist > maxRange) continue;
    const score = mode === 'nearest' ? dist : candidate.hp;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

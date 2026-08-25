import * as THREE from 'three';

/** Anything a combat unit can attack: combat units and placeholder training dummies alike. */
export interface Targetable {
  readonly ownerId: string;
  readonly position: THREE.Vector3;
  readonly mesh: THREE.Object3D;
  hp: number;
  maxHp: number;
  isAlive(): boolean;
  takeDamage(amount: number): void;
}

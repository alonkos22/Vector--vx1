import * as THREE from 'three';

/**
 * Base for all controllable units: owns a mesh, a world position, and
 * straight-line move-toward-target motion. Milestone 4 swaps the motion
 * for pathfinding-based movement without touching subclasses' state
 * machines, since they only call `moveTo`/`updateMovement`.
 */
export abstract class Unit {
  readonly mesh: THREE.Object3D;
  readonly position: THREE.Vector3;
  moveSpeed: number;
  private moveTarget: THREE.Vector3 | null = null;

  constructor(mesh: THREE.Object3D, position: THREE.Vector3, moveSpeed: number) {
    this.mesh = mesh;
    this.position = position.clone();
    this.mesh.position.copy(this.position);
    this.moveSpeed = moveSpeed;
  }

  moveTo(target: THREE.Vector3): void {
    this.moveTarget = target.clone();
  }

  isMoving(): boolean {
    return this.moveTarget !== null;
  }

  /** Advances toward the current move target. Returns true the frame it arrives. */
  protected updateMovement(dt: number): boolean {
    if (!this.moveTarget) return false;

    const toTarget = this.moveTarget.clone().sub(this.position);
    const distance = toTarget.length();
    const step = this.moveSpeed * dt;

    if (distance <= step) {
      this.position.copy(this.moveTarget);
      this.moveTarget = null;
      this.mesh.position.copy(this.position);
      return true;
    }

    toTarget.normalize();
    this.position.addScaledVector(toTarget, step);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z);
    return false;
  }
}

import * as THREE from 'three';
import { pathGrid } from '../Pathfinding';
import { registerUnit, unregisterUnit, allUnits } from './UnitRegistry';

let nextUnitId = 1;

function buildSelectionRing(radius: number): THREE.Mesh {
  const geometry = new THREE.RingGeometry(radius * 0.85, radius, 24);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.85, depthWrite: false });
  const ring = new THREE.Mesh(geometry, material);
  ring.position.y = 0.03;
  ring.renderOrder = 10;
  return ring;
}

/**
 * Base for all controllable units: owns a group (visual mesh + selection
 * ring), a world position, and pathfinding-based movement with local
 * separation steering against every other registered unit. Milestone 4
 * introduces this in place of the Milestone 1-3 straight-line movement;
 * subclasses (FluxHarvester, CombatUnit) only ever call `moveTo` /
 * `updateMovement`, so neither needed to change when this landed.
 */
export abstract class Unit {
  readonly id: number;
  readonly unitTypeId: string;
  readonly ownerId: string;
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;
  readonly selectionRadius: number;
  moveSpeed: number;
  selected = false;

  private readonly selectionRing: THREE.Mesh;
  private path: THREE.Vector3[] = [];
  private waypointIndex = 0;

  constructor(
    unitTypeId: string,
    ownerId: string,
    visualMesh: THREE.Object3D,
    position: THREE.Vector3,
    moveSpeed: number,
    selectionRadius: number,
  ) {
    this.id = nextUnitId++;
    this.unitTypeId = unitTypeId;
    this.ownerId = ownerId;
    this.position = position.clone();
    this.moveSpeed = moveSpeed;
    this.selectionRadius = selectionRadius;

    this.mesh = new THREE.Group();
    this.mesh.add(visualMesh);
    this.selectionRing = buildSelectionRing(selectionRadius);
    this.selectionRing.visible = false;
    this.mesh.add(this.selectionRing);
    this.mesh.position.copy(this.position);
    this.mesh.userData.unitRef = this;

    registerUnit(this);
  }

  setSelected(value: boolean): void {
    this.selected = value;
    this.selectionRing.visible = value;
  }

  moveTo(target: THREE.Vector3): void {
    const path = pathGrid.findPath(this.position, target);
    this.path = path ?? [target.clone()];
    this.waypointIndex = 0;
  }

  stopMoving(): void {
    this.path = [];
    this.waypointIndex = 0;
  }

  isMoving(): boolean {
    return this.path.length > 0;
  }

  destroy(): void {
    unregisterUnit(this);
  }

  /** Advances along the current path with separation steering. Returns true the frame the final waypoint is reached. */
  protected updateMovement(dt: number): boolean {
    if (this.path.length === 0) return false;

    const waypoint = this.path[this.waypointIndex];
    const toWaypointX = waypoint.x - this.position.x;
    const toWaypointZ = waypoint.z - this.position.z;
    const distance = Math.hypot(toWaypointX, toWaypointZ);
    const step = this.moveSpeed * dt;
    const isFinalWaypoint = this.waypointIndex === this.path.length - 1;

    if (distance <= step && isFinalWaypoint) {
      this.position.x = waypoint.x;
      this.position.z = waypoint.z;
      this.mesh.position.copy(this.position);
      this.path = [];
      this.waypointIndex = 0;
      return true;
    }

    const desired = distance > 0.0001 ? new THREE.Vector3(toWaypointX / distance, 0, toWaypointZ / distance) : new THREE.Vector3();

    const separation = new THREE.Vector3();
    for (const other of allUnits) {
      if (other === this) continue;
      const dx = this.position.x - other.position.x;
      const dz = this.position.z - other.position.z;
      const d = Math.hypot(dx, dz);
      const minDist = this.selectionRadius + other.selectionRadius + 0.25;
      if (d > 0.0001 && d < minDist) {
        separation.x += (dx / d) * (minDist - d);
        separation.z += (dz / d) * (minDist - d);
      }
    }
    if (separation.lengthSq() > 0.0001) separation.normalize().multiplyScalar(0.6);

    const move = desired.add(separation);
    if (move.lengthSq() > 0.0001) move.normalize();

    this.position.x += move.x * step;
    this.position.z += move.z * step;
    this.mesh.position.copy(this.position);
    if (move.lengthSq() > 0.0001) this.mesh.rotation.y = Math.atan2(move.x, move.z);

    if (distance <= step) {
      this.waypointIndex++;
      if (this.waypointIndex >= this.path.length) {
        this.path = [];
        this.waypointIndex = 0;
      }
    }

    return false;
  }
}

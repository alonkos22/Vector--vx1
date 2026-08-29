import * as THREE from 'three';
import { pathGrid } from '../Pathfinding';
import { elevation } from '../Elevation';
import { registerUnit, unregisterUnit, allUnits } from './UnitRegistry';
import { soundManager } from '../SoundManager';

let nextUnitId = 1;

/** Max turn rate in radians/sec — units rotate toward their facing over time instead of snapping instantly, for a less robotic feel. */
export const TURN_RATE_RAD_PER_SEC = 10;

/** Rotates `current` toward `target` by at most `maxDelta` radians, taking the shorter way around the circle. */
export function approachAngle(current: number, target: number, maxDelta: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + THREE.MathUtils.clamp(diff, -maxDelta, maxDelta);
}

const SPAWN_POP_DURATION = 0.25;
const HIT_FLASH_DURATION = 0.12;
const HIT_FLASH_INTENSITY_BOOST = 1.6;
const DEATH_ANIM_DURATION = 0.4;

/** Damage value treated as an "average" hit for scaling hit-flash/VFX/lunge intensity — see computePowerScale. */
const POWER_REFERENCE_DAMAGE = 20;

/** Normalizes a raw damage value into a 1=average multiplier, clamped so weak hits still register and huge hits don't blow out the effect. */
export function computePowerScale(damage: number): number {
  return THREE.MathUtils.clamp(damage / POWER_REFERENCE_DAMAGE, 0.5, 2.2);
}
const WALK_BOB_AMPLITUDE = 0.08;

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
  private walkPhase = 0;

  private spawnTimer = SPAWN_POP_DURATION;
  private hitFlashTimer = 0;
  private hitFlashScale = 1;
  private dying = false;
  private deathTimer = 0;
  private readonly flashMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly flashBaseIntensity: number[] = [];

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
    this.syncMeshToGround();
    this.mesh.userData.unitRef = this;
    this.mesh.scale.setScalar(0.001);

    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        this.flashMaterials.push(child.material);
        this.flashBaseIntensity.push(child.material.emissiveIntensity);
      }
    });

    registerUnit(this);
    soundManager.playSpawn();
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

  /** Brief emissive-glow pulse on a surviving hit, for damage feedback. `damage` (the raw hit amount) scales both the flash intensity and how long it lingers, so a heavy hit visibly lands harder than a scratch. */
  protected triggerHitFlash(damage: number): void {
    const scale = computePowerScale(damage);
    this.hitFlashScale = scale;
    this.hitFlashTimer = HIT_FLASH_DURATION * THREE.MathUtils.clamp(scale, 1, 1.6);
  }

  /** Spawn pop-in scale and hit-flash decay — call every frame regardless of alive/dead state. */
  protected tickPresentation(dt: number): void {
    if (this.spawnTimer > 0) {
      this.spawnTimer = Math.max(this.spawnTimer - dt, 0);
      const t = 1 - this.spawnTimer / SPAWN_POP_DURATION;
      this.mesh.scale.setScalar(Math.max(t, 0.001));
    }

    if (this.hitFlashTimer > 0) {
      const flashDuration = HIT_FLASH_DURATION * THREE.MathUtils.clamp(this.hitFlashScale, 1, 1.6);
      this.hitFlashTimer = Math.max(this.hitFlashTimer - dt, 0);
      const boost = (this.hitFlashTimer / flashDuration) * HIT_FLASH_INTENSITY_BOOST * this.hitFlashScale;
      for (let i = 0; i < this.flashMaterials.length; i++) this.flashMaterials[i].emissiveIntensity = this.flashBaseIntensity[i] + boost;
    }
  }

  /** Starts the death animation (shrink + sink) and immediately stops this unit from affecting separation/pathing steering for others. `instant` skips the visible animation (Convergence fusion consuming its inputs, which has its own VFX). */
  protected beginDeath(instant = false): void {
    if (this.dying) return;
    this.dying = true;
    this.deathTimer = instant ? 0 : DEATH_ANIM_DURATION;
    this.destroy();
    if (!instant) soundManager.playDeath();
  }

  /** Call every frame once `beginDeath` has fired, in place of normal update logic. */
  protected tickDeath(dt: number): void {
    this.deathTimer = Math.max(this.deathTimer - dt, 0);
    const t = 1 - this.deathTimer / DEATH_ANIM_DURATION;
    this.mesh.scale.setScalar(Math.max(1 - t, 0.001));
    this.mesh.position.y = this.position.y + this.groundHeight() - t * 0.6;
  }

  /** True once the death animation has finished — the actual cue for scene.remove + array cleanup. */
  isReadyForRemoval(): boolean {
    return this.dying && this.deathTimer <= 0;
  }

  /** Terrain height under the unit's current x/z (0 on flat ground, up to a plateau's height on top of one) — the "high ground" a fortified unit is standing on. Gameplay logic (this.position.y) never changes; only the rendered mesh height and the CombatUnit attack-damage bonus consult this. */
  protected groundHeight(): number {
    return elevation.getHeightAt(this.position.x, this.position.z);
  }

  /** Copies x/z from `position` into the mesh and lifts it to the terrain height under it — the single place elevation touches rendering. */
  private syncMeshToGround(): void {
    this.mesh.position.set(this.position.x, this.position.y + this.groundHeight(), this.position.z);
  }

  /** Local separation steering against every other registered unit — run even when idle so a crowd of stopped units gently un-stacks instead of staying permanently overlapped. */
  private computeSeparation(): THREE.Vector3 {
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
    return separation;
  }

  /** Advances along the current path with separation steering. Returns true the frame the final waypoint is reached. */
  protected updateMovement(dt: number): boolean {
    const hasPath = this.path.length > 0;
    let desired = new THREE.Vector3();
    let distance = 0;
    let step = 0;

    if (hasPath) {
      const waypoint = this.path[this.waypointIndex];
      const toWaypointX = waypoint.x - this.position.x;
      const toWaypointZ = waypoint.z - this.position.z;
      distance = Math.hypot(toWaypointX, toWaypointZ);
      step = this.moveSpeed * dt;
      const isFinalWaypoint = this.waypointIndex === this.path.length - 1;

      if (distance <= step && isFinalWaypoint) {
        this.position.x = waypoint.x;
        this.position.z = waypoint.z;
        this.syncMeshToGround();
        this.walkPhase = 0;
        this.path = [];
        this.waypointIndex = 0;
        return true;
      }
      desired = distance > 0.0001 ? new THREE.Vector3(toWaypointX / distance, 0, toWaypointZ / distance) : new THREE.Vector3();
    }

    const separation = this.computeSeparation();
    if (!hasPath) {
      this.walkPhase = 0;
      if (separation.lengthSq() < 0.0001) return false;
    }

    const move = desired.add(separation);
    if (move.lengthSq() > 0.0001) move.normalize();

    // Idle units only get a gentle un-stack nudge, not a full move-speed step, so they don't visibly "walk" without an order.
    const appliedStep = hasPath ? step : this.moveSpeed * dt * 0.5;
    const nextX = this.position.x + move.x * appliedStep;
    const nextZ = this.position.z + move.z * appliedStep;

    // A path is computed once, against the blocked-grid state at that moment — a building placed
    // afterward along an already-committed route never gets checked again, so a unit already en route
    // walked straight through it (per user report). Catch that here, right before the step that would
    // land inside newly-blocked ground, and replan a fresh route to the same final destination instead.
    // Gated on the unit's *current* cell being clear: plenty of legitimate spots (the map's center Core
    // Zone, right up against a building's clearance margin) read as "blocked" by this same grid, and a
    // unit already standing in or grazing one of those must keep moving through it exactly as before —
    // only a transition from clear ground into newly-blocked ground should trigger a replan.
    if (hasPath && !pathGrid.isBlocked(this.position) && pathGrid.isBlocked(new THREE.Vector3(nextX, 0, nextZ))) {
      const finalGoal = this.path[this.path.length - 1];
      this.moveTo(finalGoal);
      return false;
    }

    this.position.x = nextX;
    this.position.z = nextZ;
    this.syncMeshToGround();

    if (hasPath) {
      this.walkPhase += dt * (6 + this.moveSpeed * 0.6);
      this.mesh.position.y += Math.abs(Math.sin(this.walkPhase)) * WALK_BOB_AMPLITUDE;
    }

    if (move.lengthSq() > 0.0001) {
      const targetAngle = Math.atan2(move.x, move.z);
      this.mesh.rotation.y = approachAngle(this.mesh.rotation.y, targetAngle, TURN_RATE_RAD_PER_SEC * dt);
    }

    if (hasPath && distance <= step) {
      this.waypointIndex++;
      if (this.waypointIndex >= this.path.length) {
        this.path = [];
        this.waypointIndex = 0;
      }
    }

    return false;
  }
}

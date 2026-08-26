import * as THREE from 'three';
import { Unit, approachAngle, TURN_RATE_RAD_PER_SEC } from './Unit';
import type { UnitConfig } from '../../config/units';
import type { AttackVfxStyle } from '../../config/factions';
import type { Targetable } from '../Targetable';
import type { EffectManager } from '../CombatVFX';
import { HealthBar } from '../HealthBar';
import { buildUnitVisual } from './visuals';
import { acquireTarget } from '../Targeting';

const AGGRO_RANGE_BONUS = 5;
const LUNGE_DURATION_SEC = 0.18;
const LUNGE_DISTANCE = 0.28;

type AttackState = 'idle' | 'windup';

/**
 * A combat-capable unit: approaches into range of its target, then resolves
 * attacks on the config's windup/cooldown timing (§7 per-faction flavor —
 * Cyber-Nexus's is a very short windup, near-instant impact).
 */
export class CombatUnit extends Unit implements Targetable {
  maxHp: number;
  hp: number;
  target: Targetable | null = null;

  private readonly damage: number;
  private readonly attackRange: number;
  private readonly aggroRange: number;
  private readonly attackCooldownSec: number;
  private readonly windupSec: number;
  private readonly multiTargetCount: number;
  private readonly effects: EffectManager;
  private readonly attackVfxStyle: AttackVfxStyle;
  private readonly healthBar: HealthBar;
  private state: AttackState = 'idle';
  private cooldownRemaining = 0;
  private windupRemaining = 0;
  private lungeRemaining = 0;
  private lastCandidates: Targetable[] = [];
  private fusing = false;

  constructor(config: UnitConfig, ownerId: string, position: THREE.Vector3, effects: EffectManager, attackVfxStyle: AttackVfxStyle) {
    const combat = config.combat;
    if (!combat) throw new Error(`Unit type "${config.id}" has no combat stats`);

    super(config.id, ownerId, buildUnitVisual(config.id), position, config.moveSpeed, config.selectionRadius);

    this.maxHp = combat.hp;
    this.hp = combat.hp;
    this.damage = combat.damage;
    this.attackRange = combat.attackRange;
    this.aggroRange = combat.attackRange + AGGRO_RANGE_BONUS;
    this.attackCooldownSec = combat.attackCooldown;
    this.windupSec = combat.windupTime;
    this.multiTargetCount = combat.multiTargetCount ?? 1;
    this.effects = effects;
    this.attackVfxStyle = attackVfxStyle;

    this.healthBar = new HealthBar(combat.healthBarYOffset);
    this.mesh.add(this.healthBar.group);
    this.healthBar.update(1);
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  takeDamage(amount: number): void {
    if (!this.isAlive()) return;
    this.hp = Math.max(0, this.hp - amount);
    this.healthBar.update(this.hp / this.maxHp);
    if (this.hp <= 0) this.beginDeath();
    else this.triggerHitFlash();
  }

  setTarget(target: Targetable | null): void {
    this.target = target;
    this.state = 'idle';
  }

  /** Marks this unit as consumed by a Convergence fusion: freezes it in place for the channel duration. */
  beginFusing(): void {
    this.fusing = true;
    this.stopMoving();
    this.setTarget(null);
    this.healthBar.setForcedVisible(false);
  }

  isFusing(): boolean {
    return this.fusing;
  }

  /** Silently removes this unit as a completed Convergence fusion's consumed input — no damage/death VFX. */
  consumeForFusion(): void {
    this.hp = 0;
    this.beginDeath(true);
  }

  /** `targetCandidates` lets an idle, unordered unit auto-acquire the nearest enemy in range (targeting: nearest). */
  update(dt: number, camera: THREE.Camera, targetCandidates: Targetable[] = []): void {
    if (this.fusing) return;
    if (!this.isAlive()) {
      this.tickDeath(dt);
      return;
    }
    this.tickPresentation(dt);

    this.lastCandidates = targetCandidates;
    if (this.target && !this.target.isAlive()) this.target = null;

    if (!this.target && !this.isMoving()) {
      this.target = acquireTarget(this.position, this.ownerId, targetCandidates, 'nearest', this.aggroRange);
    }

    if (this.target) {
      const distance = this.position.distanceTo(this.target.position);
      if (distance > this.attackRange) {
        if (!this.isMoving()) this.moveTo(this.target.position);
        this.updateMovement(dt);
      } else {
        this.stopMoving();
        this.faceTarget(this.target.position, dt);
        this.tickAttack(dt);
        this.tickLunge(dt);
      }
    } else {
      this.updateMovement(dt);
    }

    this.healthBar.setForcedVisible(this.selected);
    this.healthBar.faceCamera(camera);
  }

  /** Brief forward punch on the moment of impact, easing back to neutral — makes a resolved attack read as a hit rather than a silent timer tick. */
  private tickLunge(dt: number): void {
    if (this.lungeRemaining <= 0) {
      this.mesh.position.copy(this.position);
      return;
    }
    this.lungeRemaining = Math.max(this.lungeRemaining - dt, 0);
    const t = this.lungeRemaining / LUNGE_DURATION_SEC;
    const facing = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
    this.mesh.position.copy(this.position).addScaledVector(facing, t * LUNGE_DISTANCE);
  }

  private faceTarget(targetPos: THREE.Vector3, dt: number): void {
    const dx = targetPos.x - this.position.x;
    const dz = targetPos.z - this.position.z;
    if (Math.hypot(dx, dz) > 0.001) {
      const targetAngle = Math.atan2(dx, dz);
      this.mesh.rotation.y = approachAngle(this.mesh.rotation.y, targetAngle, TURN_RATE_RAD_PER_SEC * dt);
    }
  }

  private tickAttack(dt: number): void {
    if (this.state === 'windup') {
      this.windupRemaining -= dt;
      if (this.windupRemaining <= 0) {
        this.resolveAttack();
        this.state = 'idle';
        this.cooldownRemaining = this.attackCooldownSec;
      }
      return;
    }

    this.cooldownRemaining -= dt;
    if (this.cooldownRemaining <= 0) {
      this.state = 'windup';
      this.windupRemaining = this.windupSec;
    }
  }

  private resolveAttack(): void {
    if (!this.target) return;
    this.lungeRemaining = LUNGE_DURATION_SEC;
    const targets = this.multiTargetCount > 1 ? this.pickMultiTargets() : [this.target];

    const origin = this.position.clone();
    origin.y = 1.3;
    for (const target of targets) {
      target.takeDamage(this.damage);
      const impact = target.position.clone();
      impact.y = 1.1;
      this.effects.spawnAttackHit(this.attackVfxStyle, origin, impact);
    }
  }

  /** Hive Construct's spread-fire: the locked-on target plus the next-nearest enemies in range, up to multiTargetCount. */
  private pickMultiTargets(): Targetable[] {
    if (!this.target) return [];
    const targets: Targetable[] = [this.target];
    const others = this.lastCandidates
      .filter(
        (c) => c !== this.target && c.isAlive() && c.ownerId !== this.ownerId && this.position.distanceTo(c.position) <= this.attackRange,
      )
      .sort((a, b) => this.position.distanceTo(a.position) - this.position.distanceTo(b.position));
    for (const candidate of others) {
      if (targets.length >= this.multiTargetCount) break;
      targets.push(candidate);
    }
    return targets;
  }
}

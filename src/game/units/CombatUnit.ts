import * as THREE from 'three';
import { Unit } from './Unit';
import type { UnitConfig } from '../../config/units';
import type { Targetable } from '../Targetable';
import type { EffectManager } from '../CombatVFX';
import { HealthBar } from '../HealthBar';
import { buildUnitVisual } from './visuals';
import { acquireTarget } from '../Targeting';

const AGGRO_RANGE_BONUS = 5;

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
  private readonly effects: EffectManager;
  private readonly healthBar: HealthBar;
  private state: AttackState = 'idle';
  private cooldownRemaining = 0;
  private windupRemaining = 0;

  constructor(config: UnitConfig, ownerId: string, position: THREE.Vector3, effects: EffectManager) {
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
    this.effects = effects;

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
    if (this.hp <= 0) this.destroy();
  }

  setTarget(target: Targetable | null): void {
    this.target = target;
    this.state = 'idle';
  }

  /** `targetCandidates` lets an idle, unordered unit auto-acquire the nearest enemy in range (targeting: nearest). */
  update(dt: number, camera: THREE.Camera, targetCandidates: Targetable[] = []): void {
    if (!this.isAlive()) return;

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
        this.faceTarget(this.target.position);
        this.tickAttack(dt);
      }
    } else {
      this.updateMovement(dt);
    }

    this.healthBar.setForcedVisible(this.selected);
    this.healthBar.faceCamera(camera);
  }

  private faceTarget(targetPos: THREE.Vector3): void {
    const dx = targetPos.x - this.position.x;
    const dz = targetPos.z - this.position.z;
    if (Math.hypot(dx, dz) > 0.001) this.mesh.rotation.y = Math.atan2(dx, dz);
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
    this.target.takeDamage(this.damage);

    const origin = this.position.clone();
    origin.y = 1.3;
    const impact = this.target.position.clone();
    impact.y = 1.1;
    this.effects.spawnLaserHit(origin, impact);
  }
}

import * as THREE from 'three';
import { Unit, approachAngle, TURN_RATE_RAD_PER_SEC, computePowerScale } from './Unit';
import { elevation } from '../Elevation';
import type { UnitConfig } from '../../config/units';
import type { AttackVfxStyle } from '../../config/factions';
import type { Targetable } from '../Targetable';
import type { EffectManager } from '../CombatVFX';
import { HealthBar } from '../HealthBar';
import { RankBadge } from '../RankBadge';
import { PowerBar } from '../PowerBar';
import { buildUnitVisual } from './visuals';
import { acquireTarget } from '../Targeting';
import { classDamageMultiplier } from '../../config/unitClasses';

const AGGRO_RANGE_BONUS = 5;
const LUNGE_DURATION_SEC = 0.18;
const LUNGE_DISTANCE = 0.28;

/** How far beyond attack range a "watch" order holds — close enough to keep eyes on the target, far enough to stay out of the fight (per user request). */
const WATCH_RANGE_BONUS = 6;

/** Damage bonus for attacking from a plateau down onto a target on lower ground (per user request: fortify on high ground). */
const HIGH_GROUND_DAMAGE_MULTIPLIER = 1.25;

/**
 * Veterancy: units earn xp from damage dealt (+ a kill bonus) and rank up at
 * fixed thresholds, gaining a flat hp/damage multiplier and a gold-chevron
 * badge. Purely a combat-earned bonus for this match — ranks don't survive
 * a Convergence fusion (the output starts fresh) and harvesters don't
 * participate (they never fight).
 */
const MAX_RANK = 2;
const RANK_NAMES = ['Recruit', 'Veteran', 'Elite'];
const RANK_XP_THRESHOLDS = [0, 30, 90];
const RANK_STAT_MULTIPLIER = [1, 1.15, 1.35];
const XP_PER_DAMAGE_DEALT = 0.5;
const KILL_BONUS_XP = 15;

/** Full-bar reference for the power bar (a fusion ultimate's burst damage) and the threshold past which it renders doubled. */
const POWER_BAR_REFERENCE_DAMAGE = 50;
const POWER_BAR_DOUBLE_THRESHOLD = 20;

/** Magic/support-role units always get the doubled power bar per design, regardless of raw damage. */
function isMagicOrSupportRole(role: string): boolean {
  const r = role.toLowerCase();
  return r.includes('magic') || r.includes('shaman') || r.includes('support');
}

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
  /** "Watch" order (per user request): a non-aggressive scouting stance — approaches to just outside attack range and holds there, never engaging on its own. Distinct from `target`, which always means "attack". */
  private watchTarget: Targetable | null = null;

  private damage: number;
  private readonly baseMaxHp: number;
  private readonly baseDamage: number;
  private readonly attackRange: number;
  private readonly aggroRange: number;
  private readonly attackCooldownSec: number;
  private readonly windupSec: number;
  private readonly multiTargetCount: number;
  private readonly effects: EffectManager;
  private readonly attackVfxStyle: AttackVfxStyle;
  private readonly healthBar: HealthBar;
  private readonly rankBadge: RankBadge;
  private readonly powerBar: PowerBar;
  private xp = 0;
  private rank = 0;
  private state: AttackState = 'idle';
  private cooldownRemaining = 0;
  private windupRemaining = 0;
  private lungeRemaining = 0;
  private lungePowerScale = 1;
  private lastCandidates: Targetable[] = [];
  private fusing = false;

  constructor(config: UnitConfig, ownerId: string, position: THREE.Vector3, effects: EffectManager, attackVfxStyle: AttackVfxStyle) {
    const combat = config.combat;
    if (!combat) throw new Error(`Unit type "${config.id}" has no combat stats`);

    super(config.id, ownerId, buildUnitVisual(config.id), position, config.moveSpeed, config.selectionRadius);

    this.maxHp = combat.hp;
    this.hp = combat.hp;
    this.baseMaxHp = combat.hp;
    this.damage = combat.damage;
    this.baseDamage = combat.damage;
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

    this.rankBadge = new RankBadge(combat.healthBarYOffset + 0.22, MAX_RANK);
    this.mesh.add(this.rankBadge.group);

    const doubled = isMagicOrSupportRole(config.role) || this.damage * this.multiTargetCount >= POWER_BAR_DOUBLE_THRESHOLD;
    this.powerBar = new PowerBar(combat.healthBarYOffset - 0.16, doubled);
    this.mesh.add(this.powerBar.group);
    this.updatePowerBar();
  }

  rankName(): string {
    return RANK_NAMES[this.rank];
  }

  private updatePowerBar(): void {
    this.powerBar.setPower((this.damage * this.multiTargetCount) / POWER_BAR_REFERENCE_DAMAGE);
  }

  private gainXp(amount: number): void {
    if (this.rank >= MAX_RANK) return;
    this.xp += amount;
    while (this.rank < MAX_RANK && this.xp >= RANK_XP_THRESHOLDS[this.rank + 1]) {
      this.rank++;
      this.applyRank();
    }
  }

  /** Applies the new rank's stat multiplier — the hp bonus tops up current hp by the delta (a small heal), not just raising the cap. */
  private applyRank(): void {
    const multiplier = RANK_STAT_MULTIPLIER[this.rank];
    const newMaxHp = this.baseMaxHp * multiplier;
    this.hp = Math.min(this.hp + (newMaxHp - this.maxHp), newMaxHp);
    this.maxHp = newMaxHp;
    this.damage = this.baseDamage * multiplier;
    this.healthBar.update(this.hp / this.maxHp);
    this.rankBadge.setRank(this.rank);
    this.updatePowerBar();
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  takeDamage(amount: number): void {
    if (!this.isAlive()) return;
    this.hp = Math.max(0, this.hp - amount);
    this.healthBar.update(this.hp / this.maxHp);
    if (this.hp <= 0) this.beginDeath();
    else this.triggerHitFlash(amount);
  }

  setTarget(target: Targetable | null): void {
    this.target = target;
    this.watchTarget = null;
    this.state = 'idle';
  }

  /** "Watch" order (vs. setTarget's "attack"): approaches to just outside attack range and holds there without engaging — a scouting stance, per user request the game offers as a choice alongside attack. */
  setWatchTarget(target: Targetable): void {
    this.target = null;
    this.watchTarget = target;
    this.state = 'idle';
    const away = new THREE.Vector3().subVectors(this.position, target.position);
    if (away.lengthSq() < 0.0001) away.set(1, 0, 0);
    away.normalize();
    const holdPoint = target.position.clone().addScaledVector(away, this.attackRange + WATCH_RANGE_BONUS);
    this.moveTo(holdPoint);
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
    if (this.watchTarget && !this.watchTarget.isAlive()) this.watchTarget = null;

    // A watching unit never auto-engages — that's the entire point of the stance (per user request).
    if (!this.target && !this.watchTarget && !this.isMoving()) {
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
    } else if (this.watchTarget) {
      this.updateMovement(dt);
      if (!this.isMoving()) this.faceTarget(this.watchTarget.position, dt);
    } else {
      this.updateMovement(dt);
    }

    this.healthBar.setForcedVisible(this.selected);
    this.healthBar.faceCamera(camera);
    this.rankBadge.faceCamera(camera);
    this.powerBar.faceCamera(camera);
  }

  /** Brief forward punch on the moment of impact, easing back to neutral — makes a resolved attack read as a hit rather than a silent timer tick. */
  private tickLunge(dt: number): void {
    const grounded = this.position.clone();
    grounded.y += this.groundHeight();
    if (this.lungeRemaining <= 0) {
      this.mesh.position.copy(grounded);
      return;
    }
    this.lungeRemaining = Math.max(this.lungeRemaining - dt, 0);
    const t = this.lungeRemaining / LUNGE_DURATION_SEC;
    const facing = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
    this.mesh.position.copy(grounded).addScaledVector(facing, t * LUNGE_DISTANCE * this.lungePowerScale);
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
    this.lungePowerScale = computePowerScale(this.damage);
    const targets = this.multiTargetCount > 1 ? this.pickMultiTargets() : [this.target];

    const myHeight = this.groundHeight();
    const origin = this.position.clone();
    origin.y = 1.3 + myHeight;
    for (const target of targets) {
      const targetHeight = elevation.getHeightAt(target.position.x, target.position.z);
      const onHighGround = myHeight > targetHeight + 0.1;
      const classMultiplier = target instanceof Unit ? classDamageMultiplier(this.unitTypeId, target.unitTypeId) : 1;
      const damage = (onHighGround ? this.damage * HIGH_GROUND_DAMAGE_MULTIPLIER : this.damage) * classMultiplier;

      const wasAlive = target.isAlive();
      target.takeDamage(damage);
      const impact = target.position.clone();
      impact.y = 1.1 + targetHeight;
      this.effects.spawnAttackHit(this.attackVfxStyle, origin, impact, this.lungePowerScale);
      this.gainXp(damage * XP_PER_DAMAGE_DEALT + (wasAlive && !target.isAlive() ? KILL_BONUS_XP : 0));
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

import * as THREE from 'three';
import type { PlayerBase } from '../PlayerBase';
import type { Targetable } from '../Targetable';

type ArmyState = 'massing' | 'attacking' | 'retreating';

const DECISION_INTERVAL_SEC = 2.5;
const HARVESTER_CAP = 6;
const ATTACK_ARMY_SIZE = 6;
const RETREAT_HP_FRACTION = 0.35;
const HOME_ARRIVAL_RADIUS = 15;

/**
 * Basic scripted opponent: build-order + mass-and-attack + retreat-when-
 * losing, driven entirely through PlayerBase's public API — the same
 * economy/production/combat systems the human player uses. Addresses
 * buildings purely by canonical role ('main'/'resourceDropoff'/
 * 'basicProduction'/'heavyProduction'), never by a faction-specific id, so
 * the exact same controller runs any faction's data unmodified (Milestone
 * 9). Runs on a slow decision tick rather than every frame, and sees the
 * whole map (no fog of war for the AI — that's a rendering concern for the
 * human's view only).
 */
export class AIController {
  private readonly base: PlayerBase;
  private readonly enemyBasePosition: THREE.Vector3;
  private decisionTimer = 0;
  private armyState: ArmyState = 'massing';
  private attackStartMaxHp = 0;
  private readonly lastHpByEntity = new Map<Targetable, number>();

  constructor(base: PlayerBase, enemyBasePosition: THREE.Vector3) {
    this.base = base;
    this.enemyBasePosition = enemyBasePosition.clone();
  }

  update(dt: number): void {
    // Checked every frame (not gated by the slow decision tick) so a rush on an idle/massing army gets punished immediately.
    this.checkForThreats();

    this.decisionTimer -= dt;
    if (this.decisionTimer > 0) return;
    this.decisionTimer = DECISION_INTERVAL_SEC;

    this.manageEconomy();
    this.manageProduction();
    this.manageArmy();
  }

  /**
   * Compares each own building/harvester/combat-unit's hp against last frame's;
   * any drop means something is under attack right now, so pull every unit
   * without an active target there to fight back — without this, an army
   * that's "massing" a few units away from the actual harass point would
   * otherwise never notice and let the raid go entirely unpunished.
   */
  private checkForThreats(): void {
    const entities: Targetable[] = [...this.base.allBuildings(), ...this.base.harvesters, ...this.base.combatUnits];
    let threatPosition: THREE.Vector3 | null = null;
    for (const entity of entities) {
      const previousHp = this.lastHpByEntity.get(entity);
      if (previousHp !== undefined && entity.hp < previousHp) threatPosition = entity.position.clone();
      this.lastHpByEntity.set(entity, entity.hp);
    }
    if (!threatPosition) return;
    for (const unit of this.base.combatUnits) {
      if (!unit.target) unit.moveTo(threatPosition);
    }
  }

  private manageEconomy(): void {
    const harvesterUnitId = this.base.harvesterUnitId();
    if (harvesterUnitId && this.base.harvesters.length < HARVESTER_CAP) {
      this.base.tryQueueUnit('main', harvesterUnitId);
    }

    if (this.base.canAffordBuilding('resourceDropoff')) {
      const spot = this.pickResourceCentroid('factionResource') ?? this.nearBaseSpot(-8, 6);
      this.base.constructBuilding('resourceDropoff', spot);
    }
    if (this.base.canAffordBuilding('basicProduction')) {
      this.base.constructBuilding('basicProduction', this.nearBaseSpot(8, -6));
    }
    if (this.base.canAffordBuilding('heavyProduction')) {
      this.base.constructBuilding('heavyProduction', this.nearBaseSpot(10, 6));
    }
  }

  private manageProduction(): void {
    for (const role of ['basicProduction', 'heavyProduction'] as const) {
      const building = this.base.getPlacedBuilding(role);
      if (!building || !building.isComplete) continue;
      const produces = building.config.produces;
      if (produces.length === 0) continue;
      const unitTypeId = produces[Math.floor(Math.random() * produces.length)];
      this.base.tryQueueUnit(role, unitTypeId);
    }
  }

  private manageArmy(): void {
    const army = this.base.combatUnits;

    if (this.armyState === 'massing') {
      const idleCount = army.filter((u) => !u.target).length;
      if (idleCount >= ATTACK_ARMY_SIZE) {
        this.armyState = 'attacking';
        this.attackStartMaxHp = army.reduce((sum, u) => sum + u.maxHp, 0);
        for (const u of army) u.moveTo(this.enemyBasePosition);
      }
      return;
    }

    if (this.armyState === 'attacking') {
      if (army.length === 0) {
        this.armyState = 'massing';
        return;
      }
      const currentHp = army.reduce((sum, u) => sum + u.hp, 0);
      if (currentHp / Math.max(this.attackStartMaxHp, 1) < RETREAT_HP_FRACTION) {
        this.armyState = 'retreating';
        for (const u of army) {
          u.setTarget(null);
          u.moveTo(this.base.basePosition);
        }
      }
      return;
    }

    // retreating
    if (army.length === 0) {
      this.armyState = 'massing';
      return;
    }
    const allHome = army.every((u) => u.position.distanceTo(this.base.basePosition) < HOME_ARRIVAL_RADIUS);
    if (allHome) this.armyState = 'massing';
  }

  private nearBaseSpot(offsetX: number, offsetZ: number): THREE.Vector3 {
    return this.base.basePosition.clone().add(new THREE.Vector3(offsetX, 0, offsetZ));
  }

  private pickResourceCentroid(type: 'coreEnergy' | 'factionResource'): THREE.Vector3 | null {
    const nodes = this.base.resourceNodes.filter((n) => n.type === type);
    if (nodes.length === 0) return null;
    const centroid = new THREE.Vector3();
    for (const node of nodes) centroid.add(node.position);
    centroid.divideScalar(nodes.length);
    return centroid;
  }
}

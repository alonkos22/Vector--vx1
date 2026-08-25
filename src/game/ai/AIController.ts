import * as THREE from 'three';
import type { PlayerBase } from '../PlayerBase';
import { CYBER_NEXUS_BUILDINGS } from '../../config/buildings';

type ArmyState = 'massing' | 'attacking' | 'retreating';

const DECISION_INTERVAL_SEC = 2.5;
const HARVESTER_CAP = 6;
const ATTACK_ARMY_SIZE = 6;
const RETREAT_HP_FRACTION = 0.35;
const HOME_ARRIVAL_RADIUS = 15;

/**
 * Basic scripted opponent: build-order + mass-and-attack + retreat-when-
 * losing, driven entirely through PlayerBase's public API — the same
 * economy/production/combat systems the human player uses. Runs on a slow
 * decision tick rather than every frame, and sees the whole map (no fog of
 * war for the AI — that's a rendering concern for the human's view only).
 */
export class AIController {
  private readonly base: PlayerBase;
  private readonly enemyBasePosition: THREE.Vector3;
  private decisionTimer = 0;
  private armyState: ArmyState = 'massing';
  private attackStartMaxHp = 0;

  constructor(base: PlayerBase, enemyBasePosition: THREE.Vector3) {
    this.base = base;
    this.enemyBasePosition = enemyBasePosition.clone();
  }

  update(dt: number): void {
    this.decisionTimer -= dt;
    if (this.decisionTimer > 0) return;
    this.decisionTimer = DECISION_INTERVAL_SEC;

    this.manageEconomy();
    this.manageProduction();
    this.manageArmy();
  }

  private manageEconomy(): void {
    if (this.base.harvesters.length < HARVESTER_CAP) {
      this.base.tryQueueUnit('core-spire', 'flux-harvester');
    }

    if (this.base.canAffordBuilding('flux-siphon')) {
      const spot = this.pickResourceCentroid('factionResource') ?? this.nearBaseSpot(-8, 6);
      this.base.constructBuilding('flux-siphon', spot);
    }
    if (this.base.canAffordBuilding('fabrication-node')) {
      this.base.constructBuilding('fabrication-node', this.nearBaseSpot(8, -6));
    }
    if (this.base.canAffordBuilding('drone-foundry')) {
      this.base.constructBuilding('drone-foundry', this.nearBaseSpot(10, 6));
    }
  }

  private manageProduction(): void {
    for (const buildingId of ['fabrication-node', 'drone-foundry']) {
      const building = this.base.getPlacedBuilding(buildingId);
      if (!building || !building.isComplete) continue;
      const produces = CYBER_NEXUS_BUILDINGS[buildingId].produces;
      const unitTypeId = produces[Math.floor(Math.random() * produces.length)];
      this.base.tryQueueUnit(buildingId, unitTypeId);
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

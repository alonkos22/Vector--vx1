import * as THREE from 'three';
import { Unit } from './Unit';
import type { ResourceNode } from '../ResourceNode';
import type { Building } from '../Building';
import type { PlayerEconomy } from '../Economy';
import type { Targetable } from '../Targetable';
import { HealthBar } from '../HealthBar';
import { buildUnitVisual } from './visuals';

type HarvesterState = 'toNode' | 'harvesting' | 'toDropoff' | 'depositing' | 'idle';

const HARVEST_AMOUNT_PER_TRIP = 10;
const HARVEST_TIME_SEC = 1.5;
const DEPOSIT_TIME_SEC = 0.4;
const MAX_HP = 25;

/** Autonomous economy unit: loops resource-node -> dropoff-building -> resource-node. Harassable (low HP, no attack of its own). */
export class FluxHarvester extends Unit implements Targetable {
  maxHp = MAX_HP;
  hp = MAX_HP;

  private readonly healthBar: HealthBar;
  private state: HarvesterState = 'idle';
  private stateTimer = 0;
  private carrying = 0;
  private node: ResourceNode | null = null;
  private dropoff: Building | null = null;

  constructor(unitTypeId: string, ownerId: string, position: THREE.Vector3, moveSpeed: number, selectionRadius: number) {
    super(unitTypeId, ownerId, buildUnitVisual(unitTypeId), position, moveSpeed, selectionRadius);

    this.healthBar = new HealthBar(1.7);
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

  /** (Re)assigns this harvester to a node/dropoff pair and starts the gather loop. */
  assign(node: ResourceNode, dropoff: Building): void {
    this.node = node;
    this.dropoff = dropoff;
    this.state = 'toNode';
    this.moveTo(node.position);
  }

  currentNodeType(): ResourceNode['type'] | null {
    return this.node?.type ?? null;
  }

  update(dt: number, economy: PlayerEconomy, camera: THREE.Camera): void {
    if (!this.isAlive()) return;

    const arrived = this.updateMovement(dt);

    switch (this.state) {
      case 'toNode':
        if (arrived) {
          this.state = 'harvesting';
          this.stateTimer = HARVEST_TIME_SEC;
        }
        break;

      case 'harvesting':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0 && this.node) {
          this.carrying = this.node.extract(HARVEST_AMOUNT_PER_TRIP);
          this.state = 'toDropoff';
          if (this.dropoff) this.moveTo(this.dropoff.position);
        }
        break;

      case 'toDropoff':
        if (arrived) {
          this.state = 'depositing';
          this.stateTimer = DEPOSIT_TIME_SEC;
        }
        break;

      case 'depositing':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          if (this.node?.type === 'coreEnergy') economy.addCoreEnergy(this.carrying);
          else economy.addFactionResource(this.carrying);
          this.carrying = 0;
          this.state = 'toNode';
          if (this.node) this.moveTo(this.node.position);
        }
        break;

      case 'idle':
        break;
    }

    this.healthBar.setForcedVisible(this.selected);
    this.healthBar.faceCamera(camera);
  }
}

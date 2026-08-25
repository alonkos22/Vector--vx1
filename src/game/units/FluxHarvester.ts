import * as THREE from 'three';
import { Unit } from './Unit';
import type { ResourceNode } from '../ResourceNode';
import type { Building } from '../Building';
import type { PlayerEconomy } from '../Economy';

type HarvesterState = 'toNode' | 'harvesting' | 'toDropoff' | 'depositing' | 'idle';

const HARVEST_AMOUNT_PER_TRIP = 10;
const HARVEST_TIME_SEC = 1.5;
const DEPOSIT_TIME_SEC = 0.4;

/** Autonomous economy unit: loops resource-node -> dropoff-building -> resource-node. */
export class FluxHarvester extends Unit {
  private state: HarvesterState = 'idle';
  private stateTimer = 0;
  private carrying = 0;
  private node: ResourceNode | null = null;
  private dropoff: Building | null = null;

  constructor(position: THREE.Vector3, moveSpeed: number, selectionRadius: number) {
    const geometry = new THREE.CapsuleGeometry(0.5, 0.8, 4, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4fc3ff,
      emissive: 0x0d3a55,
      emissiveIntensity: 0.6,
      metalness: 0.6,
      roughness: 0.35,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.y = 0.9;
    super('flux-harvester', 'player', mesh, position, moveSpeed, selectionRadius);
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

  update(dt: number, economy: PlayerEconomy): void {
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
  }
}

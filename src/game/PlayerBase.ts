import * as THREE from 'three';
import { CYBER_NEXUS_BUILDINGS } from '../config/buildings';
import { CYBER_NEXUS_UNITS } from '../config/units';
import { PlayerEconomy } from './Economy';
import { Building } from './Building';
import { ResourceNode, type ResourceType } from './ResourceNode';
import { FluxHarvester } from './units/FluxHarvester';
import { CombatUnit } from './units/CombatUnit';
import type { EffectManager } from './CombatVFX';
import type { Targetable } from './Targetable';
import type { VisionSource } from './FogOfWar';
import { pathGrid } from './Pathfinding';

/**
 * One faction base's full economy/production/army: everything the human
 * player and the AI opponent both need, so both are driven by the exact
 * same underlying systems and differ only in who calls the methods (UI
 * clicks vs. AIController heuristics per Milestone 7).
 */
export class PlayerBase {
  readonly ownerId: string;
  readonly economy: PlayerEconomy;
  readonly coreSpire: Building;
  readonly basePosition: THREE.Vector3;
  fluxSiphon: Building | null = null;
  fabricationNode: Building | null = null;
  droneFoundry: Building | null = null;
  readonly harvesters: FluxHarvester[] = [];
  readonly combatUnits: CombatUnit[] = [];
  readonly resourceNodes: ResourceNode[] = [];

  private readonly scene: THREE.Scene;
  private readonly effects: EffectManager;
  private assignedToEnergy = 0;
  private assignedToFlux = 0;

  constructor(ownerId: string, scene: THREE.Scene, effects: EffectManager, basePosition: THREE.Vector3, startingCoreEnergy: number) {
    this.ownerId = ownerId;
    this.scene = scene;
    this.effects = effects;
    this.basePosition = basePosition.clone();
    this.economy = new PlayerEconomy(startingCoreEnergy, 0);

    this.coreSpire = new Building(CYBER_NEXUS_BUILDINGS['core-spire'], this.basePosition, true);
    scene.add(this.coreSpire.mesh);
    pathGrid.markCircleBlocked(this.coreSpire.position, CYBER_NEXUS_BUILDINGS['core-spire'].footprint + 1);
  }

  addResourceNode(type: ResourceType, offsetX: number, offsetZ: number): void {
    const pos = new THREE.Vector3(this.basePosition.x + offsetX, 0, this.basePosition.z + offsetZ);
    const node = new ResourceNode(type, pos);
    this.resourceNodes.push(node);
    this.scene.add(node.mesh);
  }

  private findNearestNode(type: ResourceType, from: THREE.Vector3): ResourceNode | null {
    let best: ResourceNode | null = null;
    let bestDist = Infinity;
    for (const node of this.resourceNodes) {
      if (node.type !== type || node.isDepleted()) continue;
      const dist = node.position.distanceTo(from);
      if (dist < bestDist) {
        bestDist = dist;
        best = node;
      }
    }
    return best;
  }

  private chooseResourceType(): ResourceType {
    if (!this.fluxSiphon || !this.fluxSiphon.isComplete) return 'coreEnergy';
    return this.assignedToEnergy <= this.assignedToFlux ? 'coreEnergy' : 'factionResource';
  }

  spawnHarvester(position: THREE.Vector3): FluxHarvester {
    const config = CYBER_NEXUS_UNITS['flux-harvester'];
    const harvester = new FluxHarvester(this.ownerId, position, config.moveSpeed, config.selectionRadius);
    this.scene.add(harvester.mesh);
    this.harvesters.push(harvester);

    const type = this.chooseResourceType();
    const dropoff = type === 'coreEnergy' ? this.coreSpire : this.fluxSiphon;
    const node = this.findNearestNode(type, position);
    if (node && dropoff) {
      harvester.assign(node, dropoff);
      if (type === 'coreEnergy') this.assignedToEnergy += 1;
      else this.assignedToFlux += 1;
    }
    return harvester;
  }

  spawnCombatUnit(unitTypeId: string, position: THREE.Vector3): CombatUnit {
    const config = CYBER_NEXUS_UNITS[unitTypeId];
    const unit = new CombatUnit(config, this.ownerId, position, this.effects);
    this.scene.add(unit.mesh);
    this.combatUnits.push(unit);
    return unit;
  }

  getPlacedBuilding(buildingId: string): Building | null {
    if (buildingId === 'core-spire') return this.coreSpire;
    if (buildingId === 'flux-siphon') return this.fluxSiphon;
    if (buildingId === 'fabrication-node') return this.fabricationNode;
    if (buildingId === 'drone-foundry') return this.droneFoundry;
    return null;
  }

  private setPlacedBuilding(buildingId: string, building: Building): void {
    if (buildingId === 'flux-siphon') this.fluxSiphon = building;
    else if (buildingId === 'fabrication-node') this.fabricationNode = building;
    else if (buildingId === 'drone-foundry') this.droneFoundry = building;
  }

  canAffordBuilding(buildingId: string): boolean {
    if (this.getPlacedBuilding(buildingId)) return false;
    const config = CYBER_NEXUS_BUILDINGS[buildingId];
    return this.economy.canAfford(config.costCoreEnergy, config.costFactionResource);
  }

  /** Constructs a building immediately at the given point — used by the player's placement-confirm and the AI's instant construction alike. */
  constructBuilding(buildingId: string, point: THREE.Vector3): Building | null {
    if (!this.canAffordBuilding(buildingId)) return null;
    const config = CYBER_NEXUS_BUILDINGS[buildingId];
    this.economy.spend(config.costCoreEnergy, config.costFactionResource);
    const building = new Building(config, point, false);
    this.scene.add(building.mesh);
    pathGrid.markCircleBlocked(building.position, config.footprint + 1);
    this.setPlacedBuilding(buildingId, building);
    return building;
  }

  tryQueueUnit(buildingId: string, unitTypeId: string): boolean {
    const building = this.getPlacedBuilding(buildingId);
    if (!building || !building.isComplete || !building.canEnqueue()) return false;
    const config = CYBER_NEXUS_UNITS[unitTypeId];
    if (!this.economy.canAfford(config.costCoreEnergy, config.costFactionResource)) return false;
    this.economy.spend(config.costCoreEnergy, config.costFactionResource);
    building.enqueueProduction(unitTypeId, config.buildTimeSec);
    return true;
  }

  private onProductionFinished(buildingPosition: THREE.Vector3, unitTypeId: string): void {
    const jitter = new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6);
    const spawnPos = buildingPosition.clone().add(jitter);
    if (unitTypeId === 'flux-harvester') this.spawnHarvester(spawnPos);
    else this.spawnCombatUnit(unitTypeId, spawnPos);
  }

  allBuildings(): Building[] {
    return [this.coreSpire, this.fluxSiphon, this.fabricationNode, this.droneFoundry].filter((b): b is Building => b !== null);
  }

  supplyUsed(): number {
    return (
      this.harvesters.length * CYBER_NEXUS_UNITS['flux-harvester'].supply +
      this.combatUnits.reduce((sum, u) => sum + (CYBER_NEXUS_UNITS[u.unitTypeId]?.supply ?? 0), 0)
    );
  }

  /** Own units + buildings as fog-of-war vision sources. */
  visionSources(): VisionSource[] {
    const sources: VisionSource[] = [];
    for (const building of this.allBuildings()) {
      sources.push({ position: building.position, radius: building.config.visionRadius });
    }
    for (const harvester of this.harvesters) {
      sources.push({ position: harvester.position, radius: CYBER_NEXUS_UNITS['flux-harvester'].visionRadius });
    }
    for (const unit of this.combatUnits) {
      sources.push({ position: unit.position, radius: CYBER_NEXUS_UNITS[unit.unitTypeId]?.visionRadius ?? 8 });
    }
    return sources;
  }

  updateEconomy(dt: number): void {
    this.coreSpire.update(dt);
    this.fluxSiphon?.update(dt);
    this.fabricationNode?.update(dt);
    this.droneFoundry?.update(dt);

    for (const building of this.allBuildings()) {
      const finishedUnitId = building.collectFinishedProduction();
      if (finishedUnitId) this.onProductionFinished(building.position, finishedUnitId);
    }
  }

  updateHarvesters(dt: number, camera: THREE.Camera): void {
    for (const harvester of this.harvesters) harvester.update(dt, this.economy, camera);
    for (let i = this.harvesters.length - 1; i >= 0; i--) {
      if (!this.harvesters[i].isAlive()) {
        this.scene.remove(this.harvesters[i].mesh);
        this.harvesters.splice(i, 1);
      }
    }
  }

  updateCombatUnits(dt: number, camera: THREE.Camera, targetCandidates: Targetable[]): void {
    for (const unit of this.combatUnits) unit.update(dt, camera, targetCandidates);
    for (let i = this.combatUnits.length - 1; i >= 0; i--) {
      if (!this.combatUnits[i].isAlive()) {
        this.scene.remove(this.combatUnits[i].mesh);
        this.combatUnits.splice(i, 1);
      }
    }
  }
}

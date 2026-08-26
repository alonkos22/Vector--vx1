import * as THREE from 'three';
import { BUILDINGS_BY_FACTION, BUILDING_ROLES, type BuildingConfig, type BuildingRole } from '../config/buildings';
import { BUILDING_FUSION_BY_FACTION } from '../config/buildingFusion';
import { UNITS_BY_FACTION, type UnitConfig } from '../config/units';
import { FACTIONS, type FactionConfig } from '../config/factions';
import { PlayerEconomy } from './Economy';
import { Building } from './Building';
import { ResourceNode, type ResourceType } from './ResourceNode';
import { FluxHarvester } from './units/FluxHarvester';
import { CombatUnit } from './units/CombatUnit';
import type { EffectManager } from './CombatVFX';
import type { Targetable } from './Targetable';
import type { VisionSource } from './FogOfWar';
import { pathGrid } from './Pathfinding';
import { buildRallyFlag } from './RallyFlag';

/**
 * One faction base's full economy/production/army: everything the human
 * player and the AI opponent both need, so both are driven by the exact
 * same underlying systems and differ only in who calls the methods (UI
 * clicks vs. AIController heuristics per Milestone 7) and which faction's
 * data (Milestone 9) they were constructed with.
 *
 * Buildings are addressed by canonical role ('main'/'resourceDropoff'/
 * 'basicProduction'/'heavyProduction') internally, but every public method
 * also accepts a faction-specific building id (e.g. 'nexus-core') via
 * `resolveRole` — so the player-facing UI (always Cyber-Nexus, addresses by
 * id) and AIController (faction-agnostic, addresses by role) both work
 * unmodified against any faction.
 */
export class PlayerBase {
  readonly factionId: string;
  readonly ownerId: string;
  readonly economy: PlayerEconomy;
  readonly mainBuilding: Building;
  readonly basePosition: THREE.Vector3;
  readonly harvesters: FluxHarvester[] = [];
  readonly combatUnits: CombatUnit[] = [];
  readonly resourceNodes: ResourceNode[] = [];

  private readonly scene: THREE.Scene;
  private readonly effects: EffectManager;
  private readonly factionConfig: FactionConfig;
  private readonly buildingsConfig: Record<BuildingRole, BuildingConfig>;
  private readonly unitsConfig: Record<string, UnitConfig>;
  private readonly buildingsByRole: Partial<Record<BuildingRole, Building>> = {};
  private readonly rallyMarkers: Partial<Record<BuildingRole, THREE.Group>> = {};
  private assignedToEnergy = 0;
  private assignedToFlux = 0;

  constructor(
    factionId: string,
    ownerId: string,
    scene: THREE.Scene,
    effects: EffectManager,
    basePosition: THREE.Vector3,
    startingCoreEnergy: number,
  ) {
    this.factionId = factionId;
    this.ownerId = ownerId;
    this.scene = scene;
    this.effects = effects;
    this.basePosition = basePosition.clone();
    this.economy = new PlayerEconomy(startingCoreEnergy, 0);
    this.factionConfig = FACTIONS[factionId];
    this.buildingsConfig = BUILDINGS_BY_FACTION[factionId];
    this.unitsConfig = UNITS_BY_FACTION[factionId];

    const mainConfig = this.buildingsConfig.main;
    this.mainBuilding = new Building(mainConfig, ownerId, this.basePosition, true);
    scene.add(this.mainBuilding.mesh);
    pathGrid.markCircleBlocked(this.mainBuilding.position, mainConfig.footprint + 1);
  }

  /** The prototype's win/lose condition per the build notes: losing the main structure. */
  isDefeated(): boolean {
    return !this.mainBuilding.isAlive();
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
    const dropoff = this.getBuildingByRole('resourceDropoff');
    if (!dropoff || !dropoff.isComplete) return 'coreEnergy';
    return this.assignedToEnergy <= this.assignedToFlux ? 'coreEnergy' : 'factionResource';
  }

  /** Resolves either a canonical role (AIController) or a faction-specific building id (player-facing UI) to a role. */
  private resolveRole(buildingIdOrRole: string): BuildingRole | null {
    if ((BUILDING_ROLES as string[]).includes(buildingIdOrRole)) return buildingIdOrRole as BuildingRole;
    for (const role of BUILDING_ROLES) {
      if (this.buildingsConfig[role].id === buildingIdOrRole) return role;
    }
    return null;
  }

  getBuildingByRole(role: BuildingRole): Building | null {
    if (role === 'main') return this.mainBuilding;
    return this.buildingsByRole[role] ?? null;
  }

  getPlacedBuilding(buildingIdOrRole: string): Building | null {
    const role = this.resolveRole(buildingIdOrRole);
    return role ? this.getBuildingByRole(role) : null;
  }

  /** null when the faction has no harvester unit at all (Solari Archons' passive economy). */
  harvesterUnitId(): string | null {
    return this.factionConfig.harvesterUnitId;
  }

  spawnHarvester(position: THREE.Vector3): FluxHarvester | null {
    const harvesterUnitId = this.factionConfig.harvesterUnitId;
    if (!harvesterUnitId) return null;
    const config = this.unitsConfig[harvesterUnitId];
    const harvester = new FluxHarvester(harvesterUnitId, this.ownerId, position, config.moveSpeed, config.selectionRadius);
    this.scene.add(harvester.mesh);
    this.harvesters.push(harvester);

    const type = this.chooseResourceType();
    const dropoff = type === 'coreEnergy' ? this.mainBuilding : this.getBuildingByRole('resourceDropoff');
    const node = this.findNearestNode(type, position);
    if (node && dropoff) {
      harvester.assign(node, dropoff);
      if (type === 'coreEnergy') this.assignedToEnergy += 1;
      else this.assignedToFlux += 1;
    }
    return harvester;
  }

  spawnCombatUnit(unitTypeId: string, position: THREE.Vector3): CombatUnit {
    const config = this.unitsConfig[unitTypeId];
    const unit = new CombatUnit(config, this.ownerId, position, this.effects, this.factionConfig.attackVfxStyle);
    this.scene.add(unit.mesh);
    this.combatUnits.push(unit);
    return unit;
  }

  canAffordBuilding(buildingIdOrRole: string): boolean {
    const role = this.resolveRole(buildingIdOrRole);
    if (!role || role === 'main' || this.getBuildingByRole(role)) return false;
    const config = this.buildingsConfig[role];
    return this.economy.canAfford(config.costCoreEnergy, config.costFactionResource);
  }

  /** Constructs a building immediately at the given point — used by the player's placement-confirm and the AI's instant construction alike. */
  constructBuilding(buildingIdOrRole: string, point: THREE.Vector3): Building | null {
    const role = this.resolveRole(buildingIdOrRole);
    if (!role || role === 'main' || !this.canAffordBuilding(buildingIdOrRole)) return null;
    const config = this.buildingsConfig[role];
    this.economy.spend(config.costCoreEnergy, config.costFactionResource);
    const building = new Building(config, this.ownerId, point, false);
    this.scene.add(building.mesh);
    pathGrid.markCircleBlocked(building.position, config.footprint + 1);
    this.buildingsByRole[role] = building;
    return building;
  }

  /** Sets (or, with a null point, clears) the ground point newly trained combat units from this building auto-move to. */
  setRallyPoint(buildingIdOrRole: string, point: THREE.Vector3 | null): boolean {
    const role = this.resolveRole(buildingIdOrRole);
    const building = role ? this.getBuildingByRole(role) : null;
    if (!role || !building) return false;
    building.rallyPoint = point ? point.clone() : null;

    const existingMarker = this.rallyMarkers[role];
    if (!point) {
      if (existingMarker) {
        this.scene.remove(existingMarker);
        delete this.rallyMarkers[role];
      }
      return true;
    }
    if (existingMarker) {
      existingMarker.position.copy(point);
    } else {
      const marker = buildRallyFlag(this.factionConfig.colorSecondary);
      marker.position.copy(point);
      this.scene.add(marker);
      this.rallyMarkers[role] = marker;
    }
    return true;
  }

  tryQueueUnit(buildingIdOrRole: string, unitTypeId: string): boolean {
    const building = this.getPlacedBuilding(buildingIdOrRole);
    if (!building || !building.isComplete || !building.canEnqueue()) return false;
    const config = this.unitsConfig[unitTypeId];
    if (!config || !this.economy.canAfford(config.costCoreEnergy, config.costFactionResource)) return false;
    this.economy.spend(config.costCoreEnergy, config.costFactionResource);
    building.enqueueProduction(unitTypeId, config.buildTimeSec);
    return true;
  }

  private onProductionFinished(building: Building, unitTypeId: string): void {
    const jitter = new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6);
    const spawnPos = building.position.clone().add(jitter);
    const config = this.unitsConfig[unitTypeId];
    if (config?.combat) {
      const unit = this.spawnCombatUnit(unitTypeId, spawnPos);
      if (building.rallyPoint) unit.moveTo(building.rallyPoint);
    } else {
      this.spawnHarvester(spawnPos);
    }
  }

  /** Whether basicProduction + heavyProduction are both complete and the fusion cost is affordable — the merge button's enabled state. */
  canFuseBuildings(): boolean {
    const recipe = BUILDING_FUSION_BY_FACTION[this.factionId];
    if (!recipe) return false;
    const basic = this.getBuildingByRole('basicProduction');
    const heavy = this.getBuildingByRole('heavyProduction');
    if (!basic?.isComplete || !heavy?.isComplete) return false;
    return this.economy.canAfford(recipe.extraCoreEnergyCost, recipe.extraFactionResourceCost);
  }

  /**
   * Consumes the basicProduction + heavyProduction buildings and constructs
   * one upgraded building (producing everything both parents did) at the
   * heavyProduction spot, animated via the same construction-progress system
   * every other building uses. The basicProduction plot is freed for
   * rebuilding; per the engine's existing behavior for any destroyed
   * building, its pathfinding-blocked tile is not reclaimed.
   */
  beginBuildingFusion(): boolean {
    if (!this.canFuseBuildings()) return false;
    const recipe = BUILDING_FUSION_BY_FACTION[this.factionId];
    const basic = this.buildingsByRole.basicProduction!;
    const heavy = this.buildingsByRole.heavyProduction!;

    this.economy.spend(recipe.extraCoreEnergyCost, recipe.extraFactionResourceCost);

    const fusedPosition = heavy.position.clone();
    this.scene.remove(basic.mesh);
    this.scene.remove(heavy.mesh);
    this.effects.spawnBuildingDestroyed(basic.position, basic.config.footprint);
    this.effects.spawnBuildingDestroyed(heavy.position, heavy.config.footprint);
    delete this.buildingsByRole.basicProduction;

    const fusedConfig: BuildingConfig = {
      id: recipe.id,
      name: recipe.name,
      costCoreEnergy: 0,
      costFactionResource: 0,
      buildTimeSec: recipe.buildTimeSec,
      footprint: recipe.footprint,
      visionRadius: recipe.visionRadius,
      maxHp: recipe.maxHp,
      color: recipe.color,
      materialRoughness: recipe.materialRoughness,
      materialMetalness: recipe.materialMetalness,
      produces: recipe.produces,
      dropoffResource: null,
    };
    const fused = new Building(fusedConfig, this.ownerId, fusedPosition, false);
    this.scene.add(fused.mesh);
    pathGrid.markCircleBlocked(fused.position, fusedConfig.footprint + 1);
    this.buildingsByRole.heavyProduction = fused;
    return true;
  }

  allBuildings(): Building[] {
    return BUILDING_ROLES.map((role) => this.getBuildingByRole(role)).filter((b): b is Building => b !== null);
  }

  supplyUsed(): number {
    const harvesterUnitId = this.factionConfig.harvesterUnitId;
    const harvesterSupply = harvesterUnitId ? (this.unitsConfig[harvesterUnitId]?.supply ?? 0) : 0;
    return (
      this.harvesters.length * harvesterSupply +
      this.combatUnits.reduce((sum, u) => sum + (this.unitsConfig[u.unitTypeId]?.supply ?? 0), 0)
    );
  }

  /** Own units + buildings as fog-of-war vision sources. */
  visionSources(): VisionSource[] {
    const sources: VisionSource[] = [];
    for (const building of this.allBuildings()) {
      sources.push({ position: building.position, radius: building.config.visionRadius });
    }
    const harvesterUnitId = this.factionConfig.harvesterUnitId;
    const harvesterVision = harvesterUnitId ? (this.unitsConfig[harvesterUnitId]?.visionRadius ?? 8) : 8;
    for (const harvester of this.harvesters) {
      sources.push({ position: harvester.position, radius: harvesterVision });
    }
    for (const unit of this.combatUnits) {
      sources.push({ position: unit.position, radius: this.unitsConfig[unit.unitTypeId]?.visionRadius ?? 8 });
    }
    return sources;
  }

  updateEconomy(dt: number, camera: THREE.Camera): void {
    for (const building of this.allBuildings()) building.update(dt, camera);

    for (const building of this.allBuildings()) {
      const finishedUnitId = building.collectFinishedProduction();
      if (finishedUnitId) this.onProductionFinished(building, finishedUnitId);
    }

    for (const role of BUILDING_ROLES) {
      if (role === 'main') continue;
      const building = this.buildingsByRole[role];
      this.cleanUpDestroyedBuilding(building ?? null, () => {
        delete this.buildingsByRole[role];
        const marker = this.rallyMarkers[role];
        if (marker) {
          this.scene.remove(marker);
          delete this.rallyMarkers[role];
        }
      });
    }

    if (this.factionConfig.economyMode === 'passive') {
      this.economy.addCoreEnergy((this.factionConfig.passiveCoreEnergyPerSec ?? 0) * dt);
      this.economy.addFactionResource((this.factionConfig.passiveFactionResourcePerSec ?? 0) * dt);
    }
  }

  /** Non-main buildings are removed on death (with a destruction VFX); main-structure death is the loss condition, left in place for the match-end screen. */
  private cleanUpDestroyedBuilding(building: Building | null, clear: () => void): void {
    if (!building || building.isAlive()) return;
    this.scene.remove(building.mesh);
    this.effects.spawnBuildingDestroyed(building.position, building.config.footprint);
    clear();
  }

  updateHarvesters(dt: number, camera: THREE.Camera): void {
    for (const harvester of this.harvesters) harvester.update(dt, this.economy, camera);
    for (let i = this.harvesters.length - 1; i >= 0; i--) {
      if (this.harvesters[i].isReadyForRemoval()) {
        this.scene.remove(this.harvesters[i].mesh);
        this.harvesters.splice(i, 1);
      }
    }
  }

  updateCombatUnits(dt: number, camera: THREE.Camera, targetCandidates: Targetable[]): void {
    for (const unit of this.combatUnits) unit.update(dt, camera, targetCandidates);
    for (let i = this.combatUnits.length - 1; i >= 0; i--) {
      if (this.combatUnits[i].isReadyForRemoval()) {
        this.scene.remove(this.combatUnits[i].mesh);
        this.combatUnits.splice(i, 1);
      }
    }
  }
}

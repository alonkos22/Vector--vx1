import * as THREE from 'three';
import { InputManager } from './game/InputManager';
import { RTSCamera } from './game/RTSCamera';
import { BiomeTerrain } from './game/BiomeTerrain';
import { CoreZone } from './game/CoreZone';
import { BIOMES } from './config/biomes';
import { FACTIONS } from './config/factions';
import { CYBER_NEXUS_BUILDINGS } from './config/buildings';
import { CYBER_NEXUS_UNITS } from './config/units';
import { PlayerEconomy } from './game/Economy';
import { ResourceNode, type ResourceType } from './game/ResourceNode';
import { Building } from './game/Building';
import { FluxHarvester } from './game/units/FluxHarvester';
import { CombatUnit } from './game/units/CombatUnit';
import { TrainingDummy } from './game/units/TrainingDummy';
import { Unit } from './game/units/Unit';
import { pathGrid } from './game/Pathfinding';
import { EffectManager } from './game/CombatVFX';
import { SelectionManager } from './game/Selection';
import { ConvergenceManager } from './game/Convergence';
import { CYBER_NEXUS_CONVERGENCE } from './config/convergence';
import { HUD, type HUDPanelDef, type HUDPanelState } from './ui/HUD';

function formatCost(costCoreEnergy: number, costFactionResource: number, buildTimeSec: number): string {
  const parts: string[] = [];
  if (costCoreEnergy > 0) parts.push(`${costCoreEnergy}⚡`);
  if (costFactionResource > 0) parts.push(`${costFactionResource}◆`);
  return `${parts.join(' ')} · ${buildTimeSec}s`;
}

const MAP_HALF_EXTENT = 100;
const FACTION = FACTIONS['cyber-nexus'];
const BASE_POSITION = new THREE.Vector3(-55, 0, -55);
const STARTING_HARVESTERS = 2;
const STARTING_CORE_ENERGY = 150;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = '';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d10);
scene.fog = new THREE.Fog(0x0b0d10, 120, 260);

const rtsCamera = new RTSCamera(window.innerWidth / window.innerHeight, {
  mapHalfExtent: MAP_HALF_EXTENT,
});
rtsCamera.target.copy(BASE_POSITION);

const input = new InputManager(renderer.domElement);

// Twin-sun placeholder lighting (Milestone 8 will drive this dynamically).
const sunA = new THREE.DirectionalLight(0xfff2e0, 1.6);
sunA.position.set(60, 90, 40);
sunA.castShadow = true;
sunA.shadow.mapSize.set(2048, 2048);
sunA.shadow.camera.left = -MAP_HALF_EXTENT;
sunA.shadow.camera.right = MAP_HALF_EXTENT;
sunA.shadow.camera.top = MAP_HALF_EXTENT;
sunA.shadow.camera.bottom = -MAP_HALF_EXTENT;
sunA.shadow.camera.far = 300;
scene.add(sunA);

const sunB = new THREE.DirectionalLight(0xbcd0ff, 0.5);
sunB.position.set(-70, 60, -50);
scene.add(sunB);

const ambient = new THREE.AmbientLight(0x404550, 0.6);
scene.add(ambient);

const terrain = new BiomeTerrain(BIOMES[FACTION.biomeId], MAP_HALF_EXTENT);
scene.add(terrain.group);

const coreZone = new CoreZone();
scene.add(coreZone.group);

const effects = new EffectManager(scene);

// ---------------------------------------------------------------------------
// Pathfinding grid: init before anything moves, then register static obstacles.
// ---------------------------------------------------------------------------

pathGrid.init(MAP_HALF_EXTENT, 2);
pathGrid.markCircleBlocked(new THREE.Vector3(0, 0, 0), 9);

// ---------------------------------------------------------------------------
// Economy loop
// ---------------------------------------------------------------------------

const economy = new PlayerEconomy(STARTING_CORE_ENERGY, 0);

const coreSpire = new Building(CYBER_NEXUS_BUILDINGS['core-spire'], BASE_POSITION, true);
scene.add(coreSpire.mesh);
pathGrid.markCircleBlocked(coreSpire.position, CYBER_NEXUS_BUILDINGS['core-spire'].footprint + 1);

let fluxSiphon: Building | null = null;

const resourceNodes: ResourceNode[] = [];
function addNode(type: ResourceType, offsetX: number, offsetZ: number): void {
  const pos = new THREE.Vector3(BASE_POSITION.x + offsetX, 0, BASE_POSITION.z + offsetZ);
  const node = new ResourceNode(type, pos);
  resourceNodes.push(node);
  scene.add(node.mesh);
}

// Core Energy veins near the base (density increases toward the map center per §5;
// this home cluster plus the ones scattered toward (0,0,0) sell that gradient).
addNode('coreEnergy', 14, -6);
addNode('coreEnergy', -10, 14);
addNode('coreEnergy', 26, 20);
addNode('coreEnergy', 34, 30);

// Data-Flux nodes native to the Cyber-Nexus metal-plains home biome.
addNode('factionResource', -18, -6);
addNode('factionResource', -6, -20);
addNode('factionResource', 10, -18);
addNode('factionResource', -20, 10);

function findNearestNode(type: ResourceType, from: THREE.Vector3): ResourceNode | null {
  let best: ResourceNode | null = null;
  let bestDist = Infinity;
  for (const node of resourceNodes) {
    if (node.type !== type || node.isDepleted()) continue;
    const dist = node.position.distanceTo(from);
    if (dist < bestDist) {
      bestDist = dist;
      best = node;
    }
  }
  return best;
}

const harvesters: FluxHarvester[] = [];
let assignedToEnergy = 0;
let assignedToFlux = 0;

function chooseResourceType(): ResourceType {
  if (!fluxSiphon || !fluxSiphon.isComplete) return 'coreEnergy';
  return assignedToEnergy <= assignedToFlux ? 'coreEnergy' : 'factionResource';
}

function spawnHarvester(position: THREE.Vector3): void {
  const config = CYBER_NEXUS_UNITS['flux-harvester'];
  const harvester = new FluxHarvester(position, config.moveSpeed, config.selectionRadius);
  scene.add(harvester.mesh);
  harvesters.push(harvester);

  const type = chooseResourceType();
  const dropoff = type === 'coreEnergy' ? coreSpire : fluxSiphon;
  const node = findNearestNode(type, position);
  if (node && dropoff) {
    harvester.assign(node, dropoff);
    if (type === 'coreEnergy') assignedToEnergy += 1;
    else assignedToFlux += 1;
  }
}

for (let i = 0; i < STARTING_HARVESTERS; i++) {
  const angle = (i / STARTING_HARVESTERS) * Math.PI * 2;
  const spawnPos = BASE_POSITION.clone().add(new THREE.Vector3(Math.cos(angle) * 5, 0, Math.sin(angle) * 5));
  spawnHarvester(spawnPos);
}

// ---------------------------------------------------------------------------
// Building placement (click-to-place ghost preview), generalized across
// every player-constructible building (Flux Siphon, Fabrication Node,
// Drone Foundry).
// ---------------------------------------------------------------------------

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

let fabricationNode: Building | null = null;
let droneFoundry: Building | null = null;

function screenToGround(clientX: number, clientY: number): THREE.Vector3 | null {
  const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, rtsCamera.camera);
  const point = new THREE.Vector3();
  return raycaster.ray.intersectPlane(groundPlane, point) ? point : null;
}

function getPlacedBuilding(buildingId: string): Building | null {
  if (buildingId === 'flux-siphon') return fluxSiphon;
  if (buildingId === 'fabrication-node') return fabricationNode;
  if (buildingId === 'drone-foundry') return droneFoundry;
  return null;
}

function setPlacedBuilding(buildingId: string, building: Building): void {
  if (buildingId === 'flux-siphon') fluxSiphon = building;
  else if (buildingId === 'fabrication-node') fabricationNode = building;
  else if (buildingId === 'drone-foundry') droneFoundry = building;
}

let placementTarget: string | null = null;
let ghostMesh: THREE.Mesh | null = null;

function beginPlacement(buildingId: string): void {
  const config = CYBER_NEXUS_BUILDINGS[buildingId];
  if (!config || getPlacedBuilding(buildingId) || placementTarget) return;
  if (!economy.canAfford(config.costCoreEnergy, config.costFactionResource)) return;

  placementTarget = buildingId;
  const geometry = new THREE.CylinderGeometry(config.footprint, config.footprint * 1.15, config.footprint * 1.6, 6);
  const material = new THREE.MeshBasicMaterial({ color: config.color, transparent: true, opacity: 0.4 });
  ghostMesh = new THREE.Mesh(geometry, material);
  ghostMesh.position.y = config.footprint * 0.8;
  scene.add(ghostMesh);
  hud.setStatus(`Placing ${config.name}…`);
}

function cancelPlacement(): void {
  placementTarget = null;
  if (ghostMesh) {
    scene.remove(ghostMesh);
    ghostMesh = null;
  }
  hud.setStatus('');
}

function confirmPlacement(point: THREE.Vector3): void {
  if (!placementTarget) return;
  const config = CYBER_NEXUS_BUILDINGS[placementTarget];
  if (!economy.canAfford(config.costCoreEnergy, config.costFactionResource)) {
    cancelPlacement();
    return;
  }
  economy.spend(config.costCoreEnergy, config.costFactionResource);
  const building = new Building(config, point, false);
  scene.add(building.mesh);
  pathGrid.markCircleBlocked(building.position, config.footprint + 1);
  setPlacedBuilding(placementTarget, building);
  cancelPlacement();
}

renderer.domElement.addEventListener('mousemove', (e) => {
  if (!placementTarget || !ghostMesh) return;
  const point = screenToGround(e.clientX, e.clientY);
  if (point) {
    ghostMesh.position.x = point.x;
    ghostMesh.position.z = point.z;
  }
});

renderer.domElement.addEventListener('click', (e) => {
  if (!placementTarget) return;
  const point = screenToGround(e.clientX, e.clientY);
  if (point) confirmPlacement(point);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && placementTarget) cancelPlacement();
});

// ---------------------------------------------------------------------------
// Combat units + placeholder training dummies
// ---------------------------------------------------------------------------

const combatUnits: CombatUnit[] = [];

function spawnCombatUnit(unitTypeId: string, position: THREE.Vector3): void {
  const config = CYBER_NEXUS_UNITS[unitTypeId];
  const unit = new CombatUnit(config, 'player', position, effects);
  scene.add(unit.mesh);
  combatUnits.push(unit);
}

const dummies: TrainingDummy[] = [];
function spawnDummy(position: THREE.Vector3): void {
  const dummy = new TrainingDummy(position);
  scene.add(dummy.mesh);
  dummies.push(dummy);
}
spawnDummy(BASE_POSITION.clone().add(new THREE.Vector3(28, 0, 6)));
spawnDummy(BASE_POSITION.clone().add(new THREE.Vector3(30, 0, -4)));

// ---------------------------------------------------------------------------
// Convergence (fusion), §3: a generic data-driven engine (ConvergenceManager)
// consuming the CYBER_NEXUS_CONVERGENCE recipe table. Screen shake + a brief
// hit-stop punctuate every completed fusion, per the "feel epic" build notes.
// ---------------------------------------------------------------------------

let hitStopRemaining = 0;
function triggerHitStop(durationSec: number): void {
  hitStopRemaining = Math.max(hitStopRemaining, durationSec);
}

function getAllBuildings(): Building[] {
  return [coreSpire, fluxSiphon, fabricationNode, droneFoundry].filter((b): b is Building => b !== null);
}

const convergence = new ConvergenceManager(scene, effects, (outputUnitId, position) => {
  spawnCombatUnit(outputUnitId, position);
  rtsCamera.triggerShake(0.9, 0.3);
  triggerHitStop(0.06);
});

// ---------------------------------------------------------------------------
// Selection + orders
// ---------------------------------------------------------------------------

function updateSelectionHUD(): void {
  if (selection.selected.size === 0) {
    hud.setSelectionInfo('');
    hud.setConvergenceOption(null);
    return;
  }
  const byType = new Map<string, number>();
  for (const unit of selection.selected) {
    byType.set(unit.unitTypeId, (byType.get(unit.unitTypeId) ?? 0) + 1);
  }
  const parts = [...byType.entries()].map(([id, n]) => `${n}× ${CYBER_NEXUS_UNITS[id]?.name ?? id}`);
  hud.setSelectionInfo(`Selected: ${parts.join(', ')}`);

  const selectedCombat = [...selection.selected].filter((u): u is CombatUnit => u instanceof CombatUnit);
  const recipe = convergence.findMatchingRecipe(CYBER_NEXUS_CONVERGENCE, selectedCombat);
  const canFuse = recipe && convergence.canAffordAndPlace(recipe, selectedCombat[0].position, economy, getAllBuildings());

  if (recipe && canFuse) {
    hud.setConvergenceOption({
      label: `⚡ ${recipe.mechanicName}: Converge into ${recipe.name} (${recipe.extraCoreEnergyCost}⚡ · ${recipe.channelTimeSec}s)`,
      onClick: () => {
        const units = [...selection.selected].filter((u): u is CombatUnit => u instanceof CombatUnit);
        if (convergence.beginFusion(recipe, units, economy, getAllBuildings())) {
          for (const u of units) selection.deselect(u);
          updateSelectionHUD();
        }
      },
    });
  } else {
    hud.setConvergenceOption(null);
  }
}

const selection = new SelectionManager(
  renderer,
  rtsCamera.camera,
  () => [...harvesters, ...combatUnits] as Unit[],
  updateSelectionHUD,
);

function pickDummyAt(clientX: number, clientY: number): TrainingDummy | null {
  const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, rtsCamera.camera);
  const meshes = dummies.filter((d) => d.isAlive()).map((d) => d.mesh);
  const hits = raycaster.intersectObjects(meshes, true);
  for (const hit of hits) {
    let obj: THREE.Object3D | null = hit.object;
    while (obj) {
      const ref = obj.userData.dummyRef as TrainingDummy | undefined;
      if (ref) return ref;
      obj = obj.parent;
    }
  }
  return null;
}

function issueOrderAt(clientX: number, clientY: number): void {
  const selectedCombat = [...selection.selected].filter((u): u is CombatUnit => u instanceof CombatUnit);
  if (selectedCombat.length === 0 || placementTarget) return;

  const dummy = pickDummyAt(clientX, clientY);
  if (dummy) {
    for (const unit of selectedCombat) unit.setTarget(dummy);
    return;
  }

  const point = screenToGround(clientX, clientY);
  if (!point) return;
  const spread = Math.min(1.2 * selectedCombat.length, 4);
  selectedCombat.forEach((unit, i) => {
    unit.setTarget(null);
    const angle = (i / selectedCombat.length) * Math.PI * 2;
    const offset =
      selectedCombat.length > 1
        ? new THREE.Vector3(Math.cos(angle) * spread, 0, Math.sin(angle) * spread)
        : new THREE.Vector3();
    unit.moveTo(point.clone().add(offset));
  });
}

renderer.domElement.addEventListener('mouseup', (e) => {
  if (e.button === 2) issueOrderAt(e.clientX, e.clientY);
});

// ---------------------------------------------------------------------------
// HUD + production queues
// ---------------------------------------------------------------------------

const PRODUCER_BUILDING_IDS = ['core-spire', 'flux-siphon', 'fabrication-node', 'drone-foundry'];

function tryQueueUnit(buildingId: string, unitTypeId: string): void {
  const building = buildingId === 'core-spire' ? coreSpire : getPlacedBuilding(buildingId);
  if (!building || !building.isComplete || !building.canEnqueue()) return;

  const config = CYBER_NEXUS_UNITS[unitTypeId];
  if (!economy.canAfford(config.costCoreEnergy, config.costFactionResource)) return;
  economy.spend(config.costCoreEnergy, config.costFactionResource);
  building.enqueueProduction(unitTypeId, config.buildTimeSec);
}

function onProductionFinished(buildingPosition: THREE.Vector3, unitTypeId: string): void {
  const jitter = new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6);
  const spawnPos = buildingPosition.clone().add(jitter);
  if (unitTypeId === 'flux-harvester') spawnHarvester(spawnPos);
  else spawnCombatUnit(unitTypeId, spawnPos);
}

const panelDefs: HUDPanelDef[] = PRODUCER_BUILDING_IDS.map((buildingId) => {
  const config = CYBER_NEXUS_BUILDINGS[buildingId];
  return {
    buildingId,
    buildingName: config.name,
    prebuilt: buildingId === 'core-spire',
    buildCostLabel: formatCost(config.costCoreEnergy, config.costFactionResource, config.buildTimeSec),
    units: config.produces.map((unitId) => {
      const unitConfig = CYBER_NEXUS_UNITS[unitId];
      return {
        unitId,
        name: unitConfig.name,
        costLabel: formatCost(unitConfig.costCoreEnergy, unitConfig.costFactionResource, unitConfig.buildTimeSec),
      };
    }),
  };
});

const hud = new HUD(app, panelDefs, {
  onBeginPlaceBuilding: beginPlacement,
  onQueueUnit: tryQueueUnit,
});

function buildPanelState(buildingId: string): HUDPanelState {
  const config = CYBER_NEXUS_BUILDINGS[buildingId];
  const building = buildingId === 'core-spire' ? coreSpire : getPlacedBuilding(buildingId);
  const built = building?.isComplete ?? false;

  const unitAffordability: Record<string, boolean> = {};
  for (const unitId of config.produces) {
    const unitConfig = CYBER_NEXUS_UNITS[unitId];
    unitAffordability[unitId] = economy.canAfford(unitConfig.costCoreEnergy, unitConfig.costFactionResource);
  }

  return {
    buildingId,
    built,
    placementActive: placementTarget === buildingId,
    constructionProgress: building && !building.isComplete ? building.constructionProgress() : null,
    canAffordBuilding: economy.canAfford(config.costCoreEnergy, config.costFactionResource),
    queueLength: building?.queueLength() ?? 0,
    queueProgress: building?.productionProgress() ?? null,
    queueFull: building ? !building.canEnqueue() : false,
    unitAffordability,
  };
}

function onResize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  rtsCamera.setAspect(window.innerWidth / window.innerHeight);
}
window.addEventListener('resize', onResize);

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.1);
  let dt = rawDt;
  if (hitStopRemaining > 0) {
    hitStopRemaining -= rawDt;
    dt = rawDt * 0.05;
  }

  terrain.update(rawDt);
  coreZone.update(rawDt);

  coreSpire.update(dt);
  fluxSiphon?.update(dt);
  fabricationNode?.update(dt);
  droneFoundry?.update(dt);

  for (const building of [coreSpire, fluxSiphon, fabricationNode, droneFoundry]) {
    if (!building) continue;
    const finishedUnitId = building.collectFinishedProduction();
    if (finishedUnitId) onProductionFinished(building.position, finishedUnitId);
  }

  for (const harvester of harvesters) harvester.update(dt, economy);

  for (const combatUnit of combatUnits) combatUnit.update(dt, rtsCamera.camera, dummies);
  for (let i = combatUnits.length - 1; i >= 0; i--) {
    if (!combatUnits[i].isAlive()) {
      scene.remove(combatUnits[i].mesh);
      combatUnits.splice(i, 1);
    }
  }
  for (const dummy of dummies) dummy.update(dt, rtsCamera.camera);
  effects.update(rawDt);
  convergence.update(dt);

  selection.prune();
  updateSelectionHUD();

  const supplyUsed =
    harvesters.length * CYBER_NEXUS_UNITS['flux-harvester'].supply +
    combatUnits.reduce((sum, u) => sum + (CYBER_NEXUS_UNITS[u.unitTypeId]?.supply ?? 0), 0);

  hud.update({
    coreEnergy: economy.coreEnergy,
    factionResource: economy.factionResource,
    factionResourceLabel: FACTION.factionResourceName,
    unitCount: harvesters.length + combatUnits.length,
    supplyUsed,
    panels: PRODUCER_BUILDING_IDS.map(buildPanelState),
  });

  rtsCamera.update(rawDt, input, window.innerWidth, window.innerHeight);
  renderer.render(scene, rtsCamera.camera);
}

animate();

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
import { HUD } from './ui/HUD';

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
// Flux Siphon placement (click-to-place, independent of the future unit-
// selection system landing in Milestone 4)
// ---------------------------------------------------------------------------

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let placementActive = false;
let ghostMesh: THREE.Mesh | null = null;

function screenToGround(clientX: number, clientY: number): THREE.Vector3 | null {
  const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, rtsCamera.camera);
  const point = new THREE.Vector3();
  return raycaster.ray.intersectPlane(groundPlane, point) ? point : null;
}

function beginPlaceFluxSiphon(): void {
  const config = CYBER_NEXUS_BUILDINGS['flux-siphon'];
  if (fluxSiphon || placementActive) return;
  if (!economy.canAfford(config.costCoreEnergy, config.costFactionResource)) return;

  placementActive = true;
  const geometry = new THREE.CylinderGeometry(config.footprint, config.footprint * 1.15, config.footprint * 1.6, 6);
  const material = new THREE.MeshBasicMaterial({ color: config.color, transparent: true, opacity: 0.4 });
  ghostMesh = new THREE.Mesh(geometry, material);
  ghostMesh.position.y = config.footprint * 0.8;
  scene.add(ghostMesh);
  hud.setStatus('Placing Flux Siphon…');
}

function cancelPlacement(): void {
  placementActive = false;
  if (ghostMesh) {
    scene.remove(ghostMesh);
    ghostMesh = null;
  }
  hud.setStatus('');
}

function confirmPlacement(point: THREE.Vector3): void {
  const config = CYBER_NEXUS_BUILDINGS['flux-siphon'];
  if (!economy.canAfford(config.costCoreEnergy, config.costFactionResource)) {
    cancelPlacement();
    return;
  }
  economy.spend(config.costCoreEnergy, config.costFactionResource);
  fluxSiphon = new Building(config, point, false);
  scene.add(fluxSiphon.mesh);
  pathGrid.markCircleBlocked(fluxSiphon.position, config.footprint + 1);
  cancelPlacement();
}

renderer.domElement.addEventListener('mousemove', (e) => {
  if (!placementActive || !ghostMesh) return;
  const point = screenToGround(e.clientX, e.clientY);
  if (point) {
    ghostMesh.position.x = point.x;
    ghostMesh.position.z = point.z;
  }
});

renderer.domElement.addEventListener('click', (e) => {
  if (!placementActive) return;
  const point = screenToGround(e.clientX, e.clientY);
  if (point) confirmPlacement(point);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && placementActive) cancelPlacement();
});

// ---------------------------------------------------------------------------
// Combat units + placeholder training dummies (Milestone 4)
// ---------------------------------------------------------------------------

const combatUnits: CombatUnit[] = [];

function spawnCombatUnit(unitTypeId: string, position: THREE.Vector3): void {
  const config = CYBER_NEXUS_UNITS[unitTypeId];
  const unit = new CombatUnit(config, 'player', position, effects);
  scene.add(unit.mesh);
  combatUnits.push(unit);
}

spawnCombatUnit('sentinel-drone', BASE_POSITION.clone().add(new THREE.Vector3(8, 0, 4)));
spawnCombatUnit('sentinel-drone', BASE_POSITION.clone().add(new THREE.Vector3(8, 0, 7)));
spawnCombatUnit('phase-trooper', BASE_POSITION.clone().add(new THREE.Vector3(11, 0, 2)));
spawnCombatUnit('arc-walker', BASE_POSITION.clone().add(new THREE.Vector3(11, 0, 9)));

const dummies: TrainingDummy[] = [];
function spawnDummy(position: THREE.Vector3): void {
  const dummy = new TrainingDummy(position);
  scene.add(dummy.mesh);
  dummies.push(dummy);
}
spawnDummy(BASE_POSITION.clone().add(new THREE.Vector3(28, 0, 6)));
spawnDummy(BASE_POSITION.clone().add(new THREE.Vector3(30, 0, -4)));

// ---------------------------------------------------------------------------
// Selection + orders
// ---------------------------------------------------------------------------

function updateSelectionHUD(): void {
  if (selection.selected.size === 0) {
    hud.setSelectionInfo('');
    return;
  }
  const byType = new Map<string, number>();
  for (const unit of selection.selected) {
    byType.set(unit.unitTypeId, (byType.get(unit.unitTypeId) ?? 0) + 1);
  }
  const parts = [...byType.entries()].map(([id, n]) => `${n}× ${CYBER_NEXUS_UNITS[id]?.name ?? id}`);
  hud.setSelectionInfo(`Selected: ${parts.join(', ')}`);
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
  if (selectedCombat.length === 0 || placementActive) return;

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
// HUD
// ---------------------------------------------------------------------------

function tryTrainHarvester(): void {
  const config = CYBER_NEXUS_UNITS['flux-harvester'];
  if (coreSpire.isProducing()) return;
  if (!economy.canAfford(config.costCoreEnergy, config.costFactionResource)) return;
  economy.spend(config.costCoreEnergy, config.costFactionResource);
  coreSpire.startProduction(config.id, config.buildTimeSec);
}

const hud = new HUD(app, {
  onTrainHarvester: tryTrainHarvester,
  onBeginPlaceFluxSiphon: beginPlaceFluxSiphon,
});

function onResize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  rtsCamera.setAspect(window.innerWidth / window.innerHeight);
}
window.addEventListener('resize', onResize);

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  terrain.update(dt);
  coreZone.update(dt);

  coreSpire.update(dt);
  fluxSiphon?.update(dt);

  const finishedUnitId = coreSpire.collectFinishedProduction();
  if (finishedUnitId === 'flux-harvester') {
    const jitter = new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6);
    spawnHarvester(BASE_POSITION.clone().add(jitter));
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
  effects.update(dt);

  selection.prune();
  updateSelectionHUD();

  const trainCfg = CYBER_NEXUS_UNITS['flux-harvester'];
  const siphonCfg = CYBER_NEXUS_BUILDINGS['flux-siphon'];
  hud.update({
    coreEnergy: economy.coreEnergy,
    factionResource: economy.factionResource,
    factionResourceLabel: FACTION.factionResourceName,
    harvesterCount: harvesters.length,
    supplyUsed: harvesters.length * trainCfg.supply,
    coreSpireProducing: coreSpire.isProducing(),
    coreSpireProgress: coreSpire.productionProgress(),
    fluxSiphonBuilt: fluxSiphon !== null,
    fluxSiphonProgress: fluxSiphon && !fluxSiphon.isComplete ? fluxSiphon.constructionProgress() : null,
    canAffordHarvester: economy.canAfford(trainCfg.costCoreEnergy, trainCfg.costFactionResource),
    canAffordFluxSiphon: economy.canAfford(siphonCfg.costCoreEnergy, siphonCfg.costFactionResource),
    placementModeActive: placementActive,
  });

  rtsCamera.update(dt, input, window.innerWidth, window.innerHeight);
  renderer.render(scene, rtsCamera.camera);
}

animate();

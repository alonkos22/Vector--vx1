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

// ---------------------------------------------------------------------------
// Economy loop
// ---------------------------------------------------------------------------

const economy = new PlayerEconomy(STARTING_CORE_ENERGY, 0);

const coreSpire = new Building(CYBER_NEXUS_BUILDINGS['core-spire'], BASE_POSITION, true);
scene.add(coreSpire.mesh);

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
  const harvester = new FluxHarvester(position, config.moveSpeed);
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

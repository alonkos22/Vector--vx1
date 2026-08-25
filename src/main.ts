import * as THREE from 'three';
import { InputManager } from './game/InputManager';
import { RTSCamera } from './game/RTSCamera';
import { BiomeTerrain } from './game/BiomeTerrain';
import { CoreZone } from './game/CoreZone';
import { BIOMES } from './config/biomes';
import { FACTIONS } from './config/factions';
import { CYBER_NEXUS_BUILDINGS } from './config/buildings';
import { CYBER_NEXUS_UNITS } from './config/units';
import { CYBER_NEXUS_CONVERGENCE } from './config/convergence';
import { PlayerBase } from './game/PlayerBase';
import { CombatUnit } from './game/units/CombatUnit';
import { TrainingDummy } from './game/units/TrainingDummy';
import { Unit } from './game/units/Unit';
import type { Targetable } from './game/Targetable';
import { pathGrid } from './game/Pathfinding';
import { EffectManager } from './game/CombatVFX';
import { SelectionManager } from './game/Selection';
import { ConvergenceManager } from './game/Convergence';
import { FogOfWar } from './game/FogOfWar';
import { AIController } from './game/ai/AIController';
import { SunProximity, type SunProximityStage } from './game/SunProximity';
import { CoreEnergyWave } from './game/hazards/CoreEnergyWave';
import { HUD, type HUDPanelDef, type HUDPanelState } from './ui/HUD';

function formatCost(costCoreEnergy: number, costFactionResource: number, buildTimeSec: number): string {
  const parts: string[] = [];
  if (costCoreEnergy > 0) parts.push(`${costCoreEnergy}⚡`);
  if (costFactionResource > 0) parts.push(`${costFactionResource}◆`);
  return `${parts.join(' ')} · ${buildTimeSec}s`;
}

const MAP_HALF_EXTENT = 100;
const FACTION = FACTIONS['cyber-nexus'];
const PLAYER_BASE_POSITION = new THREE.Vector3(-55, 0, -55);
const AI_BASE_POSITION = new THREE.Vector3(55, 0, 55);
const STARTING_HARVESTERS = 2;
const STARTING_CORE_ENERGY = 150;
/** Not specified in the design doc — a tunable homebrew match length. */
const MATCH_DURATION_SEC = 900;

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
rtsCamera.target.copy(PLAYER_BASE_POSITION);

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
// Sun Proximity (§5): match-time progress through Stable/Converging/Critical,
// driving real lighting (warmer, higher/shorter-shadow sun) and the Core
// Zone's pulse (already wired to accept a stage since Milestone 2). Also
// drives the Core Energy Wave hazard's intensity.
// ---------------------------------------------------------------------------

const sunProximity = new SunProximity(MATCH_DURATION_SEC);
const coreEnergyWave = new CoreEnergyWave();

const SUN_NEUTRAL_COLOR = new THREE.Color(0xfff2e0);
const SUN_INTENSE_COLOR = new THREE.Color(0xffa04d);
const SUN_BASE_HORIZONTAL = new THREE.Vector2(60, 40);
const SUN_BASE_HEIGHT = 90;

let previousStage: SunProximityStage = 'stable';

function applySunProximity(progress: number, stage: SunProximityStage): void {
  sunA.color.copy(SUN_NEUTRAL_COLOR).lerp(SUN_INTENSE_COLOR, progress);
  sunA.intensity = 1.6 + progress * 1.3;

  // Shadows shorten as the sun rises higher overhead (§4 lighting notes).
  const heightBoost = progress * 45;
  const horizScale = 1 - progress * 0.4;
  sunA.position.set(SUN_BASE_HORIZONTAL.x * horizScale, SUN_BASE_HEIGHT + heightBoost, SUN_BASE_HORIZONTAL.y * horizScale);

  coreZone.setStage(stage);

  if (stage !== previousStage) {
    // Let the stage change be felt, not just tracked.
    rtsCamera.triggerShake(stage === 'critical' ? 1.1 : 0.5, stage === 'critical' ? 0.5 : 0.3);
    triggerHitStop(0.05);
    matchStatusEl.textContent = `Sun Proximity: ${stage[0].toUpperCase()}${stage.slice(1)}`;
    previousStage = stage;
  }
}

const matchStatusEl = document.createElement('div');
matchStatusEl.style.cssText = `
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  background: rgba(10,16,24,0.75); border: 1px solid #2ea3ff55; border-radius: 6px;
  padding: 6px 16px; font-family: 'Segoe UI', Roboto, sans-serif; font-size: 13px;
  color: #dff3ff; text-shadow: 0 1px 3px rgba(0,0,0,0.8); pointer-events: none; user-select: none;
`;
matchStatusEl.textContent = 'Sun Proximity: Stable';
app.appendChild(matchStatusEl);

// ---------------------------------------------------------------------------
// Pathfinding grid: init before anything moves, then register static obstacles.
// ---------------------------------------------------------------------------

pathGrid.init(MAP_HALF_EXTENT, 2);
pathGrid.markCircleBlocked(new THREE.Vector3(0, 0, 0), 9);

// ---------------------------------------------------------------------------
// Player + AI bases — identical economy/production/army systems (PlayerBase),
// differing only in who drives them: UI clicks for the player, AIController's
// heuristics for the AI.
// ---------------------------------------------------------------------------

const playerBase = new PlayerBase('player', scene, effects, PLAYER_BASE_POSITION, STARTING_CORE_ENERGY);
const aiBase = new PlayerBase('ai', scene, effects, AI_BASE_POSITION, STARTING_CORE_ENERGY);

// Core Energy veins + Data-Flux nodes native to the Cyber-Nexus metal-plains
// home biome, mirrored 180° around each base (sign flips every offset).
function addHomeResourceNodes(base: PlayerBase, sign: 1 | -1): void {
  base.addResourceNode('coreEnergy', 14 * sign, -6 * sign);
  base.addResourceNode('coreEnergy', -10 * sign, 14 * sign);
  base.addResourceNode('coreEnergy', 26 * sign, 20 * sign);
  base.addResourceNode('coreEnergy', 34 * sign, 30 * sign);
  base.addResourceNode('factionResource', -18 * sign, -6 * sign);
  base.addResourceNode('factionResource', -6 * sign, -20 * sign);
  base.addResourceNode('factionResource', 10 * sign, -18 * sign);
  base.addResourceNode('factionResource', -20 * sign, 10 * sign);
}
addHomeResourceNodes(playerBase, 1);
addHomeResourceNodes(aiBase, -1);

function spawnStartingHarvesters(base: PlayerBase): void {
  for (let i = 0; i < STARTING_HARVESTERS; i++) {
    const angle = (i / STARTING_HARVESTERS) * Math.PI * 2;
    const spawnPos = base.basePosition.clone().add(new THREE.Vector3(Math.cos(angle) * 5, 0, Math.sin(angle) * 5));
    base.spawnHarvester(spawnPos);
  }
}
spawnStartingHarvesters(playerBase);
spawnStartingHarvesters(aiBase);

const aiController = new AIController(aiBase, PLAYER_BASE_POSITION);

// ---------------------------------------------------------------------------
// Fog of war (player's view only — the AI sees the whole map, a standard
// simplification for a scripted opponent).
// ---------------------------------------------------------------------------

const fogOfWar = new FogOfWar(MAP_HALF_EXTENT, 4);
scene.add(fogOfWar.mesh);

// ---------------------------------------------------------------------------
// Building placement (click-to-place ghost preview), generalized across
// every player-constructible building (Flux Siphon, Fabrication Node,
// Drone Foundry).
// ---------------------------------------------------------------------------

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function screenToGround(clientX: number, clientY: number): THREE.Vector3 | null {
  const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, rtsCamera.camera);
  const point = new THREE.Vector3();
  return raycaster.ray.intersectPlane(groundPlane, point) ? point : null;
}

let placementTarget: string | null = null;
let ghostMesh: THREE.Mesh | null = null;

function beginPlacement(buildingId: string): void {
  const config = CYBER_NEXUS_BUILDINGS[buildingId];
  if (!config || placementTarget || !playerBase.canAffordBuilding(buildingId)) return;

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
  playerBase.constructBuilding(placementTarget, point);
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
// Neutral placeholder training dummies (still useful for isolated testing
// alongside the real AI opponent).
// ---------------------------------------------------------------------------

const dummies: TrainingDummy[] = [];
function spawnDummy(position: THREE.Vector3): void {
  const dummy = new TrainingDummy(position);
  scene.add(dummy.mesh);
  dummies.push(dummy);
}
spawnDummy(PLAYER_BASE_POSITION.clone().add(new THREE.Vector3(28, 0, 6)));
spawnDummy(PLAYER_BASE_POSITION.clone().add(new THREE.Vector3(30, 0, -4)));

// ---------------------------------------------------------------------------
// Convergence (fusion) — player only; the AI doesn't use Convergence this
// milestone (a scoped limitation, not a missing system - AIController could
// grow this later without any engine changes).
// ---------------------------------------------------------------------------

let hitStopRemaining = 0;
function triggerHitStop(durationSec: number): void {
  hitStopRemaining = Math.max(hitStopRemaining, durationSec);
}

const convergence = new ConvergenceManager(scene, effects, (outputUnitId, position) => {
  playerBase.spawnCombatUnit(outputUnitId, position);
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
  const canFuse = recipe && convergence.canAffordAndPlace(recipe, selectedCombat[0].position, playerBase.economy, playerBase.allBuildings());

  if (recipe && canFuse) {
    hud.setConvergenceOption({
      label: `⚡ ${recipe.mechanicName}: Converge into ${recipe.name} (${recipe.extraCoreEnergyCost}⚡ · ${recipe.channelTimeSec}s)`,
      onClick: () => {
        const units = [...selection.selected].filter((u): u is CombatUnit => u instanceof CombatUnit);
        if (convergence.beginFusion(recipe, units, playerBase.economy, playerBase.allBuildings())) {
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
  () => [...playerBase.harvesters, ...playerBase.combatUnits] as Unit[],
  updateSelectionHUD,
);

function pickTargetAt(clientX: number, clientY: number): Targetable | null {
  const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, rtsCamera.camera);
  const meshes = [
    ...dummies.filter((d) => d.isAlive()).map((d) => d.mesh),
    ...aiBase.harvesters.map((h) => h.mesh),
    ...aiBase.combatUnits.map((u) => u.mesh),
    ...aiBase.allBuildings().map((b) => b.mesh),
  ];
  const hits = raycaster.intersectObjects(meshes, true);
  for (const hit of hits) {
    let obj: THREE.Object3D | null = hit.object;
    while (obj) {
      const ref = (obj.userData.dummyRef ?? obj.userData.unitRef ?? obj.userData.buildingRef) as Targetable | undefined;
      if (ref) return ref;
      obj = obj.parent;
    }
  }
  return null;
}

function issueOrderAt(clientX: number, clientY: number): void {
  const selectedCombat = [...selection.selected].filter((u): u is CombatUnit => u instanceof CombatUnit);
  if (selectedCombat.length === 0 || placementTarget) return;

  const target = pickTargetAt(clientX, clientY);
  if (target) {
    for (const unit of selectedCombat) unit.setTarget(target);
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
  playerBase.tryQueueUnit(buildingId, unitTypeId);
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
  const building = playerBase.getPlacedBuilding(buildingId);
  const built = building?.isComplete ?? false;

  const unitAffordability: Record<string, boolean> = {};
  for (const unitId of config.produces) {
    const unitConfig = CYBER_NEXUS_UNITS[unitId];
    unitAffordability[unitId] = playerBase.economy.canAfford(unitConfig.costCoreEnergy, unitConfig.costFactionResource);
  }

  return {
    buildingId,
    built,
    placementActive: placementTarget === buildingId,
    constructionProgress: building && !building.isComplete ? building.constructionProgress() : null,
    canAffordBuilding: playerBase.economy.canAfford(config.costCoreEnergy, config.costFactionResource),
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

// ---------------------------------------------------------------------------
// Win/lose flow: destroying the enemy's main structure (Core Spire) is
// enough for the prototype. Freezes all gameplay updates once decided.
// ---------------------------------------------------------------------------

let matchOver = false;

function showMatchEndScreen(won: boolean): void {
  matchOver = true;
  hud.setStatus('');
  cancelPlacement();

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px;
    background: radial-gradient(ellipse at center, rgba(10,16,24,0.55) 0%, rgba(5,7,10,0.85) 100%);
    font-family: 'Segoe UI', Roboto, sans-serif; pointer-events: none; z-index: 100;
  `;

  const title = document.createElement('div');
  title.textContent = won ? 'VICTORY' : 'DEFEAT';
  title.style.cssText = `
    font-size: 64px; font-weight: 800; letter-spacing: 6px;
    color: ${won ? '#7fffb0' : '#ff6f6f'};
    text-shadow: 0 0 24px ${won ? '#4fe38caa' : '#ff5555aa'};
  `;

  const subtitle = document.createElement('div');
  subtitle.textContent = won ? "The enemy's Core Spire has fallen." : 'Your Core Spire has fallen.';
  subtitle.style.cssText = 'font-size: 16px; color: #dff3ff;';

  overlay.append(title, subtitle);
  app.appendChild(overlay);

  rtsCamera.triggerShake(won ? 1.2 : 0.7, 0.6);
}

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

  if (!matchOver) {
    sunProximity.update(dt);
    const sunState = sunProximity.snapshot();
    applySunProximity(sunState.progress, sunState.stage);

    playerBase.updateEconomy(dt, rtsCamera.camera);
    aiBase.updateEconomy(dt, rtsCamera.camera);

    playerBase.updateHarvesters(dt, rtsCamera.camera);
    aiBase.updateHarvesters(dt, rtsCamera.camera);

    const unitTargetables: Targetable[] = [
      ...dummies,
      ...playerBase.harvesters,
      ...playerBase.combatUnits,
      ...aiBase.harvesters,
      ...aiBase.combatUnits,
    ];
    const combatTargetables: Targetable[] = [...unitTargetables, ...playerBase.allBuildings(), ...aiBase.allBuildings()];
    playerBase.updateCombatUnits(dt, rtsCamera.camera, combatTargetables);
    aiBase.updateCombatUnits(dt, rtsCamera.camera, combatTargetables);

    const hazardIntensity = sunState.stage === 'critical' ? 2 : 1;
    coreEnergyWave.update(dt, unitTargetables, coreZone.group.position, hazardIntensity);

    for (const dummy of dummies) dummy.update(dt, rtsCamera.camera);
    effects.update(rawDt);
    convergence.update(dt);

    aiController.update(dt);

    fogOfWar.update(playerBase.visionSources());
    for (const harvester of aiBase.harvesters) harvester.mesh.visible = fogOfWar.isVisible(harvester.position);
    for (const unit of aiBase.combatUnits) unit.mesh.visible = fogOfWar.isVisible(unit.position);
    for (const building of aiBase.allBuildings()) building.mesh.visible = fogOfWar.isVisible(building.position);
    for (const dummy of dummies) dummy.mesh.visible = fogOfWar.isVisible(dummy.position);

    selection.prune();
    updateSelectionHUD();

    hud.update({
      coreEnergy: playerBase.economy.coreEnergy,
      factionResource: playerBase.economy.factionResource,
      factionResourceLabel: FACTION.factionResourceName,
      unitCount: playerBase.harvesters.length + playerBase.combatUnits.length,
      supplyUsed: playerBase.supplyUsed(),
      panels: PRODUCER_BUILDING_IDS.map(buildPanelState),
    });

    if (aiBase.isDefeated()) showMatchEndScreen(true);
    else if (playerBase.isDefeated()) showMatchEndScreen(false);
  }

  rtsCamera.update(rawDt, input, window.innerWidth, window.innerHeight);
  renderer.render(scene, rtsCamera.camera);
}

animate();

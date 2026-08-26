import * as THREE from 'three';
import { InputManager } from './game/InputManager';
import { RTSCamera } from './game/RTSCamera';
import { BiomeTerrain } from './game/BiomeTerrain';
import { CoreZone } from './game/CoreZone';
import { BIOMES } from './config/biomes';
import { FACTIONS } from './config/factions';
import { BUILDINGS_BY_FACTION, BUILDING_ROLES, type BuildingRole, type BuildingConfig } from './config/buildings';
import { UNITS_BY_FACTION } from './config/units';
import { CONVERGENCE_BY_FACTION } from './config/convergence';
import { BUILDING_FUSION_BY_FACTION } from './config/buildingFusion';
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
import { AIController, type AIDifficulty } from './game/ai/AIController';
import { SunProximity, type SunProximityStage } from './game/SunProximity';
import { CoreEnergyWave } from './game/hazards/CoreEnergyWave';
import { buildRallyFlag } from './game/RallyFlag';
import { HUD, type HUDPanelState } from './ui/HUD';
import { Minimap } from './ui/Minimap';
import { ControlGroupBar } from './ui/ControlGroupBar';
import { soundManager } from './game/SoundManager';

window.addEventListener('pointerdown', () => soundManager.unlock(), { once: true });
window.addEventListener('keydown', () => soundManager.unlock(), { once: true });

function formatCost(costCoreEnergy: number, costFactionResource: number, buildTimeSec: number): string {
  const parts: string[] = [];
  if (costCoreEnergy > 0) parts.push(`${costCoreEnergy}⚡`);
  if (costFactionResource > 0) parts.push(`${costFactionResource}◆`);
  return `${parts.join(' ')} · ${buildTimeSec}s`;
}

const MAP_HALF_EXTENT = 100;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = '';

/**
 * Everything below depends on which faction the player picked on the
 * faction-select screen (buildings, units, convergence recipes, home biome),
 * so it can't run until that choice is made — hence wrapping the whole
 * game setup + loop in a function invoked from showFactionSelectScreen()
 * at the bottom of this file, instead of running at module load time.
 */
function startGame(PLAYER_FACTION_ID: string): void {
/**
 * The AI opponent's faction (Milestone 9's live proof that PlayerBase/
 * AIController are faction-agnostic): picked at random from every other
 * faction on each page load, so all 5 non-player factions actually get
 * played rather than only ever facing one hardcoded opponent.
 */
const AI_CANDIDATE_FACTION_IDS = Object.keys(FACTIONS).filter((id) => id !== PLAYER_FACTION_ID);
const AI_FACTION_ID = AI_CANDIDATE_FACTION_IDS[Math.floor(Math.random() * AI_CANDIDATE_FACTION_IDS.length)];
const FACTION = FACTIONS[PLAYER_FACTION_ID];
const PLAYER_UNITS = UNITS_BY_FACTION[PLAYER_FACTION_ID];
const PLAYER_CONVERGENCE = CONVERGENCE_BY_FACTION[PLAYER_FACTION_ID];
const PLAYER_BASE_POSITION = new THREE.Vector3(-55, 0, -55);
const AI_BASE_POSITION = new THREE.Vector3(55, 0, 55);
const STARTING_HARVESTERS = 2;
const STARTING_CORE_ENERGY = 150;
/** Not specified in the design doc — a tunable homebrew match length. */
const MATCH_DURATION_SEC = 900;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

const playerBase = new PlayerBase(PLAYER_FACTION_ID, 'player', scene, effects, PLAYER_BASE_POSITION, STARTING_CORE_ENERGY);
const aiBase = new PlayerBase(AI_FACTION_ID, 'ai', scene, effects, AI_BASE_POSITION, STARTING_CORE_ENERGY);

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

const PLAYER_BUILDINGS = BUILDINGS_BY_FACTION[PLAYER_FACTION_ID];

/** The static default config for a role (used for cost/color before the building exists), or the live one once built — reads the actual building's config so a post-fusion role reflects its merged identity. */
function currentBuildingConfig(role: BuildingRole): BuildingConfig {
  return playerBase.getBuildingByRole(role)?.config ?? PLAYER_BUILDINGS[role];
}

let placementTarget: BuildingRole | null = null;
let ghostMesh: THREE.Mesh | null = null;

function beginPlacement(role: BuildingRole): void {
  const config = PLAYER_BUILDINGS[role];
  if (placementTarget || !playerBase.canAffordBuilding(role)) return;

  placementTarget = role;
  const geometry = new THREE.CylinderGeometry(config.footprint, config.footprint * 1.15, config.footprint * 1.6, 6);
  const material = new THREE.MeshBasicMaterial({ color: config.color, transparent: true, opacity: 0.4 });
  ghostMesh = new THREE.Mesh(geometry, material);
  ghostMesh.position.y = config.footprint * 0.8;
  scene.add(ghostMesh);
  hud.setStatus(`Placing ${config.name}…`);
  hud.closeTray();
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

let rallyTarget: BuildingRole | null = null;
let rallyGhost: THREE.Group | null = null;

function beginRallySet(role: BuildingRole): void {
  if (placementTarget || rallyTarget === role) return;
  cancelRally();
  rallyTarget = role;
  rallyGhost = buildRallyFlag();
  scene.add(rallyGhost);
  hud.setStatus('Click the ground to set the rally point (Esc to cancel)');
  hud.closeTray();
}

function cancelRally(): void {
  rallyTarget = null;
  if (rallyGhost) {
    scene.remove(rallyGhost);
    rallyGhost = null;
  }
  hud.setStatus('');
}

function confirmRally(point: THREE.Vector3): void {
  if (!rallyTarget) return;
  playerBase.setRallyPoint(rallyTarget, point);
  cancelRally();
}

function clearRallyPoint(role: BuildingRole): void {
  playerBase.setRallyPoint(role, null);
}

function mergeBuildings(): void {
  playerBase.beginBuildingFusion();
}

renderer.domElement.addEventListener('mousemove', (e) => {
  if (placementTarget && ghostMesh) {
    const point = screenToGround(e.clientX, e.clientY);
    if (point) {
      ghostMesh.position.x = point.x;
      ghostMesh.position.z = point.z;
    }
  } else if (rallyTarget && rallyGhost) {
    const point = screenToGround(e.clientX, e.clientY);
    if (point) rallyGhost.position.copy(point);
  }
});

renderer.domElement.addEventListener('click', (e) => {
  if (placementTarget) {
    const point = screenToGround(e.clientX, e.clientY);
    if (point) confirmPlacement(point);
  } else if (rallyTarget) {
    const point = screenToGround(e.clientX, e.clientY);
    if (point) confirmRally(point);
  }
});

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  if (placementTarget) cancelPlacement();
  if (rallyTarget) cancelRally();
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
  const byLabel = new Map<string, number>();
  for (const unit of selection.selected) {
    const baseName = PLAYER_UNITS[unit.unitTypeId]?.name ?? unit.unitTypeId;
    const rankSuffix = unit instanceof CombatUnit && unit.rankName() !== 'Recruit' ? ` (${unit.rankName()})` : '';
    const label = `${baseName}${rankSuffix}`;
    byLabel.set(label, (byLabel.get(label) ?? 0) + 1);
  }
  const parts = [...byLabel.entries()].map(([label, n]) => `${n}× ${label}`);
  hud.setSelectionInfo(`Selected: ${parts.join(', ')}`);

  const selectedCombat = [...selection.selected].filter((u): u is CombatUnit => u instanceof CombatUnit);
  const recipe = convergence.findMatchingRecipe(PLAYER_CONVERGENCE, selectedCombat);
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
  handleTouchTap,
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
  issueMoveOrderAtPoint(point, selectedCombat);
}

/** Formation move order to a known ground point — shared by the main viewport's right-click and the minimap's right-click, which has no screen-space raycast to pick an attack target from and so is always a move order. */
function issueMoveOrderAtPoint(point: THREE.Vector3, selectedCombat: CombatUnit[]): void {
  if (selectedCombat.length === 0) return;
  const offsets = computeFormationOffsets(selectedCombat.length);
  selectedCombat.forEach((unit, i) => {
    unit.setTarget(null);
    unit.moveTo(point.clone().add(offsets[i]));
  });
}

/**
 * Grid formation centered on the order point, one slot per unit — scales
 * with army size in both dimensions (unlike a single ring of fixed max
 * radius, which crowds a large army into the same cramped space a handful
 * of units would use).
 */
function computeFormationOffsets(count: number): THREE.Vector3[] {
  if (count <= 1) return [new THREE.Vector3()];
  const spacing = 2.4;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const offsets: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - (cols - 1) / 2) * spacing;
    const z = (row - (rows - 1) / 2) * spacing;
    offsets.push(new THREE.Vector3(x, 0, z));
  }
  return offsets;
}

/** Touch has no right-click, so a tap does double duty: select on a friendly unit, otherwise move/attack (issueOrderAt) — but only when something is already selected, so an empty-handed tap still just (de)selects normally. */
function handleTouchTap(clientX: number, clientY: number): boolean {
  if (placementTarget) return false;
  const selectedCombat = [...selection.selected].filter((u): u is CombatUnit => u instanceof CombatUnit);
  if (selectedCombat.length === 0 || selection.hasUnitAt(clientX, clientY)) return false;

  issueOrderAt(clientX, clientY);
  return true;
}

renderer.domElement.addEventListener('mouseup', (e) => {
  if (e.button === 2) issueOrderAt(e.clientX, e.clientY);
});

// ---------------------------------------------------------------------------
// HUD + production queues
// ---------------------------------------------------------------------------

function tryQueueUnit(role: BuildingRole, unitTypeId: string): void {
  playerBase.tryQueueUnit(role, unitTypeId);
}

const hud = new HUD(app, BUILDING_ROLES, {
  onBeginPlaceBuilding: beginPlacement,
  onQueueUnit: tryQueueUnit,
  onSetRallyPoint: beginRallySet,
  onClearRallyPoint: clearRallyPoint,
  onMergeBuildings: mergeBuildings,
});

const minimap = new Minimap(
  app,
  (worldX, worldZ) => {
    rtsCamera.target.set(worldX, 0, worldZ);
  },
  (worldX, worldZ) => {
    const selectedCombat = [...selection.selected].filter((u): u is CombatUnit => u instanceof CombatUnit);
    issueMoveOrderAtPoint(new THREE.Vector3(worldX, 0, worldZ), selectedCombat);
  },
);

const controlGroupBar = new ControlGroupBar(
  app,
  (groupNumber) => {
    soundManager.playUIClick();
    selection.recallControlGroup(groupNumber);
  },
  (groupNumber) => {
    soundManager.playUIClick();
    selection.setControlGroup(groupNumber);
  },
);

function buildPanelState(role: BuildingRole): HUDPanelState {
  const config = currentBuildingConfig(role);
  const building = playerBase.getBuildingByRole(role);
  const built = building?.isComplete ?? false;

  const units = config.produces.map((unitId) => {
    const unitConfig = PLAYER_UNITS[unitId];
    return { unitId, name: unitConfig.name, costLabel: formatCost(unitConfig.costCoreEnergy, unitConfig.costFactionResource, unitConfig.buildTimeSec) };
  });
  const unitAffordability: Record<string, boolean> = {};
  for (const unitId of config.produces) {
    const unitConfig = PLAYER_UNITS[unitId];
    unitAffordability[unitId] = playerBase.economy.canAfford(unitConfig.costCoreEnergy, unitConfig.costFactionResource);
  }

  const fusionRecipe = role === 'heavyProduction' ? BUILDING_FUSION_BY_FACTION[PLAYER_FACTION_ID] : null;
  const showMergeOption = !!fusionRecipe && playerBase.canFuseBuildings();

  return {
    role,
    buildingName: config.name,
    prebuilt: role === 'main',
    built,
    placementActive: placementTarget === role,
    constructionProgress: building && !building.isComplete ? building.constructionProgress() : null,
    buildCostLabel: formatCost(config.costCoreEnergy, config.costFactionResource, config.buildTimeSec),
    canAffordBuilding: playerBase.economy.canAfford(config.costCoreEnergy, config.costFactionResource),
    units,
    unitAffordability,
    queueLength: building?.queueLength() ?? 0,
    queueProgress: building?.productionProgress() ?? null,
    queueFull: building ? !building.canEnqueue() : false,
    hasRallyPoint: !!building?.rallyPoint,
    rallyArmed: rallyTarget === role,
    showMergeOption,
    mergeCostLabel: fusionRecipe ? formatCost(fusionRecipe.extraCoreEnergyCost, fusionRecipe.extraFactionResourceCost, fusionRecipe.buildTimeSec) : '',
    canAffordMerge: showMergeOption,
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
let gameStarted = false;

// ---------------------------------------------------------------------------
// Under-attack alert: the human player has no way to notice a raid on a
// part of the base the camera isn't currently looking at, unlike the AI
// (which sees the whole map every frame in checkForThreats). Same hp-delta
// detection approach, gated by a distance-from-view check and a cooldown so
// it doesn't spam while a fight is already on-screen.
// ---------------------------------------------------------------------------

const playerLastHpByEntity = new Map<Targetable, number>();
let underAttackCooldown = 0;
let alertTargetPos: THREE.Vector3 | null = null;

const alertBanner = document.createElement('div');
alertBanner.style.cssText = `
  position: absolute; top: 60px; left: 50%; transform: translateX(-50%);
  background: rgba(120,10,10,0.92); border: 1px solid #ff6f6f; border-radius: 6px;
  padding: 8px 18px; font-size: 14px; font-weight: 700; color: #ffdede;
  font-family: 'Segoe UI', Roboto, sans-serif; cursor: pointer; display: none;
  z-index: 50; text-shadow: 0 1px 3px rgba(0,0,0,0.8);
`;
alertBanner.textContent = '⚠ Base under attack — click to view';
app.appendChild(alertBanner);
alertBanner.addEventListener('click', () => {
  if (alertTargetPos) rtsCamera.target.copy(alertTargetPos);
  alertBanner.style.display = 'none';
});

function checkPlayerUnderAttack(dt: number): void {
  underAttackCooldown = Math.max(0, underAttackCooldown - dt);
  const entities: Targetable[] = [...playerBase.allBuildings(), ...playerBase.harvesters, ...playerBase.combatUnits];
  let threatPos: THREE.Vector3 | null = null;
  for (const entity of entities) {
    const previousHp = playerLastHpByEntity.get(entity);
    if (previousHp !== undefined && entity.hp < previousHp) threatPos = entity.position.clone();
    playerLastHpByEntity.set(entity, entity.hp);
  }
  if (!threatPos || underAttackCooldown > 0) return;
  if (rtsCamera.target.distanceTo(threatPos) < 25) return; // already looking at the fight

  underAttackCooldown = 6;
  alertTargetPos = threatPos;
  alertBanner.style.display = 'block';
  soundManager.playAlert();
  setTimeout(() => {
    alertBanner.style.display = 'none';
  }, 4000);
}

function showStartScreen(): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 22px;
    background: radial-gradient(ellipse at center, rgba(10,16,24,0.9) 0%, rgba(5,7,10,0.98) 100%);
    font-family: 'Segoe UI', Roboto, sans-serif; z-index: 200;
  `;

  const title = document.createElement('div');
  title.textContent = 'VECTOR VX1';
  title.style.cssText = `
    font-size: 48px; font-weight: 800; letter-spacing: 8px; color: #9fe8ff;
    text-shadow: 0 0 24px #4fc3ffaa;
  `;

  const subtitle = document.createElement('div');
  subtitle.textContent = `You play ${FACTION.name}. Choose the AI opponent's difficulty to begin.`;
  subtitle.style.cssText = 'font-size: 14px; color: #dff3ffcc;';

  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = 'display: flex; gap: 14px;';

  const difficulties: Array<{ level: AIDifficulty; label: string }> = [
    { level: 'easy', label: 'Easy' },
    { level: 'medium', label: 'Medium' },
    { level: 'hard', label: 'Hard' },
  ];
  for (const { level, label } of difficulties) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      font-size: 16px; font-weight: 700; color: #0b0d10;
      background: linear-gradient(135deg, #9fe8ff, #4fc3ff); border: 1px solid #dff3ff;
      border-radius: 8px; padding: 14px 30px; cursor: pointer; touch-action: manipulation;
    `;
    btn.addEventListener('click', () => {
      soundManager.unlock();
      soundManager.playUIClick();
      aiController.setDifficulty(level);
      gameStarted = true;
      overlay.remove();
    });
    buttonRow.appendChild(btn);
  }

  overlay.append(title, subtitle, buttonRow);
  app.appendChild(overlay);
}

function showMatchEndScreen(won: boolean): void {
  matchOver = true;
  hud.setStatus('');
  cancelPlacement();
  if (won) soundManager.playVictory();
  else soundManager.playDefeat();

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

  if (!matchOver && gameStarted) {
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
    checkPlayerUnderAttack(dt);

    fogOfWar.update(playerBase.visionSources());
    for (const harvester of aiBase.harvesters) harvester.mesh.visible = fogOfWar.isVisible(harvester.position);
    for (const unit of aiBase.combatUnits) unit.mesh.visible = fogOfWar.isVisible(unit.position);
    for (const building of aiBase.allBuildings()) building.mesh.visible = fogOfWar.isVisible(building.position);
    for (const dummy of dummies) dummy.mesh.visible = fogOfWar.isVisible(dummy.position);

    minimap.update({
      mapHalfExtent: MAP_HALF_EXTENT,
      playerBuildings: playerBase.allBuildings().map((b) => ({ x: b.position.x, z: b.position.z })),
      playerUnits: [...playerBase.harvesters, ...playerBase.combatUnits].map((u) => ({ x: u.position.x, z: u.position.z })),
      visibleEnemyBuildings: aiBase
        .allBuildings()
        .filter((b) => fogOfWar.isVisible(b.position))
        .map((b) => ({ x: b.position.x, z: b.position.z })),
      visibleEnemyUnits: [...aiBase.harvesters, ...aiBase.combatUnits]
        .filter((u) => fogOfWar.isVisible(u.position))
        .map((u) => ({ x: u.position.x, z: u.position.z })),
      cameraTarget: { x: rtsCamera.target.x, z: rtsCamera.target.z },
      cameraDistance: rtsCamera.viewDistance,
    });

    selection.prune();
    updateSelectionHUD();
    controlGroupBar.update([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => selection.hasControlGroup(n)));

    hud.update({
      coreEnergy: playerBase.economy.coreEnergy,
      factionResource: playerBase.economy.factionResource,
      factionResourceLabel: FACTION.factionResourceName,
      unitCount: playerBase.harvesters.length + playerBase.combatUnits.length,
      supplyUsed: playerBase.supplyUsed(),
      panels: BUILDING_ROLES.map(buildPanelState),
    });

    if (aiBase.isDefeated()) showMatchEndScreen(true);
    else if (playerBase.isDefeated()) showMatchEndScreen(false);
  }

  rtsCamera.update(rawDt, input, window.innerWidth, window.innerHeight);
  renderer.render(scene, rtsCamera.camera);
}

showStartScreen();
animate();
}

/** Faction-select screen, shown before startGame() so it can be picked without any game state existing yet. */
function showFactionSelectScreen(onPick: (factionId: string) => void): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 22px;
    background: radial-gradient(ellipse at center, rgba(10,16,24,0.9) 0%, rgba(5,7,10,0.98) 100%);
    font-family: 'Segoe UI', Roboto, sans-serif; z-index: 200;
  `;

  const title = document.createElement('div');
  title.textContent = 'VECTOR VX1';
  title.style.cssText = `
    font-size: 48px; font-weight: 800; letter-spacing: 8px; color: #9fe8ff;
    text-shadow: 0 0 24px #4fc3ffaa;
  `;

  const subtitle = document.createElement('div');
  subtitle.textContent = 'Choose your faction.';
  subtitle.style.cssText = 'font-size: 14px; color: #dff3ffcc;';

  const grid = document.createElement('div');
  grid.style.cssText = 'display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; max-width: 720px;';

  for (const factionId of Object.keys(FACTIONS)) {
    const faction = FACTIONS[factionId];
    const swatch = `#${faction.colorPrimary.toString(16).padStart(6, '0')}`;
    const btn = document.createElement('button');
    btn.style.cssText = `
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 700; color: #dff3ff;
      background: rgba(10,16,24,0.75); border: 2px solid ${swatch}; border-radius: 10px;
      padding: 16px 20px; cursor: pointer; touch-action: manipulation; width: 150px;
    `;
    const swatchEl = document.createElement('div');
    swatchEl.style.cssText = `width: 36px; height: 36px; border-radius: 50%; background: ${swatch}; box-shadow: 0 0 14px ${swatch}aa;`;
    const nameEl = document.createElement('div');
    nameEl.textContent = faction.name;
    const flavorEl = document.createElement('div');
    flavorEl.textContent = faction.factionResourceName;
    flavorEl.style.cssText = 'font-size: 11px; font-weight: 400; color: #9fd8ffaa;';
    btn.append(swatchEl, nameEl, flavorEl);
    btn.addEventListener('click', () => {
      soundManager.unlock();
      soundManager.playUIClick();
      overlay.remove();
      onPick(factionId);
    });
    grid.appendChild(btn);
  }

  overlay.append(title, subtitle, grid);
  app.appendChild(overlay);
}

showFactionSelectScreen((factionId) => startGame(factionId));

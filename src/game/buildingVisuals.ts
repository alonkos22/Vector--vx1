import * as THREE from 'three';
import type { BuildingRole } from '../config/buildings';
import { getImportedBuildingModel } from './ImportedBuildingModels';

/**
 * Procedural per-role building silhouettes (§4's "not a single hexagon"
 * pass), now branched per faction's shapeFamily so identity reads beyond
 * color: 'round' factions build with domes/drums/spheres (smooth, high
 * radial-segment or curved primitives), 'angular' factions with flat-panel
 * boxes and low-segment (4-sided) prisms (hard edges, sharp corners). Every
 * faction still shares the same four role archetypes, sized off footprint
 * and tinted with its own color/material - only the underlying primitive
 * family changes.
 */
export type ShapeFamily = 'round' | 'angular';

function withShadows(object: THREE.Object3D): THREE.Object3D {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
}

function makeMaterial(color: number, roughness: number, metalness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.1,
    roughness,
    metalness,
  });
}

/** Main structure, round family: wide domed plinth, curved tapering tower, a glowing orb cap. */
function buildMainRound(footprint: number, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();

  const baseHeight = footprint * 0.5;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(footprint * 1.05, footprint * 1.25, baseHeight, 20), material);
  base.position.y = baseHeight / 2;
  group.add(base);

  const towerHeight = footprint * 1.5;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(footprint * 0.35, footprint * 0.8, towerHeight, 16), material);
  tower.position.y = baseHeight + towerHeight / 2;
  group.add(tower);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(footprint * 0.45, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7), material);
  dome.position.y = baseHeight + towerHeight;
  group.add(dome);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(footprint * 0.28, 14, 10), material);
  cap.position.y = baseHeight + towerHeight + footprint * 0.4;
  group.add(cap);

  return group;
}

/** Main structure, angular family: hard-edged plinth, faceted tapered tower, a sharp crystal cap. */
function buildMainAngular(footprint: number, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();

  const baseHeight = footprint * 0.5;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(footprint * 1.05, footprint * 1.3, baseHeight, 4), material);
  base.rotation.y = Math.PI / 4;
  base.position.y = baseHeight / 2;
  group.add(base);

  const towerHeight = footprint * 1.6;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(footprint * 0.32, footprint * 0.85, towerHeight, 4), material);
  tower.rotation.y = Math.PI / 4;
  tower.position.y = baseHeight + towerHeight / 2;
  group.add(tower);

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(footprint * 0.42, 0), material);
  crystal.position.y = baseHeight + towerHeight + footprint * 0.35;
  group.add(crystal);

  return group;
}

/** Resource dropoff, round family: squat dome, spherical tank, two curved collector loops. */
function buildResourceDropoffRound(footprint: number, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();

  const baseHeight = footprint * 0.45;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(footprint, footprint * 1.1, baseHeight, 18), material);
  base.position.y = baseHeight / 2;
  group.add(base);

  const tank = new THREE.Mesh(new THREE.SphereGeometry(footprint * 0.6, 16, 12), material);
  tank.position.y = baseHeight + footprint * 0.5;
  group.add(tank);

  const loopGeo = new THREE.TorusGeometry(footprint * 0.35, footprint * 0.06, 8, 16);
  for (const [dx, dz] of [
    [0.4, 0.4],
    [-0.4, -0.4],
  ] as const) {
    const loop = new THREE.Mesh(loopGeo, material);
    loop.position.set(dx * footprint, baseHeight + footprint * 0.5, dz * footprint);
    loop.rotation.x = Math.PI / 2;
    group.add(loop);
  }

  return group;
}

/** Resource dropoff, angular family: squat box base, hex-panel drum, two straight collector pipes. */
function buildResourceDropoffAngular(footprint: number, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();

  const baseHeight = footprint * 0.5;
  const base = new THREE.Mesh(new THREE.BoxGeometry(footprint * 1.9, baseHeight, footprint * 1.9), material);
  base.position.y = baseHeight / 2;
  group.add(base);

  const drumHeight = footprint * 0.5;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(footprint * 0.65, footprint * 0.75, drumHeight, 6), material);
  drum.position.y = baseHeight + drumHeight / 2;
  group.add(drum);

  const pipeGeo = new THREE.BoxGeometry(footprint * 0.15, footprint * 0.15, footprint * 0.6);
  for (const [dx, dz] of [
    [0.4, 0.4],
    [-0.4, -0.4],
  ] as const) {
    const pipe = new THREE.Mesh(pipeGeo, material);
    pipe.position.set(dx * footprint, baseHeight + drumHeight + footprint * 0.3, dz * footprint);
    group.add(pipe);
  }

  return group;
}

/** Basic production, round family: curved silo body, domed roof, a round side pod. */
function buildBasicProductionRound(footprint: number, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();

  const bodyHeight = footprint * 1.0;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(footprint * 0.85, footprint * 0.95, bodyHeight, 18), material);
  body.position.y = bodyHeight / 2;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.SphereGeometry(footprint * 0.85, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), material);
  roof.position.y = bodyHeight;
  group.add(roof);

  const pod = new THREE.Mesh(new THREE.SphereGeometry(footprint * 0.28, 12, 10), material);
  pod.position.set(footprint * 0.6, bodyHeight * 0.5, footprint * 0.5);
  group.add(pod);

  return group;
}

/** Basic production, angular family: boxy factory body, pyramidal roof, a side vent. */
function buildBasicProductionAngular(footprint: number, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();

  const bodyHeight = footprint * 0.9;
  const body = new THREE.Mesh(new THREE.BoxGeometry(footprint * 1.6, bodyHeight, footprint * 1.6), material);
  body.position.y = bodyHeight / 2;
  group.add(body);

  const roofHeight = footprint * 0.5;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(footprint * 1.15, roofHeight, 4), material);
  roof.position.y = bodyHeight + roofHeight / 2;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  const vent = new THREE.Mesh(new THREE.BoxGeometry(footprint * 0.28, footprint * 0.7, footprint * 0.28), material);
  vent.position.set(footprint * 0.5, bodyHeight + footprint * 0.35, footprint * 0.3);
  group.add(vent);

  return group;
}

/** Heavy production, round family: bulbous main dome, two flanking round pods, a curved central stack. */
function buildHeavyProductionRound(footprint: number, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();

  const bodyHeight = footprint * 1.0;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(footprint * 0.95, footprint * 1.05, bodyHeight, 20), material);
  body.position.y = bodyHeight / 2;
  group.add(body);

  const domeCap = new THREE.Mesh(new THREE.SphereGeometry(footprint * 0.95, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), material);
  domeCap.position.y = bodyHeight;
  group.add(domeCap);

  const podGeo = new THREE.SphereGeometry(footprint * 0.4, 14, 10);
  for (const side of [-1, 1] as const) {
    const pod = new THREE.Mesh(podGeo, material);
    pod.position.set(side * footprint * 0.85, footprint * 0.4, -footprint * 0.4);
    group.add(pod);
  }

  const coreVent = new THREE.Mesh(new THREE.SphereGeometry(footprint * 0.3, 12, 10), material);
  coreVent.position.set(0, bodyHeight + footprint * 0.5, footprint * 0.3);
  group.add(coreVent);

  return group;
}

/** Heavy production, angular family: larger box body, two flanking angular towers, a boxy central smokestack. */
function buildHeavyProductionAngular(footprint: number, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();

  const bodyHeight = footprint * 1.1;
  const body = new THREE.Mesh(new THREE.BoxGeometry(footprint * 1.9, bodyHeight, footprint * 1.9), material);
  body.position.y = bodyHeight / 2;
  group.add(body);

  const towerHeight = footprint * 1.5;
  const towerGeo = new THREE.CylinderGeometry(footprint * 0.35, footprint * 0.4, towerHeight, 4);
  for (const side of [-1, 1] as const) {
    const tower = new THREE.Mesh(towerGeo, material);
    tower.rotation.y = Math.PI / 4;
    tower.position.set(side * footprint * 0.75, towerHeight / 2, -footprint * 0.4);
    group.add(tower);
  }

  const coreVent = new THREE.Mesh(new THREE.BoxGeometry(footprint * 0.55, footprint * 0.8, footprint * 0.55), material);
  coreVent.position.set(0, bodyHeight + footprint * 0.4, footprint * 0.3);
  group.add(coreVent);

  return group;
}

const BUILDERS: Record<ShapeFamily, Record<BuildingRole, (footprint: number, material: THREE.MeshStandardMaterial) => THREE.Group>> = {
  round: {
    main: buildMainRound,
    resourceDropoff: buildResourceDropoffRound,
    basicProduction: buildBasicProductionRound,
    heavyProduction: buildHeavyProductionRound,
  },
  angular: {
    main: buildMainAngular,
    resourceDropoff: buildResourceDropoffAngular,
    basicProduction: buildBasicProductionAngular,
    heavyProduction: buildHeavyProductionAngular,
  },
};

/** How far each archetype's top sits above the ground, in footprint units — used to place the health bar above the actual silhouette. Round and angular variants of a role are sized close enough to share one factor. */
export const BUILDING_TOP_HEIGHT_FACTOR: Record<BuildingRole, number> = {
  main: 2.85,
  resourceDropoff: 1.6,
  basicProduction: 1.4,
  heavyProduction: 1.9,
};

export function buildBuildingVisual(
  shapeKind: BuildingRole,
  footprint: number,
  color: number,
  roughness: number,
  metalness: number,
  shapeFamily: ShapeFamily,
  buildingId?: string,
): { group: THREE.Group; material: THREE.MeshStandardMaterial } {
  const imported = buildingId ? getImportedBuildingModel(buildingId) : null;
  if (imported) {
    // The imported model owns its own (already-flattened, already-cloned) materials — expose the first
    // one found as the nominal `material` return value for API compatibility; Building.ts itself
    // collects every material under the group by traversal for the construction fade-in, same as
    // CombatUnit's hit-flash does for imported unit models.
    let first: THREE.MeshStandardMaterial | null = null;
    imported.traverse((child) => {
      if (!first && child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) first = child.material;
    });
    return { group: imported as THREE.Group, material: first ?? makeMaterial(color, roughness, metalness) };
  }
  const material = makeMaterial(color, roughness, metalness);
  const group = withShadows(BUILDERS[shapeFamily][shapeKind](footprint, material)) as THREE.Group;
  return { group, material };
}

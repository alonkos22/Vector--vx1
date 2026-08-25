import * as THREE from 'three';
import type { BuildingRole } from '../config/buildings';

/**
 * Procedural per-role building silhouettes (§4's "not a single hexagon"
 * pass): every faction's buildings share these four archetypes — spire,
 * collector, factory, heavy-factory — sized off the building's footprint
 * and tinted with its own color, so faction identity still comes purely
 * from config (color/footprint), never a hardcoded per-building shape.
 */
function withShadows(object: THREE.Object3D): THREE.Object3D {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
}

function makeMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.1,
    roughness: 0.4,
    metalness: 0.6,
  });
}

/** Main structure: wide plinth, tapered tower, glowing crystal cap. */
function buildMain(footprint: number, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();

  const baseHeight = footprint * 0.5;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(footprint * 1.05, footprint * 1.25, baseHeight, 6), material);
  base.position.y = baseHeight / 2;
  group.add(base);

  const towerHeight = footprint * 1.6;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(footprint * 0.4, footprint * 0.85, towerHeight, 6), material);
  tower.position.y = baseHeight + towerHeight / 2;
  group.add(tower);

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(footprint * 0.4, 0), material);
  crystal.position.y = baseHeight + towerHeight + footprint * 0.35;
  group.add(crystal);

  return group;
}

/** Resource dropoff: squat base, drum, two collector pipes. */
function buildResourceDropoff(footprint: number, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();

  const baseHeight = footprint * 0.5;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(footprint, footprint * 1.1, baseHeight, 8), material);
  base.position.y = baseHeight / 2;
  group.add(base);

  const drumHeight = footprint * 0.5;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(footprint * 0.65, footprint * 0.75, drumHeight, 8), material);
  drum.position.y = baseHeight + drumHeight / 2;
  group.add(drum);

  const pipeGeo = new THREE.CylinderGeometry(footprint * 0.08, footprint * 0.08, footprint * 0.6, 6);
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

/** Basic production: boxy factory body, pyramidal roof, a side vent. */
function buildBasicProduction(footprint: number, material: THREE.MeshStandardMaterial): THREE.Group {
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

  const vent = new THREE.Mesh(new THREE.CylinderGeometry(footprint * 0.15, footprint * 0.15, footprint * 0.7, 8), material);
  vent.position.set(footprint * 0.5, bodyHeight + footprint * 0.35, footprint * 0.3);
  group.add(vent);

  return group;
}

/** Heavy production: larger body, two flanking towers, a central smokestack. */
function buildHeavyProduction(footprint: number, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();

  const bodyHeight = footprint * 1.1;
  const body = new THREE.Mesh(new THREE.BoxGeometry(footprint * 1.9, bodyHeight, footprint * 1.9), material);
  body.position.y = bodyHeight / 2;
  group.add(body);

  const towerHeight = footprint * 1.5;
  const towerGeo = new THREE.CylinderGeometry(footprint * 0.35, footprint * 0.4, towerHeight, 8);
  for (const side of [-1, 1] as const) {
    const tower = new THREE.Mesh(towerGeo, material);
    tower.position.set(side * footprint * 0.75, towerHeight / 2, -footprint * 0.4);
    group.add(tower);
  }

  const coreVent = new THREE.Mesh(new THREE.CylinderGeometry(footprint * 0.3, footprint * 0.3, footprint * 0.8, 8), material);
  coreVent.position.set(0, bodyHeight + footprint * 0.4, footprint * 0.3);
  group.add(coreVent);

  return group;
}

const BUILDERS: Record<BuildingRole, (footprint: number, material: THREE.MeshStandardMaterial) => THREE.Group> = {
  main: buildMain,
  resourceDropoff: buildResourceDropoff,
  basicProduction: buildBasicProduction,
  heavyProduction: buildHeavyProduction,
};

/** How far each archetype's top sits above the ground, in footprint units — used to place the health bar above the actual silhouette. */
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
): { group: THREE.Group; material: THREE.MeshStandardMaterial } {
  const material = makeMaterial(color);
  const group = withShadows(BUILDERS[shapeKind](footprint, material)) as THREE.Group;
  return { group, material };
}

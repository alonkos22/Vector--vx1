import * as THREE from 'three';

function withShadows(object: THREE.Object3D): THREE.Object3D {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  return object;
}

function buildSentinelDrone(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x4fc3ff,
    emissive: 0x0d3a55,
    emissiveIntensity: 0.7,
    metalness: 0.7,
    roughness: 0.25,
  });

  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), material);
  body.position.y = 1.3;
  group.add(body);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 6, 16), material);
  ring.position.y = 1.3;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  return withShadows(group);
}

function buildPhaseTrooper(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x6fd2ff,
    emissive: 0x123a55,
    emissiveIntensity: 0.5,
    metalness: 0.6,
    roughness: 0.35,
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.0, 4, 8), material);
  torso.position.y = 1.0;
  group.add(torso);

  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.9, 6), new THREE.MeshBasicMaterial({ color: 0x9fe8ff }));
  blade.position.set(0.45, 1.25, 0);
  blade.rotation.z = Math.PI / 2.4;
  group.add(blade);

  return withShadows(group);
}

function buildArcWalker(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x2ea3ff,
    emissive: 0x0a2f4d,
    emissiveIntensity: 0.6,
    metalness: 0.7,
    roughness: 0.3,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.4), material);
  body.position.y = 1.6;
  group.add(body);

  const legOffsets: Array<[number, number]> = [
    [-0.4, -0.5],
    [0.4, -0.5],
    [-0.4, 0.5],
    [0.4, 0.5],
  ];
  const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1.6, 6);
  for (const [x, z] of legOffsets) {
    const leg = new THREE.Mesh(legGeometry, material);
    leg.position.set(x, 0.8, z);
    group.add(leg);
  }

  return withShadows(group);
}

const BUILDERS: Record<string, () => THREE.Object3D> = {
  'sentinel-drone': buildSentinelDrone,
  'phase-trooper': buildPhaseTrooper,
  'arc-walker': buildArcWalker,
};

/** Placeholder combat-unit silhouettes, one distinct shape per unit type per §4's silhouette pillar. */
export function buildUnitVisual(unitTypeId: string): THREE.Object3D {
  const builder = BUILDERS[unitTypeId];
  if (!builder) throw new Error(`No visual defined for unit type "${unitTypeId}"`);
  return builder();
}

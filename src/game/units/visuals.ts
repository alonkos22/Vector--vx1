import * as THREE from 'three';

function withShadows(object: THREE.Object3D): THREE.Object3D {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  return object;
}

// ---------------------------------------------------------------------------
// Cyber-Nexus — brushed chrome/frosted glass, neon-blue glow (§4).
// ---------------------------------------------------------------------------

function buildFluxHarvester(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x4fc3ff,
    emissive: 0x0d3a55,
    emissiveIntensity: 0.6,
    metalness: 0.6,
    roughness: 0.35,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.8, 4, 8), material);
  body.position.y = 0.9;
  group.add(body);
  return withShadows(group);
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

function buildHiveConstruct(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x4fc3ff,
    emissive: 0x1560aa,
    emissiveIntensity: 0.85,
    metalness: 0.7,
    roughness: 0.2,
  });

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), material);
  core.position.y = 1.5;
  group.add(core);

  const satelliteOffsets: Array<[number, number, number]> = [
    [0.95, 1.5, 0],
    [-0.45, 1.9, 0.8],
    [-0.45, 1.1, -0.8],
  ];
  for (const [x, y, z] of satelliteOffsets) {
    const satellite = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), material);
    satellite.position.set(x, y, z);
    group.add(satellite);
  }

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.04, 6, 20), material);
  ring.position.y = 1.5;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  return withShadows(group);
}

function buildVanguardExecutioner(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x2ea3ff,
    emissive: 0x0a2f4d,
    emissiveIntensity: 0.7,
    metalness: 0.65,
    roughness: 0.3,
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.3, 4, 8), material);
  torso.position.y = 1.4;
  group.add(torso);

  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.5), material);
  shoulders.position.y = 2.0;
  group.add(shoulders);

  const bladeMaterial = new THREE.MeshBasicMaterial({ color: 0x9fe8ff });
  for (const side of [-1, 1] as const) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 1.2, 6), bladeMaterial);
    blade.position.set(side * 0.75, 1.6, 0);
    blade.rotation.z = side * (Math.PI / 2.6);
    group.add(blade);
  }

  return withShadows(group);
}

// ---------------------------------------------------------------------------
// Pyroliths — matte basalt/obsidian, breathing orange cracks (§4).
// ---------------------------------------------------------------------------

function buildCinderGrub(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x2a1c12,
    emissive: 0xff6a1a,
    emissiveIntensity: 0.8,
    roughness: 0.9,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), material);
  body.scale.set(1.3, 0.7, 1);
  body.position.y = 0.55;
  group.add(body);
  const bump = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), material);
  bump.position.set(0.5, 0.7, 0);
  group.add(bump);
  return withShadows(group);
}

function buildEmberWhelp(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x2a1c12,
    emissive: 0xff6a1a,
    emissiveIntensity: 0.9,
    roughness: 0.85,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), material);
  body.position.y = 0.9;
  group.add(body);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 5), material);
  spike.position.y = 1.5;
  group.add(spike);
  return withShadows(group);
}

function buildCinderHurler(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x241812,
    emissive: 0xcc4a10,
    emissiveIntensity: 0.75,
    roughness: 0.85,
    metalness: 0.08,
  });
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), material);
  body.position.y = 1.2;
  group.add(body);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.9, 6), material);
  arm.position.set(0.5, 1.5, 0);
  arm.rotation.z = Math.PI / 3;
  group.add(arm);
  return withShadows(group);
}

function buildBasaltBrute(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x1c140e,
    emissive: 0x8a2f10,
    emissiveIntensity: 0.7,
    roughness: 0.9,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), material);
  body.position.y = 1.3;
  group.add(body);
  const armGeometry = new THREE.CylinderGeometry(0.22, 0.3, 1.1, 6);
  for (const side of [-1, 1] as const) {
    const arm = new THREE.Mesh(armGeometry, material);
    arm.position.set(side * 0.85, 1.0, 0);
    group.add(arm);
  }
  return withShadows(group);
}

function buildBasaltBruteConverged(): THREE.Object3D {
  const group = buildBasaltBrute();
  group.scale.setScalar(1.25);
  return group;
}

function buildMagmaColossus(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x180f0a,
    emissive: 0xff4500,
    emissiveIntensity: 1.0,
    roughness: 0.9,
    metalness: 0.05,
  });
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), material);
  core.position.y = 1.8;
  group.add(core);
  const shoulderGeo = new THREE.DodecahedronGeometry(0.6, 0);
  for (const side of [-1, 1] as const) {
    const shoulder = new THREE.Mesh(shoulderGeo, material);
    shoulder.position.set(side * 1.1, 1.9, 0);
    group.add(shoulder);
  }
  const legGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.6, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, material);
    leg.position.set(side * 0.5, 0.8, 0);
    group.add(leg);
  }
  return withShadows(group);
}

// ---------------------------------------------------------------------------
// Solari Archons — "living light": soft, glowing, no legs, floating (§4).
// ---------------------------------------------------------------------------

function buildLumenWisp(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffe08a,
    emissive: 0xffd76a,
    emissiveIntensity: 1.1,
    roughness: 0.15,
    metalness: 0,
    transparent: true,
    opacity: 0.9,
  });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), material);
  orb.position.y = 1.4;
  group.add(orb);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 6, 16), material);
  ring.position.y = 1.4;
  ring.rotation.x = Math.PI / 2.3;
  group.add(ring);
  return withShadows(group);
}

function buildSolarAcolyte(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xf4c542,
    emissive: 0xf4c542,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 0.92,
  });
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 10), material);
  robe.position.y = 1.1;
  group.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), material);
  head.position.y = 1.9;
  group.add(head);
  return withShadows(group);
}

function buildHaloSeraph(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x9b5de5,
    emissive: 0x9b5de5,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), material);
  body.position.y = 1.8;
  group.add(body);
  const wingGeo = new THREE.PlaneGeometry(1.1, 0.5);
  for (const side of [-1, 1] as const) {
    const wing = new THREE.Mesh(wingGeo, material);
    wing.position.set(side * 0.7, 1.8, 0);
    wing.rotation.y = side * 0.5;
    group.add(wing);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 6, 20), material);
  halo.position.y = 2.35;
  halo.rotation.x = Math.PI / 2;
  group.add(halo);
  return withShadows(group);
}

function buildSolarAcolyteConverged(): THREE.Object3D {
  const group = buildSolarAcolyte();
  group.scale.setScalar(1.2);
  return group;
}

function buildRadiantAscendant(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffd700,
    emissiveIntensity: 1.1,
    roughness: 0.15,
    metalness: 0.05,
    transparent: true,
    opacity: 0.92,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), material);
  body.position.y = 2.0;
  group.add(body);
  const haloGeo = new THREE.TorusGeometry(0.75, 0.035, 6, 24);
  const halo1 = new THREE.Mesh(haloGeo, material);
  halo1.position.y = 2.0;
  halo1.rotation.x = Math.PI / 2;
  group.add(halo1);
  const halo2 = new THREE.Mesh(haloGeo, material);
  halo2.position.y = 2.0;
  halo2.rotation.y = Math.PI / 2;
  group.add(halo2);
  return withShadows(group);
}

// ---------------------------------------------------------------------------
// Frost-Forged — rusted steel, worn metal, industrial (§4).
// ---------------------------------------------------------------------------

function buildRustling(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x7a6a58,
    emissive: 0x4fd8e0,
    emissiveIntensity: 0.4,
    roughness: 0.75,
    metalness: 0.45,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.8), material);
  body.position.y = 0.6;
  group.add(body);
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.15, 10);
  const wheelOffsets: Array<[number, number]> = [
    [-0.3, -0.35],
    [0.3, -0.35],
    [-0.3, 0.35],
    [0.3, 0.35],
  ];
  for (const [x, z] of wheelOffsets) {
    const wheel = new THREE.Mesh(wheelGeo, material);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.25, z);
    group.add(wheel);
  }
  return withShadows(group);
}

function buildFrostTrooper(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xb5651d,
    emissive: 0x4fd8e0,
    emissiveIntensity: 0.35,
    roughness: 0.7,
    metalness: 0.5,
  });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 1.1, 8), material);
  torso.position.y = 1.0;
  group.add(torso);
  const rifle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), material);
  rifle.position.set(0.4, 1.1, 0.2);
  rifle.rotation.z = Math.PI / 2;
  group.add(rifle);
  return withShadows(group);
}

function buildPistonCrusher(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x8a4a17,
    emissive: 0x4fd8e0,
    emissiveIntensity: 0.4,
    roughness: 0.7,
    metalness: 0.5,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.9), material);
  body.position.y = 1.3;
  group.add(body);
  const claw = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 4), material);
  claw.position.set(0.75, 1.3, 0);
  claw.rotation.z = -Math.PI / 2;
  group.add(claw);
  const legGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.1, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, material);
    leg.position.set(side * 0.35, 0.6, 0);
    group.add(leg);
  }
  return withShadows(group);
}

function buildIceHowitzer(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x6f7a80,
    emissive: 0x4fd8e0,
    emissiveIntensity: 0.5,
    roughness: 0.65,
    metalness: 0.55,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.5, 8), material);
  base.position.y = 0.5;
  group.add(base);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 8), material);
  barrel.position.set(0, 0.9, 0.5);
  barrel.rotation.x = Math.PI / 2.6;
  group.add(barrel);
  return withShadows(group);
}

function buildPistonCrusherConverged(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x8a4a17,
    emissive: 0x4fd8e0,
    emissiveIntensity: 0.5,
    roughness: 0.7,
    metalness: 0.5,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.2, 1.0), material);
  body.position.y = 1.4;
  group.add(body);
  for (const side of [-1, 1] as const) {
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 4), material);
    claw.position.set(side * 0.85, 1.4, 0);
    claw.rotation.z = side * (-Math.PI / 2);
    group.add(claw);
  }
  const legGeo = new THREE.CylinderGeometry(0.2, 0.24, 1.2, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, material);
    leg.position.set(side * 0.4, 0.65, 0);
    group.add(leg);
  }
  return withShadows(group);
}

function buildJuggernautRig(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x4a3218,
    emissive: 0x4fd8e0,
    emissiveIntensity: 0.6,
    roughness: 0.65,
    metalness: 0.55,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.4), material);
  body.position.y = 1.6;
  group.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.0, 8), material);
  barrel.position.set(0, 1.7, 0.9);
  barrel.rotation.x = Math.PI / 2.4;
  group.add(barrel);
  const legGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.6, 6);
  const legOffsets: Array<[number, number]> = [
    [-0.6, -0.5],
    [0.6, -0.5],
    [-0.6, 0.5],
    [0.6, 0.5],
  ];
  for (const [x, z] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, material);
    leg.position.set(x, 0.8, z);
    group.add(leg);
  }
  return withShadows(group);
}

const BUILDERS: Record<string, () => THREE.Object3D> = {
  // Cyber-Nexus
  'flux-harvester': buildFluxHarvester,
  'sentinel-drone': buildSentinelDrone,
  'phase-trooper': buildPhaseTrooper,
  'arc-walker': buildArcWalker,
  'hive-construct': buildHiveConstruct,
  'vanguard-executioner': buildVanguardExecutioner,
  // Pyroliths
  'cinder-grub': buildCinderGrub,
  'ember-whelp': buildEmberWhelp,
  'cinder-hurler': buildCinderHurler,
  'basalt-brute': buildBasaltBrute,
  'basalt-brute-converged': buildBasaltBruteConverged,
  'magma-colossus': buildMagmaColossus,
  // Solari Archons
  'lumen-wisp': buildLumenWisp,
  'solar-acolyte': buildSolarAcolyte,
  'halo-seraph': buildHaloSeraph,
  'solar-acolyte-converged': buildSolarAcolyteConverged,
  'radiant-ascendant': buildRadiantAscendant,
  // Frost-Forged
  rustling: buildRustling,
  'frost-trooper': buildFrostTrooper,
  'piston-crusher': buildPistonCrusher,
  'ice-howitzer': buildIceHowitzer,
  'piston-crusher-converged': buildPistonCrusherConverged,
  'juggernaut-rig': buildJuggernautRig,
};

/** Placeholder combat-unit silhouettes, one distinct shape per unit type per §4's silhouette pillar. */
export function buildUnitVisual(unitTypeId: string): THREE.Object3D {
  const builder = BUILDERS[unitTypeId];
  if (!builder) throw new Error(`No visual defined for unit type "${unitTypeId}"`);
  return builder();
}

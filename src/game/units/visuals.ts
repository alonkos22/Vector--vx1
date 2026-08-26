import * as THREE from 'three';

function withShadows(object: THREE.Object3D): THREE.Object3D {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  return object;
}

// ---------------------------------------------------------------------------
// Cyber-Nexus — mirror-polished chrome, matte dark grey, neon-cyan glow,
// geometric edges, per the detailed unit catalog.
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
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.75), material);
  body.position.y = 0.9;
  group.add(body);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x9fe8ff });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMaterial);
  eye.position.set(0, 1.05, 0.42);
  group.add(eye);
  const collector = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 6), material);
  collector.position.y = 0.35;
  group.add(collector);
  return withShadows(group);
}

/** Nexus Striker: lightweight chrome/matte-black cyborg, single cyan visor line, arm-mounted plasma rifle. */
function buildNexusStriker(): THREE.Object3D {
  const group = new THREE.Group();
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc7d2da, emissive: 0x0d3a55, emissiveIntensity: 0.3, metalness: 0.85, roughness: 0.2 });
  const limbMaterial = new THREE.MeshStandardMaterial({ color: 0x1c2126, roughness: 0.5, metalness: 0.4 });
  const visorMaterial = new THREE.MeshBasicMaterial({ color: 0x4fe3ff });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 0.36), chrome);
  torso.position.y = 1.05;
  group.add(torso);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.06), visorMaterial);
  visor.position.set(0, 1.42, 0.24);
  group.add(visor);

  const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.55, 6);
  for (const side of [-1, 1] as const) {
    const arm = new THREE.Mesh(armGeo, limbMaterial);
    arm.position.set(side * 0.36, 0.95, 0);
    group.add(arm);
  }

  const rifle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 6), chrome);
  rifle.position.set(0.4, 1.0, 0.2);
  rifle.rotation.x = Math.PI / 2;
  group.add(rifle);

  return withShadows(group);
}

/** Tesla Archon: bulky chrome heavy infantry, dual transparent back-mounted Tesla coils crackling with blue electricity, glowing chest core. */
function buildTeslaArchon(): THREE.Object3D {
  const group = new THREE.Group();
  const chrome = new THREE.MeshStandardMaterial({ color: 0xaebdc8, emissive: 0x0a2f4d, emissiveIntensity: 0.4, metalness: 0.85, roughness: 0.2 });
  const coilMaterial = new THREE.MeshStandardMaterial({
    color: 0x4fc3ff,
    emissive: 0x4fc3ff,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.55,
    roughness: 0.1,
    metalness: 0.1,
  });
  const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x9fe8ff });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.6), chrome);
  torso.position.y = 1.35;
  group.add(torso);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), coreMaterial);
  core.position.set(0, 1.4, 0.42);
  group.add(core);

  const coilGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.1, 8);
  for (const side of [-1, 1] as const) {
    const coil = new THREE.Mesh(coilGeo, coilMaterial);
    coil.position.set(side * 0.32, 1.6, -0.35);
    group.add(coil);
  }

  const legGeo = new THREE.CylinderGeometry(0.14, 0.16, 1.0, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, chrome);
    leg.position.set(side * 0.28, 0.5, 0);
    group.add(leg);
  }

  return withShadows(group);
}

/** Nanite Weaver: spider-like four-legged chrome hover drone, glass torso globe filled with green-cyan nanite liquid. */
function buildNaniteWeaver(): THREE.Object3D {
  const group = new THREE.Group();
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc7d2da, metalness: 0.85, roughness: 0.2 });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x8affc0,
    emissive: 0x6ce8a0,
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0,
  });

  const globe = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), glassMaterial);
  globe.position.y = 1.1;
  group.add(globe);

  const shell = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 6), chrome);
  shell.position.y = 1.1;
  shell.rotation.x = Math.PI / 2.4;
  group.add(shell);

  const legGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.75, 6);
  const legOffsets: Array<[number, number]> = [
    [-0.5, -0.4],
    [0.5, -0.4],
    [-0.5, 0.4],
    [0.5, 0.4],
  ];
  for (const [x, z] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, chrome);
    leg.position.set(x, 0.55, z);
    leg.rotation.z = (x > 0 ? -1 : 1) * 0.5;
    leg.rotation.x = (z > 0 ? -1 : 1) * 0.35;
    group.add(leg);
  }

  return withShadows(group);
}

/** Hive Construct (3x Nexus Striker fusion): drone swarm-core, unchanged bespoke design. */
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

/** Storm-Grid Colossus (Tesla Archon + Nanite Weaver fusion): legless chrome siege mech floating over a crackling static-electricity ball. */
function buildStormGridColossus(): THREE.Object3D {
  const group = new THREE.Group();
  const chrome = new THREE.MeshStandardMaterial({ color: 0xaebdc8, emissive: 0x0a2f4d, emissiveIntensity: 0.5, metalness: 0.85, roughness: 0.15 });
  const stormMaterial = new THREE.MeshStandardMaterial({
    color: 0x4fc3ff,
    emissive: 0x4fc3ff,
    emissiveIntensity: 1.3,
    transparent: true,
    opacity: 0.5,
    roughness: 0.1,
    metalness: 0.1,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.15, 0.75), chrome);
  torso.position.y = 1.9;
  group.add(torso);

  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 0.55), chrome);
  shoulders.position.y = 2.4;
  group.add(shoulders);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.65, 14, 12), stormMaterial);
  ball.position.y = 1.0;
  group.add(ball);

  const sparkGeo = new THREE.ConeGeometry(0.06, 0.3, 4);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const spark = new THREE.Mesh(sparkGeo, stormMaterial);
    spark.position.set(Math.cos(angle) * 0.65, 1.0, Math.sin(angle) * 0.65);
    spark.rotation.z = angle;
    group.add(spark);
  }

  return withShadows(group);
}

// ---------------------------------------------------------------------------
// Pyroliths — black basalt rock, obsidian glass spines, glowing orange
// lava, toxic lime-green accents, per the detailed unit catalog.
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
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), material);
  body.scale.set(1.3, 0.7, 1);
  body.position.y = 0.55;
  group.add(body);
  const bump = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), material);
  bump.position.set(0.5, 0.7, 0);
  group.add(bump);
  const legGeo = new THREE.SphereGeometry(0.14, 6, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, material);
    leg.position.set(side * 0.35, 0.25, 0.35);
    group.add(leg);
  }
  return withShadows(group);
}

/** Magma Imp: small aggressive quadrupedal beast, cracked black rock, lava pulsing through its body. */
function buildMagmaImp(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x1c140e, emissive: 0xff6a1a, emissiveIntensity: 0.9, roughness: 0.9, metalness: 0.05 });

  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), material);
  body.scale.set(1.2, 0.85, 1);
  body.position.y = 0.55;
  group.add(body);

  const headGeo = new THREE.DodecahedronGeometry(0.2, 0);
  const head = new THREE.Mesh(headGeo, material);
  head.position.set(0, 0.65, 0.45);
  group.add(head);

  const legGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.4, 5);
  const legOffsets: Array<[number, number]> = [
    [-0.22, -0.25],
    [0.22, -0.25],
    [-0.22, 0.25],
    [0.22, 0.25],
  ];
  for (const [x, z] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, material);
    leg.position.set(x, 0.2, z);
    group.add(leg);
  }

  return withShadows(group);
}

/** Ignis Priest: hunched basalt shaman in a tattered ash-grey cloak, obsidian staff topped with a floating lava orb. */
function buildIgnisPriest(): THREE.Object3D {
  const group = new THREE.Group();
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x241c18, roughness: 0.9, metalness: 0.05 });
  const cloakMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.95, metalness: 0 });
  const lavaMaterial = new THREE.MeshBasicMaterial({ color: 0xff8a2a });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 4, 8), stoneMaterial);
  body.position.y = 0.85;
  body.rotation.x = 0.15;
  group.add(body);

  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 8), cloakMaterial);
  cloak.position.y = 0.6;
  group.add(cloak);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), stoneMaterial);
  head.position.set(0, 1.35, 0.08);
  group.add(head);

  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 6), stoneMaterial);
  staff.position.set(0.4, 1.0, 0);
  group.add(staff);

  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), lavaMaterial);
  orb.position.set(0.4, 1.75, 0);
  group.add(orb);

  return withShadows(group);
}

/** Acid Drake: obsidian dragon with black membrane wings, toxic-green acid dripping from its jaw, green chest cracks. */
function buildAcidDrake(): THREE.Object3D {
  const group = new THREE.Group();
  const obsidianMaterial = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.5, metalness: 0.15 });
  const acidMaterial = new THREE.MeshStandardMaterial({ color: 0x8aff5a, emissive: 0x8aff5a, emissiveIntensity: 1.1, roughness: 0.3, metalness: 0 });
  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.9, 4, 10), obsidianMaterial);
  body.rotation.z = Math.PI / 2;
  body.position.y = 1.3;
  group.add(body);

  const chestCrack = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), acidMaterial);
  chestCrack.position.set(0, 1.25, 0.3);
  group.add(chestCrack);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 6), obsidianMaterial);
  head.rotation.z = -Math.PI / 2;
  head.position.set(0.75, 1.3, 0);
  group.add(head);

  const jawDrip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), acidMaterial);
  jawDrip.position.set(0.95, 1.15, 0);
  group.add(jawDrip);

  const wingGeo = new THREE.PlaneGeometry(1.2, 0.7);
  for (const side of [-1, 1] as const) {
    const wing = new THREE.Mesh(wingGeo, wingMaterial);
    wing.position.set(-0.1, 1.45, side * 0.5);
    wing.rotation.x = side * 0.9;
    wing.rotation.y = Math.PI / 2;
    group.add(wing);
  }

  return withShadows(group);
}

/** Molten Behemoth (3x Magma Imp fusion): a larger rock brute with wide arms and deep lava cracks. */
function buildMoltenBehemoth(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x1c140e, emissive: 0xff6a1a, emissiveIntensity: 0.85, roughness: 0.9, metalness: 0.05 });

  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), material);
  body.position.y = 1.35;
  group.add(body);

  const armGeometry = new THREE.CylinderGeometry(0.24, 0.32, 1.2, 6);
  for (const side of [-1, 1] as const) {
    const arm = new THREE.Mesh(armGeometry, material);
    arm.position.set(side * 0.9, 1.0, 0);
    group.add(arm);
  }

  const legGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.7, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, material);
    leg.position.set(side * 0.4, 0.4, 0);
    group.add(leg);
  }

  return withShadows(group);
}

/** Obsidian Chimera (Magma Imp + Acid Drake fusion): three-headed flying rock monster with obsidian wings, breathing fire/lava/acid at once. */
function buildObsidianChimera(): THREE.Object3D {
  const group = new THREE.Group();
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x180f0a, emissive: 0xff4500, emissiveIntensity: 1.0, roughness: 0.85, metalness: 0.08 });
  const acidMaterial = new THREE.MeshBasicMaterial({ color: 0x8aff5a });
  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide });

  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), rockMaterial);
  body.position.y = 1.9;
  group.add(body);

  const headGeo = new THREE.ConeGeometry(0.2, 0.5, 6);
  const headOffsets: Array<[number, number, number, number]> = [
    [0.7, 2.0, 0, 0],
    [0.55, 2.3, 0.4, 0.4],
    [0.55, 1.7, -0.4, -0.4],
  ];
  for (const [x, y, z, tilt] of headOffsets) {
    const head = new THREE.Mesh(headGeo, rockMaterial);
    head.rotation.z = -Math.PI / 2 + tilt;
    head.position.set(x, y, z);
    group.add(head);
  }

  const flameGeo = new THREE.SphereGeometry(0.09, 6, 6);
  for (const [x, y, z] of [
    [1.0, 2.0, 0],
    [0.85, 2.3, 0.4],
    [0.85, 1.7, -0.4],
  ] as const) {
    const flame = new THREE.Mesh(flameGeo, acidMaterial);
    flame.position.set(x, y, z);
    group.add(flame);
  }

  const wingGeo = new THREE.PlaneGeometry(1.6, 0.9);
  for (const side of [-1, 1] as const) {
    const wing = new THREE.Mesh(wingGeo, wingMaterial);
    wing.position.set(-0.3, 2.0, side * 0.7);
    wing.rotation.x = side * 0.7;
    wing.rotation.y = Math.PI / 2;
    group.add(wing);
  }

  const legGeo = new THREE.CylinderGeometry(0.16, 0.2, 1.1, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, rockMaterial);
    leg.position.set(side * 0.35, 0.9, 0.1);
    group.add(leg);
  }

  return withShadows(group);
}

// ---------------------------------------------------------------------------
// Solari Archons — royal gold armor, pearl white accents, radiant violet
// plasma energy, floating sacred geometry, per the detailed unit catalog.
// ---------------------------------------------------------------------------

/** Solar Zealot: slender floating gold-armored warrior, dual wrist-mounted violet plasma blades, faceless gold helmet. */
function buildSolarZealot(): THREE.Object3D {
  const group = new THREE.Group();
  const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xf4c542, emissive: 0xd9a834, emissiveIntensity: 0.5, roughness: 0.25, metalness: 0.7 });
  const bladeMaterial = new THREE.MeshBasicMaterial({ color: 0xb27bff });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.65, 4, 10), goldMaterial);
  torso.position.y = 1.1;
  group.add(torso);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), goldMaterial);
  helmet.position.y = 1.55;
  group.add(helmet);

  const bladeGeo = new THREE.ConeGeometry(0.05, 0.4, 5);
  for (const side of [-1, 1] as const) {
    const blade = new THREE.Mesh(bladeGeo, bladeMaterial);
    blade.position.set(side * 0.4, 0.85, 0.1);
    blade.rotation.z = side * (Math.PI / 2.5);
    group.add(blade);
  }

  return withShadows(group);
}

/** Void Arbiter: six-armed floating gold entity with a sun mask and purple third eye, no legs, floating on a pillar of psychic force. */
function buildVoidArbiter(): THREE.Object3D {
  const group = new THREE.Group();
  const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xf4c542, emissive: 0xd9a834, emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.7 });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x9b5de5 });
  const psychicMaterial = new THREE.MeshStandardMaterial({
    color: 0x9b5de5,
    emissive: 0x9b5de5,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.4,
    roughness: 0.2,
    metalness: 0,
  });

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), goldMaterial);
  torso.position.y = 1.6;
  group.add(torso);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMaterial);
  eye.position.set(0, 1.68, 0.42);
  group.add(eye);

  const armGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.55, 6);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const arm = new THREE.Mesh(armGeo, goldMaterial);
    arm.position.set(Math.cos(angle) * 0.55, 1.55, Math.sin(angle) * 0.55);
    arm.rotation.z = Math.cos(angle) * 0.9;
    arm.rotation.x = Math.sin(angle) * 0.9;
    group.add(arm);
  }

  const pillar = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.3, 10, 1, true), psychicMaterial);
  pillar.position.y = 0.55;
  group.add(pillar);

  return withShadows(group);
}

/** Astral Frost Scribe: tall thin golden entity enveloped in floating rings of frozen purple crystal ice. */
function buildAstralFrostScribe(): THREE.Object3D {
  const group = new THREE.Group();
  const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xf4c542, emissive: 0xf4c542, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.65 });
  const iceMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9a8ff,
    emissive: 0xc9a8ff,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0,
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.0, 4, 10), goldMaterial);
  body.position.y = 1.3;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), goldMaterial);
  head.position.y = 1.95;
  group.add(head);

  const ringGeo = new THREE.TorusGeometry(0.45, 0.03, 6, 16);
  const ringHeights = [0.9, 1.35, 1.75];
  ringHeights.forEach((y, i) => {
    const ring = new THREE.Mesh(ringGeo, iceMaterial);
    ring.position.y = y;
    ring.rotation.x = Math.PI / 2 + i * 0.5;
    ring.rotation.y = i * 0.4;
    group.add(ring);
  });

  return withShadows(group);
}

/** Ascended Zealot (3x Solar Zealot fusion): a Solar Zealot wreathed in a wider halo of violet plasma. */
function buildAscendedZealot(): THREE.Object3D {
  const group = buildSolarZealot();
  group.scale.setScalar(1.2);
  const haloMaterial = new THREE.MeshStandardMaterial({
    color: 0xb27bff,
    emissive: 0xb27bff,
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.5,
    roughness: 0.15,
    metalness: 0,
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 6, 20), haloMaterial);
  halo.position.y = 1.1;
  halo.rotation.x = Math.PI / 2.2;
  group.add(halo);
  return group;
}

/** Eclipse Titan (Solar Zealot + Void Arbiter fusion): giant floating divine titan in a dark-purple void aura, spinning gold sun rings, spawning a miniature black hole. */
function buildEclipseTitan(): THREE.Object3D {
  const group = new THREE.Group();
  const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 1.0, roughness: 0.2, metalness: 0.7 });
  const voidMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a1064,
    emissive: 0x3a1064,
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.45,
    roughness: 0.2,
    metalness: 0,
  });
  const blackHoleMaterial = new THREE.MeshBasicMaterial({ color: 0x05010a });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.65, 14, 12), goldMaterial);
  body.position.y = 2.1;
  group.add(body);

  const aura = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 12), voidMaterial);
  aura.position.y = 2.1;
  group.add(aura);

  const haloGeo = new THREE.TorusGeometry(0.85, 0.035, 6, 24);
  const halo1 = new THREE.Mesh(haloGeo, goldMaterial);
  halo1.position.y = 2.1;
  halo1.rotation.x = Math.PI / 2;
  group.add(halo1);
  const halo2 = new THREE.Mesh(haloGeo, goldMaterial);
  halo2.position.y = 2.1;
  halo2.rotation.y = Math.PI / 2;
  group.add(halo2);

  const blackHole = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), blackHoleMaterial);
  blackHole.position.set(0, 1.1, 0.5);
  group.add(blackHole);
  const blackHoleRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 6, 16), goldMaterial);
  blackHoleRing.position.copy(blackHole.position);
  blackHoleRing.rotation.x = Math.PI / 2.4;
  group.add(blackHoleRing);

  return withShadows(group);
}

// ---------------------------------------------------------------------------
// Frost-Forged — rusty copper, dark steel, frost-cyan ice crystals, thick
// rivets, white steam, black diesel smoke, per the detailed unit catalog.
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

/** Steam Scrapper: bulky square copper mech, heavy rivets, single glowing green optic behind a grill mask, hydraulic drill arm. */
function buildSteamScrapper(): THREE.Object3D {
  const group = new THREE.Group();
  const copperMaterial = new THREE.MeshStandardMaterial({ color: 0xa5673a, roughness: 0.6, metalness: 0.55 });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x6cff6c });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.6), copperMaterial);
  body.position.y = 1.0;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.35), copperMaterial);
  head.position.y = 1.6;
  group.add(head);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMaterial);
  eye.position.set(0, 1.62, 0.19);
  group.add(eye);

  const drillGeo = new THREE.ConeGeometry(0.16, 0.75, 6);
  const drill = new THREE.Mesh(drillGeo, copperMaterial);
  drill.rotation.z = -Math.PI / 2;
  drill.position.set(0.6, 1.0, 0);
  group.add(drill);

  const legGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.7, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, copperMaterial);
    leg.position.set(side * 0.24, 0.4, 0);
    group.add(leg);
  }

  return withShadows(group);
}

/** Cryo-Thrower Mech: massive copper mech covered in frost-cyan ice crystals, sub-zero liquid tanks on its back, hydraulic freeze nozzle. */
function buildCryoThrowerMech(): THREE.Object3D {
  const group = new THREE.Group();
  const copperMaterial = new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.6, metalness: 0.55 });
  const iceMaterial = new THREE.MeshStandardMaterial({ color: 0x9ff2ff, emissive: 0x9ff2ff, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.1 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.05, 0.85), copperMaterial);
  body.position.y = 1.25;
  group.add(body);

  const crystalGeo = new THREE.ConeGeometry(0.1, 0.35, 5);
  const crystalSpots: Array<[number, number, number]> = [
    [0.45, 1.6, 0.3],
    [-0.45, 1.55, 0.3],
    [0.3, 0.85, 0.45],
  ];
  for (const [x, y, z] of crystalSpots) {
    const crystal = new THREE.Mesh(crystalGeo, iceMaterial);
    crystal.position.set(x, y, z);
    group.add(crystal);
  }

  const tankGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.8, 8);
  for (const side of [-1, 1] as const) {
    const tank = new THREE.Mesh(tankGeo, copperMaterial);
    tank.position.set(side * 0.3, 1.3, -0.5);
    group.add(tank);
  }

  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.9, 8), copperMaterial);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.set(0.5, 1.1, 0.5);
  group.add(nozzle);

  const legGeo = new THREE.CylinderGeometry(0.2, 0.24, 1.0, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, copperMaterial);
    leg.position.set(side * 0.34, 0.5, 0);
    group.add(leg);
  }

  return withShadows(group);
}

/** Boiler Juggernaut: giant square tracked tank, central glowing steam boiler with brass gauges, multiple exhaust stacks blasting steam. */
function buildBoilerJuggernaut(): THREE.Object3D {
  const group = new THREE.Group();
  const steelMaterial = new THREE.MeshStandardMaterial({ color: 0x5a6268, roughness: 0.55, metalness: 0.6 });
  const boilerMaterial = new THREE.MeshStandardMaterial({ color: 0xb5651d, emissive: 0xff6a2a, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.4 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.2), steelMaterial);
  hull.position.y = 0.4;
  group.add(hull);

  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.7, 10), boilerMaterial);
  boiler.rotation.z = Math.PI / 2;
  boiler.position.y = 0.95;
  group.add(boiler);

  const stackGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.6, 6);
  for (const x of [-0.5, -0.2, 0.2, 0.5]) {
    const stack = new THREE.Mesh(stackGeo, steelMaterial);
    stack.position.set(x, 1.35, -0.2);
    group.add(stack);
  }

  const trackGeo = new THREE.BoxGeometry(1.8, 0.3, 0.25);
  for (const side of [-1, 1] as const) {
    const track = new THREE.Mesh(trackGeo, steelMaterial);
    track.position.set(0, 0.15, side * 0.62);
    group.add(track);
  }

  return withShadows(group);
}

/** Forge Walker (3x Steam Scrapper fusion): a bulked-up Steam Scrapper with a second drill arm. */
function buildForgeWalker(): THREE.Object3D {
  const group = new THREE.Group();
  const copperMaterial = new THREE.MeshStandardMaterial({ color: 0xa5673a, roughness: 0.6, metalness: 0.55 });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x6cff6c });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.05, 0.75), copperMaterial);
  body.position.y = 1.3;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 0.4), copperMaterial);
  head.position.y = 2.0;
  group.add(head);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMaterial);
  eye.position.set(0, 2.02, 0.22);
  group.add(eye);

  const drillGeo = new THREE.ConeGeometry(0.18, 0.85, 6);
  for (const side of [-1, 1] as const) {
    const drill = new THREE.Mesh(drillGeo, copperMaterial);
    drill.rotation.z = side * (-Math.PI / 2);
    drill.position.set(side * 0.75, 1.3, 0);
    group.add(drill);
  }

  const legGeo = new THREE.CylinderGeometry(0.17, 0.2, 0.85, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, copperMaterial);
    leg.position.set(side * 0.32, 0.5, 0);
    group.add(leg);
  }

  return withShadows(group);
}

/** Thermal Shock Engine (Cryo-Thrower Mech + Steam Scrapper fusion): dual-weapon behemoth, ice nozzle on one arm, steam vent on the other. */
function buildThermalShockEngine(): THREE.Object3D {
  const group = new THREE.Group();
  const steelMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3218, roughness: 0.55, metalness: 0.6 });
  const iceMaterial = new THREE.MeshStandardMaterial({ color: 0x9ff2ff, emissive: 0x9ff2ff, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.1 });
  const steamMaterial = new THREE.MeshStandardMaterial({ color: 0xb5651d, emissive: 0xff6a2a, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.4 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.4), steelMaterial);
  body.position.y = 1.6;
  group.add(body);

  const iceArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 1.1, 8), iceMaterial);
  iceArm.rotation.z = Math.PI / 2;
  iceArm.position.set(-0.95, 1.6, 0.3);
  group.add(iceArm);

  const steamArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 1.1, 8), steamMaterial);
  steamArm.rotation.z = Math.PI / 2;
  steamArm.position.set(0.95, 1.6, -0.3);
  group.add(steamArm);

  const legGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.6, 6);
  const legOffsets: Array<[number, number]> = [
    [-0.6, -0.5],
    [0.6, -0.5],
    [-0.6, 0.5],
    [0.6, 0.5],
  ];
  for (const [x, z] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, steelMaterial);
    leg.position.set(x, 0.8, z);
    group.add(leg);
  }

  return withShadows(group);
}

// ---------------------------------------------------------------------------
// Verdant Wilds — rough bark and chitin, matte moss green, bioluminescent
// lime spore glow, thorny/organic silhouettes.
// ---------------------------------------------------------------------------

function buildRootTender(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x3a5a2a, emissive: 0x7fd94f, emissiveIntensity: 0.55, roughness: 0.85, metalness: 0.05 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.6, 6, 10), material);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.55;
  group.add(body);
  const sacMaterial = new THREE.MeshStandardMaterial({ color: 0x8fd45f, emissive: 0x8fd45f, emissiveIntensity: 0.7, roughness: 0.4, metalness: 0 });
  const sac = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), sacMaterial);
  sac.position.set(0, 0.75, -0.3);
  group.add(sac);
  const legGeo = new THREE.ConeGeometry(0.08, 0.35, 5);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, material);
    leg.position.set(side * 0.3, 0.2, 0.2);
    group.add(leg);
  }
  return withShadows(group);
}

/** Thorn Skitterling: small quick many-legged bark-beetle with a spiked back ridge. */
function buildThornSkitterling(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x2d4520, emissive: 0x4a8f3d, emissiveIntensity: 0.4, roughness: 0.85, metalness: 0.05 });
  const thornMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2b12, roughness: 0.7, metalness: 0.05 });

  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), material);
  body.scale.set(1.3, 0.75, 1);
  body.position.y = 0.4;
  group.add(body);

  const thornGeo = new THREE.ConeGeometry(0.05, 0.22, 4);
  for (const x of [-0.15, 0, 0.15]) {
    const thorn = new THREE.Mesh(thornGeo, thornMaterial);
    thorn.position.set(x, 0.62, 0);
    group.add(thorn);
  }

  const legGeo = new THREE.CylinderGeometry(0.03, 0.045, 0.3, 5);
  const legOffsets: Array<[number, number]> = [
    [-0.18, -0.2],
    [0.18, -0.2],
    [-0.18, 0.2],
    [0.18, 0.2],
  ];
  for (const [x, z] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, thornMaterial);
    leg.position.set(x, 0.15, z);
    group.add(leg);
  }

  return withShadows(group);
}

/** Spore Mystic: hunched floating plant-shaman wrapped in vines, a bulbous spore pod staff. */
function buildSporeMystic(): THREE.Object3D {
  const group = new THREE.Group();
  const barkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3a24, roughness: 0.85, metalness: 0.05 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x3a6b2e, roughness: 0.8, metalness: 0.05 });
  const sporeMaterial = new THREE.MeshBasicMaterial({ color: 0x8fd45f });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.65, 4, 8), barkMaterial);
  body.position.y = 0.85;
  group.add(body);

  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 7), leafMaterial);
  cloak.position.y = 0.6;
  group.add(cloak);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), barkMaterial);
  head.position.set(0, 1.3, 0);
  group.add(head);

  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6), barkMaterial);
  staff.position.set(0.38, 0.95, 0);
  group.add(staff);

  const pod = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), sporeMaterial);
  pod.position.set(0.38, 1.65, 0);
  group.add(pod);

  return withShadows(group);
}

/** Bramble Colossus: hulking beast of woven roots and thorn-vine arms, a glowing sap core. */
function buildBrambleColossus(): THREE.Object3D {
  const group = new THREE.Group();
  const barkMaterial = new THREE.MeshStandardMaterial({ color: 0x3a2c1a, roughness: 0.9, metalness: 0.03 });
  const sapMaterial = new THREE.MeshStandardMaterial({ color: 0x8fd45f, emissive: 0x8fd45f, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0 });
  const thornMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2b12, roughness: 0.7, metalness: 0.05 });

  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), barkMaterial);
  body.position.y = 1.3;
  group.add(body);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), sapMaterial);
  core.position.set(0, 1.3, 0.4);
  group.add(core);

  const armGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.1, 6);
  for (const side of [-1, 1] as const) {
    const arm = new THREE.Mesh(armGeo, barkMaterial);
    arm.position.set(side * 0.85, 1.15, 0);
    arm.rotation.z = side * 0.25;
    group.add(arm);
  }

  const thornGeo = new THREE.ConeGeometry(0.07, 0.3, 4);
  for (const [x, y, z] of [
    [0.2, 1.75, 0.3],
    [-0.2, 1.75, 0.3],
    [0, 1.85, -0.2],
  ] as const) {
    const thorn = new THREE.Mesh(thornGeo, thornMaterial);
    thorn.position.set(x, y, z);
    group.add(thorn);
  }

  const legGeo = new THREE.CylinderGeometry(0.2, 0.26, 0.75, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, barkMaterial);
    leg.position.set(side * 0.35, 0.4, 0);
    group.add(leg);
  }

  return withShadows(group);
}

/** Bramblehive Matron (3x Thorn Skitterling fusion): a bloated brood-mother skitterling trailing a cluster of spore sacs. */
function buildBramblehiveMatron(): THREE.Object3D {
  const group = buildThornSkitterling();
  group.scale.setScalar(1.6);
  const sacMaterial = new THREE.MeshStandardMaterial({ color: 0x8fd45f, emissive: 0x8fd45f, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0 });
  const sacGeo = new THREE.SphereGeometry(0.14, 8, 8);
  for (const [x, y, z] of [
    [-0.25, 0.35, -0.35],
    [0.25, 0.35, -0.35],
    [0, 0.45, -0.5],
  ] as const) {
    const sac = new THREE.Mesh(sacGeo, sacMaterial);
    sac.position.set(x, y, z);
    group.add(sac);
  }
  return group;
}

/** Verdant Devourer (Spore Mystic + Bramble Colossus fusion): a massive maw-jawed plant predator with venus-flytrap head. */
function buildVerdantDevourer(): THREE.Object3D {
  const group = new THREE.Group();
  const barkMaterial = new THREE.MeshStandardMaterial({ color: 0x2d4520, roughness: 0.88, metalness: 0.03 });
  const jawMaterial = new THREE.MeshStandardMaterial({ color: 0x6b1f2a, roughness: 0.6, metalness: 0.05 });
  const sapMaterial = new THREE.MeshStandardMaterial({ color: 0x8fd45f, emissive: 0x8fd45f, emissiveIntensity: 1.0, roughness: 0.3, metalness: 0 });

  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), barkMaterial);
  body.position.y = 1.6;
  group.add(body);

  const jawGeo = new THREE.ConeGeometry(0.5, 0.9, 6);
  for (const [side, tilt] of [
    [1, 0.35],
    [-1, -0.35],
  ] as const) {
    const jaw = new THREE.Mesh(jawGeo, jawMaterial);
    jaw.position.set(0, 2.1, side * 0.3);
    jaw.rotation.x = tilt;
    group.add(jaw);
  }

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), sapMaterial);
  core.position.set(0, 1.6, 0.5);
  group.add(core);

  const armGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.3, 6);
  for (const side of [-1, 1] as const) {
    const arm = new THREE.Mesh(armGeo, barkMaterial);
    arm.position.set(side * 1.0, 1.4, 0);
    arm.rotation.z = side * 0.3;
    group.add(arm);
  }

  const legGeo = new THREE.CylinderGeometry(0.25, 0.32, 0.9, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, barkMaterial);
    leg.position.set(side * 0.42, 0.5, 0);
    group.add(leg);
  }

  return withShadows(group);
}

// ---------------------------------------------------------------------------
// Umbral Voidkin — dark obsidian-glass, semi-glossy void-black, violet/
// magenta glow, jagged crystalline silhouettes.
// ---------------------------------------------------------------------------

function buildHuskDrifter(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x2a1a3a, emissive: 0x9f6fd0, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.25 });
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), material);
  body.scale.set(1, 1.15, 0.85);
  body.position.y = 0.75;
  group.add(body);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xd94fd9 });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMaterial);
  eye.position.set(0, 0.9, 0.36);
  group.add(eye);
  const shardGeo = new THREE.ConeGeometry(0.08, 0.3, 5);
  for (const side of [-1, 1] as const) {
    const shard = new THREE.Mesh(shardGeo, material);
    shard.rotation.z = side * 0.7;
    shard.position.set(side * 0.4, 0.6, -0.2);
    group.add(shard);
  }
  return withShadows(group);
}

/** Shade Stalker: lean crouched shadow-assassin, jagged crystal claws, no visible face beneath a hooded void-mist head. */
function buildShadeStalker(): THREE.Object3D {
  const group = new THREE.Group();
  const shadowMaterial = new THREE.MeshStandardMaterial({ color: 0x1a0f28, roughness: 0.4, metalness: 0.2 });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xd94fd9 });
  const clawMaterial = new THREE.MeshStandardMaterial({ color: 0x7a3fb0, emissive: 0x7a3fb0, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.2 });

  const torso = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), shadowMaterial);
  torso.scale.set(0.85, 1.3, 0.7);
  torso.position.y = 0.85;
  torso.rotation.x = 0.2;
  group.add(torso);

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 5), shadowMaterial);
  hood.position.set(0, 1.25, 0.05);
  group.add(hood);

  const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), glowMaterial);
  eyes.position.set(0, 1.22, 0.2);
  group.add(eyes);

  const clawGeo = new THREE.ConeGeometry(0.05, 0.35, 4);
  for (const side of [-1, 1] as const) {
    const claw = new THREE.Mesh(clawGeo, clawMaterial);
    claw.rotation.z = side * (Math.PI / 2.3);
    claw.position.set(side * 0.35, 0.75, 0.15);
    group.add(claw);
  }

  return withShadows(group);
}

/** Nullweaver: floating hollow-robed void mage encircled by orbiting dark crystal shards. */
function buildNullweaver(): THREE.Object3D {
  const group = new THREE.Group();
  const robeMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1a3a, roughness: 0.35, metalness: 0.25 });
  const shardMaterial = new THREE.MeshStandardMaterial({ color: 0x9f6fd0, emissive: 0x9f6fd0, emissiveIntensity: 0.9, transparent: true, opacity: 0.75, roughness: 0.1, metalness: 0.2 });

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 5), robeMaterial);
  body.position.y = 0.9;
  group.add(body);

  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), robeMaterial);
  head.position.y = 1.6;
  group.add(head);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xd94fd9 }));
  eye.position.set(0, 1.6, 0.17);
  group.add(eye);

  const shardGeo = new THREE.OctahedronGeometry(0.12, 0);
  const orbitCount = 3;
  for (let i = 0; i < orbitCount; i++) {
    const angle = (i / orbitCount) * Math.PI * 2;
    const shard = new THREE.Mesh(shardGeo, shardMaterial);
    shard.position.set(Math.cos(angle) * 0.55, 1.1 + Math.sin(angle) * 0.15, Math.sin(angle) * 0.55);
    group.add(shard);
  }

  return withShadows(group);
}

/** Voidmaw Horror: hunched multi-limbed void beast with a gaping crystalline maw on its chest. */
function buildVoidmawHorror(): THREE.Object3D {
  const group = new THREE.Group();
  const hideMaterial = new THREE.MeshStandardMaterial({ color: 0x1a0f28, roughness: 0.45, metalness: 0.2 });
  const mawMaterial = new THREE.MeshStandardMaterial({ color: 0xd94fd9, emissive: 0xd94fd9, emissiveIntensity: 1.0, roughness: 0.2, metalness: 0.1 });
  const crystalMaterial = new THREE.MeshStandardMaterial({ color: 0x7a3fb0, emissive: 0x7a3fb0, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3 });

  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), hideMaterial);
  body.position.y = 1.25;
  group.add(body);

  const maw = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.32, 12), mawMaterial);
  maw.position.set(0, 1.3, 0.55);
  group.add(maw);

  const spikeGeo = new THREE.ConeGeometry(0.09, 0.4, 5);
  for (const [x, y, z] of [
    [0.4, 1.75, 0],
    [-0.4, 1.75, 0],
    [0, 1.85, -0.3],
  ] as const) {
    const spike = new THREE.Mesh(spikeGeo, crystalMaterial);
    spike.position.set(x, y, z);
    group.add(spike);
  }

  const armGeo = new THREE.CylinderGeometry(0.13, 0.18, 1.0, 6);
  for (const side of [-1, 1] as const) {
    const arm = new THREE.Mesh(armGeo, hideMaterial);
    arm.position.set(side * 0.75, 1.1, 0);
    arm.rotation.z = side * 0.3;
    group.add(arm);
  }

  const legGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.75, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, hideMaterial);
    leg.position.set(side * 0.32, 0.45, 0);
    group.add(leg);
  }

  return withShadows(group);
}

/** Shade Legion (3x Shade Stalker fusion): three Shade Stalkers fused shoulder-to-shoulder, sharing a single void-mist cloak. */
function buildShadeLegion(): THREE.Object3D {
  const group = new THREE.Group();
  const shadowMaterial = new THREE.MeshStandardMaterial({ color: 0x1a0f28, roughness: 0.4, metalness: 0.2 });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xd94fd9 });

  const offsets: Array<[number, number]> = [
    [0, 0],
    [-0.4, -0.15],
    [0.4, -0.15],
  ];
  for (const [x, z] of offsets) {
    const torso = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), shadowMaterial);
    torso.scale.set(0.85, 1.3, 0.7);
    torso.position.set(x, 0.8, z);
    group.add(torso);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 5), shadowMaterial);
    hood.position.set(x, 1.15, z + 0.05);
    group.add(hood);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), glowMaterial);
    eye.position.set(x, 1.12, z + 0.18);
    group.add(eye);
  }

  return withShadows(group);
}

/** Oblivion Warden (Nullweaver + Voidmaw Horror fusion): a towering void titan wreathed in a crystalline halo of shattered reality. */
function buildOblivionWarden(): THREE.Object3D {
  const group = new THREE.Group();
  const hideMaterial = new THREE.MeshStandardMaterial({ color: 0x150a20, roughness: 0.4, metalness: 0.25 });
  const mawMaterial = new THREE.MeshStandardMaterial({ color: 0xd94fd9, emissive: 0xd94fd9, emissiveIntensity: 1.1, roughness: 0.2, metalness: 0.1 });
  const crystalMaterial = new THREE.MeshStandardMaterial({
    color: 0x9f6fd0,
    emissive: 0x9f6fd0,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.2,
  });

  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), hideMaterial);
  body.position.y = 2.0;
  group.add(body);

  const maw = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.42, 14), mawMaterial);
  maw.position.set(0, 2.05, 0.75);
  group.add(maw);

  const shardGeo = new THREE.OctahedronGeometry(0.2, 0);
  const shardCount = 5;
  for (let i = 0; i < shardCount; i++) {
    const angle = (i / shardCount) * Math.PI * 2;
    const shard = new THREE.Mesh(shardGeo, crystalMaterial);
    shard.position.set(Math.cos(angle) * 1.2, 2.0 + Math.sin(angle) * 0.3, Math.sin(angle) * 1.2);
    group.add(shard);
  }

  const armGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.5, 6);
  for (const side of [-1, 1] as const) {
    const arm = new THREE.Mesh(armGeo, hideMaterial);
    arm.position.set(side * 1.15, 1.7, 0);
    arm.rotation.z = side * 0.3;
    group.add(arm);
  }

  const legGeo = new THREE.CylinderGeometry(0.3, 0.38, 1.2, 6);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(legGeo, hideMaterial);
    leg.position.set(side * 0.5, 0.7, 0);
    group.add(leg);
  }

  return withShadows(group);
}

const BUILDERS: Record<string, () => THREE.Object3D> = {
  // Cyber-Nexus
  'flux-harvester': buildFluxHarvester,
  'nexus-striker': buildNexusStriker,
  'tesla-archon': buildTeslaArchon,
  'nanite-weaver': buildNaniteWeaver,
  'hive-construct': buildHiveConstruct,
  'storm-grid-colossus': buildStormGridColossus,
  // Pyroliths
  'cinder-grub': buildCinderGrub,
  'magma-imp': buildMagmaImp,
  'ignis-priest': buildIgnisPriest,
  'acid-drake': buildAcidDrake,
  'molten-behemoth': buildMoltenBehemoth,
  'obsidian-chimera': buildObsidianChimera,
  // Solari Archons
  'solar-zealot': buildSolarZealot,
  'void-arbiter': buildVoidArbiter,
  'astral-frost-scribe': buildAstralFrostScribe,
  'ascended-zealot': buildAscendedZealot,
  'eclipse-titan': buildEclipseTitan,
  // Frost-Forged
  rustling: buildRustling,
  'steam-scrapper': buildSteamScrapper,
  'cryo-thrower-mech': buildCryoThrowerMech,
  'boiler-juggernaut': buildBoilerJuggernaut,
  'forge-walker': buildForgeWalker,
  'thermal-shock-engine': buildThermalShockEngine,
  // Verdant Wilds
  'root-tender': buildRootTender,
  'thorn-skitterling': buildThornSkitterling,
  'spore-mystic': buildSporeMystic,
  'bramble-colossus': buildBrambleColossus,
  'bramblehive-matron': buildBramblehiveMatron,
  'verdant-devourer': buildVerdantDevourer,
  // Umbral Voidkin
  'husk-drifter': buildHuskDrifter,
  'shade-stalker': buildShadeStalker,
  nullweaver: buildNullweaver,
  'voidmaw-horror': buildVoidmawHorror,
  'shade-legion': buildShadeLegion,
  'oblivion-warden': buildOblivionWarden,
};

/** Placeholder combat-unit silhouettes, one distinct shape per unit type matching the detailed unit catalog's visual descriptions. */
export function buildUnitVisual(unitTypeId: string): THREE.Object3D {
  const builder = BUILDERS[unitTypeId];
  if (!builder) throw new Error(`No visual defined for unit type "${unitTypeId}"`);
  return builder();
}

import * as THREE from 'three';

export type SunProximityStage = 'stable' | 'converging' | 'critical';

const PULSE_SPEED: Record<SunProximityStage, number> = {
  stable: 0.6,
  converging: 1.4,
  critical: 2.8,
};

const PULSE_AMPLITUDE: Record<SunProximityStage, number> = {
  stable: 0.08,
  converging: 0.18,
  critical: 0.32,
};

interface CrystalPlacement {
  x: number;
  y: number;
  z: number;
  scale: number;
}

const CLUSTER_LAYOUT: CrystalPlacement[] = [
  { x: 0, y: 3, z: 0, scale: 3.2 },
  { x: 1.6, y: 1.6, z: 0.8, scale: 1.9 },
  { x: -1.4, y: 1.3, z: -1, scale: 1.7 },
  { x: 0.5, y: 1.9, z: -1.6, scale: 1.4 },
  { x: -0.9, y: 2.3, z: 1.3, scale: 1.3 },
];

/**
 * The Core Zone: a giant crystal at map center, fading between cold-blue
 * and violet-white (§5). Its pulse speed/amplitude ramps up with the Sun
 * Proximity stage — Milestone 8 wires `setStage` to the real match timer.
 * For now it defaults to the dormant "stable" slow pulse.
 */
export class CoreZone {
  readonly group = new THREE.Group();
  private readonly crystals: THREE.Mesh[] = [];
  private readonly material: THREE.MeshStandardMaterial;
  private readonly glow: THREE.PointLight;
  private readonly haloMaterial: THREE.MeshBasicMaterial;
  private time = 0;
  private stage: SunProximityStage = 'stable';

  constructor() {
    this.material = new THREE.MeshStandardMaterial({
      color: 0x9fdcff,
      emissive: 0x4fb8ff,
      emissiveIntensity: 1,
      roughness: 0.15,
      metalness: 0.1,
    });

    for (const p of CLUSTER_LAYOUT) {
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), this.material);
      mesh.position.set(p.x, p.y, p.z);
      mesh.scale.setScalar(p.scale);
      mesh.castShadow = true;
      this.crystals.push(mesh);
      this.group.add(mesh);
    }

    this.glow = new THREE.PointLight(0x66c9ff, 4, 26, 2);
    this.glow.position.set(0, 3, 0);
    this.group.add(this.glow);

    this.haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x3fb6ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const halo = new THREE.Mesh(new THREE.CircleGeometry(8, 48), this.haloMaterial);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.02;
    this.group.add(halo);
  }

  setStage(stage: SunProximityStage): void {
    this.stage = stage;
  }

  update(dt: number): void {
    this.time += dt;
    const speed = PULSE_SPEED[this.stage];
    const amplitude = PULSE_AMPLITUDE[this.stage];
    const pulse = Math.sin(this.time * speed) * amplitude;

    this.material.emissiveIntensity = 1 + pulse * 2;
    this.material.color.setHSL(0.58 - pulse * 0.15, 0.7, 0.75 + pulse * 0.1);
    this.glow.intensity = 4 + pulse * 6;
    this.haloMaterial.opacity = 0.18 + pulse * 0.12;

    for (const crystal of this.crystals) {
      crystal.rotation.y += dt * 0.15;
    }
    this.group.rotation.y += dt * 0.05;
  }
}

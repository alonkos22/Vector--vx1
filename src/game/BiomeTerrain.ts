import * as THREE from 'three';
import type { BiomeConfig } from '../config/biomes';

/** Small deterministic PRNG so the vein pattern is stable across reloads. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Procedural branching-vein texture: glowing cracks/circuits under the ground. */
function generateVeinTexture(veinColor: number, seed: number, size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  const hex = `#${new THREE.Color(veinColor).getHexString()}`;
  ctx.strokeStyle = hex;
  ctx.shadowColor = hex;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;

  const rand = mulberry32(seed);

  const branch = (x: number, y: number, angle: number, length: number, depth: number): void => {
    if (depth <= 0 || length < 5) return;
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const branchCount = rand() < 0.45 ? 1 : 2;
    for (let i = 0; i < branchCount; i++) {
      branch(x2, y2, angle + (rand() - 0.5) * 1.5, length * (0.6 + rand() * 0.25), depth - 1);
    }
  };

  const veinCount = 9;
  for (let i = 0; i < veinCount; i++) {
    branch(rand() * size, rand() * size, rand() * Math.PI * 2, 55 + rand() * 45, 5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

/** Flat home-biome ground plane, materials driven entirely by BiomeConfig. */
export class BiomeTerrain {
  readonly group = new THREE.Group();
  private readonly material: THREE.MeshStandardMaterial;
  private pulseTime = 0;
  private readonly baseEmissiveIntensity: number;

  constructor(biome: BiomeConfig, halfExtent: number) {
    const geometry = new THREE.PlaneGeometry(halfExtent * 2, halfExtent * 2, 1, 1);
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.MeshStandardMaterial({
      color: biome.groundColor,
      roughness: biome.roughness,
      metalness: biome.metalness,
    });

    this.baseEmissiveIntensity = biome.veinColor !== null ? 0.5 : 0;
    if (biome.veinColor !== null) {
      this.material.emissiveMap = generateVeinTexture(biome.veinColor, 1337);
      this.material.emissive = new THREE.Color(biome.veinColor);
      this.material.emissiveIntensity = this.baseEmissiveIntensity;
    }

    const ground = new THREE.Mesh(geometry, this.material);
    ground.receiveShadow = true;
    this.group.add(ground);

    const grid = new THREE.GridHelper(halfExtent * 2, halfExtent / 5, 0x555a60, 0x44484d);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.3;
    grid.position.y = 0.01;
    this.group.add(grid);
  }

  /** Slow breathing pulse on the vein glow, per §4 material language. */
  update(dt: number): void {
    if (this.baseEmissiveIntensity === 0) return;
    this.pulseTime += dt;
    this.material.emissiveIntensity = this.baseEmissiveIntensity + Math.sin(this.pulseTime * 0.8) * 0.2;
  }
}

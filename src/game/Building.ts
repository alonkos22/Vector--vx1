import * as THREE from 'three';
import type { BuildingConfig } from '../config/buildings';

/** A placed building: handles the under-construction visual and a single-slot production queue. */
export class Building {
  readonly config: BuildingConfig;
  readonly mesh: THREE.Mesh;
  readonly position: THREE.Vector3;
  isComplete: boolean;
  private constructionRemaining: number;
  private productionUnitId: string | null = null;
  private productionRemaining = 0;
  private productionTotal = 0;

  constructor(config: BuildingConfig, position: THREE.Vector3, prebuilt = false) {
    this.config = config;
    this.position = position.clone();

    const geometry = new THREE.CylinderGeometry(config.footprint, config.footprint * 1.15, config.footprint * 1.6, 6);
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.color,
      emissiveIntensity: prebuilt ? 0.35 : 0.1,
      roughness: 0.4,
      metalness: 0.6,
      transparent: !prebuilt,
      opacity: prebuilt ? 1 : 0.4,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.position.y = config.footprint * 0.8;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.scale.setScalar(prebuilt ? 1 : 0.5);

    this.isComplete = prebuilt;
    this.constructionRemaining = prebuilt ? 0 : config.buildTimeSec;
  }

  update(dt: number): void {
    if (!this.isComplete) {
      this.constructionRemaining -= dt;
      const progress = 1 - Math.max(this.constructionRemaining, 0) / this.config.buildTimeSec;
      const material = this.mesh.material as THREE.MeshStandardMaterial;
      material.opacity = 0.4 + progress * 0.6;
      this.mesh.scale.setScalar(0.5 + progress * 0.5);

      if (this.constructionRemaining <= 0) {
        this.isComplete = true;
        material.opacity = 1;
        material.transparent = false;
        material.emissiveIntensity = 0.35;
        this.mesh.scale.setScalar(1);
      }
      return;
    }

    if (this.productionUnitId) {
      this.productionRemaining -= dt;
    }
  }

  isProducing(): boolean {
    return this.productionUnitId !== null;
  }

  /** 0..1, or null when idle. */
  productionProgress(): number | null {
    if (!this.productionUnitId) return null;
    return 1 - Math.max(this.productionRemaining, 0) / this.productionTotal;
  }

  startProduction(unitId: string, buildTimeSec: number): void {
    this.productionUnitId = unitId;
    this.productionRemaining = buildTimeSec;
    this.productionTotal = buildTimeSec;
  }

  /** Returns the finished unit id once, clearing the queue slot. */
  collectFinishedProduction(): string | null {
    if (this.productionUnitId && this.productionRemaining <= 0) {
      const id = this.productionUnitId;
      this.productionUnitId = null;
      return id;
    }
    return null;
  }

  constructionProgress(): number {
    if (this.isComplete) return 1;
    return 1 - Math.max(this.constructionRemaining, 0) / this.config.buildTimeSec;
  }
}

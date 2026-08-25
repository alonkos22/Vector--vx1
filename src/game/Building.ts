import * as THREE from 'three';
import type { BuildingConfig } from '../config/buildings';
import type { Targetable } from './Targetable';
import { HealthBar } from './HealthBar';

const MAX_QUEUE_SIZE = 5;

interface QueuedItem {
  unitId: string;
  buildTimeSec: number;
  remaining: number;
}

/** A placed building: handles the under-construction visual, a multi-item FIFO production queue, and (once built) HP as a Targetable. */
export class Building implements Targetable {
  readonly config: BuildingConfig;
  readonly ownerId: string;
  readonly mesh: THREE.Mesh;
  readonly position: THREE.Vector3;
  isComplete: boolean;
  maxHp: number;
  hp: number;

  private readonly healthBar: HealthBar;
  private constructionRemaining: number;
  private readonly productionQueue: QueuedItem[] = [];

  constructor(config: BuildingConfig, ownerId: string, position: THREE.Vector3, prebuilt = false) {
    this.config = config;
    this.ownerId = ownerId;
    this.position = position.clone();
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;

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
    this.mesh.userData.buildingRef = this;

    this.healthBar = new HealthBar(config.footprint * 1.6 + 0.6, 1.6);
    this.mesh.add(this.healthBar.group);
    this.healthBar.update(1);

    this.isComplete = prebuilt;
    this.constructionRemaining = prebuilt ? 0 : config.buildTimeSec;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  takeDamage(amount: number): void {
    if (!this.isAlive()) return;
    this.hp = Math.max(0, this.hp - amount);
    this.healthBar.update(this.hp / this.maxHp);
  }

  update(dt: number, camera?: THREE.Camera): void {
    if (camera) this.healthBar.faceCamera(camera);

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

    if (this.productionQueue.length > 0) {
      this.productionQueue[0].remaining -= dt;
    }
  }

  constructionProgress(): number {
    if (this.isComplete) return 1;
    return 1 - Math.max(this.constructionRemaining, 0) / this.config.buildTimeSec;
  }

  canEnqueue(): boolean {
    return this.productionQueue.length < MAX_QUEUE_SIZE;
  }

  enqueueProduction(unitId: string, buildTimeSec: number): void {
    this.productionQueue.push({ unitId, buildTimeSec, remaining: buildTimeSec });
  }

  /** Cancels the most recently queued item (LIFO), returning its unit id so its cost can be refunded. */
  cancelLastQueued(): string | null {
    return this.productionQueue.pop()?.unitId ?? null;
  }

  isProducing(): boolean {
    return this.productionQueue.length > 0;
  }

  queueLength(): number {
    return this.productionQueue.length;
  }

  queuedUnitIds(): string[] {
    return this.productionQueue.map((item) => item.unitId);
  }

  /** 0..1 progress of the item at the head of the queue, or null when idle. */
  productionProgress(): number | null {
    const head = this.productionQueue[0];
    if (!head) return null;
    return 1 - Math.max(head.remaining, 0) / head.buildTimeSec;
  }

  /** Returns the finished unit id once, dequeuing it and starting the next item. */
  collectFinishedProduction(): string | null {
    const head = this.productionQueue[0];
    if (head && head.remaining <= 0) {
      this.productionQueue.shift();
      return head.unitId;
    }
    return null;
  }
}

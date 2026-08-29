import * as THREE from 'three';
import { BUILDING_ROLE_BY_ID, type BuildingConfig, type BuildingRole } from '../config/buildings';
import { BUILDING_FUSION_ROLE_BY_ID } from '../config/buildingFusion';
import type { Targetable } from './Targetable';
import { HealthBar } from './HealthBar';
import { buildBuildingVisual, BUILDING_TOP_HEIGHT_FACTOR } from './buildingVisuals';
import { soundManager } from './SoundManager';

const MAX_QUEUE_SIZE = 5;

interface QueuedItem {
  unitId: string;
  buildTimeSec: number;
  remaining: number;
}

/** A placed building: handles the under-construction visual, a multi-item FIFO production queue, and (once built) HP as a Targetable. */
export class Building implements Targetable {
  readonly config: BuildingConfig;
  readonly role: BuildingRole;
  readonly ownerId: string;
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;
  isComplete: boolean;
  maxHp: number;
  hp: number;
  /** Ground point newly produced combat units auto-move to, or null to spawn in place. Player-set only; the AI doesn't use rally points. */
  rallyPoint: THREE.Vector3 | null = null;

  /** Every MeshStandardMaterial under the visual group, collected by traversal (same pattern as CombatUnit's hit-flash) so the construction fade-in works whether the visual is one shared procedural material or a multi-material imported model. */
  private readonly materials: THREE.MeshStandardMaterial[] = [];
  private readonly healthBar: HealthBar;
  private constructionRemaining: number;
  private readonly productionQueue: QueuedItem[] = [];

  constructor(config: BuildingConfig, ownerId: string, position: THREE.Vector3, prebuilt = false) {
    this.config = config;
    this.ownerId = ownerId;
    this.position = position.clone();
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;

    const role = BUILDING_ROLE_BY_ID[config.id] ?? BUILDING_FUSION_ROLE_BY_ID[config.id];
    this.role = role;
    const { group } = buildBuildingVisual(
      role,
      config.footprint,
      config.color,
      config.materialRoughness,
      config.materialMetalness,
      config.shapeFamily,
      config.id,
    );
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) this.materials.push(child.material);
    });
    for (const m of this.materials) {
      m.emissiveIntensity = prebuilt ? 0.35 : 0.1;
      m.transparent = !prebuilt;
      m.opacity = prebuilt ? 1 : 0.4;
    }

    this.mesh = group;
    this.mesh.position.copy(this.position);
    this.mesh.scale.setScalar(prebuilt ? 1 : 0.5);
    this.mesh.userData.buildingRef = this;

    this.healthBar = new HealthBar(config.footprint * BUILDING_TOP_HEIGHT_FACTOR[role] + 0.6, 1.6);
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
      for (const m of this.materials) m.opacity = 0.4 + progress * 0.6;
      this.mesh.scale.setScalar(0.5 + progress * 0.5);

      if (this.constructionRemaining <= 0) {
        this.isComplete = true;
        for (const m of this.materials) {
          m.opacity = 1;
          m.transparent = false;
          m.emissiveIntensity = 0.35;
        }
        this.mesh.scale.setScalar(1);
        soundManager.playBuildingComplete();
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

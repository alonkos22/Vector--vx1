import * as THREE from 'three';

interface ActiveEffect {
  life: number;
  maxLife: number;
  tick: (t: number) => void;
  dispose: () => void;
}

/**
 * Minimal reusable VFX spawner, keyed by trigger. On-attack and on-fusion
 * exist so far (§6); on-death/on-spawn triggers land alongside the
 * milestones that need them.
 */
export class EffectManager {
  private readonly scene: THREE.Scene;
  private readonly active: ActiveEffect[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Cyber-Nexus attack VFX per §6: thin neon-blue laser line + a small impact flash. */
  spawnLaserHit(from: THREE.Vector3, to: THREE.Vector3, color = 0x4fc3ff): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.active.push({
      life: 0,
      maxLife: 0.12,
      tick: (t) => {
        material.opacity = 0.95 * (1 - t);
      },
      dispose: () => {
        this.scene.remove(line);
        geometry.dispose();
        material.dispose();
      },
    });

    const flashMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const flashGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(to);
    this.scene.add(flash);
    this.active.push({
      life: 0,
      maxLife: 0.18,
      tick: (t) => {
        flash.scale.setScalar(1 + t * 2.2);
        flashMaterial.opacity = 0.9 * (1 - t);
      },
      dispose: () => {
        this.scene.remove(flash);
        flashGeometry.dispose();
        flashMaterial.dispose();
      },
    });
  }

  /** Cyber-Nexus Synchronization channel per §6: a blue data-line connecting each fusing unit to the merge point, flickering for the channel duration. */
  spawnSynchronizationLinks(unitPositions: THREE.Vector3[], center: THREE.Vector3, durationSec: number): void {
    const lines: THREE.Line[] = [];
    const materials: THREE.LineBasicMaterial[] = [];
    for (const pos of unitPositions) {
      const from = pos.clone();
      from.y = 1;
      const to = center.clone();
      to.y = 1;
      const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
      const material = new THREE.LineBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
      lines.push(line);
      materials.push(material);
    }

    this.active.push({
      life: 0,
      maxLife: durationSec,
      tick: (t) => {
        const flicker = 0.5 + Math.sin(t * Math.PI * 10) * 0.5;
        for (const material of materials) material.opacity = 0.35 + flicker * 0.55;
      },
      dispose: () => {
        for (const line of lines) {
          this.scene.remove(line);
          line.geometry.dispose();
        }
        for (const material of materials) material.dispose();
      },
    });
  }

  /** Cyber-Nexus Synchronization payoff per §6: a sharp, fast glitch-burst merge. */
  spawnSynchronizationBurst(center: THREE.Vector3): void {
    const point = center.clone();
    point.y = 1.2;

    const flashMaterial = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 1 });
    const flashGeometry = new THREE.SphereGeometry(0.4, 10, 10);
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(point);
    this.scene.add(flash);
    this.active.push({
      life: 0,
      maxLife: 0.3,
      tick: (t) => {
        flash.scale.setScalar(1 + t * 9);
        flashMaterial.opacity = 1 - t;
      },
      dispose: () => {
        this.scene.remove(flash);
        flashGeometry.dispose();
        flashMaterial.dispose();
      },
    });

    const shardCount = 10;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2;
      const direction = new THREE.Vector3(Math.cos(angle), 0.4 + Math.random() * 0.4, Math.sin(angle));
      const shardMaterial = new THREE.MeshBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: 1 });
      const shard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), shardMaterial);
      shard.position.copy(point);
      this.scene.add(shard);
      const maxLife = 0.35 + Math.random() * 0.2;
      this.active.push({
        life: 0,
        maxLife,
        tick: (t) => {
          shard.position.copy(point).addScaledVector(direction, t * 3.5);
          shard.rotation.x += 0.4;
          shard.rotation.y += 0.4;
          shardMaterial.opacity = 1 - t;
        },
        dispose: () => {
          this.scene.remove(shard);
          shard.geometry.dispose();
          shardMaterial.dispose();
        },
      });
    }
  }

  /** Cyber-Nexus building-death VFX per §6: the structure disassembles into blue pixel squares that dissolve upward. Weightier than a unit death. */
  spawnBuildingDestroyed(center: THREE.Vector3, radius: number): void {
    const point = center.clone();
    point.y = radius * 0.6;

    const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xdff3ff, transparent: true, opacity: 1 });
    const flashGeometry = new THREE.SphereGeometry(radius * 0.5, 12, 12);
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(point);
    this.scene.add(flash);
    this.active.push({
      life: 0,
      maxLife: 0.4,
      tick: (t) => {
        flash.scale.setScalar(1 + t * 4);
        flashMaterial.opacity = 1 - t;
      },
      dispose: () => {
        this.scene.remove(flash);
        flashGeometry.dispose();
        flashMaterial.dispose();
      },
    });

    const shardCount = 22;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      const direction = new THREE.Vector3(Math.cos(angle), 0.6 + Math.random() * 0.9, Math.sin(angle));
      const size = 0.12 + Math.random() * 0.22;
      const shardMaterial = new THREE.MeshBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: 1 });
      const shard = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), shardMaterial);
      const startPos = point.clone().add(new THREE.Vector3((Math.random() - 0.5) * radius, 0, (Math.random() - 0.5) * radius));
      shard.position.copy(startPos);
      this.scene.add(shard);
      const maxLife = 0.6 + Math.random() * 0.5;
      this.active.push({
        life: 0,
        maxLife,
        tick: (t) => {
          shard.position.copy(startPos).addScaledVector(direction, t * speed);
          shard.rotation.x += 0.35;
          shard.rotation.y += 0.35;
          shardMaterial.opacity = 1 - t;
        },
        dispose: () => {
          this.scene.remove(shard);
          shard.geometry.dispose();
          shardMaterial.dispose();
        },
      });
    }
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i];
      effect.life += dt;
      const t = Math.min(effect.life / effect.maxLife, 1);
      effect.tick(t);
      if (effect.life >= effect.maxLife) {
        effect.dispose();
        this.active.splice(i, 1);
      }
    }
  }
}

import * as THREE from 'three';

interface ActiveEffect {
  life: number;
  maxLife: number;
  tick: (t: number) => void;
  dispose: () => void;
}

/**
 * Minimal reusable VFX spawner, keyed by trigger. Only on-attack exists so
 * far (Cyber-Nexus laser + impact flash per §6); on-death/on-spawn/on-fusion
 * triggers land alongside the milestones that need them.
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

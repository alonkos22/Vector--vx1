import * as THREE from 'three';
import type { AttackVfxStyle } from '../config/factions';
import { soundManager } from './SoundManager';

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

  private readonly attackHitHandlers: Record<AttackVfxStyle, (from: THREE.Vector3, to: THREE.Vector3, powerScale: number) => void> = {
    laser: (from, to, p) => this.spawnLaserHit(from, to, p),
    'lava-arc': (from, to, p) => this.spawnLavaArcHit(from, to, p),
    'light-beam': (from, to, p) => this.spawnLightBeamHit(from, to, p),
    projectile: (from, to, p) => this.spawnProjectileHit(from, to, p),
    'spore-burst': (from, to, p) => this.spawnSporeBurstHit(from, to, p),
    'shadow-bolt': (from, to, p) => this.spawnShadowBoltHit(from, to, p),
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Faction-agnostic attack-hit dispatcher (§6): CombatUnit calls this with
   * its faction's `attackVfxStyle` and never needs to know which faction it
   * is. `powerScale` (1 = an average hit) sizes up every style's impact
   * flash/particles so a heavy hitter's attack visibly lands harder than a
   * basic unit's.
   */
  spawnAttackHit(style: AttackVfxStyle, from: THREE.Vector3, to: THREE.Vector3, powerScale = 1): void {
    this.attackHitHandlers[style](from, to, powerScale);
    soundManager.playHit(style, powerScale);
  }

  /** Cyber-Nexus attack VFX per §6: thin neon-blue laser line + a small impact flash. */
  spawnLaserHit(from: THREE.Vector3, to: THREE.Vector3, powerScale = 1, color = 0x4fc3ff): void {
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
    const flashGeometry = new THREE.SphereGeometry(0.3 * powerScale, 8, 8);
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

  /** Pyroliths attack VFX per §6: a thick lava arc that leaves a brief burning mark on the ground at the impact point. */
  spawnLavaArcHit(from: THREE.Vector3, to: THREE.Vector3, powerScale = 1): void {
    const arcMid = from.clone().lerp(to, 0.5);
    arcMid.y += 0.6;
    const curve = new THREE.QuadraticBezierCurve3(from, arcMid, to);
    const geometry = new THREE.TubeGeometry(curve, 12, 0.12 * powerScale, 6, false);
    const material = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.95 });
    const arc = new THREE.Mesh(geometry, material);
    this.scene.add(arc);
    this.active.push({
      life: 0,
      maxLife: 0.16,
      tick: (t) => {
        material.opacity = 0.95 * (1 - t);
      },
      dispose: () => {
        this.scene.remove(arc);
        geometry.dispose();
        material.dispose();
      },
    });

    const burnGeometry = new THREE.CircleGeometry(0.55 * powerScale, 10);
    const burnMaterial = new THREE.MeshBasicMaterial({ color: 0x552005, transparent: true, opacity: 0.8 });
    const burn = new THREE.Mesh(burnGeometry, burnMaterial);
    burn.rotation.x = -Math.PI / 2;
    burn.position.copy(to);
    burn.position.y = 0.05;
    this.scene.add(burn);
    this.active.push({
      life: 0,
      maxLife: 1.1,
      tick: (t) => {
        burnMaterial.opacity = 0.8 * (1 - t);
      },
      dispose: () => {
        this.scene.remove(burn);
        burnGeometry.dispose();
        burnMaterial.dispose();
      },
    });
  }

  /** Solari Archons attack VFX per §6: a continuous light beam whose impact disperses into small light particles. */
  spawnLightBeamHit(from: THREE.Vector3, to: THREE.Vector3, powerScale = 1): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const material = new THREE.LineBasicMaterial({ color: 0xf4c542, transparent: true, opacity: 1 });
    const beam = new THREE.Line(geometry, material);
    this.scene.add(beam);
    this.active.push({
      life: 0,
      maxLife: 0.2,
      tick: (t) => {
        material.opacity = 1 - t;
      },
      dispose: () => {
        this.scene.remove(beam);
        geometry.dispose();
        material.dispose();
      },
    });

    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const direction = new THREE.Vector3(Math.cos(angle), 0.3 + Math.random() * 0.5, Math.sin(angle));
      const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 1 });
      const particle = new THREE.Mesh(new THREE.SphereGeometry(0.09 * powerScale, 6, 6), particleMaterial);
      particle.position.copy(to);
      this.scene.add(particle);
      const maxLife = 0.25 + Math.random() * 0.15;
      this.active.push({
        life: 0,
        maxLife,
        tick: (t) => {
          particle.position.copy(to).addScaledVector(direction, t * 1.8 * powerScale);
          particleMaterial.opacity = 1 - t;
        },
        dispose: () => {
          this.scene.remove(particle);
          particle.geometry.dispose();
          particleMaterial.dispose();
        },
      });
    }
  }

  /**
   * Frost-Forged attack VFX per §6: a physical projectile with a brief smoke
   * trail; impact is metal sparks plus a small ice cloud. Approximated as an
   * instantaneous streak-plus-impact (same resolve-on-hit shape as the other
   * three styles) rather than a time-of-flight projectile.
   */
  spawnProjectileHit(from: THREE.Vector3, to: THREE.Vector3, powerScale = 1): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const material = new THREE.LineBasicMaterial({ color: 0x6f7a80, transparent: true, opacity: 0.7 });
    const streak = new THREE.Line(geometry, material);
    this.scene.add(streak);
    this.active.push({
      life: 0,
      maxLife: 0.1,
      tick: (t) => {
        material.opacity = 0.7 * (1 - t);
      },
      dispose: () => {
        this.scene.remove(streak);
        geometry.dispose();
        material.dispose();
      },
    });

    const sparkCount = 7;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2;
      const direction = new THREE.Vector3(Math.cos(angle), 0.4 + Math.random() * 0.4, Math.sin(angle));
      const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 1 });
      const spark = new THREE.Mesh(new THREE.BoxGeometry(0.08 * powerScale, 0.08 * powerScale, 0.08 * powerScale), sparkMaterial);
      spark.position.copy(to);
      this.scene.add(spark);
      const maxLife = 0.2 + Math.random() * 0.15;
      this.active.push({
        life: 0,
        maxLife,
        tick: (t) => {
          spark.position.copy(to).addScaledVector(direction, t * 2.4 * powerScale);
          sparkMaterial.opacity = 1 - t;
        },
        dispose: () => {
          this.scene.remove(spark);
          spark.geometry.dispose();
          sparkMaterial.dispose();
        },
      });
    }

    const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0x9fe8f0, transparent: true, opacity: 0.55 });
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.3 * powerScale, 8, 8), cloudMaterial);
    cloud.position.copy(to);
    this.scene.add(cloud);
    this.active.push({
      life: 0,
      maxLife: 0.35,
      tick: (t) => {
        cloud.scale.setScalar(1 + t * 1.8);
        cloudMaterial.opacity = 0.55 * (1 - t);
      },
      dispose: () => {
        this.scene.remove(cloud);
        cloud.geometry.dispose();
        cloudMaterial.dispose();
      },
    });
  }

  /** Verdant Wilds attack VFX: a lobbed spore pod that bursts into a cloud of drifting toxic spore motes on impact. */
  spawnSporeBurstHit(from: THREE.Vector3, to: THREE.Vector3, powerScale = 1): void {
    const arcMid = from.clone().lerp(to, 0.5);
    arcMid.y += 0.8;
    const curve = new THREE.QuadraticBezierCurve3(from, arcMid, to);
    const geometry = new THREE.TubeGeometry(curve, 10, 0.06 * powerScale, 6, false);
    const material = new THREE.MeshBasicMaterial({ color: 0x7fd94f, transparent: true, opacity: 0.85 });
    const pod = new THREE.Mesh(geometry, material);
    this.scene.add(pod);
    this.active.push({
      life: 0,
      maxLife: 0.22,
      tick: (t) => {
        material.opacity = 0.85 * (1 - t);
      },
      dispose: () => {
        this.scene.remove(pod);
        geometry.dispose();
        material.dispose();
      },
    });

    const moteCount = 8;
    for (let i = 0; i < moteCount; i++) {
      const angle = (i / moteCount) * Math.PI * 2;
      const direction = new THREE.Vector3(Math.cos(angle), 0.3 + Math.random() * 0.6, Math.sin(angle));
      const moteMaterial = new THREE.MeshBasicMaterial({ color: 0x8fd45f, transparent: true, opacity: 0.9 });
      const mote = new THREE.Mesh(new THREE.SphereGeometry(0.07 * powerScale, 6, 6), moteMaterial);
      mote.position.copy(to);
      this.scene.add(mote);
      const maxLife = 0.3 + Math.random() * 0.25;
      this.active.push({
        life: 0,
        maxLife,
        tick: (t) => {
          mote.position.copy(to).addScaledVector(direction, t * 1.5 * powerScale);
          moteMaterial.opacity = 0.9 * (1 - t);
        },
        dispose: () => {
          this.scene.remove(mote);
          mote.geometry.dispose();
          moteMaterial.dispose();
        },
      });
    }
  }

  /** Umbral Voidkin attack VFX: a jagged violet shadow bolt whose impact tears open into wisping void tendrils. */
  spawnShadowBoltHit(from: THREE.Vector3, to: THREE.Vector3, powerScale = 1): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const material = new THREE.LineBasicMaterial({ color: 0x9f6fd0, transparent: true, opacity: 0.9 });
    const bolt = new THREE.Line(geometry, material);
    this.scene.add(bolt);
    this.active.push({
      life: 0,
      maxLife: 0.14,
      tick: (t) => {
        material.opacity = 0.9 * (1 - t);
      },
      dispose: () => {
        this.scene.remove(bolt);
        geometry.dispose();
        material.dispose();
      },
    });

    const tendrilCount = 6;
    for (let i = 0; i < tendrilCount; i++) {
      const angle = (i / tendrilCount) * Math.PI * 2;
      const direction = new THREE.Vector3(Math.cos(angle), 0.2 + Math.random() * 0.5, Math.sin(angle));
      const tendrilMaterial = new THREE.MeshBasicMaterial({ color: 0x6a2fa0, transparent: true, opacity: 0.85 });
      const tendril = new THREE.Mesh(new THREE.ConeGeometry(0.05 * powerScale, 0.35 * powerScale, 5), tendrilMaterial);
      tendril.position.copy(to);
      this.scene.add(tendril);
      const maxLife = 0.22 + Math.random() * 0.15;
      this.active.push({
        life: 0,
        maxLife,
        tick: (t) => {
          tendril.position.copy(to).addScaledVector(direction, t * 2.0 * powerScale);
          tendrilMaterial.opacity = 0.85 * (1 - t);
        },
        dispose: () => {
          this.scene.remove(tendril);
          tendril.geometry.dispose();
          tendrilMaterial.dispose();
        },
      });
    }

    const voidCloudMaterial = new THREE.MeshBasicMaterial({ color: 0x2d0f4a, transparent: true, opacity: 0.6 });
    const voidCloud = new THREE.Mesh(new THREE.SphereGeometry(0.28 * powerScale, 8, 8), voidCloudMaterial);
    voidCloud.position.copy(to);
    this.scene.add(voidCloud);
    this.active.push({
      life: 0,
      maxLife: 0.3,
      tick: (t) => {
        voidCloud.scale.setScalar(1 + t * 1.6);
        voidCloudMaterial.opacity = 0.6 * (1 - t);
      },
      dispose: () => {
        this.scene.remove(voidCloud);
        voidCloud.geometry.dispose();
        voidCloudMaterial.dispose();
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
    soundManager.playFusion();
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
    soundManager.playBuildingDestroyed();
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

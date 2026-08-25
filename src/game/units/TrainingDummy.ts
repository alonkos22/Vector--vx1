import * as THREE from 'three';
import type { Targetable } from '../Targetable';
import { HealthBar } from '../HealthBar';

const RESPAWN_DELAY_SEC = 6;
const MAX_HP = 150;

/** Stationary placeholder target for proving out the combat system (Milestone 4). Respawns after being destroyed. */
export class TrainingDummy implements Targetable {
  readonly ownerId = 'dummy';
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;
  maxHp = MAX_HP;
  hp = MAX_HP;

  private readonly visualMesh: THREE.Mesh;
  private readonly healthBar: HealthBar;
  private respawnRemaining = 0;

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.mesh.userData.dummyRef = this;

    const material = new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.6, metalness: 0.2 });
    this.visualMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.4, 4, 8), material);
    this.visualMesh.position.y = 1.1;
    this.visualMesh.castShadow = true;
    this.mesh.add(this.visualMesh);

    this.healthBar = new HealthBar(2.4);
    this.healthBar.setForcedVisible(true);
    this.healthBar.update(1);
    this.mesh.add(this.healthBar.group);
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  takeDamage(amount: number): void {
    if (!this.isAlive()) return;
    this.hp = Math.max(0, this.hp - amount);
    this.healthBar.update(this.hp / this.maxHp);
    if (this.hp <= 0) {
      this.visualMesh.visible = false;
      this.respawnRemaining = RESPAWN_DELAY_SEC;
    }
  }

  update(dt: number, camera: THREE.Camera): void {
    if (!this.isAlive()) {
      this.respawnRemaining -= dt;
      if (this.respawnRemaining <= 0) this.respawn();
    }
    this.healthBar.faceCamera(camera);
  }

  private respawn(): void {
    this.hp = this.maxHp;
    this.visualMesh.visible = true;
    this.healthBar.update(1);
  }
}

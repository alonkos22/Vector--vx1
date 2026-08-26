import * as THREE from 'three';

/** Small billboarded gold chevrons above a combat unit's health bar, one lit per veterancy rank earned. */
export class RankBadge {
  readonly group: THREE.Group;
  private readonly chevrons: THREE.Mesh[];

  constructor(yOffset: number, maxRank: number) {
    this.group = new THREE.Group();
    this.group.position.y = yOffset;
    this.group.visible = false;

    const material = new THREE.MeshBasicMaterial({ color: 0xffd24a, depthTest: false });
    const geometry = new THREE.ConeGeometry(0.07, 0.16, 3);
    this.chevrons = [];
    for (let i = 0; i < maxRank; i++) {
      const chevron = new THREE.Mesh(geometry, material);
      chevron.renderOrder = 999;
      chevron.position.x = (i - (maxRank - 1) / 2) * 0.2;
      this.chevrons.push(chevron);
      this.group.add(chevron);
    }
  }

  setRank(rank: number): void {
    this.group.visible = rank > 0;
    for (let i = 0; i < this.chevrons.length; i++) this.chevrons[i].visible = i < rank;
  }

  faceCamera(camera: THREE.Camera): void {
    this.group.quaternion.copy(camera.quaternion);
  }
}

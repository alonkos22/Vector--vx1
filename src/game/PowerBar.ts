import * as THREE from 'three';

const BAR_WIDTH = 0.85;
const BAR_HEIGHT = 0.06;
const ROW_GAP = 0.1;

/**
 * Small billboarded bar below a combat unit's health bar showing its
 * relative attack power. Magic/support-role units and heavy-hitting units
 * (fusion outputs, "heavy" tier) render it doubled — two stacked bars
 * instead of one — to call out their outsized threat at a glance.
 */
export class PowerBar {
  readonly group: THREE.Group;
  private readonly fills: THREE.Mesh[] = [];

  constructor(yOffset: number, doubled: boolean, color = 0xff8a3d) {
    this.group = new THREE.Group();
    this.group.position.y = yOffset;

    const rows = doubled ? 2 : 1;
    for (let row = 0; row < rows; row++) {
      const rowY = -row * ROW_GAP;

      const bg = new THREE.Mesh(
        new THREE.PlaneGeometry(BAR_WIDTH, BAR_HEIGHT),
        new THREE.MeshBasicMaterial({ color: 0x11141a, depthTest: false, transparent: true, opacity: 0.8 }),
      );
      bg.position.y = rowY;
      bg.renderOrder = 998;

      const fill = new THREE.Mesh(new THREE.PlaneGeometry(BAR_WIDTH, BAR_HEIGHT), new THREE.MeshBasicMaterial({ color, depthTest: false }));
      fill.position.set(0, rowY, 0.001);
      fill.renderOrder = 999;

      this.group.add(bg, fill);
      this.fills.push(fill);
    }
  }

  /** 0..1 fraction of the reference power scale. */
  setPower(fraction: number): void {
    const clamped = THREE.MathUtils.clamp(fraction, 0.05, 1);
    for (const fill of this.fills) {
      fill.scale.x = clamped;
      fill.position.x = (-BAR_WIDTH / 2) * (1 - clamped);
    }
  }

  faceCamera(camera: THREE.Camera): void {
    this.group.quaternion.copy(camera.quaternion);
  }
}

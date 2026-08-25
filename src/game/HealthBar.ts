import * as THREE from 'three';

/** Small billboarded HP bar shown above a unit/target. Visible when damaged or forced (e.g. selected). */
export class HealthBar {
  readonly group: THREE.Group;
  private readonly fill: THREE.Mesh;
  private readonly width: number;
  private lastFraction = 1;
  private forcedVisible = false;

  constructor(yOffset: number, width = 1.1) {
    this.width = width;
    this.group = new THREE.Group();
    this.group.position.y = yOffset;
    this.group.visible = false;

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(width, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x11141a, depthTest: false, transparent: true, opacity: 0.85 }),
    );
    bg.renderOrder = 998;

    this.fill = new THREE.Mesh(
      new THREE.PlaneGeometry(width, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x4fe36a, depthTest: false }),
    );
    this.fill.renderOrder = 999;
    this.fill.position.z = 0.001;

    this.group.add(bg, this.fill);
  }

  update(fraction: number): void {
    this.lastFraction = THREE.MathUtils.clamp(fraction, 0, 1);
    this.fill.scale.x = Math.max(0.001, this.lastFraction);
    this.fill.position.x = (-this.width / 2) * (1 - this.lastFraction);
    const material = this.fill.material as THREE.MeshBasicMaterial;
    material.color.setHSL(this.lastFraction * 0.33, 0.7, 0.5);
    this.refreshVisibility();
  }

  setForcedVisible(value: boolean): void {
    this.forcedVisible = value;
    this.refreshVisibility();
  }

  private refreshVisibility(): void {
    this.group.visible = this.forcedVisible || this.lastFraction < 1;
  }

  faceCamera(camera: THREE.Camera): void {
    this.group.quaternion.copy(camera.quaternion);
  }
}

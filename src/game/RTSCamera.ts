import * as THREE from 'three';
import type { InputManager } from './InputManager';

const DEG2RAD = Math.PI / 180;

export interface RTSCameraOptions {
  /** Pitch above the horizon, degrees. StarCraft II-style isometric ~45-55°. */
  elevationDeg: number;
  fovDeg: number;
  minDistance: number;
  maxDistance: number;
  startDistance: number;
  panSpeed: number;
  edgePanSpeed: number;
  edgePanMarginPx: number;
  zoomSpeed: number;
  rotateSpeed: number;
  mapHalfExtent: number;
}

const DEFAULT_OPTIONS: RTSCameraOptions = {
  elevationDeg: 50,
  fovDeg: 40,
  minDistance: 15,
  maxDistance: 110,
  startDistance: 55,
  panSpeed: 40,
  edgePanSpeed: 30,
  edgePanMarginPx: 12,
  zoomSpeed: 0.06,
  rotateSpeed: 1.4,
  mapHalfExtent: 200,
};

/**
 * Fixed isometric-style RTS camera: always looks at a ground-plane target
 * point from a constant elevation angle. Pan moves the target, zoom dollies
 * distance, rotate orbits azimuth around the target (slow, classic-RTS feel).
 */
export class RTSCamera {
  readonly camera: THREE.PerspectiveCamera;
  readonly target = new THREE.Vector3(0, 0, 0);
  private distance: number;
  private azimuth = Math.PI / 4;
  private readonly opts: RTSCameraOptions;

  constructor(aspect: number, opts: Partial<RTSCameraOptions> = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...opts };
    this.distance = this.opts.startDistance;
    this.camera = new THREE.PerspectiveCamera(this.opts.fovDeg, aspect, 0.1, 500);
    this.updateCameraTransform();
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, input: InputManager, viewportWidth: number, viewportHeight: number): void {
    this.handleZoom(input);
    this.handleRotate(dt, input);
    this.handlePan(dt, input, viewportWidth, viewportHeight);
    this.updateCameraTransform();
    input.endFrame();
  }

  private handleZoom(input: InputManager): void {
    if (input.wheelDelta === 0) return;
    const factor = 1 + input.wheelDelta * this.opts.zoomSpeed * 0.01;
    this.distance = THREE.MathUtils.clamp(this.distance * factor, this.opts.minDistance, this.opts.maxDistance);
  }

  private handleRotate(dt: number, input: InputManager): void {
    let rotateInput = 0;
    if (input.isDown('KeyQ')) rotateInput -= 1;
    if (input.isDown('KeyE')) rotateInput += 1;
    if (input.mouse.middleDown) rotateInput += input.mouse.dx * 0.01;
    this.azimuth += rotateInput * this.opts.rotateSpeed * dt;
  }

  private handlePan(dt: number, input: InputManager, viewportWidth: number, viewportHeight: number): void {
    let panX = 0;
    let panZ = 0;

    if (input.isDown('KeyW') || input.isDown('ArrowUp')) panZ -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) panZ += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) panX -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) panX += 1;

    const margin = this.opts.edgePanMarginPx;
    const mx = input.mouse.x;
    const my = input.mouse.y;
    if (mx > 0 && my > 0) {
      if (mx <= margin) panX -= 1;
      else if (mx >= viewportWidth - margin) panX += 1;
      if (my <= margin) panZ -= 1;
      else if (my >= viewportHeight - margin) panZ += 1;
    }

    if (panX === 0 && panZ === 0) return;

    const panVec = new THREE.Vector2(panX, panZ);
    if (panVec.lengthSq() > 1) panVec.normalize();

    // Pan relative to current camera azimuth so "forward" is always screen-up.
    const forward = new THREE.Vector3(Math.sin(this.azimuth), 0, Math.cos(this.azimuth));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    const speed = this.opts.panSpeed * (this.distance / this.opts.startDistance) * dt;
    this.target.addScaledVector(forward, -panVec.y * speed);
    this.target.addScaledVector(right, panVec.x * speed);

    const half = this.opts.mapHalfExtent;
    this.target.x = THREE.MathUtils.clamp(this.target.x, -half, half);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -half, half);
  }

  private updateCameraTransform(): void {
    const elevation = this.opts.elevationDeg * DEG2RAD;
    const horizontalDist = this.distance * Math.cos(elevation);
    const height = this.distance * Math.sin(elevation);

    const offset = new THREE.Vector3(
      Math.sin(this.azimuth) * horizontalDist,
      height,
      Math.cos(this.azimuth) * horizontalDist,
    );

    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }
}

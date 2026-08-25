import * as THREE from 'three';
import type { Unit } from './units/Unit';

const DRAG_THRESHOLD_PX = 4;
const DOUBLE_CLICK_MS = 350;
const DOUBLE_CLICK_RADIUS_PX = 24;

/** Click select, drag-box select, double-click select-all-visible-of-type, and Ctrl+1-9 control groups. */
export class SelectionManager {
  readonly selected = new Set<Unit>();

  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.Camera;
  private readonly getUnits: () => Unit[];
  private readonly onChange: () => void;
  private readonly boxEl: HTMLDivElement;
  private readonly controlGroups = new Map<number, Unit[]>();

  private dragStartPx: { x: number; y: number } | null = null;
  private dragging = false;
  private lastClick: { time: number; x: number; y: number } | null = null;

  constructor(renderer: THREE.WebGLRenderer, camera: THREE.Camera, getUnits: () => Unit[], onChange: () => void) {
    this.renderer = renderer;
    this.camera = camera;
    this.getUnits = getUnits;
    this.onChange = onChange;

    this.boxEl = document.createElement('div');
    this.boxEl.style.cssText = `
      position: fixed; border: 1px solid #9fe8ffcc; background: rgba(79,195,255,0.15);
      pointer-events: none; display: none; z-index: 60;
    `;
    document.body.appendChild(this.boxEl);

    const el = renderer.domElement;
    el.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.dragStartPx = { x: e.clientX, y: e.clientY };
    this.dragging = false;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.dragStartPx) return;
    const dx = e.clientX - this.dragStartPx.x;
    const dy = e.clientY - this.dragStartPx.y;
    if (!this.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) this.dragging = true;
    if (!this.dragging) return;

    const x = Math.min(this.dragStartPx.x, e.clientX);
    const y = Math.min(this.dragStartPx.y, e.clientY);
    this.boxEl.style.left = `${x}px`;
    this.boxEl.style.top = `${y}px`;
    this.boxEl.style.width = `${Math.abs(dx)}px`;
    this.boxEl.style.height = `${Math.abs(dy)}px`;
    this.boxEl.style.display = 'block';
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0 || !this.dragStartPx) return;

    if (this.dragging) {
      this.finishBoxSelect(this.dragStartPx, { x: e.clientX, y: e.clientY }, e.shiftKey);
    } else {
      this.handleClickSelect(e);
    }

    this.dragStartPx = null;
    this.dragging = false;
    this.boxEl.style.display = 'none';
  }

  private handleClickSelect(e: MouseEvent): void {
    const now = performance.now();
    const isDoubleClick =
      this.lastClick !== null &&
      now - this.lastClick.time < DOUBLE_CLICK_MS &&
      Math.hypot(e.clientX - this.lastClick.x, e.clientY - this.lastClick.y) < DOUBLE_CLICK_RADIUS_PX;
    this.lastClick = { time: now, x: e.clientX, y: e.clientY };

    const hit = this.pickUnitAt(e.clientX, e.clientY);

    if (isDoubleClick && hit) {
      this.selectAllOfType(hit.unitTypeId);
      return;
    }

    if (!hit) {
      if (!e.shiftKey) this.clear();
      this.onChange();
      return;
    }

    if (e.shiftKey) {
      if (this.selected.has(hit)) this.deselect(hit);
      else this.select(hit);
    } else {
      this.clear();
      this.select(hit);
    }
    this.onChange();
  }

  private pickUnitAt(clientX: number, clientY: number): Unit | null {
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);

    const meshes = this.getUnits().map((u) => u.mesh);
    const hits = raycaster.intersectObjects(meshes, true);
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        const ref = obj.userData.unitRef as Unit | undefined;
        if (ref) return ref;
        obj = obj.parent;
      }
    }
    return null;
  }

  private finishBoxSelect(startPx: { x: number; y: number }, endPx: { x: number; y: number }, additive: boolean): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const minX = Math.min(startPx.x, endPx.x);
    const maxX = Math.max(startPx.x, endPx.x);
    const minY = Math.min(startPx.y, endPx.y);
    const maxY = Math.max(startPx.y, endPx.y);

    if (!additive) this.clear();

    const worldPoint = new THREE.Vector3();
    const cameraSpace = new THREE.Vector3();
    for (const unit of this.getUnits()) {
      worldPoint.set(unit.position.x, unit.position.y + 0.5, unit.position.z);
      cameraSpace.copy(worldPoint).applyMatrix4(this.camera.matrixWorldInverse);
      if (cameraSpace.z > 0) continue;

      const projected = worldPoint.clone().project(this.camera);
      const sx = rect.left + ((projected.x + 1) / 2) * rect.width;
      const sy = rect.top + ((1 - projected.y) / 2) * rect.height;
      if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) this.select(unit);
    }
    this.onChange();
  }

  private selectAllOfType(unitTypeId: string): void {
    this.clear();
    const frustum = this.buildFrustum();
    for (const unit of this.getUnits()) {
      if (unit.unitTypeId !== unitTypeId) continue;
      if (frustum.containsPoint(unit.position)) this.select(unit);
    }
    this.onChange();
  }

  private buildFrustum(): THREE.Frustum {
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(matrix);
    return frustum;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!/^Digit[1-9]$/.test(e.code)) return;
    const groupNumber = Number(e.code.replace('Digit', ''));

    if (e.ctrlKey || e.metaKey) {
      this.controlGroups.set(groupNumber, [...this.selected]);
      return;
    }

    const liveUnits = this.getUnits();
    const group = this.controlGroups.get(groupNumber)?.filter((u) => liveUnits.includes(u));
    if (!group || group.length === 0) return;
    this.clear();
    for (const unit of group) this.select(unit);
    this.onChange();
  }

  select(unit: Unit): void {
    unit.setSelected(true);
    this.selected.add(unit);
  }

  deselect(unit: Unit): void {
    unit.setSelected(false);
    this.selected.delete(unit);
  }

  clear(): void {
    for (const unit of this.selected) unit.setSelected(false);
    this.selected.clear();
  }

  /** Drops any selected units that no longer exist (e.g. died in combat). */
  prune(): void {
    const liveUnits = this.getUnits();
    for (const unit of [...this.selected]) {
      if (!liveUnits.includes(unit)) this.selected.delete(unit);
    }
  }
}

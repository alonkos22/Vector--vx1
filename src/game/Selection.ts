import * as THREE from 'three';
import type { Unit } from './units/Unit';
import { FluxHarvester } from './units/FluxHarvester';

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
  /** Touch-only: given a tap's screen point, may issue a move/attack order and return true to suppress the default tap-to-select. Lets the caller (which knows about enemy targets) implement "smart tap" since touch has no separate right-click. */
  private readonly onTouchTap?: (clientX: number, clientY: number) => boolean;
  private readonly boxEl: HTMLDivElement;
  private readonly controlGroups = new Map<number, Unit[]>();

  private dragStartPx: { x: number; y: number } | null = null;
  private dragPointerId: number | null = null;
  private dragging = false;
  private lastClick: { time: number; x: number; y: number } | null = null;
  private readonly activeTouchIds = new Set<number>();

  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    getUnits: () => Unit[],
    onChange: () => void,
    onTouchTap?: (clientX: number, clientY: number) => boolean,
  ) {
    this.renderer = renderer;
    this.camera = camera;
    this.getUnits = getUnits;
    this.onChange = onChange;
    this.onTouchTap = onTouchTap;

    this.boxEl = document.createElement('div');
    this.boxEl.style.cssText = `
      position: fixed; border: 1px solid #9fe8ffcc; background: rgba(79,195,255,0.15);
      pointer-events: none; display: none; z-index: 60;
    `;
    document.body.appendChild(this.boxEl);

    // Pointer Events unify mouse and single-finger touch: click-select, drag-box-select and
    // double-click/tap all work the same way for both. A second finger joining mid-drag hands
    // off to RTSCamera's two-finger pan/pinch-zoom instead (see abandonDrag below).
    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerCancel(e));
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.pointerType === 'touch') {
      this.activeTouchIds.add(e.pointerId);
      if (this.activeTouchIds.size > 1) {
        this.abandonDrag();
        return;
      }
    }
    if (e.button !== 0) return;
    this.dragStartPx = { x: e.clientX, y: e.clientY };
    this.dragPointerId = e.pointerId;
    this.dragging = false;
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragStartPx || e.pointerId !== this.dragPointerId) return;
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

  private onPointerUp(e: PointerEvent): void {
    if (e.pointerType === 'touch') this.activeTouchIds.delete(e.pointerId);
    if (e.button !== 0 || !this.dragStartPx || e.pointerId !== this.dragPointerId) return;

    if (this.dragging) {
      this.finishBoxSelect(this.dragStartPx, { x: e.clientX, y: e.clientY }, e.shiftKey);
    } else if (!(e.pointerType === 'touch' && this.onTouchTap?.(e.clientX, e.clientY))) {
      this.handleClickSelect(e);
    }

    this.dragStartPx = null;
    this.dragPointerId = null;
    this.dragging = false;
    this.boxEl.style.display = 'none';
  }

  private onPointerCancel(e: PointerEvent): void {
    if (e.pointerType === 'touch') this.activeTouchIds.delete(e.pointerId);
    if (e.pointerId === this.dragPointerId) this.abandonDrag();
  }

  /** Cancels an in-progress drag without issuing a select — used when a second finger joins (handing off to camera gestures) or a touch is cancelled by the OS. */
  private abandonDrag(): void {
    this.dragStartPx = null;
    this.dragPointerId = null;
    this.dragging = false;
    this.boxEl.style.display = 'none';
  }

  private handleClickSelect(e: PointerEvent): void {
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

  /** Whether one of the player's own units is at this screen point — lets a touch "smart tap" fall back to normal select instead of issuing a move order onto a friendly unit. */
  hasUnitAt(clientX: number, clientY: number): boolean {
    return this.pickUnitAt(clientX, clientY) !== null;
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

    if (e.ctrlKey || e.metaKey) this.setControlGroup(groupNumber);
    else this.recallControlGroup(groupNumber);
  }

  /** Assigns the current selection to control group `groupNumber` (1-9). Public so a touch UI (long-press a group slot) can trigger it without a Ctrl key, which touch has no equivalent of. */
  setControlGroup(groupNumber: number): void {
    this.controlGroups.set(groupNumber, [...this.selected]);
  }

  /** Selects control group `groupNumber`, dropping any units that died since it was set. Public so a touch UI (tap a group slot) can trigger it. */
  recallControlGroup(groupNumber: number): void {
    const liveUnits = this.getUnits();
    const group = this.controlGroups.get(groupNumber)?.filter((u) => liveUnits.includes(u));
    if (!group || group.length === 0) return;
    this.clear();
    for (const unit of group) this.select(unit);
    this.onChange();
  }

  /** Whether control group `groupNumber` currently has any (still-live) units assigned — for a UI indicator. */
  hasControlGroup(groupNumber: number): boolean {
    const liveUnits = this.getUnits();
    return (this.controlGroups.get(groupNumber)?.filter((u) => liveUnits.includes(u)).length ?? 0) > 0;
  }

  select(unit: Unit): void {
    unit.setSelected(true);
    this.selected.add(unit);
    // Full manual control (per user request): selecting a harvester pauses its autonomous gather loop for a
    // few seconds so the player has a window to give it an order before it walks off on its own again.
    if (unit instanceof FluxHarvester) unit.pauseForOrder();
  }

  deselect(unit: Unit): void {
    unit.setSelected(false);
    this.selected.delete(unit);
    if (unit instanceof FluxHarvester) unit.cancelPause();
  }

  clear(): void {
    for (const unit of this.selected) {
      unit.setSelected(false);
      if (unit instanceof FluxHarvester) unit.cancelPause();
    }
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

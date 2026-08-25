export class InputManager {
  readonly keys = new Set<string>();
  readonly mouse = { x: 0, y: 0, dx: 0, dy: 0, leftDown: false, rightDown: false, middleDown: false };
  wheelDelta = 0;

  /** Two-finger drag delta this frame (camera pan on touch, since touch has no WASD/edge-pan). */
  readonly touchPan = { dx: 0, dy: 0 };
  /** Change in inter-finger distance this frame: positive = fingers spreading apart (pinch-out = zoom in). */
  touchPinchDelta = 0;
  /** True while exactly one finger is down and not part of a pinch/pan gesture — the gesture Selection/tap-orders use. */
  singleTouchActive = false;

  private readonly activeTouches = new Map<number, { x: number; y: number }>();
  private lastTouchCentroid: { x: number; y: number } | null = null;
  private lastTouchDistance: number | null = null;

  constructor(domElement: HTMLElement) {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    domElement.addEventListener('mousemove', (e) => {
      this.mouse.dx += e.movementX;
      this.mouse.dy += e.movementY;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.leftDown = true;
      if (e.button === 1) this.mouse.middleDown = true;
      if (e.button === 2) this.mouse.rightDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.leftDown = false;
      if (e.button === 1) this.mouse.middleDown = false;
      if (e.button === 2) this.mouse.rightDown = false;
    });

    domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    domElement.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.wheelDelta += e.deltaY;
      },
      { passive: false },
    );

    domElement.addEventListener('pointerdown', (e) => this.onTouchPointerDown(e));
    domElement.addEventListener('pointermove', (e) => this.onTouchPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onTouchPointerEnd(e));
    window.addEventListener('pointercancel', (e) => this.onTouchPointerEnd(e));
  }

  private onTouchPointerDown(e: PointerEvent): void {
    if (e.pointerType !== 'touch') return;
    this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.singleTouchActive = this.activeTouches.size === 1;
    if (this.activeTouches.size === 2) this.resetTwoFingerBaseline();
  }

  private onTouchPointerMove(e: PointerEvent): void {
    if (e.pointerType !== 'touch' || !this.activeTouches.has(e.pointerId)) return;
    this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.activeTouches.size !== 2) return;

    const [a, b] = [...this.activeTouches.values()];
    const centroid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const distance = Math.hypot(a.x - b.x, a.y - b.y);

    if (this.lastTouchCentroid && this.lastTouchDistance !== null) {
      this.touchPan.dx += centroid.x - this.lastTouchCentroid.x;
      this.touchPan.dy += centroid.y - this.lastTouchCentroid.y;
      this.touchPinchDelta += distance - this.lastTouchDistance;
    }
    this.lastTouchCentroid = centroid;
    this.lastTouchDistance = distance;
  }

  private onTouchPointerEnd(e: PointerEvent): void {
    if (e.pointerType !== 'touch') return;
    this.activeTouches.delete(e.pointerId);
    this.singleTouchActive = this.activeTouches.size === 1;
    if (this.activeTouches.size < 2) {
      this.lastTouchCentroid = null;
      this.lastTouchDistance = null;
    } else {
      this.resetTwoFingerBaseline();
    }
  }

  private resetTwoFingerBaseline(): void {
    const [a, b] = [...this.activeTouches.values()];
    this.lastTouchCentroid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.lastTouchDistance = Math.hypot(a.x - b.x, a.y - b.y);
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** Call once per frame after consuming per-frame deltas. */
  endFrame(): void {
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.wheelDelta = 0;
    this.touchPan.dx = 0;
    this.touchPan.dy = 0;
    this.touchPinchDelta = 0;
  }
}

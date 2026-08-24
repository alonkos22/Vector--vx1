export class InputManager {
  readonly keys = new Set<string>();
  readonly mouse = { x: 0, y: 0, dx: 0, dy: 0, leftDown: false, rightDown: false, middleDown: false };
  wheelDelta = 0;

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
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** Call once per frame after consuming per-frame deltas. */
  endFrame(): void {
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.wheelDelta = 0;
  }
}

export interface MinimapEntity {
  x: number;
  z: number;
}

export interface MinimapState {
  mapHalfExtent: number;
  playerBuildings: MinimapEntity[];
  playerUnits: MinimapEntity[];
  visibleEnemyBuildings: MinimapEntity[];
  visibleEnemyUnits: MinimapEntity[];
  /** Ground point the RTS camera is currently looking at, for the viewport box. */
  cameraTarget: MinimapEntity;
  /** RTSCamera.viewDistance — bigger means more zoomed out, so the viewport box grows. */
  cameraDistance: number;
}

/** Internal canvas resolution — stays crisp at the expanded display size; CSS width/height controls what's actually shown. */
const CANVAS_RES_PX = 220;
const DEFAULT_SIZE_PX = 100;
const EXPANDED_SIZE_PX = 220;

/**
 * Canvas-drawn top-down overview: own units/buildings, fog-of-war-visible
 * enemy contacts, and a click/drag-to-recenter viewport box. Small by
 * default so it doesn't cover the corner of the viewport; expands only
 * while actively pressed (a press-and-hold magnifier, not a toggle) for a
 * clearer view/more precise click, then shrinks back on release.
 */
export class Minimap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private mapHalfExtent = 100;

  /**
   * `onNavigate` (left-click/drag, or any touch tap) recenters the camera.
   * `onCommand` (right-click) issues a move/attack order to the current
   * selection at that world point, mirroring right-click on the main
   * viewport — lets the player command the army without panning off an
   * important view first.
   */
  constructor(container: HTMLElement, onNavigate: (worldX: number, worldZ: number) => void, onCommand: (worldX: number, worldZ: number) => void) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_RES_PX;
    this.canvas.height = CANVAS_RES_PX;
    this.canvas.style.cssText = `
      position: absolute; bottom: 12px; right: 12px;
      width: ${DEFAULT_SIZE_PX}px; height: ${DEFAULT_SIZE_PX}px;
      background: rgba(10,16,24,0.85); border: 1px solid #2ea3ff55; border-radius: 6px;
      cursor: pointer; touch-action: none; transition: width 0.12s ease, height 0.12s ease;
    `;
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    const setExpanded = (expanded: boolean): void => {
      const px = expanded ? EXPANDED_SIZE_PX : DEFAULT_SIZE_PX;
      this.canvas.style.width = `${px}px`;
      this.canvas.style.height = `${px}px`;
    };

    const worldPointFromEvent = (e: PointerEvent | MouseEvent): [number, number] => {
      const rect = this.canvas.getBoundingClientRect();
      const u = (e.clientX - rect.left) / rect.width;
      const v = (e.clientY - rect.top) / rect.height;
      return [(u * 2 - 1) * this.mapHalfExtent, (v * 2 - 1) * this.mapHalfExtent];
    };
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setExpanded(true);
      const [x, z] = worldPointFromEvent(e);
      if (e.button === 2) onCommand(x, z);
      else onNavigate(x, z);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (e.buttons === 1) onNavigate(...worldPointFromEvent(e));
    });
    window.addEventListener('pointerup', () => setExpanded(false));
    this.canvas.addEventListener('pointercancel', () => setExpanded(false));
  }

  private toCanvas(x: number, z: number): [number, number] {
    const half = this.mapHalfExtent;
    return [((x + half) / (2 * half)) * CANVAS_RES_PX, ((z + half) / (2 * half)) * CANVAS_RES_PX];
  }

  private drawDot(x: number, z: number, radius: number, color: string, square: boolean): void {
    const [cx, cy] = this.toCanvas(x, z);
    this.ctx.fillStyle = color;
    if (square) {
      this.ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    } else {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  update(state: MinimapState): void {
    this.mapHalfExtent = state.mapHalfExtent;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, CANVAS_RES_PX, CANVAS_RES_PX);
    ctx.fillStyle = 'rgba(20,28,38,0.9)';
    ctx.fillRect(0, 0, CANVAS_RES_PX, CANVAS_RES_PX);

    for (const b of state.playerBuildings) this.drawDot(b.x, b.z, 3.5, '#4fc3ff', true);
    for (const u of state.playerUnits) this.drawDot(u.x, u.z, 2, '#9fe8ff', false);
    for (const b of state.visibleEnemyBuildings) this.drawDot(b.x, b.z, 3.5, '#ff4d4d', true);
    for (const u of state.visibleEnemyUnits) this.drawDot(u.x, u.z, 2, '#ff8a8a', false);

    const [vx, vy] = this.toCanvas(state.cameraTarget.x, state.cameraTarget.z);
    const boxHalf = Math.max(6, (state.cameraDistance / (2 * this.mapHalfExtent)) * CANVAS_RES_PX * 0.55);
    ctx.strokeStyle = 'rgba(223,243,255,0.85)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vx - boxHalf, vy - boxHalf, boxHalf * 2, boxHalf * 2);
  }
}

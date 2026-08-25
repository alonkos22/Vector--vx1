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

const SIZE_PX = 170;

/** Canvas-drawn top-down overview: own units/buildings, fog-of-war-visible enemy contacts, and a click/drag-to-recenter viewport box. */
export class Minimap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private mapHalfExtent = 100;

  constructor(container: HTMLElement, onNavigate: (worldX: number, worldZ: number) => void) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE_PX;
    this.canvas.height = SIZE_PX;
    this.canvas.style.cssText = `
      position: absolute; bottom: 12px; right: 12px;
      background: rgba(10,16,24,0.85); border: 1px solid #2ea3ff55; border-radius: 6px;
      cursor: pointer; touch-action: none;
    `;
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    const handlePointer = (e: PointerEvent): void => {
      const rect = this.canvas.getBoundingClientRect();
      const u = (e.clientX - rect.left) / rect.width;
      const v = (e.clientY - rect.top) / rect.height;
      onNavigate((u * 2 - 1) * this.mapHalfExtent, (v * 2 - 1) * this.mapHalfExtent);
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handlePointer(e);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (e.buttons === 1) handlePointer(e);
    });
  }

  private toCanvas(x: number, z: number): [number, number] {
    const half = this.mapHalfExtent;
    return [((x + half) / (2 * half)) * SIZE_PX, ((z + half) / (2 * half)) * SIZE_PX];
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

    ctx.clearRect(0, 0, SIZE_PX, SIZE_PX);
    ctx.fillStyle = 'rgba(20,28,38,0.9)';
    ctx.fillRect(0, 0, SIZE_PX, SIZE_PX);

    for (const b of state.playerBuildings) this.drawDot(b.x, b.z, 3.5, '#4fc3ff', true);
    for (const u of state.playerUnits) this.drawDot(u.x, u.z, 2, '#9fe8ff', false);
    for (const b of state.visibleEnemyBuildings) this.drawDot(b.x, b.z, 3.5, '#ff4d4d', true);
    for (const u of state.visibleEnemyUnits) this.drawDot(u.x, u.z, 2, '#ff8a8a', false);

    const [vx, vy] = this.toCanvas(state.cameraTarget.x, state.cameraTarget.z);
    const boxHalf = Math.max(6, (state.cameraDistance / (2 * this.mapHalfExtent)) * SIZE_PX * 0.55);
    ctx.strokeStyle = 'rgba(223,243,255,0.85)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vx - boxHalf, vy - boxHalf, boxHalf * 2, boxHalf * 2);
  }
}

import * as THREE from 'three';

/**
 * Cosmetic "high ground" lookup for plateaus (per user request: elevated
 * terrain units can fortify on / attack from). Gameplay logic — pathfinding,
 * movement, attack-range distance checks — all stay on the flat x/z plane
 * exactly as before (Targetable.position.y is never touched); only the
 * rendered mesh height (Unit.ts) and the high-ground damage bonus
 * (CombatUnit.ts) consult this grid. Kept separate from PathGrid (which
 * only knows blocked/walkable) since a plateau is walkable but tall, while
 * a mountain ridge is blocked and has no height concept at all.
 */
class ElevationField {
  private cellSize = 2;
  private halfExtent = 100;
  private cols = 1;
  private rows = 1;
  private heights = new Float32Array(1);

  init(halfExtent: number, cellSize = 2): void {
    this.halfExtent = halfExtent;
    this.cellSize = cellSize;
    this.cols = Math.ceil((halfExtent * 2) / cellSize);
    this.rows = this.cols;
    this.heights = new Float32Array(this.cols * this.rows);
  }

  private worldToCellX(x: number): number {
    return THREE.MathUtils.clamp(Math.floor((x + this.halfExtent) / this.cellSize), 0, this.cols - 1);
  }

  private worldToCellZ(z: number): number {
    return THREE.MathUtils.clamp(Math.floor((z + this.halfExtent) / this.cellSize), 0, this.rows - 1);
  }

  private idx(cx: number, cz: number): number {
    return cz * this.cols + cx;
  }

  /** Registers a circular plateau, raising every cell within `radius` to `height` (highest wins where plateaus overlap). Falls off smoothly over the outer `edgeFeather` units so the mesa's sloped rim doesn't produce a sudden step in unit height. */
  addPlateau(center: THREE.Vector3, radius: number, height: number, edgeFeather = 2): void {
    const ccx = this.worldToCellX(center.x);
    const ccz = this.worldToCellZ(center.z);
    const cellRadius = Math.ceil(radius / this.cellSize) + 1;
    for (let dz = -cellRadius; dz <= cellRadius; dz++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const cx = ccx + dx;
        const cz = ccz + dz;
        if (cx < 0 || cz < 0 || cx >= this.cols || cz >= this.rows) continue;
        const wx = cx * this.cellSize - this.halfExtent + this.cellSize / 2;
        const wz = cz * this.cellSize - this.halfExtent + this.cellSize / 2;
        const d = Math.hypot(wx - center.x, wz - center.z);
        if (d > radius) continue;
        const innerRadius = Math.max(radius - edgeFeather, 0.01);
        const t = d <= innerRadius ? 1 : 1 - (d - innerRadius) / (radius - innerRadius);
        const cellHeight = height * t;
        const i = this.idx(cx, cz);
        this.heights[i] = Math.max(this.heights[i], cellHeight);
      }
    }
  }

  /** Terrain height at a world point — 0 on flat ground, up to a plateau's height on top of it. */
  getHeightAt(x: number, z: number): number {
    return this.heights[this.idx(this.worldToCellX(x), this.worldToCellZ(z))];
  }
}

/** Single shared elevation field for the map, mirroring the pathGrid singleton pattern. */
export const elevation = new ElevationField();

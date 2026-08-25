import * as THREE from 'three';

interface HeapItem {
  f: number;
  index: number;
}

/** Small binary min-heap keyed by f-score, for A*'s open set. */
class MinHeap {
  private readonly items: HeapItem[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: HeapItem): void {
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].f <= this.items[i].f) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop(): HeapItem | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      let i = 0;
      const n = this.items.length;
      for (;;) {
        const l = i * 2 + 1;
        const r = i * 2 + 2;
        let smallest = i;
        if (l < n && this.items[l].f < this.items[smallest].f) smallest = l;
        if (r < n && this.items[r].f < this.items[smallest].f) smallest = r;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

const NEIGHBORS: Array<[number, number, number]> = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

/**
 * Grid-based A* pathfinding over the map. Buildings and other static
 * obstacles are marked blocked via `markCircleBlocked`; local separation
 * between units is handled separately, per-unit, during movement.
 */
export class PathGrid {
  private cellSize = 2;
  private halfExtent = 100;
  private cols = 1;
  private rows = 1;
  private blocked = new Uint8Array(1);

  init(halfExtent: number, cellSize = 2): void {
    this.halfExtent = halfExtent;
    this.cellSize = cellSize;
    this.cols = Math.ceil((halfExtent * 2) / cellSize);
    this.rows = this.cols;
    this.blocked = new Uint8Array(this.cols * this.rows);
  }

  private worldToCellX(x: number): number {
    return THREE.MathUtils.clamp(Math.floor((x + this.halfExtent) / this.cellSize), 0, this.cols - 1);
  }

  private worldToCellZ(z: number): number {
    return THREE.MathUtils.clamp(Math.floor((z + this.halfExtent) / this.cellSize), 0, this.rows - 1);
  }

  private cellToWorldX(cx: number): number {
    return cx * this.cellSize - this.halfExtent + this.cellSize / 2;
  }

  private cellToWorldZ(cz: number): number {
    return cz * this.cellSize - this.halfExtent + this.cellSize / 2;
  }

  private idx(cx: number, cz: number): number {
    return cz * this.cols + cx;
  }

  markCircleBlocked(center: THREE.Vector3, radius: number): void {
    const ccx = this.worldToCellX(center.x);
    const ccz = this.worldToCellZ(center.z);
    const cellRadius = Math.ceil(radius / this.cellSize) + 1;
    for (let dz = -cellRadius; dz <= cellRadius; dz++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const cx = ccx + dx;
        const cz = ccz + dz;
        if (cx < 0 || cz < 0 || cx >= this.cols || cz >= this.rows) continue;
        const wx = this.cellToWorldX(cx);
        const wz = this.cellToWorldZ(cz);
        if (Math.hypot(wx - center.x, wz - center.z) <= radius) this.blocked[this.idx(cx, cz)] = 1;
      }
    }
  }

  private isWalkable(cx: number, cz: number): boolean {
    if (cx < 0 || cz < 0 || cx >= this.cols || cz >= this.rows) return false;
    return this.blocked[this.idx(cx, cz)] === 0;
  }

  private findNearestWalkable(cx: number, cz: number): { cx: number; cz: number } | null {
    if (this.isWalkable(cx, cz)) return { cx, cz };
    for (let r = 1; r < 20; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const nx = cx + dx;
          const nz = cz + dz;
          if (this.isWalkable(nx, nz)) return { cx: nx, cz: nz };
        }
      }
    }
    return null;
  }

  private heuristic(x1: number, z1: number, x2: number, z2: number): number {
    return Math.hypot(x2 - x1, z2 - z1);
  }

  findPath(start: THREE.Vector3, goal: THREE.Vector3): THREE.Vector3[] | null {
    const startCx = this.worldToCellX(start.x);
    const startCz = this.worldToCellZ(start.z);
    let goalCx = this.worldToCellX(goal.x);
    let goalCz = this.worldToCellZ(goal.z);

    if (!this.isWalkable(goalCx, goalCz)) {
      const alt = this.findNearestWalkable(goalCx, goalCz);
      if (!alt) return null;
      goalCx = alt.cx;
      goalCz = alt.cz;
    }

    const startIdx = this.idx(startCx, startCz);
    const goalIdx = this.idx(goalCx, goalCz);
    if (startIdx === goalIdx) return [goal.clone()];

    const size = this.cols * this.rows;
    const gScore = new Float32Array(size).fill(Infinity);
    const cameFrom = new Int32Array(size).fill(-1);
    const visited = new Uint8Array(size);
    gScore[startIdx] = 0;

    const heap = new MinHeap();
    heap.push({ f: this.heuristic(startCx, startCz, goalCx, goalCz), index: startIdx });

    const maxIterations = size;
    let iterations = 0;

    while (heap.size > 0 && iterations < maxIterations) {
      iterations++;
      const current = heap.pop();
      if (!current) break;
      if (visited[current.index]) continue;
      visited[current.index] = 1;
      if (current.index === goalIdx) break;

      const cx = current.index % this.cols;
      const cz = Math.floor(current.index / this.cols);

      for (const [dx, dz, cost] of NEIGHBORS) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (!this.isWalkable(nx, nz)) continue;
        if (dx !== 0 && dz !== 0 && (!this.isWalkable(cx + dx, cz) || !this.isWalkable(cx, cz + dz))) continue;

        const nIdx = this.idx(nx, nz);
        if (visited[nIdx]) continue;
        const tentativeG = gScore[current.index] + cost;
        if (tentativeG < gScore[nIdx]) {
          gScore[nIdx] = tentativeG;
          cameFrom[nIdx] = current.index;
          heap.push({ f: tentativeG + this.heuristic(nx, nz, goalCx, goalCz), index: nIdx });
        }
      }
    }

    if (cameFrom[goalIdx] === -1 && goalIdx !== startIdx) return null;

    const cellPath: Array<[number, number]> = [];
    let cur = goalIdx;
    while (cur !== startIdx) {
      cellPath.push([cur % this.cols, Math.floor(cur / this.cols)]);
      cur = cameFrom[cur];
    }
    cellPath.push([startCx, startCz]);
    cellPath.reverse();

    const worldPath = cellPath.map(([cx, cz]) => new THREE.Vector3(this.cellToWorldX(cx), 0, this.cellToWorldZ(cz)));
    worldPath[worldPath.length - 1] = goal.clone();

    return this.simplifyPath(worldPath);
  }

  /** String-pulling: drop waypoints a straight line-of-sight can skip, for smoother movement. */
  private simplifyPath(path: THREE.Vector3[]): THREE.Vector3[] {
    if (path.length <= 2) return path;
    const simplified: THREE.Vector3[] = [path[0]];
    let anchor = 0;
    for (let i = 1; i < path.length; i++) {
      if (i === path.length - 1) {
        simplified.push(path[i]);
        break;
      }
      if (!this.hasLineOfSight(path[anchor], path[i + 1])) {
        simplified.push(path[i]);
        anchor = i;
      }
    }
    return simplified;
  }

  private hasLineOfSight(a: THREE.Vector3, b: THREE.Vector3): boolean {
    const dist = a.distanceTo(b);
    const steps = Math.max(1, Math.ceil(dist / (this.cellSize * 0.5)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      if (!this.isWalkable(this.worldToCellX(x), this.worldToCellZ(z))) return false;
    }
    return true;
  }
}

/** Single shared grid for the map — one match, one navigable space. */
export const pathGrid = new PathGrid();

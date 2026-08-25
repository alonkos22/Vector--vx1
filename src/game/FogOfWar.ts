import * as THREE from 'three';

export interface VisionSource {
  position: THREE.Vector3;
  radius: number;
}

/**
 * Per-unit-vision fog of war for one viewer (the human player): three
 * states per cell — unexplored (opaque black), explored-but-not-visible
 * (dimmed, remembered terrain), currently visible (clear). Rendered as a
 * CanvasTexture overlay above the terrain; `isVisible` also gates whether
 * enemy unit/building meshes are shown at all (the overlay alone isn't
 * opaque enough to hide a mesh rendered on top of it).
 */
export class FogOfWar {
  readonly mesh: THREE.Mesh;
  private readonly cellSize: number;
  private readonly halfExtent: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly explored: Uint8Array;
  private readonly visible: Uint8Array;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
  private readonly imageData: ImageData;

  constructor(halfExtent: number, cellSize = 4) {
    this.halfExtent = halfExtent;
    this.cellSize = cellSize;
    this.cols = Math.ceil((halfExtent * 2) / cellSize);
    this.rows = this.cols;
    this.explored = new Uint8Array(this.cols * this.rows);
    this.visible = new Uint8Array(this.cols * this.rows);

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.ctx = this.canvas.getContext('2d')!;
    this.imageData = this.ctx.createImageData(this.cols, this.rows);

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const geometry = new THREE.PlaneGeometry(halfExtent * 2, halfExtent * 2);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = 0.5;
    this.mesh.renderOrder = 5;

    this.redraw();
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

  /** Recomputes current visibility from one viewer's vision sources, then redraws the overlay. */
  update(sources: VisionSource[]): void {
    this.visible.fill(0);
    for (const source of sources) {
      const ccx = this.worldToCellX(source.position.x);
      const ccz = this.worldToCellZ(source.position.z);
      const cellRadius = Math.ceil(source.radius / this.cellSize) + 1;
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
          const cx = ccx + dx;
          const cz = ccz + dz;
          if (cx < 0 || cz < 0 || cx >= this.cols || cz >= this.rows) continue;
          const wx = cx * this.cellSize - this.halfExtent + this.cellSize / 2;
          const wz = cz * this.cellSize - this.halfExtent + this.cellSize / 2;
          if (Math.hypot(wx - source.position.x, wz - source.position.z) <= source.radius) {
            const i = this.idx(cx, cz);
            this.visible[i] = 1;
            this.explored[i] = 1;
          }
        }
      }
    }
    this.redraw();
  }

  /** Currently visible (not just explored) — used to gate whether an enemy's mesh is shown at all. */
  isVisible(position: THREE.Vector3): boolean {
    return this.visible[this.idx(this.worldToCellX(position.x), this.worldToCellZ(position.z))] === 1;
  }

  private redraw(): void {
    const data = this.imageData.data;
    for (let cz = 0; cz < this.rows; cz++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const i = this.idx(cx, cz);
        let alpha: number;
        if (this.visible[i]) alpha = 0;
        else if (this.explored[i]) alpha = 140;
        else alpha = 235;

        const p = i * 4;
        data[p] = 4;
        data[p + 1] = 8;
        data[p + 2] = 14;
        data[p + 3] = alpha;
      }
    }
    this.ctx.putImageData(this.imageData, 0, 0);
    this.texture.needsUpdate = true;
  }
}

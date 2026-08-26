import * as THREE from 'three';

/**
 * Renders a building/unit's actual in-game 3D geometry to a small thumbnail (per user request: a picture of
 * the building/unit next to its name, on the button used to build it) — reusing buildBuildingVisual/
 * buildUnitVisual instead of drawing separate 2D art, so every icon automatically matches its in-game model,
 * including the imported models in ImportedUnitModels.ts. Each key is rendered at most once per page load;
 * the result is cached and every caller after the first gets the cached data URL back immediately.
 */
const ICON_PX = 128;
let renderer: THREE.WebGLRenderer | null = null;
const cache = new Map<string, string>();

function getRenderer(): THREE.WebGLRenderer {
  if (!renderer) {
    const canvas = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(ICON_PX, ICON_PX, false);
    renderer.setPixelRatio(1);
  }
  return renderer;
}

export function getIcon(cacheKey: string, buildObject: () => THREE.Object3D): string {
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const object = buildObject();
  const r = getRenderer();

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  scene.add(object);
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const fitRadius = Math.max(size.length() * 0.5, 0.05);

  const fovDeg = 32;
  const camera = new THREE.PerspectiveCamera(fovDeg, 1, 0.05, 200);
  const dist = fitRadius / Math.sin(THREE.MathUtils.degToRad(fovDeg / 2));
  camera.position.copy(center).add(new THREE.Vector3(1, 0.9, 1).normalize().multiplyScalar(dist));
  camera.lookAt(center);

  r.setClearColor(0x000000, 0);
  r.render(scene, camera);
  const url = r.domElement.toDataURL('image/png');
  cache.set(cacheKey, url);

  // Free GPU resources for the throwaway render object — a fresh instance is only ever built once per key.
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of materials) m.dispose();
    }
  });

  return url;
}

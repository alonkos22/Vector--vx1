import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import rocketTurretUrl from '../assets/models/rocket-turret.glb';

/**
 * Building counterpart to ImportedUnitModels.ts: swaps a building's procedural placeholder geometry
 * for a user-supplied 3D scan, keyed by building id (not role) so only the one specific building using
 * it picks it up — every other faction's building in the same role keeps its procedural shape. Same
 * asset-prep pipeline as the imported units: textures stripped, materials flattened to the game's flat-
 * color palette, unused skinning/UV data trimmed.
 */
interface ImportedBuildingSpec {
  url: string;
  /** Uniform scale bringing the source model's arbitrary size to roughly match its role's other buildings. */
  scale: number;
  rotationY: number;
}

const SPECS: Record<string, ImportedBuildingSpec> = {
  'emp-arc-turret': { url: rocketTurretUrl, scale: 0.75, rotationY: 0 },
};

const loader = new GLTFLoader();
const loaded = new Map<string, THREE.Object3D>();

export function preloadImportedBuildingModels(): void {
  for (const [buildingId, spec] of Object.entries(SPECS)) {
    loader.load(
      spec.url,
      (gltf) => {
        const root = gltf.scene;
        root.scale.setScalar(spec.scale);
        root.rotation.y = spec.rotationY;
        root.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        // Ground the model at y=0 regardless of where its own origin sits, matching every procedural
        // building (which are all authored base-up from y=0).
        const box = new THREE.Box3().setFromObject(root);
        root.position.y -= box.min.y;
        loaded.set(buildingId, root);
      },
      undefined,
      (error) => console.error('Failed to load imported building model', buildingId, error),
    );
  }
}

/**
 * A fresh clone ready to use as a building's visual mesh, or null if the model hasn't finished loading
 * yet (caller should fall back to its procedural builder) or no import exists for this building id.
 * Materials are cloned too — Building.ts collects every MeshStandardMaterial under the group (by
 * traversal, same as CombatUnit's hit-flash) to drive the shared construction fade-in/opacity, and a
 * clone must own that state independently of every other building using the same source model.
 */
export function getImportedBuildingModel(buildingId: string): THREE.Object3D | null {
  const root = loaded.get(buildingId);
  if (!root) return null;
  const clone = root.clone(true);
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone();
    }
  });
  return clone;
}

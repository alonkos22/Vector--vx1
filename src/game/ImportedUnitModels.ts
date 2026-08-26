import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import shadeStalkerUrl from '../assets/models/shade-stalker.glb';
import solarZealotUrl from '../assets/models/solar-zealot.glb';
import fluxHarvesterUrl from '../assets/models/flux-harvester.glb';

/**
 * Three unit types swap their procedural placeholder geometry for a user-supplied 3D scan, chosen per unit
 * by visual fit to its faction: a spectral ghost for Umbral Voidkin's Shade Stalker, a gold-armored
 * humanoid for Solari Archons' Solar Zealot, a sci-fi pod for Cyber-Nexus's Flux Harvester. Each was
 * flattened to the game's flat-color palette with the same asset-prep pipeline as the decorative terrain
 * props (see DecorativeModels.ts) — textures stripped, materials replaced with faction-matching solid
 * colors, unused skinning/UV data trimmed.
 *
 * Preloaded once here so visuals.ts's builder functions can synchronously clone a ready instance; a unit
 * spawned in the small window before the load finishes falls back to that unit's original procedural
 * geometry for that one call, which already existed and needs no special-casing.
 */
interface ImportedUnitSpec {
  url: string;
  /** Uniform scale bringing the source model's arbitrary size to the game's ~1.3-1.8 unit tall convention. */
  scale: number;
  rotationY: number;
}

const SPECS: Record<string, ImportedUnitSpec> = {
  'shade-stalker': { url: shadeStalkerUrl, scale: 1.5, rotationY: 0 },
  'solar-zealot': { url: solarZealotUrl, scale: 0.54, rotationY: 0 },
  'flux-harvester': { url: fluxHarvesterUrl, scale: 1.1, rotationY: 0 },
};

const loader = new GLTFLoader();
const loaded = new Map<string, THREE.Object3D>();

export function preloadImportedUnitModels(): void {
  for (const [unitTypeId, spec] of Object.entries(SPECS)) {
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
        loaded.set(unitTypeId, root);
      },
      undefined,
      (error) => console.error('Failed to load imported unit model', unitTypeId, error),
    );
  }
}

/**
 * A fresh clone ready to use as a unit's visual mesh, or null if the model hasn't finished loading yet
 * (caller should fall back to its procedural builder). Materials are cloned too, not just geometry — every
 * unit instance needs its own material objects since hit-flash mutates emissiveIntensity directly on them,
 * and sharing one material across every unit of a type would flash them all in sync.
 */
export function getImportedUnitModel(unitTypeId: string): THREE.Object3D | null {
  const root = loaded.get(unitTypeId);
  if (!root) return null;
  const clone = root.clone(true);
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone();
    }
  });
  return clone;
}

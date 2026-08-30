import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import shadeStalkerUrl from '../assets/models/shade-stalker.glb';
import solarZealotUrl from '../assets/models/solar-zealot.glb';
import fluxHarvesterUrl from '../assets/models/flux-harvester.glb';
import biomechMutantUrl from '../assets/models/biomech-mutant.glb';
import robotDroneUrl from '../assets/models/robot-drone.glb';
import megabotUrl from '../assets/models/megabot.glb';

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
  /**
   * Some source files embed a real animation clip (a mixamo walk cycle, a drone's spinning-rotor loop).
   * `animateAlways` picks how Unit plays it back: false (default) advances it only while the unit is
   * moving and freezes it on the current frame when idle, matching a walk cycle; true keeps it running
   * regardless of movement, for a clip that isn't tied to locomotion (e.g. rotors that spin at rest too).
   */
  animateAlways?: boolean;
}

const SPECS: Record<string, ImportedUnitSpec> = {
  'shade-stalker': { url: shadeStalkerUrl, scale: 1.5, rotationY: 0 },
  'solar-zealot': { url: solarZealotUrl, scale: 0.54, rotationY: 0 },
  'flux-harvester': { url: fluxHarvesterUrl, scale: 1.1, rotationY: 0 },
  // Source model is ~177 units tall (raw Sketchfab scale) — 0.0125 brings it to ~2.2 units, matching
  // this heavy-infantry unit's taller-than-basic-infantry silhouette (selectionRadius 1.1 vs ~0.6-0.7).
  'voidmaw-horror': { url: biomechMutantUrl, scale: 0.0125, rotationY: 0 },
  // Source quadcopter is ~4.3 units across its rotor span (raw scale) — 0.33 brings it to ~1.4 units
  // wide, roughly matching this support unit's selectionRadius (0.7 -> ~1.4 diameter). Its embedded clip
  // spins the rotors, which a hovering drone should do at rest too, not just while translating.
  'nanite-weaver': { url: robotDroneUrl, scale: 0.33, rotationY: 0, animateAlways: true },
  // Source mech is ~733 units tall (raw Sketchfab scale) — 0.00287 brings it to ~2.1 units, matching
  // this heavy-tank unit's bulk (selectionRadius 1.2, on par with Voidmaw Horror's imported scale).
  'boiler-juggernaut': { url: megabotUrl, scale: 0.00287, rotationY: 0 },
};

interface LoadedUnitModel {
  root: THREE.Object3D;
  animations: THREE.AnimationClip[];
  animateAlways: boolean;
}

const loader = new GLTFLoader();
const loaded = new Map<string, LoadedUnitModel>();

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
        // Ground at y=0 regardless of where the source model's own origin sits — some rigs have it at
        // the feet already (near-zero shift), others (e.g. a mech modeled from a head-height pivot) sit
        // far off the ground otherwise.
        const box = new THREE.Box3().setFromObject(root);
        root.position.y -= box.min.y;
        loaded.set(unitTypeId, { root, animations: gltf.animations, animateAlways: spec.animateAlways ?? false });
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
 * and sharing one material across every unit of a type would flash them all in sync. Uses SkeletonUtils
 * (not Object3D.clone) so a skinned mesh's bones get cloned and rebound correctly — a plain clone(true)
 * duplicates the bone nodes but leaves the skin's bone references pointing at the originals, which would
 * make every cloned unit of a skinned model animate/pose in lockstep with the first one loaded.
 * When the source embedded an animation clip, it's carried over on the clone's userData so Unit can play
 * it back — AnimationClip tracks bind to nodes by name, so the same clip works against any clone that
 * preserved the original hierarchy's names, no per-instance retargeting needed.
 */
export function getImportedUnitModel(unitTypeId: string): THREE.Object3D | null {
  const entry = loaded.get(unitTypeId);
  if (!entry) return null;
  const clone = cloneSkeleton(entry.root) as THREE.Object3D;
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone();
    }
  });
  if (entry.animations.length > 0) {
    clone.userData.importedAnimations = entry.animations;
    clone.userData.animateAlways = entry.animateAlways;
  }
  return clone;
}

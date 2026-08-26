import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { OccupiedRegion } from './TerrainFeatures';
import bambooUrl from '../assets/models/bamboo.glb';
import sandUrl from '../assets/models/sand_dune.glb';
import cliffRockUrl from '../assets/models/cliff-rock.glb';

/**
 * Purely decorative environment props, built from user-supplied 3D scans
 * (a bamboo grove, a dune terrain scan, a cliff rock formation) that were
 * flattened to plain geometry with the game's existing flat-color palette
 * (no photoreal textures — see the asset-prep notes in src/assets/models/). Scattered
 * across the whole arena with a randomized count, scale, and rotation each
 * match (per user request: "not always the same amount"), so no two
 * matches look identical. Not registered with pathfinding or the
 * elevation field, matching how craters are treated — decoration only.
 */
const loader = new GLTFLoader();

function isClear(x: number, z: number, keepClearOf: OccupiedRegion[]): boolean {
  return keepClearOf.every((r) => Math.hypot(x - r.x, z - r.z) > r.radius);
}

/** Rejection-samples scatter points across the map: clear of every region in `keepClearOf`, and at least `minSpacing` apart from each other so instances don't pile on top of one another. */
function scatterPoints(
  count: number,
  mapHalfExtent: number,
  margin: number,
  minSpacing: number,
  keepClearOf: OccupiedRegion[],
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const maxAttempts = count * 50;
  for (let attempt = 0; points.length < count && attempt < maxAttempts; attempt++) {
    const x = (Math.random() * 2 - 1) * (mapHalfExtent - margin);
    const z = (Math.random() * 2 - 1) * (mapHalfExtent - margin);
    if (!isClear(x, z, keepClearOf)) continue;
    if (points.some(([px, pz]) => Math.hypot(x - px, z - pz) < minSpacing)) continue;
    points.push([x, z]);
  }
  return points;
}

function loadInstances(
  url: string,
  scene: THREE.Scene,
  points: Array<[number, number]>,
  scaleRange: [number, number],
  flattenY: number,
): void {
  loader.load(
    url,
    (gltf) => {
      for (const [x, z] of points) {
        const instance = gltf.scene.clone(true);
        const scale = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
        instance.scale.set(scale, scale * flattenY, scale);
        instance.rotation.y = Math.random() * Math.PI * 2;
        instance.position.set(x, 0, z);
        instance.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        scene.add(instance);
      }
    },
    undefined,
    (error) => console.error('Failed to load decorative model', url, error),
  );
}

export function loadDecorativeModels(scene: THREE.Scene, mapHalfExtent: number, keepClearOf: OccupiedRegion[]): void {
  // Dune-scan ground patches: low, wide, flattened way down from the source's original relief so they read as ground texture variation across the arena rather than obstacles.
  const sandCount = 14 + Math.floor(Math.random() * 10);
  const sandPoints = scatterPoints(sandCount, mapHalfExtent, 6, 13, keepClearOf);
  loadInstances(sandUrl, scene, sandPoints, [0.0035, 0.006], 0.3);

  // Bamboo groves: taller, more isolated landmarks.
  const bambooCount = 6 + Math.floor(Math.random() * 9);
  const bambooPoints = scatterPoints(bambooCount, mapHalfExtent, 10, 18, keepClearOf);
  loadInstances(bambooUrl, scene, bambooPoints, [0.12, 0.22], 1);

  // Cliff rock spires: rare, dramatic landmarks — kept sparse and well spread out.
  const cliffCount = 3 + Math.floor(Math.random() * 5);
  const cliffPoints = scatterPoints(cliffCount, mapHalfExtent, 15, 25, keepClearOf);
  loadInstances(cliffRockUrl, scene, cliffPoints, [0.15, 0.35], 1);
}

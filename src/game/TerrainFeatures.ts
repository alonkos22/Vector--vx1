import * as THREE from 'three';
import { pathGrid } from './Pathfinding';
import { elevation } from './Elevation';

/** Small deterministic PRNG so rock-cluster shapes are stable across reloads. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.95, metalness: 0.05 });
const rockMaterialDark = new THREE.MeshStandardMaterial({ color: 0x35322e, roughness: 0.95, metalness: 0.05 });
const mesaMaterial = new THREE.MeshStandardMaterial({ color: 0x5c5650, roughness: 0.85, metalness: 0.1 });
const craterFloorMaterial = new THREE.MeshStandardMaterial({ color: 0x181614, roughness: 0.95, metalness: 0 });
const craterRimMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.9, metalness: 0.05 });

/** One jagged rock formation: a cluster of overlapping dodecahedra of varying scale/rotation, tallest near the center. Blocks pathfinding under its footprint — mountains are impassable, not just decorative. */
function buildMountainCluster(rng: () => number, radius: number, peakHeight: number): THREE.Group {
  const group = new THREE.Group();
  const rockCount = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < rockCount; i++) {
    const angle = (i / rockCount) * Math.PI * 2 + rng() * 0.6;
    const dist = rng() * radius * 0.7;
    const size = radius * (0.35 + rng() * 0.35) * (1 - dist / (radius * 1.4));
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(Math.max(size, 0.6), 0), rng() < 0.5 ? rockMaterial : rockMaterialDark);
    rock.scale.set(1, 1.4 + rng() * 0.8, 1);
    rock.position.set(Math.cos(angle) * dist, size * 0.6, Math.sin(angle) * dist);
    rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    group.add(rock);
  }
  const peak = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.4, peakHeight, 6), rockMaterial);
  peak.position.y = peakHeight * 0.5;
  group.add(peak);

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

/** A ridge: a chain of mountain clusters along explicit points, each blocking pathfinding under it. Gaps in the point list (skip a position) become the narrow passes armies must funnel through. */
function buildRidge(points: Array<[number, number]>, blockRadius: number, seed: number): THREE.Group {
  const group = new THREE.Group();
  const rng = mulberry32(seed);
  for (const [x, z] of points) {
    const cluster = buildMountainCluster(rng, blockRadius * 1.15, blockRadius * 1.8);
    cluster.position.set(x, 0, z);
    group.add(cluster);
    pathGrid.markCircleBlocked(new THREE.Vector3(x, 0, z), blockRadius);
  }
  return group;
}

/** A flat-topped plateau ("high ground"): a wide sloped mesa, walkable (not blocked) and registered with the elevation field so units standing on it render taller and get the CombatUnit high-ground damage bonus. */
function buildPlateau(center: [number, number], radius: number, height: number): THREE.Group {
  const group = new THREE.Group();
  const [x, z] = center;

  const mesa = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius, height, 10), mesaMaterial);
  mesa.position.set(x, height / 2, z);
  mesa.castShadow = true;
  mesa.receiveShadow = true;
  group.add(mesa);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.7, height * 0.18, 6, 10), rockMaterial);
  rim.position.set(x, height, z);
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  elevation.addPlateau(new THREE.Vector3(x, 0, z), radius * 0.72, height);
  return group;
}

/** A crater: purely cosmetic (not blocked, no elevation) — a sunken dark floor ringed by a low raised lip. */
function buildCrater(center: [number, number], radius: number): THREE.Group {
  const group = new THREE.Group();
  const [x, z] = center;

  const floor = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.85, 20), craterFloorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, 0.02, z);
  floor.receiveShadow = true;
  group.add(floor);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.85, radius * 0.16, 6, 24), craterRimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, 0.1, z);
  rim.receiveShadow = true;
  rim.castShadow = true;
  group.add(rim);

  return group;
}

/**
 * Builds the map's terrain features: two mountain ridges flanking the
 * center (each with a gated gap, forming a defended pass along the direct
 * line between the bases), a plateau overlooking each gap, and a couple of
 * decorative craters off to the sides. Coordinates keep clear of both
 * bases' home resource-node clusters and the central Core Zone.
 */
export function buildTerrainFeatures(): THREE.Group {
  const group = new THREE.Group();

  // Ridge A (between the AI-facing side and center) and Ridge B (mirrored,
  // player-facing side) both run perpendicular to the base-to-base diagonal,
  // each with a gap near the diagonal itself so the two gaps line up into
  // one defended corridor rather than two separate holes.
  const ridgeA = buildRidge(
    [
      [-7, 42.4],
      [5.3, 30.1],
      // gap near (17.7, 17.7) — the pass
      [30.1, 5.3],
      [42.4, -7],
    ],
    6,
    101,
  );
  const ridgeB = buildRidge(
    [
      [-42.4, 7],
      [-30.1, -5.3],
      // gap near (-17.7, -17.7) — the pass
      [-5.3, -30.1],
      [7, -42.4],
    ],
    6,
    202,
  );
  group.add(ridgeA, ridgeB);

  // High ground overlooking each gap.
  group.add(buildPlateau([10, 34], 9, 2.6));
  group.add(buildPlateau([-34, -10], 9, 2.6));

  // Decorative craters, well clear of ridges/plateaus/resource clusters.
  group.add(buildCrater([-70, 25], 7));
  group.add(buildCrater([70, -25], 6));

  return group;
}

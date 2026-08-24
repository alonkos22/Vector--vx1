import * as THREE from 'three';

/** Placeholder flat ground plane. Swapped for real per-biome terrain in Milestone 2. */
export function createPlaceholderGround(halfExtent: number): THREE.Object3D {
  const group = new THREE.Group();

  const geometry = new THREE.PlaneGeometry(halfExtent * 2, halfExtent * 2, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.95, metalness: 0.05 });
  const ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  group.add(ground);

  const grid = new THREE.GridHelper(halfExtent * 2, halfExtent / 5, 0x555a60, 0x44484d);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.5;
  grid.position.y = 0.01;
  group.add(grid);

  return group;
}

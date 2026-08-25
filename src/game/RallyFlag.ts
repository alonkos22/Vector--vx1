import * as THREE from 'three';

/** Small pole + flag marking a production building's rally point (and the live placement preview while arming one). */
export function buildRallyFlag(color = 0xffe08a): THREE.Group {
  const group = new THREE.Group();

  const poleMaterial = new THREE.MeshBasicMaterial({ color: 0xdddddd });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), poleMaterial);
  pole.position.y = 0.8;
  group.add(pole);

  const flagMaterial = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 3), flagMaterial);
  flag.rotation.z = -Math.PI / 2;
  flag.position.set(0.25, 1.3, 0);
  group.add(flag);

  return group;
}

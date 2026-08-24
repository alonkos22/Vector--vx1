import * as THREE from 'three';
import { InputManager } from './game/InputManager';
import { RTSCamera } from './game/RTSCamera';
import { createPlaceholderGround } from './game/Terrain';

const MAP_HALF_EXTENT = 100;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = '';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d10);
scene.fog = new THREE.Fog(0x0b0d10, 120, 260);

const rtsCamera = new RTSCamera(window.innerWidth / window.innerHeight, {
  mapHalfExtent: MAP_HALF_EXTENT,
});

const input = new InputManager(renderer.domElement);

// Twin-sun placeholder lighting (Milestone 8 will drive this dynamically).
const sunA = new THREE.DirectionalLight(0xfff2e0, 1.6);
sunA.position.set(60, 90, 40);
sunA.castShadow = true;
sunA.shadow.mapSize.set(2048, 2048);
sunA.shadow.camera.left = -MAP_HALF_EXTENT;
sunA.shadow.camera.right = MAP_HALF_EXTENT;
sunA.shadow.camera.top = MAP_HALF_EXTENT;
sunA.shadow.camera.bottom = -MAP_HALF_EXTENT;
sunA.shadow.camera.far = 300;
scene.add(sunA);

const sunB = new THREE.DirectionalLight(0xbcd0ff, 0.5);
sunB.position.set(-70, 60, -50);
scene.add(sunB);

const ambient = new THREE.AmbientLight(0x404550, 0.6);
scene.add(ambient);

scene.add(createPlaceholderGround(MAP_HALF_EXTENT));

// Core Zone placeholder marker at map center (full spec in Milestone 2).
const coreMarker = new THREE.Mesh(
  new THREE.OctahedronGeometry(3, 0),
  new THREE.MeshStandardMaterial({ color: 0x66e0ff, emissive: 0x1560aa, emissiveIntensity: 0.8 }),
);
coreMarker.position.y = 3;
coreMarker.castShadow = true;
scene.add(coreMarker);

function onResize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  rtsCamera.setAspect(window.innerWidth / window.innerHeight);
}
window.addEventListener('resize', onResize);

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  coreMarker.rotation.y += dt * 0.4;

  rtsCamera.update(dt, input, window.innerWidth, window.innerHeight);
  renderer.render(scene, rtsCamera.camera);
}

animate();

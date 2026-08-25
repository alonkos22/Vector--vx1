import * as THREE from 'three';
import { InputManager } from './game/InputManager';
import { RTSCamera } from './game/RTSCamera';
import { BiomeTerrain } from './game/BiomeTerrain';
import { CoreZone } from './game/CoreZone';
import { BIOMES } from './config/biomes';

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

const terrain = new BiomeTerrain(BIOMES['cyber-nexus'], MAP_HALF_EXTENT);
scene.add(terrain.group);

const coreZone = new CoreZone();
scene.add(coreZone.group);

function onResize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  rtsCamera.setAspect(window.innerWidth / window.innerHeight);
}
window.addEventListener('resize', onResize);

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  terrain.update(dt);
  coreZone.update(dt);

  rtsCamera.update(dt, input, window.innerWidth, window.innerHeight);
  renderer.render(scene, rtsCamera.camera);
}

animate();

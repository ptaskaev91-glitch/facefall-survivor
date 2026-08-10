import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { GameLoop } from './core/GameLoop';
import { DualCameraRig, type CameraMode } from './camera/DualCameraRig';
import { CollisionWorld } from './physics/CollisionWorld';
import { detectQuality } from './graphics/quality';
import { GrassField } from './world/GrassField';
import { WEAPONS } from './combat/weapons';
import { ENEMY_ARCHETYPES } from './enemies/archetypes';
import { EFFECTS } from './effects/recipes';

const app = document.querySelector<HTMLDivElement>('#app');
const status = document.querySelector<HTMLDivElement>('#status');
const topButton = document.querySelector<HTMLButtonElement>('#camTop');
const thirdButton = document.querySelector<HTMLButtonElement>('#camThird');

if (!app || !status || !topButton || !thirdButton) {
  throw new Error('Engine lab DOM is incomplete');
}

const quality = detectQuality();
const renderer = new THREE.WebGLRenderer({
  antialias: quality.antialias,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = quality.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.replaceChildren(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07100b);
scene.fog = new THREE.FogExp2(0x0b1610, quality.fogDensity);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.08, 220);
const cameraRig = new DualCameraRig(camera);
const facing = new THREE.Vector3(0, 0, -1);

scene.add(new THREE.HemisphereLight(0xc6d4c7, 0x172019, 1.5));
const moon = new THREE.DirectionalLight(0xdbe8df, 2.0);
moon.position.set(-18, 32, -12);
moon.castShadow = quality.shadows;
moon.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
scene.add(moon);

const warm = new THREE.PointLight(0xffc56e, 8, 16, 2);
warm.position.set(9, 4.2, -5);
scene.add(warm);

const staticWorld = new THREE.Group();
scene.add(staticWorld);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(110, 110, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x273827, roughness: 0.96 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
staticWorld.add(ground);

const road = new THREE.Mesh(
  new THREE.BoxGeometry(13, 0.08, 92),
  new THREE.MeshStandardMaterial({ color: 0x303735, roughness: 0.48, metalness: 0.08 })
);
road.position.set(0, -0.03, 0);
road.receiveShadow = true;
staticWorld.add(road);

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x41483f, roughness: 0.9 });
for (const [x, z, sx, sz] of [
  [-11, -8, 8, 5],
  [12, 10, 7, 6],
  [-14, 18, 5, 8]
] as const) {
  const obstacle = new THREE.Mesh(new THREE.BoxGeometry(sx, 3.2, sz), wallMaterial);
  obstacle.position.set(x, 1.6, z);
  obstacle.castShadow = quality.shadows;
  obstacle.receiveShadow = true;
  staticWorld.add(obstacle);
}

const collisionWorld = new CollisionWorld();
collisionWorld.rebuild(staticWorld);

function makeCapsuleMarker(radius: number, bodyLength: number, color: number): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, bodyLength, 10), material);
  cylinder.position.y = bodyLength / 2 + radius;
  const lower = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material);
  lower.position.y = radius;
  const upper = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material);
  upper.position.y = bodyLength + radius;
  for (const mesh of [cylinder, lower, upper]) mesh.castShadow = quality.shadows;
  group.add(cylinder, lower, upper);
  return group;
}

const player = makeCapsuleMarker(0.36, 0.85, 0x8d9c8d);
const weapon = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.1, 0.85),
  new THREE.MeshStandardMaterial({ color: 0x1f2421, roughness: 0.32, metalness: 0.65 })
);
weapon.position.set(0.32, 1.18, -0.52);
player.add(weapon);
scene.add(player);

const playerCapsule = new Capsule(
  new THREE.Vector3(0, 0.35, 0),
  new THREE.Vector3(0, 1.35, 0),
  0.35
);

const grass = new GrassField(quality);
scene.add(grass.group);

const enemyMeshes: THREE.Object3D[] = [];
for (const [i, enemy] of Object.values(ENEMY_ARCHETYPES).entries()) {
  const radius = enemy.id === 'brute' ? 0.55 : 0.34;
  const length = enemy.id === 'brute' ? 1.15 : 0.82;
  const mesh = makeCapsuleMarker(radius, length, enemy.id === 'brute' ? 0x765246 : enemy.id === 'runner' ? 0x725b4a : 0x66564d);
  mesh.position.set(-4 + i * 4.2, 0, -8 - i * 2.5);
  const scale = enemy.id === 'runner' ? 0.88 : enemy.id === 'brute' ? 1.18 : 1;
  mesh.scale.setScalar(scale);
  scene.add(mesh);
  enemyMeshes.push(mesh);
}

const keys = new Set<string>();
window.addEventListener('keydown', (event) => keys.add(event.code));
window.addEventListener('keyup', (event) => keys.delete(event.code));

let cameraMode: CameraMode = 'top';
function setCameraMode(mode: CameraMode): void {
  cameraMode = mode;
  cameraRig.setMode(mode);
  topButton.dataset.active = String(mode === 'top');
  thirdButton.dataset.active = String(mode === 'third');
  refreshStatus();
}

topButton.addEventListener('click', () => setCameraMode('top'));
thirdButton.addEventListener('click', () => setCameraMode('third'));

const move = new THREE.Vector3();
const desired = new THREE.Vector3();
const velocity = new THREE.Vector3();
const temp = new THREE.Vector3();

const loop = new GameLoop({
  fixedUpdate(dt) {
    desired.set(0, 0, 0);
    if (keys.has('KeyW') || keys.has('ArrowUp')) desired.z -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) desired.z += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) desired.x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) desired.x += 1;

    if (desired.lengthSq() > 0) {
      desired.normalize();
      facing.lerp(temp.copy(desired), 1 - Math.exp(-dt * 12)).normalize();
    }

    const targetSpeed = desired.lengthSq() > 0 ? 5.0 : 0;
    move.copy(desired).multiplyScalar(targetSpeed);
    velocity.lerp(move, 1 - Math.exp(-dt * 10));

    const displacement = temp.copy(velocity).multiplyScalar(dt);
    playerCapsule.translate(displacement);
    const result = collisionWorld.resolveCapsule(playerCapsule);
    if (result.collided) {
      const intoWall = velocity.dot(result.normal);
      if (intoWall < 0) velocity.addScaledVector(result.normal, -intoWall);
    }

    player.position.set(playerCapsule.start.x, playerCapsule.start.y - 0.35, playerCapsule.start.z);
    player.rotation.y = Math.atan2(-facing.x, -facing.z);
  },
  render(_alpha, frameDt) {
    cameraRig.update(player.position, facing, frameDt);
    grass.update(camera.position);
    renderer.render(scene, camera);
  }
}, {
  fixedStep: 1 / 60,
  maxFrameDelta: 0.1,
  maxSubSteps: 5
});

function refreshStatus(): void {
  status.textContent = [
    'ENGINE NEXT готов',
    `quality=${quality.id}`,
    `camera=${cameraMode}`,
    `weapons=${Object.keys(WEAPONS).length}`,
    `enemy archetypes=${enemyMeshes.length}`,
    `fx recipes=${Object.keys(EFFECTS).length}`,
    'Three.js bundled via npm'
  ].join(' · ');
}

refreshStatus();
loop.start();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio));
});

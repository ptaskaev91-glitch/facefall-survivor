import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { GameLoop } from './core/GameLoop';
import { EventBus } from './core/EventBus';
import { DualCameraRig, type CameraMode } from './camera/DualCameraRig';
import { CollisionWorld } from './physics/CollisionWorld';
import { detectQuality } from './graphics/quality';
import { GrassField } from './world/GrassField';
import { WEAPONS } from './combat/weapons';
import { ENEMY_ARCHETYPES } from './enemies/archetypes';
import { EFFECTS } from './effects/recipes';
import { InputManager } from './input/InputManager';
import { KeyboardMouseInput } from './input/KeyboardMouseInput';
import { TouchInput } from './input/TouchInput';
import { WeaponSystem } from './combat/WeaponSystem';
import { Health } from './combat/Health';
import { DamageSystem } from './combat/DamageSystem';
import type { FacefallEvents, HitZone } from './combat/types';

const app = document.querySelector<HTMLDivElement>('#app');
const status = document.querySelector<HTMLDivElement>('#status');
const topButton = document.querySelector<HTMLButtonElement>('#camTop');
const thirdButton = document.querySelector<HTMLButtonElement>('#camThird');

if (!app || !status || !topButton || !thirdButton) {
  throw new Error('Engine lab DOM is incomplete');
}

const quality = detectQuality();
const renderer = new THREE.WebGLRenderer({ antialias: quality.antialias, powerPreference: 'high-performance' });
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
const weaponMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.1, 0.85),
  new THREE.MeshStandardMaterial({ color: 0x1f2421, roughness: 0.32, metalness: 0.65 })
);
weaponMesh.position.set(0.32, 1.18, -0.52);
player.add(weaponMesh);
scene.add(player);

const playerCapsule = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1.35, 0), 0.35);

const grass = new GrassField(quality);
scene.add(grass.group);

const events = new EventBus<FacefallEvents>();
const weaponSystem = new WeaponSystem(events);
const damageSystem = new DamageSystem(events);
const raycaster = new THREE.Raycaster();
const enemyMeshes: THREE.Object3D[] = [];
const enemyRoots = new Map<string, THREE.Object3D>();

for (const [i, enemy] of Object.values(ENEMY_ARCHETYPES).entries()) {
  const id = `enemy-${enemy.id}-${i}`;
  const radius = enemy.id === 'brute' ? 0.55 : 0.34;
  const length = enemy.id === 'brute' ? 1.15 : 0.82;
  const mesh = makeCapsuleMarker(radius, length, enemy.id === 'brute' ? 0x765246 : enemy.id === 'runner' ? 0x725b4a : 0x66564d);
  mesh.position.set(-4 + i * 4.2, 0, -8 - i * 2.5);
  const scale = enemy.id === 'runner' ? 0.88 : enemy.id === 'brute' ? 1.18 : 1;
  mesh.scale.setScalar(scale);
  mesh.traverse((object) => { object.userData.damageTargetId = id; });
  scene.add(mesh);
  enemyMeshes.push(mesh);
  enemyRoots.set(id, mesh);
  damageSystem.register({ id, health: new Health(enemy.health) });
}

function getHitZone(object: THREE.Object3D, point: THREE.Vector3): HitZone {
  const rootId = object.userData.damageTargetId as string | undefined;
  const root = rootId ? enemyRoots.get(rootId) : undefined;
  if (!root) return 'torso';
  const localY = point.y - root.position.y;
  if (localY > 1.35 * root.scale.y) return 'head';
  if (localY < 0.55 * root.scale.y) return 'limb';
  return 'torso';
}

function spreadDirection(base: THREE.Vector3, spread: number): THREE.Vector3 {
  const result = base.clone();
  result.x += (Math.random() - 0.5) * spread;
  result.y += (Math.random() - 0.5) * spread * 0.45;
  result.z += (Math.random() - 0.5) * spread;
  return result.normalize();
}

events.on('shot', (shot) => {
  const definition = WEAPONS[shot.weaponId];
  if (definition.fireModel !== 'hitscan') return;

  for (let pellet = 0; pellet < definition.pellets; pellet++) {
    const direction = spreadDirection(shot.direction, definition.spread);
    raycaster.set(shot.origin, direction);
    raycaster.far = 70;
    const intersections = raycaster.intersectObjects(enemyMeshes, true);
    const intersection = intersections.find((entry) => entry.object.visible && entry.object.userData.damageTargetId);
    if (!intersection) continue;

    const targetId = intersection.object.userData.damageTargetId as string;
    const hitZone = getHitZone(intersection.object, intersection.point);
    const multiplier = hitZone === 'head' ? definition.headMultiplier : hitZone === 'limb' ? definition.limbMultiplier : 1;
    damageSystem.apply({
      amount: definition.damage * multiplier,
      kind: shot.weaponId === 'shotgun' ? 'pellet' : 'bullet',
      sourceId: shot.sourceId,
      targetId,
      hitPoint: intersection.point.clone(),
      direction: direction.clone(),
      impulse: definition.impulse,
      hitZone,
      critical: hitZone === 'head'
    });
  }
});

events.on('hit', (hit) => {
  status.dataset.lastEvent = `${hit.hitZone.toUpperCase()} ${Math.round(hit.amount)} DMG`;
  refreshStatus();
});

events.on('kill', (hit) => {
  const root = enemyRoots.get(hit.targetId);
  if (root) root.visible = false;
  status.dataset.lastEvent = `KILL ${hit.targetId}`;
  refreshStatus();
});

const input = new InputManager();
const keyboard = new KeyboardMouseInput(input);
keyboard.attach();

const joy = document.querySelector<HTMLElement>('#joy');
const stick = document.querySelector<HTMLElement>('#stick');
const touchFire = document.querySelector<HTMLElement>('#touchFire');
if (joy && stick && touchFire) {
  new TouchInput(input, {
    joystick: joy,
    stick,
    fire: touchFire,
    reload: document.querySelector<HTMLElement>('#touchReload') ?? undefined,
    switchWeapon: document.querySelector<HTMLElement>('#touchWeapon') ?? undefined,
    toggleCamera: document.querySelector<HTMLElement>('#touchCamera') ?? undefined
  }).attach();
}

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
const muzzle = new THREE.Vector3();
let statusRefresh = 0;

const loop = new GameLoop({
  fixedUpdate(dt) {
    const controls = input.snapshot();
    desired.set(controls.moveX, 0, controls.moveY);

    if (desired.lengthSq() > 0) {
      desired.normalize();
      facing.lerp(temp.copy(desired), 1 - Math.exp(-dt * 12)).normalize();
    }

    const targetSpeed = desired.lengthSq() > 0 ? (controls.sprint ? 7.1 : 5.0) : 0;
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

    weaponSystem.update(dt);
    if (input.consumePressed('toggleCamera')) setCameraMode(cameraMode === 'top' ? 'third' : 'top');
    if (input.consumePressed('switchWeapon')) weaponSystem.cycle();
    if (input.consumePressed('reload')) weaponSystem.reload();
    if (controls.fire) {
      muzzle.copy(player.position).add(new THREE.Vector3(0, 1.15, 0)).addScaledVector(facing, 0.5);
      weaponSystem.fire('player', muzzle, facing);
    }

    statusRefresh -= dt;
    if (statusRefresh <= 0) {
      statusRefresh = 0.2;
      refreshStatus();
    }
  },
  render(_alpha, frameDt) {
    cameraRig.update(player.position, facing, frameDt);
    grass.update(camera.position);
    renderer.render(scene, camera);
  }
}, { fixedStep: 1 / 60, maxFrameDelta: 0.1, maxSubSteps: 5 });

function refreshStatus(): void {
  const runtime = weaponSystem.runtime();
  const lastEvent = status.dataset.lastEvent ? ` · ${status.dataset.lastEvent}` : '';
  status.textContent = [
    'ENGINE NEXT готов',
    `quality=${quality.id}`,
    `camera=${cameraMode}`,
    `${WEAPONS[weaponSystem.selected].label} ${runtime.magazine}/${runtime.reserve}`,
    `enemies=${enemyMeshes.filter((enemy) => enemy.visible).length}`,
    `fx recipes=${Object.keys(EFFECTS).length}`,
    'Three.js=bundled'
  ].join(' · ') + lastEvent;
}

refreshStatus();
loop.start();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio));
});

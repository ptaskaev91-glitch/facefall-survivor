import * as THREE from 'three';
import type { EnemyId } from './archetypes';
import { updateRiggedWalker } from './RiggedWalkerVisual';

interface ZombiePalette {
  skin: number;
  shirt: number;
  pants: number;
  accent: number;
}

const PALETTES: Record<EnemyId, ZombiePalette> = {
  walker: { skin: 0x9a8f79, shirt: 0x6b665b, pants: 0x363735, accent: 0x6a1e1b },
  runner: { skin: 0xa58f78, shirt: 0x51495d, pants: 0x30353a, accent: 0x8b3028 },
  brute: { skin: 0x816f61, shirt: 0x514a43, pants: 0x2b2927, accent: 0x5f1716 }
};

function material(color: number, roughness = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

function addMesh(
  root: THREE.Group,
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  position: THREE.Vector3Tuple,
  zone: 'head' | 'torso' | 'limb',
  shadows: boolean,
  name: string
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position);
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  mesh.userData.hitZone = zone;
  mesh.name = name;
  root.add(mesh);
  return mesh;
}

/**
 * Lightweight humanoid infected fallback. Walker is hydrated into a rigged visual
 * asynchronously in EnemySystem; Runner/Brute stay procedural until their own slices land.
 */
export function createEnemyVisual(type: EnemyId, shadows: boolean): THREE.Group {
  const palette = PALETTES[type];
  const root = new THREE.Group();
  root.name = `infected-${type}`;

  const skin = material(palette.skin, 0.96);
  const shirt = material(palette.shirt, 0.93);
  const pants = material(palette.pants, 0.96);
  const wound = material(palette.accent, 0.88);
  const eye = new THREE.MeshBasicMaterial({ color: type === 'runner' ? 0xffb36e : 0xd9d8b3 });

  const scale = type === 'brute' ? 1.22 : type === 'runner' ? 0.92 : 1;
  const shoulder = type === 'brute' ? 0.62 : 0.46;
  const torsoWidth = type === 'brute' ? 1.05 : 0.72;
  const torsoHeight = type === 'brute' ? 0.88 : 0.74;

  const torso = addMesh(
    root,
    new THREE.BoxGeometry(torsoWidth, torsoHeight, type === 'brute' ? 0.52 : 0.38),
    shirt,
    [0, 1.18, 0],
    'torso', shadows, 'torso'
  );
  torso.rotation.x = type === 'runner' ? 0.18 : 0.08;

  const chestWound = addMesh(
    root,
    new THREE.BoxGeometry(type === 'brute' ? 0.34 : 0.24, 0.09, 0.02),
    wound,
    [type === 'runner' ? -0.18 : 0.2, 1.24, -0.205],
    'torso', false, 'chest-wound'
  );
  chestWound.rotation.z = -0.18;

  const neck = addMesh(root, new THREE.CylinderGeometry(0.12, 0.14, 0.18, 7), skin, [0, 1.63, -0.03], 'torso', shadows, 'neck');
  neck.rotation.x = 0.12;

  const head = addMesh(
    root,
    new THREE.DodecahedronGeometry(type === 'brute' ? 0.31 : 0.27, 0),
    skin,
    [0, type === 'brute' ? 1.88 : 1.84, -0.11],
    'head', shadows, 'head'
  );
  head.rotation.z = type === 'walker' ? 0.13 : type === 'runner' ? -0.12 : 0.04;

  const eyeY = head.position.y + 0.035;
  for (const x of [-0.085, 0.085]) {
    const e = addMesh(root, new THREE.SphereGeometry(0.027, 6, 4), eye, [x, eyeY, -0.35], 'head', false, 'eye');
    e.userData.decorative = true;
  }

  const armGeometry = new THREE.CylinderGeometry(type === 'brute' ? 0.14 : 0.095, type === 'brute' ? 0.16 : 0.11, type === 'brute' ? 0.82 : 0.72, 7);
  const leftArm = addMesh(root, armGeometry.clone(), skin, [-shoulder, 1.15, -0.14], 'limb', shadows, 'arm-left');
  const rightArm = addMesh(root, armGeometry.clone(), skin, [shoulder, 1.15, -0.14], 'limb', shadows, 'arm-right');
  leftArm.rotation.x = type === 'runner' ? -1.02 : -0.78;
  rightArm.rotation.x = type === 'runner' ? -0.86 : -0.7;
  leftArm.rotation.z = 0.13;
  rightArm.rotation.z = -0.13;

  const hip = addMesh(root, new THREE.BoxGeometry(type === 'brute' ? 0.72 : 0.55, 0.24, 0.34), pants, [0, 0.72, 0.02], 'torso', shadows, 'hip');
  hip.rotation.x = -0.03;

  const legRadius = type === 'brute' ? 0.15 : 0.115;
  const legHeight = type === 'brute' ? 0.74 : 0.68;
  const legGeometry = new THREE.CylinderGeometry(legRadius, legRadius * 1.06, legHeight, 7);
  const leftLeg = addMesh(root, legGeometry.clone(), pants, [-0.18 * scale, 0.34, 0.02], 'limb', shadows, 'leg-left');
  const rightLeg = addMesh(root, legGeometry.clone(), pants, [0.18 * scale, 0.34, 0.02], 'limb', shadows, 'leg-right');
  leftLeg.rotation.z = type === 'walker' ? 0.07 : 0;
  rightLeg.rotation.z = type === 'walker' ? -0.04 : 0;

  const footGeometry = new THREE.BoxGeometry(type === 'brute' ? 0.31 : 0.24, 0.13, type === 'runner' ? 0.39 : 0.34);
  addMesh(root, footGeometry.clone(), pants, [-0.18 * scale, 0.05, -0.08], 'limb', shadows, 'foot-left');
  addMesh(root, footGeometry.clone(), pants, [0.18 * scale, 0.05, -0.08], 'limb', shadows, 'foot-right');

  if (type === 'brute') {
    addMesh(root, new THREE.DodecahedronGeometry(0.26, 0), shirt, [-0.54, 1.46, 0], 'torso', shadows, 'brute-shoulder');
  } else if (type === 'runner') {
    addMesh(root, new THREE.BoxGeometry(0.18, 0.3, 0.22), wound, [0.46, 1.28, -0.08], 'limb', shadows, 'runner-torn-sleeve');
  }

  root.scale.setScalar(scale);
  root.userData.baseScale = scale;
  root.userData.type = type;
  root.userData.gaitPhase = Math.random() * Math.PI * 2;
  return root;
}

/** Uses the rigged animation mixer when available, otherwise keeps the procedural fallback alive. */
export function animateEnemyVisual(root: THREE.Group, speed: number, dt: number): void {
  if (root.userData.type === 'walker' && updateRiggedWalker(root, speed, dt)) return;

  const phase = ((root.userData.gaitPhase as number | undefined) ?? 0) + dt * (2.8 + speed * 1.25);
  root.userData.gaitPhase = phase;
  const stride = Math.min(0.55, speed * 0.11);
  const swing = Math.sin(phase) * stride;

  const leftArm = root.getObjectByName('arm-left');
  const rightArm = root.getObjectByName('arm-right');
  const leftLeg = root.getObjectByName('leg-left');
  const rightLeg = root.getObjectByName('leg-right');
  if (leftArm) leftArm.rotation.x = -0.72 + swing;
  if (rightArm) rightArm.rotation.x = -0.72 - swing;
  if (leftLeg) leftLeg.rotation.x = -swing * 0.7;
  if (rightLeg) rightLeg.rotation.x = swing * 0.7;
}

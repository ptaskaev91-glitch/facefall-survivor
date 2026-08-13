import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import type { EnemyId } from './archetypes';

const MODEL_URL = '/assets/enemies/mesh2motion-human-zombie/human-zombie.glb';
const BASE_TARGET_HEIGHT = 1.78;
const SKELETON_TO_FULL_HEIGHT = 1.12;
const TARGET_ANKLE_HEIGHT = 0.055;

interface BonePose { bone: THREE.Bone | null; base: THREE.Quaternion; }
type InfectedAction = 'attack' | 'stagger' | 'death' | null;

interface InfectedProfile {
  width: number;
  depth: number;
  pace: number;
  stride: number;
  lean: number;
  armLift: number;
  tint: number;
  woundScale: number;
}

const PROFILES: Record<EnemyId, InfectedProfile> = {
  walker: { width: 1, depth: 1, pace: 1, stride: 1, lean: 0.18, armLift: 0.42, tint: 0xa4ad9a, woundScale: 1 },
  runner: { width: 0.82, depth: 0.86, pace: 1.55, stride: 1.18, lean: 0.34, armLift: 0.74, tint: 0xa99b91, woundScale: 0.85 },
  brute: { width: 1.14, depth: 1.16, pace: 0.72, stride: 0.82, lean: 0.12, armLift: 0.28, tint: 0x8d8278, woundScale: 1.35 }
};

interface InfectedRuntime {
  wrapper: THREE.Group;
  type: EnemyId;
  active: 'idle' | 'walk';
  clock: number;
  action: InfectedAction;
  actionTime: number;
  actionDuration: number;
  head: BonePose;
  spine: BonePose;
  upperArmL: BonePose;
  upperArmR: BonePose;
  lowerArmL: BonePose;
  lowerArmR: BonePose;
  thighL: BonePose;
  thighR: BonePose;
  calfL: BonePose;
  calfR: BonePose;
}

const loader = new GLTFLoader();
let sourcePromise: Promise<THREE.Object3D> | null = null;
let sourceLoadCount = 0;
const offsetQuaternion = new THREE.Quaternion();
const offsetEuler = new THREE.Euler();

function loadSource(): Promise<THREE.Object3D> {
  if (!sourcePromise) {
    sourceLoadCount += 1;
    sourcePromise = loader.loadAsync(MODEL_URL).then((model) => model.scene).catch((error) => {
      sourcePromise = null;
      throw error;
    });
  }
  return sourcePromise;
}

export function infectedSourceLoadCount(): number { return sourceLoadCount; }

function findBone(root: THREE.Object3D, name: string): THREE.Bone | null {
  const found = root.getObjectByName(name);
  return found instanceof THREE.Bone ? found : null;
}
function findHead(root: THREE.Object3D): THREE.Bone | null { return findBone(root, 'head') ?? findBone(root, 'Head'); }
function pose(root: THREE.Object3D, name: string): BonePose {
  const bone = findBone(root, name); return { bone, base: bone?.quaternion.clone() ?? new THREE.Quaternion() };
}
function headPose(root: THREE.Object3D): BonePose {
  const bone = findHead(root); return { bone, base: bone?.quaternion.clone() ?? new THREE.Quaternion() };
}
function setPose(target: BonePose, x = 0, y = 0, z = 0): void {
  if (!target.bone) return;
  offsetEuler.set(x, y, z, 'XYZ');
  offsetQuaternion.setFromEuler(offsetEuler);
  target.bone.quaternion.copy(target.base).multiply(offsetQuaternion);
}

function estimateHeight(root: THREE.Object3D): number {
  root.updateMatrixWorld(true);
  const head = findHead(root);
  const feet = [findBone(root, 'foot_l'), findBone(root, 'foot_r')].filter((bone): bone is THREE.Bone => bone !== null);
  if (head && feet.length > 0) {
    const headWorld = new THREE.Vector3(); head.getWorldPosition(headWorld);
    const footWorld = new THREE.Vector3();
    for (const foot of feet) { const point = new THREE.Vector3(); foot.getWorldPosition(point); footWorld.add(point); }
    footWorld.multiplyScalar(1 / feet.length);
    const h = Math.abs(headWorld.y - footWorld.y);
    if (Number.isFinite(h) && h > 0.5 && h < 3) return h * SKELETON_TO_FULL_HEIGHT;
  }
  const bounds = new THREE.Box3().setFromObject(root);
  const height = bounds.max.y - bounds.min.y;
  return Number.isFinite(height) && height > 0.1 ? height : BASE_TARGET_HEIGHT;
}

function groundFromFeet(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const feet = [findBone(root, 'foot_l'), findBone(root, 'foot_r')].filter((bone): bone is THREE.Bone => bone !== null);
  if (feet.length > 0) {
    let minY = Number.POSITIVE_INFINITY;
    for (const foot of feet) { const point = new THREE.Vector3(); foot.getWorldPosition(point); minY = Math.min(minY, point.y); }
    if (Number.isFinite(minY)) { root.position.y += TARGET_ANKLE_HEIGHT - minY; return; }
  }
  const bounds = new THREE.Box3().setFromObject(root);
  if (Number.isFinite(bounds.min.y)) root.position.y -= bounds.min.y;
}

function infectedMaterial(source: THREE.Material, profile: InfectedProfile): THREE.Material {
  const material = source.clone();
  if (material instanceof THREE.MeshStandardMaterial) {
    material.color.multiply(new THREE.Color(profile.tint));
    material.roughness = Math.max(0.86, material.roughness);
    material.metalness = 0;
  }
  return material;
}

function prepareModel(model: THREE.Object3D, damageTargetId: string, shadows: boolean, profile: InfectedProfile): void {
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = shadows;
    object.receiveShadow = true;
    object.frustumCulled = true;
    object.geometry = object.geometry.clone();
    if (Array.isArray(object.material)) object.material = object.material.map((m) => infectedMaterial(m, profile));
    else object.material = infectedMaterial(object.material, profile);
    // Gameplay uses authored bone hit proxies. The skin is presentation only.
    object.userData.visualOnly = true;
    object.raycast = () => undefined;
  });
  model.userData.damageTargetId = damageTargetId;
}

function addInfectionDetails(wrapper: THREE.Group, damageTargetId: string, shadows: boolean, type: EnemyId): void {
  const profile = PROFILES[type];
  const woundMaterial = new THREE.MeshStandardMaterial({ color: 0x5e0b08, roughness: 0.96, metalness: 0 });
  const driedBlood = new THREE.MeshStandardMaterial({ color: 0x260504, roughness: 1, metalness: 0 });
  const chest = new THREE.Mesh(new THREE.CircleGeometry(0.18 * profile.woundScale, 12), woundMaterial);
  chest.name = `${type}-chest-wound`; chest.position.set(0.12, 1.17, -0.24); chest.rotation.set(0, Math.PI, -0.32);
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.09 * profile.woundScale, 8, 6), driedBlood);
  shoulder.name = `${type}-shoulder-wound`; shoulder.position.set(-0.28, 1.42, -0.13); shoulder.scale.set(1.45, 0.7, 0.45);
  for (const detail of [chest, shoulder]) {
    detail.castShadow = shadows; detail.userData.damageTargetId = damageTargetId; detail.userData.decorative = true;
    detail.raycast = () => undefined; wrapper.add(detail);
  }
}

function proxyMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
}

function addBoneHitProxy(
  bone: THREE.Bone | null,
  damageTargetId: string,
  zone: 'head' | 'torso' | 'limb',
  name: string,
  geometry: THREE.BufferGeometry,
  position: THREE.Vector3Tuple,
  scale: THREE.Vector3Tuple = [1, 1, 1]
): void {
  if (!bone) { geometry.dispose(); return; }
  const mesh = new THREE.Mesh(geometry, proxyMaterial());
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.userData.damageTargetId = damageTargetId;
  mesh.userData.hitZone = zone;
  mesh.userData.damageCollider = true;
  mesh.frustumCulled = false;
  bone.add(mesh);
}

function addBoneHitProxies(model: THREE.Object3D, damageTargetId: string, type: EnemyId): void {
  const profile = PROFILES[type];
  const w = profile.width;
  addBoneHitProxy(findHead(model), damageTargetId, 'head', `${type}-hit-head`, new THREE.SphereGeometry(0.16, 8, 6), [0, 0.04, 0], [1.05, 1.18, 0.95]);
  addBoneHitProxy(findBone(model, 'spine_02') ?? findBone(model, 'spine_03'), damageTargetId, 'torso', `${type}-hit-torso`, new THREE.BoxGeometry(0.42, 0.52, 0.28), [0, 0.05, 0], [w, 1, profile.depth]);
  for (const side of ['l', 'r'] as const) {
    addBoneHitProxy(findBone(model, `upperarm_${side}`), damageTargetId, 'limb', `${type}-hit-upperarm-${side}`, new THREE.CapsuleGeometry(0.075, 0.25, 4, 6), [0, -0.13, 0], [w, 1, w]);
    addBoneHitProxy(findBone(model, `lowerarm_${side}`), damageTargetId, 'limb', `${type}-hit-lowerarm-${side}`, new THREE.CapsuleGeometry(0.065, 0.22, 4, 6), [0, -0.11, 0], [w, 1, w]);
    addBoneHitProxy(findBone(model, `thigh_${side}`), damageTargetId, 'limb', `${type}-hit-thigh-${side}`, new THREE.CapsuleGeometry(0.09, 0.30, 4, 6), [0, -0.17, 0], [w, 1, w]);
    addBoneHitProxy(findBone(model, `calf_${side}`), damageTargetId, 'limb', `${type}-hit-calf-${side}`, new THREE.CapsuleGeometry(0.075, 0.26, 4, 6), [0, -0.15, 0], [w, 1, w]);
  }
}

function hideProceduralFallback(root: THREE.Group): void {
  for (const child of root.children) if (child.name !== 'infected-rigged-visual') child.visible = false;
}

function createRuntime(wrapper: THREE.Group, model: THREE.Object3D, type: EnemyId): InfectedRuntime {
  return {
    wrapper, type, active: 'idle', clock: Math.random() * Math.PI * 2, action: null, actionTime: 0, actionDuration: 0,
    head: headPose(model), spine: pose(model, 'spine_03'), upperArmL: pose(model, 'upperarm_l'), upperArmR: pose(model, 'upperarm_r'),
    lowerArmL: pose(model, 'lowerarm_l'), lowerArmR: pose(model, 'lowerarm_r'), thighL: pose(model, 'thigh_l'), thighR: pose(model, 'thigh_r'),
    calfL: pose(model, 'calf_l'), calfR: pose(model, 'calf_r')
  };
}

export async function hydrateRiggedInfected(root: THREE.Group, type: EnemyId, shadows: boolean): Promise<boolean> {
  if (root.userData.riggedInfectedReady || root.userData.riggedInfectedLoading) return Boolean(root.userData.riggedInfectedReady);
  root.userData.riggedInfectedLoading = true;
  const damageTargetId = String(root.userData.damageTargetId ?? '');
  try {
    const source = await loadSource();
    if (!root.parent || !root.visible) return false;
    const profile = PROFILES[type];
    const model = cloneSkeleton(source);
    model.name = `${type}-rigged-model`;
    prepareModel(model, damageTargetId, shadows, profile);
    model.updateMatrixWorld(true);
    model.scale.multiplyScalar(BASE_TARGET_HEIGHT / Math.max(0.001, estimateHeight(model)));
    model.updateMatrixWorld(true); groundFromFeet(model);
    model.scale.x *= profile.width; model.scale.z *= profile.depth;
    addBoneHitProxies(model, damageTargetId, type);

    const wrapper = new THREE.Group();
    wrapper.name = 'infected-rigged-visual'; wrapper.rotation.y = Math.PI; wrapper.add(model);
    addInfectionDetails(wrapper, damageTargetId, shadows, type); root.add(wrapper);

    root.userData.riggedInfectedRuntime = createRuntime(wrapper, model, type);
    root.userData.riggedInfectedReady = true; root.userData.riggedInfectedLoading = false;
    root.userData.productionInfectedType = type; root.userData.productionAsset = MODEL_URL;
    hideProceduralFallback(root); updateRiggedInfected(root, 0, 0); return true;
  } catch (error) {
    root.userData.riggedInfectedLoading = false;
    root.userData.riggedInfectedError = error instanceof Error ? error.message : String(error);
    console.warn(`[Facefall] rigged ${type} hydration failed; keeping procedural fallback.`, error); return false;
  }
}

/** Backward-compatible Walker aliases retained for existing tests/integration. */
export function hydrateRiggedWalker(root: THREE.Group, shadows: boolean): Promise<boolean> { return hydrateRiggedInfected(root, 'walker', shadows); }

export function playRiggedInfectedAction(root: THREE.Group, action: Exclude<InfectedAction, null>): boolean {
  const runtime = root.userData.riggedInfectedRuntime as InfectedRuntime | undefined;
  if (!runtime) return false;
  runtime.action = action; runtime.actionTime = 0;
  runtime.actionDuration = action === 'attack' ? 0.48 : action === 'stagger' ? 0.34 : 1.05;
  return true;
}

function applyNativePose(runtime: InfectedRuntime, speed: number): void {
  const profile = PROFILES[runtime.type];
  const moving = speed > 0.12; const phase = runtime.clock;
  const stride = (moving ? Math.min(0.52, 0.18 + speed * 0.065) : 0.035) * profile.stride;
  const left = Math.sin(phase) * stride; const right = Math.sin(phase + Math.PI) * stride;
  const drag = moving && runtime.type === 'walker' ? 0.13 : 0.03;
  setPose(runtime.spine, -profile.lean, 0, (runtime.type === 'runner' ? -0.03 : 0.07) + Math.sin(phase * 0.5) * 0.04);
  setPose(runtime.head, 0.08 + Math.sin(phase * 0.38) * 0.03, 0, runtime.type === 'runner' ? -0.08 : -0.20 + Math.sin(phase * 0.62) * 0.045);
  setPose(runtime.upperArmL, -profile.armLift - left * 0.42, 0, runtime.type === 'brute' ? -0.28 : -0.16);
  setPose(runtime.upperArmR, -profile.armLift * 0.78 - right * 0.30, 0, runtime.type === 'brute' ? 0.24 : 0.10);
  setPose(runtime.lowerArmL, runtime.type === 'runner' ? -0.78 : -0.34, 0, -0.12);
  setPose(runtime.lowerArmR, runtime.type === 'runner' ? -0.62 : -0.22, 0, 0.08);
  setPose(runtime.thighL, left, 0, 0.035); setPose(runtime.thighR, right * 0.76 - drag, 0, -0.025);
  setPose(runtime.calfL, Math.max(0, -left) * 0.62, 0, 0); setPose(runtime.calfR, Math.max(0, -right) * 0.52 + drag, 0, 0);
  runtime.wrapper.rotation.z = (runtime.type === 'runner' ? -0.025 : 0.045) + Math.sin(phase * 0.5) * 0.025;
  runtime.wrapper.rotation.x = runtime.type === 'runner' ? 0.12 : 0.025;
}

function applyAction(runtime: InfectedRuntime): void {
  if (!runtime.action) return;
  const t = THREE.MathUtils.clamp(runtime.actionTime / runtime.actionDuration, 0, 1);
  const pulse = Math.sin(Math.PI * t);
  if (runtime.action === 'attack') {
    setPose(runtime.spine, -0.10 + 0.34 * pulse, 0, 0);
    setPose(runtime.upperArmL, -0.90 - 0.48 * pulse, 0, -0.18);
    setPose(runtime.upperArmR, -0.78 - 0.56 * pulse, 0, 0.15);
    setPose(runtime.lowerArmL, -0.62, 0, 0); setPose(runtime.lowerArmR, -0.58, 0, 0);
  } else if (runtime.action === 'stagger') {
    setPose(runtime.spine, -0.18 + 0.44 * pulse, 0, -0.24 * pulse);
    setPose(runtime.head, -0.20 * pulse, 0, 0.18 * pulse);
    runtime.wrapper.rotation.z += 0.12 * pulse;
  } else {
    const ease = t * t * (3 - 2 * t);
    setPose(runtime.spine, 0.92 * ease, 0, -0.58 * ease);
    setPose(runtime.head, -0.38 * ease, 0, 0.34 * ease);
    setPose(runtime.upperArmL, -0.2, 0, -0.92 * ease); setPose(runtime.upperArmR, -0.2, 0, 0.82 * ease);
    runtime.wrapper.rotation.x = 0.05 + 1.22 * ease;
    runtime.wrapper.position.y = -0.34 * ease;
  }
  if (t >= 1 && runtime.action !== 'death') runtime.action = null;
}

export function updateRiggedInfected(root: THREE.Group, speed: number, dt: number): boolean {
  const runtime = root.userData.riggedInfectedRuntime as InfectedRuntime | undefined;
  if (!runtime) return false;
  runtime.active = speed > 0.12 ? 'walk' : 'idle';
  const profile = PROFILES[runtime.type];
  const pace = (runtime.active === 'walk' ? Math.max(1.6, Math.min(4.8, 1.45 + speed * 0.72)) : 0.85) * profile.pace;
  runtime.clock += Math.max(0, dt) * pace;
  if (runtime.action) runtime.actionTime += Math.max(0, dt);
  applyNativePose(runtime, speed); applyAction(runtime); return true;
}

export function updateRiggedWalker(root: THREE.Group, speed: number, dt: number): boolean { return updateRiggedInfected(root, speed, dt); }

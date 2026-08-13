import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const MODEL_URL = '/assets/enemies/mesh2motion-human-zombie/human-zombie.glb';
const TARGET_HEIGHT = 1.78;
const SKELETON_TO_FULL_HEIGHT = 1.12;
const TARGET_ANKLE_HEIGHT = 0.055;

interface BonePose {
  bone: THREE.Bone | null;
  base: THREE.Quaternion;
}

interface WalkerRuntime {
  wrapper: THREE.Group;
  active: 'idle' | 'walk';
  clock: number;
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
const offsetQuaternion = new THREE.Quaternion();
const offsetEuler = new THREE.Euler();

function loadSource(): Promise<THREE.Object3D> {
  if (!sourcePromise) {
    sourcePromise = loader.loadAsync(MODEL_URL)
      .then((model) => model.scene)
      .catch((error) => {
        sourcePromise = null;
        throw error;
      });
  }
  return sourcePromise;
}

function findBone(root: THREE.Object3D, name: string): THREE.Bone | null {
  const found = root.getObjectByName(name);
  return found instanceof THREE.Bone ? found : null;
}

function findHead(root: THREE.Object3D): THREE.Bone | null {
  return findBone(root, 'head') ?? findBone(root, 'Head');
}

function pose(root: THREE.Object3D, name: string): BonePose {
  const bone = findBone(root, name);
  return { bone, base: bone?.quaternion.clone() ?? new THREE.Quaternion() };
}

function headPose(root: THREE.Object3D): BonePose {
  const bone = findHead(root);
  return { bone, base: bone?.quaternion.clone() ?? new THREE.Quaternion() };
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
    const headWorld = new THREE.Vector3();
    head.getWorldPosition(headWorld);
    const footWorld = new THREE.Vector3();
    for (const foot of feet) {
      const point = new THREE.Vector3();
      foot.getWorldPosition(point);
      footWorld.add(point);
    }
    footWorld.multiplyScalar(1 / feet.length);
    const skeletonHeight = Math.abs(headWorld.y - footWorld.y);
    if (Number.isFinite(skeletonHeight) && skeletonHeight > 0.5 && skeletonHeight < 3) {
      return skeletonHeight * SKELETON_TO_FULL_HEIGHT;
    }
  }
  const bounds = new THREE.Box3().setFromObject(root);
  const height = bounds.max.y - bounds.min.y;
  return Number.isFinite(height) && height > 0.1 ? height : TARGET_HEIGHT;
}

function groundFromFeet(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const feet = [findBone(root, 'foot_l'), findBone(root, 'foot_r')].filter((bone): bone is THREE.Bone => bone !== null);
  if (feet.length > 0) {
    let minY = Number.POSITIVE_INFINITY;
    for (const foot of feet) {
      const point = new THREE.Vector3();
      foot.getWorldPosition(point);
      minY = Math.min(minY, point.y);
    }
    if (Number.isFinite(minY)) {
      root.position.y += TARGET_ANKLE_HEIGHT - minY;
      return;
    }
  }
  const bounds = new THREE.Box3().setFromObject(root);
  if (Number.isFinite(bounds.min.y)) root.position.y -= bounds.min.y;
}

function infectedMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone();
  if (material instanceof THREE.MeshStandardMaterial) {
    material.color.multiply(new THREE.Color(0xa4ad9a));
    material.roughness = Math.max(0.86, material.roughness);
    material.metalness = 0;
  }
  return material;
}

function inferHitZone(name: string): 'head' | 'torso' | 'limb' {
  const lower = name.toLowerCase();
  if (/(head|face|eye|hair)/.test(lower)) return 'head';
  if (/(arm|hand|leg|foot|toe)/.test(lower)) return 'limb';
  return 'torso';
}

function prepareModel(model: THREE.Object3D, damageTargetId: string, shadows: boolean): void {
  model.traverse((object) => {
    object.userData.damageTargetId = damageTargetId;
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = shadows;
    object.receiveShadow = true;
    object.frustumCulled = true;
    object.geometry = object.geometry.clone();
    object.userData.hitZone = inferHitZone(object.name);
    if (Array.isArray(object.material)) object.material = object.material.map(infectedMaterial);
    else object.material = infectedMaterial(object.material);
  });
}

function addInfectionDetails(wrapper: THREE.Group, damageTargetId: string, shadows: boolean): void {
  const woundMaterial = new THREE.MeshStandardMaterial({ color: 0x5e0b08, roughness: 0.96, metalness: 0 });
  const driedBlood = new THREE.MeshStandardMaterial({ color: 0x260504, roughness: 1, metalness: 0 });
  const details: THREE.Mesh[] = [];

  const chest = new THREE.Mesh(new THREE.CircleGeometry(0.18, 14), woundMaterial);
  chest.name = 'walker-chest-wound';
  chest.position.set(0.12, 1.17, -0.24);
  chest.rotation.set(0, Math.PI, -0.32);
  chest.scale.set(1.25, 0.58, 1);
  chest.userData.hitZone = 'torso';
  details.push(chest);

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), driedBlood);
  shoulder.name = 'walker-shoulder-wound';
  shoulder.position.set(-0.28, 1.42, -0.13);
  shoulder.scale.set(1.45, 0.7, 0.45);
  shoulder.userData.hitZone = 'limb';
  details.push(shoulder);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.055, 0.03), woundMaterial);
  jaw.name = 'walker-jaw-wound';
  jaw.position.set(0.055, 1.67, -0.19);
  jaw.rotation.z = -0.23;
  jaw.userData.hitZone = 'head';
  details.push(jaw);

  for (const detail of details) {
    detail.castShadow = shadows;
    detail.userData.damageTargetId = damageTargetId;
    detail.userData.decorative = true;
    wrapper.add(detail);
  }
}

function hideProceduralFallback(root: THREE.Group): void {
  for (const child of root.children) {
    if (child.name !== 'walker-rigged-visual') child.visible = false;
  }
}

function createRuntime(wrapper: THREE.Group, model: THREE.Object3D): WalkerRuntime {
  return {
    wrapper,
    active: 'idle',
    clock: Math.random() * Math.PI * 2,
    head: headPose(model),
    spine: pose(model, 'spine_03'),
    upperArmL: pose(model, 'upperarm_l'),
    upperArmR: pose(model, 'upperarm_r'),
    lowerArmL: pose(model, 'lowerarm_l'),
    lowerArmR: pose(model, 'lowerarm_r'),
    thighL: pose(model, 'thigh_l'),
    thighR: pose(model, 'thigh_r'),
    calfL: pose(model, 'calf_l'),
    calfR: pose(model, 'calf_r')
  };
}

export async function hydrateRiggedWalker(root: THREE.Group, shadows: boolean): Promise<boolean> {
  if (root.userData.riggedWalkerReady || root.userData.riggedWalkerLoading) return Boolean(root.userData.riggedWalkerReady);
  root.userData.riggedWalkerLoading = true;
  const damageTargetId = String(root.userData.damageTargetId ?? '');

  try {
    const source = await loadSource();
    if (!root.parent || !root.visible) return false;

    const model = cloneSkeleton(source);
    model.name = 'walker-rigged-model';
    prepareModel(model, damageTargetId, shadows);
    model.updateMatrixWorld(true);
    model.scale.multiplyScalar(TARGET_HEIGHT / Math.max(0.001, estimateHeight(model)));
    model.updateMatrixWorld(true);
    groundFromFeet(model);

    const wrapper = new THREE.Group();
    wrapper.name = 'walker-rigged-visual';
    wrapper.rotation.y = Math.PI;
    wrapper.add(model);
    addInfectionDetails(wrapper, damageTargetId, shadows);
    root.add(wrapper);

    root.userData.riggedWalkerRuntime = createRuntime(wrapper, model);
    root.userData.riggedWalkerReady = true;
    root.userData.riggedWalkerLoading = false;
    hideProceduralFallback(root);
    updateRiggedWalker(root, 0, 0);
    return true;
  } catch (error) {
    root.userData.riggedWalkerLoading = false;
    root.userData.riggedWalkerError = error instanceof Error ? error.message : String(error);
    console.warn('[Facefall] rigged Walker hydration failed; keeping procedural fallback.', error);
    return false;
  }
}

export function setRiggedWalkerMotion(root: THREE.Group, speed: number): boolean {
  const runtime = root.userData.riggedWalkerRuntime as WalkerRuntime | undefined;
  if (!runtime) return false;
  runtime.active = speed > 0.12 ? 'walk' : 'idle';
  return true;
}

function applyNativeZombiePose(runtime: WalkerRuntime, speed: number): void {
  const moving = speed > 0.12;
  const phase = runtime.clock;
  const stride = moving ? Math.min(0.48, 0.18 + speed * 0.065) : 0.035;
  const left = Math.sin(phase) * stride;
  const right = Math.sin(phase + Math.PI) * stride;
  const drag = moving ? 0.13 : 0.04;

  setPose(runtime.spine, -0.18, 0, 0.07 + Math.sin(phase * 0.5) * 0.04);
  setPose(runtime.head, 0.11 + Math.sin(phase * 0.38) * 0.025, 0, -0.20 + Math.sin(phase * 0.62) * 0.045);
  setPose(runtime.upperArmL, -0.48 - left * 0.42, 0, -0.16);
  setPose(runtime.upperArmR, -0.34 - right * 0.28, 0, 0.10);
  setPose(runtime.lowerArmL, -0.34, 0, -0.12);
  setPose(runtime.lowerArmR, -0.22, 0, 0.08);
  setPose(runtime.thighL, left, 0, 0.035);
  setPose(runtime.thighR, right * 0.72 - drag, 0, -0.025);
  setPose(runtime.calfL, Math.max(0, -left) * 0.62, 0, 0);
  setPose(runtime.calfR, Math.max(0, -right) * 0.48 + drag, 0, 0);
  runtime.wrapper.rotation.z = 0.045 + Math.sin(phase * 0.5) * 0.025;
  runtime.wrapper.rotation.x = 0.025 + Math.sin(phase * 0.31) * 0.012;
}

export function updateRiggedWalker(root: THREE.Group, speed: number, dt: number): boolean {
  const runtime = root.userData.riggedWalkerRuntime as WalkerRuntime | undefined;
  if (!runtime) return false;
  setRiggedWalkerMotion(root, speed);
  const pace = runtime.active === 'walk' ? Math.max(1.6, Math.min(4.2, 1.45 + speed * 0.72)) : 0.85;
  runtime.clock += Math.max(0, dt) * pace;
  applyNativeZombiePose(runtime, speed);
  return true;
}

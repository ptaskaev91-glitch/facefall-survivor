import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const MODEL_URL = '/assets/characters/quaternius-universal-base-male/Superhero_Male_FullBody.gltf';
const ANIMATIONS_URL = '/assets/animations/quaternius-universal-animation-library/UAL1_Standard.glb';
const TARGET_HEIGHT = 1.78;
const SKELETON_TO_FULL_HEIGHT = 1.12;
const TARGET_ANKLE_HEIGHT = 0.055;

interface WalkerSource {
  scene: THREE.Object3D;
  clips: THREE.AnimationClip[];
}

interface WalkerRuntime {
  wrapper: THREE.Group;
  mixer: THREE.AnimationMixer;
  idle: THREE.AnimationAction | null;
  walk: THREE.AnimationAction | null;
  active: 'idle' | 'walk' | null;
  head: THREE.Bone | null;
  spine: THREE.Bone | null;
  clavicleL: THREE.Bone | null;
  clavicleR: THREE.Bone | null;
  upperArmL: THREE.Bone | null;
  upperArmR: THREE.Bone | null;
}

const loader = new GLTFLoader();
let sourcePromise: Promise<WalkerSource> | null = null;

function loadSource(): Promise<WalkerSource> {
  if (!sourcePromise) {
    sourcePromise = Promise.all([
      loader.loadAsync(MODEL_URL),
      loader.loadAsync(ANIMATIONS_URL)
    ]).then(([model, animations]) => ({
      scene: model.scene,
      clips: animations.animations.map((clip) => new THREE.AnimationClip(
        clip.name,
        clip.duration,
        clip.tracks
          .filter((track) => /\.quaternion$/i.test(track.name))
          .map((track) => track.clone())
      ).optimize())
    })).catch((error) => {
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

function estimateHeight(root: THREE.Object3D): number {
  root.updateMatrixWorld(true);
  const head = findBone(root, 'Head');
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
    const lowerName = material.name.toLowerCase();
    if (lowerName.includes('superhero')) {
      // The current source body texture is healthy and dark. Keep its normal map but replace
      // albedo so the silhouette reads as dead/grey-green even under the very dark night rig.
      material.map = null;
      material.color.set(0x74816f);
      material.roughness = 0.92;
    } else if (lowerName.includes('eyes')) {
      material.color.set(0xc4d09a);
      material.emissive.set(0x4b5627);
      material.emissiveIntensity = 0.34;
    } else {
      material.color.multiply(new THREE.Color(0x4f554c));
      material.roughness = Math.max(0.82, material.roughness);
    }
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

  const chest = new THREE.Mesh(new THREE.CircleGeometry(0.22, 14), woundMaterial);
  chest.name = 'walker-chest-wound';
  chest.position.set(0.14, 1.18, -0.245);
  chest.rotation.y = Math.PI;
  chest.rotation.z = -0.32;
  chest.scale.set(1.35, 0.62, 1);
  chest.userData.hitZone = 'torso';

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), driedBlood);
  shoulder.name = 'walker-shoulder-wound';
  shoulder.position.set(-0.31, 1.42, -0.14);
  shoulder.scale.set(1.55, 0.72, 0.48);
  shoulder.userData.hitZone = 'limb';

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.065, 0.03), woundMaterial);
  jaw.name = 'walker-jaw-wound';
  jaw.position.set(0.06, 1.68, -0.205);
  jaw.rotation.z = -0.23;
  jaw.userData.hitZone = 'head';

  for (const detail of [chest, shoulder, jaw]) {
    detail.castShadow = shadows;
    detail.userData.damageTargetId = damageTargetId;
    detail.userData.decorative = true;
    wrapper.add(detail);
  }
}

function hideProceduralFallback(root: THREE.Group): void {
  for (const child of root.children) {
    if (child.name === 'walker-rigged-visual') continue;
    child.visible = false;
  }
}

function bindAction(mixer: THREE.AnimationMixer, clips: THREE.AnimationClip[], patterns: RegExp[]): THREE.AnimationAction | null {
  const clip = clips.find((candidate) => patterns.some((pattern) => pattern.test(candidate.name)));
  return clip ? mixer.clipAction(clip) : null;
}

export async function hydrateRiggedWalker(root: THREE.Group, shadows: boolean): Promise<boolean> {
  if (root.userData.riggedWalkerReady || root.userData.riggedWalkerLoading) return Boolean(root.userData.riggedWalkerReady);
  root.userData.riggedWalkerLoading = true;
  const damageTargetId = String(root.userData.damageTargetId ?? '');

  try {
    const source = await loadSource();
    if (!root.parent || !root.visible) return false;

    const model = cloneSkeleton(source.scene);
    model.name = 'walker-rigged-model';
    prepareModel(model, damageTargetId, shadows);
    model.updateMatrixWorld(true);
    model.scale.multiplyScalar(TARGET_HEIGHT / Math.max(0.001, estimateHeight(model)));
    model.updateMatrixWorld(true);
    groundFromFeet(model);

    const wrapper = new THREE.Group();
    wrapper.name = 'walker-rigged-visual';
    wrapper.rotation.y = Math.PI;
    wrapper.rotation.z = 0.055;
    wrapper.add(model);
    addInfectionDetails(wrapper, damageTargetId, shadows);
    root.add(wrapper);

    const mixer = new THREE.AnimationMixer(model);
    const idle = bindAction(mixer, source.clips, [/idle.*loop/i, /idle/i]);
    const walk = bindAction(mixer, source.clips, [/walk.*loop/i, /jog.*fwd/i, /walk/i]);
    const runtime: WalkerRuntime = {
      wrapper,
      mixer,
      idle,
      walk,
      active: null,
      head: findBone(model, 'Head'),
      spine: findBone(model, 'spine_03'),
      clavicleL: findBone(model, 'clavicle_l'),
      clavicleR: findBone(model, 'clavicle_r'),
      upperArmL: findBone(model, 'upperarm_l'),
      upperArmR: findBone(model, 'upperarm_r')
    };
    root.userData.riggedWalkerRuntime = runtime;
    root.userData.riggedWalkerReady = true;
    root.userData.riggedWalkerLoading = false;
    hideProceduralFallback(root);
    setRiggedWalkerMotion(root, 0);
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
  const desired: 'idle' | 'walk' = speed > 0.12 ? 'walk' : 'idle';
  if (runtime.active !== desired) {
    const next = desired === 'walk' ? runtime.walk ?? runtime.idle : runtime.idle ?? runtime.walk;
    const previous = runtime.active === 'walk' ? runtime.walk : runtime.active === 'idle' ? runtime.idle : null;
    previous?.fadeOut(0.18);
    next?.reset().fadeIn(0.18).play();
    runtime.active = desired;
  }
  return true;
}

function applyInfectedPose(runtime: WalkerRuntime, phase: number): void {
  // Mixer writes the authored pose first; these local offsets are applied afterwards and are
  // therefore refreshed every frame instead of accumulating. The asymmetry is intentional.
  runtime.spine?.rotateX(-0.20);
  runtime.spine?.rotateZ(0.06 + Math.sin(phase * 0.55) * 0.035);
  runtime.head?.rotateX(0.13);
  runtime.head?.rotateZ(-0.24 + Math.sin(phase * 0.72) * 0.035);
  runtime.clavicleL?.rotateZ(-0.18);
  runtime.clavicleR?.rotateZ(0.10);
  runtime.upperArmL?.rotateX(-0.34);
  runtime.upperArmR?.rotateX(-0.16);
  runtime.upperArmR?.rotateZ(0.12);
}

export function updateRiggedWalker(root: THREE.Group, speed: number, dt: number): boolean {
  const runtime = root.userData.riggedWalkerRuntime as WalkerRuntime | undefined;
  if (!runtime) return false;
  setRiggedWalkerMotion(root, speed);
  const phase = ((root.userData.riggedWalkerLeanPhase as number | undefined) ?? Math.random() * Math.PI * 2) + dt * 1.7;
  root.userData.riggedWalkerLeanPhase = phase;
  runtime.mixer.update(Math.max(0, dt) * Math.max(0.58, Math.min(1.05, 0.46 + speed * 0.13)));
  applyInfectedPose(runtime, phase);
  runtime.wrapper.rotation.z = 0.055 + Math.sin(phase) * 0.028;
  runtime.wrapper.rotation.x = 0.035 + Math.sin(phase * 0.43) * 0.012;
  return true;
}

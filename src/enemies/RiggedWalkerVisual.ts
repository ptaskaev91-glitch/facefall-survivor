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
    material.color.multiply(new THREE.Color(0x83927d));
    material.roughness = Math.max(0.72, material.roughness);
    material.metalness *= 0.2;
    material.emissive.set(0x130707);
    material.emissiveIntensity = 0.08;
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
    // SkeletonUtils clones the hierarchy/skeleton but shares render resources. Give every
    // infected its own geometry/material instances so EnemySystem reset can dispose safely.
    object.geometry = object.geometry.clone();
    object.userData.hitZone = inferHitZone(object.name);
    if (Array.isArray(object.material)) object.material = object.material.map(infectedMaterial);
    else object.material = infectedMaterial(object.material);
  });
}

function addInfectionDetails(wrapper: THREE.Group, damageTargetId: string, shadows: boolean): void {
  const woundMaterial = new THREE.MeshStandardMaterial({ color: 0x4d0e0c, roughness: 0.93, metalness: 0 });
  const driedBlood = new THREE.MeshStandardMaterial({ color: 0x2b0a08, roughness: 1, metalness: 0 });

  const chest = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), woundMaterial);
  chest.name = 'walker-chest-wound';
  chest.position.set(0.16, 1.18, -0.235);
  chest.rotation.y = Math.PI;
  chest.rotation.z = -0.28;
  chest.userData.hitZone = 'torso';

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), driedBlood);
  shoulder.name = 'walker-shoulder-wound';
  shoulder.position.set(-0.30, 1.42, -0.12);
  shoulder.scale.set(1.3, 0.65, 0.42);
  shoulder.userData.hitZone = 'limb';

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.025), woundMaterial);
  jaw.name = 'walker-jaw-wound';
  jaw.position.set(0.06, 1.68, -0.19);
  jaw.rotation.z = -0.17;
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

/**
 * Hydrates a procedural Walker root with a cached rigged humanoid presentation.
 * Gameplay keeps owning the stable root; failed loading simply leaves the fallback visible.
 */
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
    // Quaternius source faces +Z; Facefall actors move/fight toward local -Z.
    wrapper.rotation.y = Math.PI;
    wrapper.rotation.z = 0.025;
    wrapper.add(model);
    addInfectionDetails(wrapper, damageTargetId, shadows);
    root.add(wrapper);

    const mixer = new THREE.AnimationMixer(model);
    const idle = bindAction(mixer, source.clips, [/idle.*loop/i, /idle/i]);
    const walk = bindAction(mixer, source.clips, [/walk.*loop/i, /jog.*fwd/i, /walk/i]);
    const runtime: WalkerRuntime = { wrapper, mixer, idle, walk, active: null };
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

export function updateRiggedWalker(root: THREE.Group, speed: number, dt: number): boolean {
  const runtime = root.userData.riggedWalkerRuntime as WalkerRuntime | undefined;
  if (!runtime) return false;
  setRiggedWalkerMotion(root, speed);
  runtime.mixer.update(Math.max(0, dt) * Math.max(0.68, Math.min(1.25, 0.55 + speed * 0.16)));
  const phase = ((root.userData.riggedWalkerLeanPhase as number | undefined) ?? Math.random() * Math.PI * 2) + dt * 1.7;
  root.userData.riggedWalkerLeanPhase = phase;
  runtime.wrapper.rotation.z = 0.025 + Math.sin(phase) * 0.018;
  return true;
}

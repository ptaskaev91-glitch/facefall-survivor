import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { resolveLocomotionState, type LocomotionState } from './CharacterLocomotion';

export interface CharacterLoadResult {
  clipNames: string[];
  hasSkeleton: boolean;
  sourceHeight: number;
}

const TARGET_CHARACTER_HEIGHT = 1.82;
const SKELETON_TO_FULL_HEIGHT = 1.12;
const TARGET_ANKLE_HEIGHT = 0.075;
const FACE_TEXTURE_WIDTH = 512;
const FACE_TEXTURE_HEIGHT = 640;

/**
 * Production-character boundary behind PlayerRuntime.
 * Owns rigged GLTF loading, locomotion clips, the head-bone photo shell and cleanup.
 * It deliberately knows nothing about input, weapons, health, collision or cameras.
 */
export class CharacterModel {
  readonly root = new THREE.Group();

  private readonly loader = new GLTFLoader();
  private readonly actions = new Map<LocomotionState, THREE.AnimationAction>();
  private readonly clips: THREE.AnimationClip[] = [];
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private activeState: LocomotionState | null = null;
  private headBone: THREE.Bone | null = null;
  private eyes: THREE.Object3D | null = null;
  private faceShell: THREE.Mesh | null = null;
  private faceTexture: THREE.Texture | null = null;
  private faceMaterial: THREE.MeshStandardMaterial | null = null;
  private faceDataUrl: string | null = null;
  private generation = 0;
  private faceGeneration = 0;
  private loaded = false;

  constructor(private readonly shadows: boolean) {
    this.root.name = 'player-production-character';
    this.root.visible = false;
  }

  get isLoaded(): boolean { return this.loaded; }

  async load(url: string): Promise<CharacterLoadResult> {
    const generation = ++this.generation;
    const gltf = await this.loader.loadAsync(url);
    if (generation !== this.generation) throw new Error('Character load superseded');

    this.clearModel();
    const instance = cloneSkeleton(gltf.scene);
    instance.name = 'hero-model';
    this.prepareRenderable(instance);
    instance.updateMatrixWorld(true);

    // SkinnedMesh geometry bounds can describe the undeformed source mesh rather than the
    // visible bind pose, which made some rigs several times too large in-game. Prefer an
    // anatomical rig measurement and only fall back to geometry bounds for unknown rigs.
    const sourceHeight = this.estimateFullHeightFromRig(instance) ?? this.estimateFallbackHeight(instance);
    const uniformScale = TARGET_CHARACTER_HEIGHT / Math.max(0.001, sourceHeight);
    instance.scale.multiplyScalar(uniformScale);
    instance.updateMatrixWorld(true);
    this.groundFromFeet(instance);

    this.model = instance;
    this.root.add(instance);
    this.root.updateMatrixWorld(true);
    this.mixer = new THREE.AnimationMixer(instance);
    this.headBone = this.findBone(instance, 'Head');
    this.eyes = instance.getObjectByName('Eyes') ?? null;
    this.loaded = true;

    this.clips.splice(0, this.clips.length, ...gltf.animations);
    this.bindLocomotionActions(this.clips);
    if (this.faceDataUrl) await this.rebuildFaceShell(this.faceDataUrl, ++this.faceGeneration);

    return {
      clipNames: this.clips.map((clip) => clip.name),
      hasSkeleton: this.containsSkeleton(instance),
      sourceHeight
    };
  }

  async loadAnimations(url: string): Promise<string[]> {
    if (!this.model || !this.mixer) throw new Error('Load the production character before animations');
    const generation = this.generation;
    const gltf = await this.loader.loadAsync(url);
    if (generation !== this.generation) throw new Error('Animation load superseded');

    // The library samples translation/scale as well as rotation for every joint.
    // Keeping those channels would overwrite the base character's bone lengths and
    // can distort compatible-but-not-bit-identical rigs. Rotation-only retargeting
    // preserves this hero's proportions while still applying the authored motion.
    const retargeted = gltf.animations.map((clip) => new THREE.AnimationClip(
      clip.name,
      clip.duration,
      clip.tracks
        .filter((track) => /\.quaternion$/i.test(track.name))
        .map((track) => track.clone())
    ).optimize());

    this.clips.splice(0, this.clips.length, ...retargeted);
    this.bindLocomotionActions(this.clips);
    this.disposeObjectResources(gltf.scene);
    this.setLocomotion('idle', true);
    return this.clips.map((clip) => clip.name);
  }

  async setFaceDataUrl(dataUrl: string | null): Promise<void> {
    this.faceDataUrl = dataUrl;
    const generation = ++this.faceGeneration;
    this.clearFaceShell();
    if (!dataUrl || !this.loaded || !this.headBone) return;
    await this.rebuildFaceShell(dataUrl, generation);
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible && this.loaded;
  }

  update(dt: number, speed: number): void {
    if (!this.loaded || !this.mixer) return;
    this.setLocomotion(resolveLocomotionState(speed));
    this.mixer.update(Math.max(0, dt));
  }

  dispose(): void {
    ++this.generation;
    ++this.faceGeneration;
    this.clearModel();
    this.root.removeFromParent();
  }

  private bindLocomotionActions(clips: THREE.AnimationClip[]): void {
    this.mixer?.stopAllAction();
    this.actions.clear();
    this.activeState = null;
    if (!this.mixer) return;

    const exact = (...names: string[]): THREE.AnimationClip | undefined =>
      names.map((name) => clips.find((clip) => clip.name.toLowerCase() === name.toLowerCase())).find(Boolean);
    const fuzzy = (...patterns: RegExp[]): THREE.AnimationClip | undefined =>
      clips.find((clip) => patterns.some((pattern) => pattern.test(clip.name)));

    const idle = exact('Pistol_Idle_Loop', 'Idle_Loop') ?? fuzzy(/pistol.*idle/i, /idle/i, /stand/i) ?? clips[0];
    const walk = exact('Walk_Loop', 'Jog_Fwd_Loop') ?? fuzzy(/walk.*loop/i, /jog.*fwd/i, /walk/i);
    const run = exact('Sprint_Loop', 'Jog_Fwd_Loop') ?? fuzzy(/sprint/i, /jog.*fwd/i, /run/i);

    if (idle) this.actions.set('idle', this.mixer.clipAction(idle));
    if (walk) this.actions.set('walk', this.mixer.clipAction(walk));
    if (run) this.actions.set('run', this.mixer.clipAction(run));
  }

  private setLocomotion(state: LocomotionState, immediate = false): void {
    if (this.activeState === state) return;
    const next = this.actions.get(state) ?? this.actions.get('walk') ?? this.actions.get('idle');
    if (!next) return;

    const previous = this.activeState ? this.actions.get(this.activeState) : undefined;
    const fade = immediate ? 0 : 0.18;
    if (previous && previous !== next) previous.fadeOut(fade);
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();
    this.activeState = state;
  }

  private estimateFullHeightFromRig(root: THREE.Object3D): number | null {
    const head = this.findBone(root, 'Head');
    const feet = [this.findBone(root, 'foot_l'), this.findBone(root, 'foot_r')].filter(
      (bone): bone is THREE.Bone => bone !== null
    );
    if (!head || feet.length === 0) return null;

    root.updateMatrixWorld(true);
    const headWorld = new THREE.Vector3();
    head.getWorldPosition(headWorld);
    const footWorld = new THREE.Vector3();
    for (const foot of feet) {
      const position = new THREE.Vector3();
      foot.getWorldPosition(position);
      footWorld.add(position);
    }
    footWorld.multiplyScalar(1 / feet.length);

    const skeletonHeight = Math.abs(headWorld.y - footWorld.y);
    if (!Number.isFinite(skeletonHeight) || skeletonHeight < 0.5 || skeletonHeight > 3.0) return null;
    return skeletonHeight * SKELETON_TO_FULL_HEIGHT;
  }

  private estimateFallbackHeight(root: THREE.Object3D): number {
    const bounds = new THREE.Box3().setFromObject(root);
    const height = bounds.max.y - bounds.min.y;
    return Number.isFinite(height) && height > 0.001 ? height : TARGET_CHARACTER_HEIGHT;
  }

  private groundFromFeet(root: THREE.Object3D): void {
    root.updateMatrixWorld(true);
    const feet = [this.findBone(root, 'foot_l'), this.findBone(root, 'foot_r')].filter(
      (bone): bone is THREE.Bone => bone !== null
    );

    if (feet.length > 0) {
      let minFootY = Number.POSITIVE_INFINITY;
      for (const foot of feet) {
        const position = new THREE.Vector3();
        foot.getWorldPosition(position);
        minFootY = Math.min(minFootY, position.y);
      }
      if (Number.isFinite(minFootY)) {
        root.position.y += TARGET_ANKLE_HEIGHT - minFootY;
        root.updateMatrixWorld(true);
        return;
      }
    }

    const bounds = new THREE.Box3().setFromObject(root);
    if (Number.isFinite(bounds.min.y)) root.position.y -= bounds.min.y;
    root.updateMatrixWorld(true);
  }

  private async rebuildFaceShell(dataUrl: string, generation: number): Promise<void> {
    if (!this.headBone || !this.model) return;
    const image = await this.loadImage(dataUrl);
    if (generation !== this.faceGeneration || !this.headBone || !this.model) return;

    const texture = this.makeMaskedFaceTexture(image);
    const placement = this.resolveFacePlacement(this.headBone, this.eyes);
    const geometry = this.makeCurvedFaceGeometry(placement.width, placement.height);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.025,
      depthWrite: true,
      roughness: 0.92,
      metalness: 0,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    const shell = new THREE.Mesh(geometry, material);
    shell.name = 'uploaded-face-shell';
    shell.position.copy(placement.position);
    shell.quaternion.copy(placement.quaternion);
    shell.renderOrder = 3;
    shell.castShadow = false;
    shell.receiveShadow = false;
    this.headBone.add(shell);

    this.faceTexture = texture;
    this.faceMaterial = material;
    this.faceShell = shell;
  }

  private resolveFacePlacement(head: THREE.Bone, eyes: THREE.Object3D | null): {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    width: number;
    height: number;
  } {
    this.root.updateMatrixWorld(true);
    const headWorld = new THREE.Vector3();
    const headWorldScale = new THREE.Vector3();
    const headWorldQuaternion = new THREE.Quaternion();
    head.getWorldPosition(headWorld);
    head.getWorldScale(headWorldScale);
    head.getWorldQuaternion(headWorldQuaternion);

    const eyeBounds = eyes ? new THREE.Box3().setFromObject(eyes) : null;
    const eyeCenter = eyeBounds && !eyeBounds.isEmpty()
      ? eyeBounds.getCenter(new THREE.Vector3())
      : headWorld.clone().add(new THREE.Vector3(0, 0.045, -0.08));
    const eyeSize = eyeBounds && !eyeBounds.isEmpty()
      ? eyeBounds.getSize(new THREE.Vector3())
      : new THREE.Vector3(0.13, 0.05, 0.04);

    const forward = eyeCenter.clone().sub(headWorld);
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.normalize();

    const worldUp = new THREE.Vector3(0, 1, 0);
    let right = new THREE.Vector3().crossVectors(worldUp, forward);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(forward, right).normalize();

    const worldWidth = THREE.MathUtils.clamp(Math.max(eyeSize.x, eyeSize.z) * 1.75, 0.19, 0.27);
    const worldHeight = THREE.MathUtils.clamp(worldWidth * 1.24, 0.24, 0.34);
    const faceCenterWorld = eyeCenter.clone()
      .addScaledVector(forward, 0.014)
      .addScaledVector(up, -worldHeight * 0.2);

    const position = head.worldToLocal(faceCenterWorld.clone());
    const basis = new THREE.Matrix4().makeBasis(right, up, forward);
    const worldQuaternion = new THREE.Quaternion().setFromRotationMatrix(basis);
    const quaternion = headWorldQuaternion.clone().invert().multiply(worldQuaternion);
    const scaleX = Math.max(0.0001, Math.abs(headWorldScale.x));
    const scaleY = Math.max(0.0001, Math.abs(headWorldScale.y));

    return {
      position,
      quaternion,
      width: worldWidth / scaleX,
      height: worldHeight / scaleY
    };
  }

  private makeCurvedFaceGeometry(width: number, height: number): THREE.PlaneGeometry {
    const geometry = new THREE.PlaneGeometry(width, height, 10, 12);
    const positions = geometry.attributes.position;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const curve = width * 0.105;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i) / halfWidth;
      const y = positions.getY(i) / halfHeight;
      positions.setZ(i, -curve * (x * x + 0.18 * y * y));
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

  private makeMaskedFaceTexture(image: HTMLImageElement): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = FACE_TEXTURE_WIDTH;
    canvas.height = FACE_TEXTURE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable for face texture');

    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.drawImage(image, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);

    ctx.globalCompositeOperation = 'destination-in';
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(1, 1.18);
    const gradient = ctx.createRadialGradient(0, -14, canvas.width * 0.28, 0, -14, canvas.width * 0.49);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.72, 'rgba(255,255,255,0.98)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    return texture;
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Не удалось прочитать фотографию для 3D-героя'));
      image.src = dataUrl;
    });
  }

  private findBone(root: THREE.Object3D, name: string): THREE.Bone | null {
    let found: THREE.Bone | null = null;
    root.traverse((object) => {
      if (!found && object instanceof THREE.Bone && object.name.toLowerCase() === name.toLowerCase()) found = object;
    });
    return found;
  }

  private containsSkeleton(root: THREE.Object3D): boolean {
    let found = false;
    root.traverse((object) => {
      if (object instanceof THREE.SkinnedMesh || object instanceof THREE.Bone) found = true;
    });
    return found;
  }

  private prepareRenderable(root: THREE.Object3D): void {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = this.shadows;
      object.receiveShadow = true;
      object.frustumCulled = true;
      object.geometry.computeBoundingBox();
      object.geometry.computeBoundingSphere();
    });
  }

  private clearFaceShell(): void {
    this.faceShell?.removeFromParent();
    this.faceShell?.geometry.dispose();
    this.faceMaterial?.dispose();
    this.faceTexture?.dispose();
    this.faceShell = null;
    this.faceMaterial = null;
    this.faceTexture = null;
  }

  private clearModel(): void {
    this.clearFaceShell();
    this.mixer?.stopAllAction();
    if (this.model && this.mixer) this.mixer.uncacheRoot(this.model);
    this.mixer = null;
    this.actions.clear();
    this.clips.splice(0);
    this.activeState = null;
    this.headBone = null;
    this.eyes = null;
    this.loaded = false;
    this.root.visible = false;

    if (!this.model) return;
    this.disposeObjectResources(this.model);
    this.model.removeFromParent();
    this.model = null;
  }

  private disposeObjectResources(root: THREE.Object3D): void {
    const disposedMaterials = new Set<THREE.Material>();
    const disposedGeometries = new Set<THREE.BufferGeometry>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (!disposedGeometries.has(object.geometry)) {
        disposedGeometries.add(object.geometry);
        object.geometry.dispose();
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (disposedMaterials.has(material)) continue;
        disposedMaterials.add(material);
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        material.dispose();
      }
    });
  }
}

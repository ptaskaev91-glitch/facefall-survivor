import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { resolveLocomotionState, type LocomotionState } from './CharacterLocomotion';

export interface CharacterLoadResult {
  clipNames: string[];
  hasSkeleton: boolean;
  sourceHeight: number;
}

const TARGET_CHARACTER_HEIGHT = 1.82;

/**
 * Production-character boundary behind PlayerRuntime.
 *
 * Owns GLTF loading/cloning, scale normalization and AnimationMixer lifecycle.
 * It deliberately knows nothing about input, weapons, health or cameras.
 */
export class CharacterModel {
  readonly root = new THREE.Group();

  private readonly loader = new GLTFLoader();
  private readonly actions = new Map<LocomotionState, THREE.AnimationAction>();
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private activeState: LocomotionState | null = null;
  private generation = 0;
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

    const bounds = new THREE.Box3().setFromObject(instance);
    const sourceHeight = Math.max(0.001, bounds.max.y - bounds.min.y);
    const uniformScale = TARGET_CHARACTER_HEIGHT / sourceHeight;
    instance.scale.multiplyScalar(uniformScale);
    instance.updateMatrixWorld(true);

    const scaledBounds = new THREE.Box3().setFromObject(instance);
    instance.position.y -= scaledBounds.min.y;
    instance.updateMatrixWorld(true);

    this.model = instance;
    this.root.add(instance);
    this.mixer = new THREE.AnimationMixer(instance);
    this.bindLocomotionActions(gltf);
    this.loaded = true;
    this.setLocomotion('idle', true);

    return {
      clipNames: gltf.animations.map((clip) => clip.name),
      hasSkeleton: this.containsSkeleton(instance),
      sourceHeight
    };
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
    this.clearModel();
    this.root.removeFromParent();
  }

  private bindLocomotionActions(gltf: GLTF): void {
    this.actions.clear();
    if (!this.mixer) return;

    const find = (patterns: RegExp[]): THREE.AnimationClip | undefined =>
      gltf.animations.find((clip) => patterns.some((pattern) => pattern.test(clip.name)));

    const idle = find([/idle/i, /stand/i]) ?? gltf.animations[0];
    const walk = find([/walk/i]);
    const run = find([/run/i, /sprint/i, /jog/i]);

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

  private clearModel(): void {
    this.mixer?.stopAllAction();
    if (this.model && this.mixer) this.mixer.uncacheRoot(this.model);
    this.mixer = null;
    this.actions.clear();
    this.activeState = null;
    this.loaded = false;
    this.root.visible = false;

    if (!this.model) return;
    const disposedMaterials = new Set<THREE.Material>();
    const disposedGeometries = new Set<THREE.BufferGeometry>();
    this.model.traverse((object) => {
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
    this.model.removeFromParent();
    this.model = null;
  }
}

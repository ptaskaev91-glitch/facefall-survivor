import { Group, Mesh } from 'three';
import type { CollisionWorld } from '../physics/CollisionWorld';
import { AssetManager } from './AssetManager';
import { parseLevelManifest, type LevelManifest } from './LevelManifest';

export interface LevelLoadRequest {
  glbUrl: string;
  manifestUrl: string;
  shadows: boolean;
}

export interface LoadedLevel {
  root: Group;
  manifest: LevelManifest;
}

/**
 * GLB loading/traverse setup follows the same small MIT-licensed pattern used
 * in ivanoskov/shooter Game.ts, but is separated into a reusable Facefall
 * level service. See THIRD_PARTY_NOTICES.md.
 */
export class LevelLoader {
  constructor(
    private readonly assets: AssetManager,
    private readonly collisionWorld?: CollisionWorld
  ) {}

  async loadManifest(manifestUrl: string): Promise<LevelManifest> {
    const response = await fetch(manifestUrl, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Level manifest failed: ${response.status} ${response.statusText}`);
    }
    return parseLevelManifest(await response.json());
  }

  async load(request: LevelLoadRequest): Promise<LoadedLevel> {
    const [gltf, manifest] = await Promise.all([
      this.assets.loadGLB(request.glbUrl),
      this.loadManifest(request.manifestUrl)
    ]);

    const root = gltf.scene;
    AssetManager.prepareRenderable(root, request.shadows);
    root.name = root.name || 'authored-level-root';
    if (this.collisionWorld) {
      const collisionRoot = new Group();
      root.updateMatrixWorld(true);
      root.traverse((object) => {
        if (!(object instanceof Mesh) || object.name.startsWith('decor-')) return;
        const proxy = new Mesh(object.geometry);
        proxy.matrix.copy(object.matrixWorld);
        proxy.matrixAutoUpdate = false;
        collisionRoot.add(proxy);
      });
      this.collisionWorld.rebuild(collisionRoot);
    }

    return { root, manifest };
  }
}

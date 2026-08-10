import type { Group } from 'three';
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

  async load(request: LevelLoadRequest): Promise<LoadedLevel> {
    const [gltf, manifestResponse] = await Promise.all([
      this.assets.loadGLB(request.glbUrl),
      fetch(request.manifestUrl, { cache: 'no-cache' })
    ]);

    if (!manifestResponse.ok) {
      throw new Error(`Level manifest failed: ${manifestResponse.status} ${manifestResponse.statusText}`);
    }

    const manifest = parseLevelManifest(await manifestResponse.json());
    const root = gltf.scene;
    AssetManager.prepareRenderable(root, request.shadows);
    this.collisionWorld?.rebuild(root);

    return { root, manifest };
  }
}

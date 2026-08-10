import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

export class AssetManager {
  private readonly gltfLoader = new GLTFLoader();
  private readonly gltfCache = new Map<string, Promise<GLTF>>();

  loadGLB(url: string): Promise<GLTF> {
    const existing = this.gltfCache.get(url);
    if (existing) return existing;

    const pending = this.gltfLoader.loadAsync(url).catch((error) => {
      this.gltfCache.delete(url);
      throw error;
    });
    this.gltfCache.set(url, pending);
    return pending;
  }

  evict(url: string): void {
    this.gltfCache.delete(url);
  }

  clearCache(): void {
    this.gltfCache.clear();
  }

  static prepareRenderable(root: THREE.Object3D, shadows: boolean): void {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = shadows;
      object.receiveShadow = true;
      object.frustumCulled = true;
      object.geometry.computeBoundingBox();
      object.geometry.computeBoundingSphere();
    });
  }

  static disposeObject(root: THREE.Object3D): void {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        material.dispose();
      }
    });
  }
}

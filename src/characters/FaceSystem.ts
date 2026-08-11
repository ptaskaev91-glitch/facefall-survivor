import * as THREE from 'three';

/** Lightweight face integration for engine-next parity.
 * Final 0.85 Face System will replace this plane with fitted head integration.
 */
export class FaceSystem {
  private readonly root = new THREE.Group();
  private readonly geometry = new THREE.PlaneGeometry(0.54, 0.66);
  private readonly fallbackMaterial = new THREE.MeshStandardMaterial({
    color: 0xaab7a7,
    roughness: 0.82,
    side: THREE.DoubleSide
  });
  private readonly mesh = new THREE.Mesh(this.geometry, this.fallbackMaterial);
  private texture: THREE.Texture | null = null;
  private photoMaterial: THREE.MeshBasicMaterial | null = null;
  private generation = 0;

  constructor(parent: THREE.Object3D) {
    // Player model currently faces local -Z.
    this.root.position.set(0, 1.64, -0.39);
    this.root.rotation.y = Math.PI;
    this.mesh.renderOrder = 2;
    this.root.add(this.mesh);
    parent.add(this.root);
  }

  async setDataUrl(dataUrl: string | null): Promise<void> {
    const generation = ++this.generation;
    this.clearTexture();

    if (!dataUrl) {
      this.mesh.material = this.fallbackMaterial;
      return;
    }

    const texture = await this.loadTexture(dataUrl);
    if (generation !== this.generation) {
      texture.dispose();
      return;
    }

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    this.texture = texture;
    this.photoMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    this.mesh.material = this.photoMaterial;
  }

  dispose(): void {
    this.clearTexture();
    this.geometry.dispose();
    this.fallbackMaterial.dispose();
    this.root.removeFromParent();
  }

  private clearTexture(): void {
    this.texture?.dispose();
    this.texture = null;
    this.photoMaterial?.dispose();
    this.photoMaterial = null;
  }

  private loadTexture(dataUrl: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(new THREE.Texture(image));
      image.onerror = () => reject(new Error('Не удалось прочитать фотографию'));
      image.src = dataUrl;
    });
  }
}

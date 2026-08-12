import * as THREE from 'three';

/**
 * Functional low-poly player visual for engine-next.
 * The uploaded image is the front material of the actual head — never a floating plane/card.
 * Final character GLB/UV fitting will replace this procedural body during the visual vertical slice.
 */
export class FaceSystem {
  private readonly root = new THREE.Group();
  private readonly hiddenLegacyChildren: THREE.Object3D[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials = new Set<THREE.Material>();

  private readonly skinMaterial = this.material(0xb89a82, 0.86);
  private readonly jacketMaterial = this.material(0x58675b, 0.88);
  private readonly shirtMaterial = this.material(0x29342e, 0.9);
  private readonly pantsMaterial = this.material(0x202722, 0.94);
  private readonly bootMaterial = this.material(0x111512, 0.9);
  private readonly weaponMaterial = new THREE.MeshStandardMaterial({
    color: 0x151a18,
    roughness: 0.34,
    metalness: 0.72
  });
  private readonly fallbackFaceMaterial = this.material(0xb89a82, 0.82);

  private readonly headGeometry = this.geometry(new THREE.BoxGeometry(0.48, 0.52, 0.44, 1, 1, 1));
  private readonly headMaterials: THREE.Material[];
  private readonly head: THREE.Mesh;
  private texture: THREE.Texture | null = null;
  private photoMaterial: THREE.MeshStandardMaterial | null = null;
  private generation = 0;

  constructor(private readonly parent: THREE.Object3D) {
    this.materials.add(this.weaponMaterial);

    // Hide the old capsule/marker visual while preserving its gameplay/collision parent.
    for (const child of [...parent.children]) {
      child.visible = false;
      this.hiddenLegacyChildren.push(child);
    }

    this.root.name = 'facefall-lowpoly-player';
    this.root.rotation.y = 0;

    this.buildBody();

    // BoxGeometry material groups: +X, -X, +Y, -Y, +Z, -Z.
    // Player faces local -Z, so index 5 is the actual front of the head.
    this.headMaterials = [
      this.skinMaterial,
      this.skinMaterial,
      this.skinMaterial,
      this.skinMaterial,
      this.skinMaterial,
      this.fallbackFaceMaterial
    ];
    this.head = new THREE.Mesh(this.headGeometry, this.headMaterials);
    this.head.position.set(0, 1.72, -0.055);
    this.head.castShadow = true;
    this.head.name = 'player-head';
    this.root.add(this.head);

    parent.add(this.root);
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  async setDataUrl(dataUrl: string | null): Promise<void> {
    const generation = ++this.generation;
    this.clearTexture();

    if (!dataUrl) {
      this.headMaterials[5] = this.fallbackFaceMaterial;
      this.head.material = this.headMaterials;
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
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture = texture;

    this.photoMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0,
      color: 0xffffff,
      toneMapped: true
    });
    this.materials.add(this.photoMaterial);
    this.headMaterials[5] = this.photoMaterial;
    this.head.material = this.headMaterials;
  }

  dispose(): void {
    this.clearTexture();
    this.root.removeFromParent();
    for (const child of this.hiddenLegacyChildren) child.visible = true;
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
  }

  private buildBody(): void {
    const torso = this.box(0.72, 0.72, 0.36, this.jacketMaterial);
    torso.position.set(0, 1.12, 0.02);
    this.root.add(torso);

    const chest = this.box(0.58, 0.28, 0.38, this.shirtMaterial);
    chest.position.set(0, 1.34, -0.015);
    this.root.add(chest);

    const neck = this.cylinder(0.13, 0.13, 0.18, this.skinMaterial, 8);
    neck.position.set(0, 1.48, -0.015);
    this.root.add(neck);

    const hip = this.box(0.52, 0.22, 0.30, this.pantsMaterial);
    hip.position.set(0, 0.72, 0.03);
    this.root.add(hip);

    const leftLeg = this.box(0.22, 0.64, 0.25, this.pantsMaterial);
    leftLeg.position.set(-0.16, 0.36, 0.04);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.16;
    this.root.add(leftLeg, rightLeg);

    const leftBoot = this.box(0.25, 0.16, 0.38, this.bootMaterial);
    leftBoot.position.set(-0.16, 0.08, -0.055);
    const rightBoot = leftBoot.clone();
    rightBoot.position.x = 0.16;
    this.root.add(leftBoot, rightBoot);

    const armGeometry = this.geometry(new THREE.CylinderGeometry(0.11, 0.12, 0.66, 8));
    const leftArm = new THREE.Mesh(armGeometry, this.jacketMaterial);
    leftArm.position.set(-0.46, 1.13, -0.02);
    leftArm.rotation.z = -0.10;
    leftArm.rotation.x = -0.12;
    leftArm.castShadow = true;

    const rightArm = new THREE.Mesh(armGeometry, this.jacketMaterial);
    rightArm.position.set(0.46, 1.13, -0.08);
    rightArm.rotation.z = 0.10;
    rightArm.rotation.x = -0.32;
    rightArm.castShadow = true;
    this.root.add(leftArm, rightArm);

    const leftHand = this.box(0.18, 0.18, 0.18, this.skinMaterial);
    leftHand.position.set(-0.49, 0.81, -0.08);
    const rightHand = this.box(0.18, 0.18, 0.18, this.skinMaterial);
    rightHand.position.set(0.49, 0.82, -0.22);
    this.root.add(leftHand, rightHand);

    // Simple readable pistol silhouette attached to the right hand.
    const pistol = new THREE.Group();
    const slide = this.box(0.13, 0.13, 0.58, this.weaponMaterial);
    slide.position.set(0, 0, -0.24);
    const grip = this.box(0.12, 0.28, 0.14, this.weaponMaterial);
    grip.position.set(0, -0.15, -0.02);
    grip.rotation.x = -0.18;
    pistol.add(slide, grip);
    pistol.position.set(0.49, 0.89, -0.35);
    pistol.rotation.x = -0.04;
    this.root.add(pistol);
  }

  private box(width: number, height: number, depth: number, material: THREE.Material): THREE.Mesh {
    const geometry = this.geometry(new THREE.BoxGeometry(width, height, depth));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private cylinder(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    material: THREE.Material,
    segments: number
  ): THREE.Mesh {
    const geometry = this.geometry(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }

  private material(color: number, roughness: number): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    this.materials.add(material);
    return material;
  }

  private geometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private clearTexture(): void {
    this.texture?.dispose();
    this.texture = null;
    if (this.photoMaterial) {
      this.materials.delete(this.photoMaterial);
      this.photoMaterial.dispose();
      this.photoMaterial = null;
    }
    if (this.headMaterials) this.headMaterials[5] = this.fallbackFaceMaterial;
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

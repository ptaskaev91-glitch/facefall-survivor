import * as THREE from 'three';

/**
 * Lightweight production weapon visual driven by the animated right-hand socket.
 * Position follows the bone; weapon forward remains aligned with gameplay facing.
 */
export class WeaponSocketVisual {
  private characterRoot: THREE.Object3D | null = null;
  private hand: THREE.Bone | null = null;
  private socket: THREE.Group | null = null;
  private muzzle: THREE.Object3D | null = null;
  private readonly handWorldPosition = new THREE.Vector3();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(private readonly shadows: boolean) {}

  attach(characterRoot: THREE.Object3D, boneName = 'hand_r'): boolean {
    this.detach();
    characterRoot.updateWorldMatrix(true, true);

    const hand = characterRoot.getObjectByName(boneName);
    if (!(hand instanceof THREE.Bone)) return false;

    const socket = new THREE.Group();
    socket.name = 'weapon-socket-pistol';

    const darkMetal = this.material({ color: 0x171b19, roughness: 0.3, metalness: 0.78 });
    const gripMaterial = this.material({ color: 0x252a27, roughness: 0.72, metalness: 0.18 });
    const sightMaterial = this.material({ color: 0x0b0d0c, roughness: 0.45, metalness: 0.5 });

    // Compact service-pistol proportions: roughly 21 cm overall length.
    const slide = this.box(0.042, 0.036, 0.205, darkMetal);
    slide.position.set(0, 0.018, 0.105);

    const frame = this.box(0.038, 0.032, 0.125, darkMetal);
    frame.position.set(0, -0.008, 0.052);

    const barrel = new THREE.Mesh(
      this.geometry(new THREE.CylinderGeometry(0.009, 0.009, 0.135, 10)),
      darkMetal
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.017, 0.135);
    barrel.castShadow = this.shadows;

    const grip = this.box(0.039, 0.115, 0.052, gripMaterial);
    grip.position.set(0, -0.071, -0.005);
    grip.rotation.x = -0.18;

    const triggerGuard = new THREE.Mesh(
      this.geometry(new THREE.TorusGeometry(0.026, 0.006, 6, 12, Math.PI)),
      darkMetal
    );
    triggerGuard.rotation.x = Math.PI / 2;
    triggerGuard.position.set(0, -0.044, 0.045);
    triggerGuard.castShadow = this.shadows;

    const frontSight = this.box(0.009, 0.012, 0.013, sightMaterial);
    frontSight.position.set(0, 0.041, 0.194);

    const rearSight = this.box(0.028, 0.010, 0.011, sightMaterial);
    rearSight.position.set(0, 0.040, 0.020);

    socket.add(slide, frame, barrel, grip, triggerGuard, frontSight, rearSight);

    const muzzle = new THREE.Object3D();
    muzzle.name = 'weapon-muzzle';
    muzzle.position.set(0, 0.017, 0.218);
    socket.add(muzzle);

    // The wrapper has no normalization scale, so the pistol dimensions stay in metres.
    // Keeping the socket here also prevents wrist roll from turning the barrel sideways.
    characterRoot.add(socket);
    this.characterRoot = characterRoot;
    this.hand = hand;
    this.socket = socket;
    this.muzzle = muzzle;
    this.update();
    return true;
  }

  update(): void {
    if (!this.characterRoot || !this.hand || !this.socket) return;
    this.characterRoot.updateWorldMatrix(true, true);
    this.hand.getWorldPosition(this.handWorldPosition);
    this.socket.position.copy(this.characterRoot.worldToLocal(this.handWorldPosition));
    this.socket.quaternion.identity();
  }

  getMuzzleWorldPosition(out: THREE.Vector3): boolean {
    if (!this.muzzle) return false;
    this.muzzle.getWorldPosition(out);
    return true;
  }

  dispose(): void {
    this.detach();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometries.splice(0);
    this.materials.splice(0);
  }

  private detach(): void {
    this.socket?.removeFromParent();
    this.characterRoot = null;
    this.hand = null;
    this.socket = null;
    this.muzzle = null;
  }

  private box(
    width: number,
    height: number,
    depth: number,
    material: THREE.Material
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(width, height, depth)), material);
    mesh.castShadow = this.shadows;
    mesh.receiveShadow = false;
    return mesh;
  }

  private geometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private material(parameters: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial(parameters);
    this.materials.push(material);
    return material;
  }
}

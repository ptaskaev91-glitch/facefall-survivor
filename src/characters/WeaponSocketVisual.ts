import * as THREE from 'three';

/**
 * Lightweight production weapon visual bound to the animated character hand.
 * Gameplay weapon state remains owned by PlayerRuntime/WeaponController.
 */
export class WeaponSocketVisual {
  private socket: THREE.Group | null = null;
  private muzzle: THREE.Object3D | null = null;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(private readonly shadows: boolean) {}

  attach(characterRoot: THREE.Object3D, boneName = 'hand_r'): boolean {
    this.detach();
    characterRoot.updateWorldMatrix(true, true);

    const hand = characterRoot.getObjectByName(boneName);
    if (!(hand instanceof THREE.Bone)) return false;

    const handWorldQuaternion = new THREE.Quaternion();
    const characterWorldQuaternion = new THREE.Quaternion();
    const handWorldScale = new THREE.Vector3();
    hand.getWorldQuaternion(handWorldQuaternion);
    characterRoot.getWorldQuaternion(characterWorldQuaternion);
    hand.getWorldScale(handWorldScale);

    const socket = new THREE.Group();
    socket.name = 'weapon-socket-pistol';

    // Align the pistol's +Z with the character visual's forward axis in the sampled
    // idle pose, while preserving subsequent animated hand rotations.
    socket.quaternion.copy(handWorldQuaternion).invert().multiply(characterWorldQuaternion);

    // Bone descendants inherit the character's normalization scale. Cancel it so the
    // procedural pistol dimensions below remain stable world-space metres.
    socket.scale.set(
      1 / Math.max(0.0001, Math.abs(handWorldScale.x)),
      1 / Math.max(0.0001, Math.abs(handWorldScale.y)),
      1 / Math.max(0.0001, Math.abs(handWorldScale.z))
    );

    const darkMetal = this.material({ color: 0x171b19, roughness: 0.3, metalness: 0.78 });
    const gripMaterial = this.material({ color: 0x252a27, roughness: 0.72, metalness: 0.18 });
    const sightMaterial = this.material({ color: 0x0b0d0c, roughness: 0.45, metalness: 0.5 });

    const slide = this.box(0.115, 0.105, 0.43, darkMetal);
    slide.position.set(0, 0.035, 0.235);

    const frame = this.box(0.105, 0.085, 0.27, darkMetal);
    frame.position.set(0, -0.045, 0.115);

    const barrel = new THREE.Mesh(
      this.geometry(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 10)),
      darkMetal
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, 0.29);
    barrel.castShadow = this.shadows;

    const grip = this.box(0.105, 0.245, 0.115, gripMaterial);
    grip.position.set(0, -0.145, -0.005);
    grip.rotation.x = -0.18;

    const frontSight = this.box(0.022, 0.027, 0.035, sightMaterial);
    frontSight.position.set(0, 0.102, 0.415);

    const rearSight = this.box(0.07, 0.022, 0.026, sightMaterial);
    rearSight.position.set(0, 0.098, 0.055);

    socket.add(slide, frame, barrel, grip, frontSight, rearSight);

    const muzzle = new THREE.Object3D();
    muzzle.name = 'weapon-muzzle';
    muzzle.position.set(0, 0.04, 0.485);
    socket.add(muzzle);

    hand.add(socket);
    this.socket = socket;
    this.muzzle = muzzle;
    return true;
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

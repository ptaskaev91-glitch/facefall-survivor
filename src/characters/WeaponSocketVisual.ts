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

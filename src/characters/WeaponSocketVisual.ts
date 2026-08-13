import * as THREE from 'three';
import type { WeaponId } from '../combat/types';

/**
 * Production weapon presentation driven by the animated right-hand socket.
 * Position follows the hand bone; weapon forward remains aligned with gameplay facing
 * so authored wrist roll cannot turn long barrels sideways.
 */
export class WeaponSocketVisual {
  private characterRoot: THREE.Object3D | null = null;
  private hand: THREE.Bone | null = null;
  private socket: THREE.Group | null = null;
  private readonly weaponGroups = new Map<WeaponId, THREE.Group>();
  private readonly muzzles = new Map<WeaponId, THREE.Object3D>();
  private readonly handWorldPosition = new THREE.Vector3();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private activeWeapon: WeaponId = 'pistol';
  private enabled = false;

  constructor(private readonly shadows: boolean) {}

  attach(characterRoot: THREE.Object3D, boneName = 'hand_r'): boolean {
    this.detach();
    characterRoot.updateWorldMatrix(true, true);

    const hand = characterRoot.getObjectByName(boneName);
    if (!(hand instanceof THREE.Bone)) return false;

    const socket = new THREE.Group();
    socket.name = 'weapon-socket-production';

    const pistol = this.buildPistol();
    const shotgun = this.buildShotgun();
    socket.add(pistol.group, shotgun.group);
    this.weaponGroups.set('pistol', pistol.group);
    this.weaponGroups.set('shotgun', shotgun.group);
    this.muzzles.set('pistol', pistol.muzzle);
    this.muzzles.set('shotgun', shotgun.muzzle);

    characterRoot.add(socket);
    this.characterRoot = characterRoot;
    this.hand = hand;
    this.socket = socket;
    this.updateVisibility();
    this.update();
    return true;
  }

  setActiveWeapon(weaponId: WeaponId): void {
    this.activeWeapon = weaponId;
    this.updateVisibility();
  }

  update(): void {
    if (!this.characterRoot || !this.hand || !this.socket || !this.enabled) return;
    this.characterRoot.updateWorldMatrix(true, true);
    this.hand.getWorldPosition(this.handWorldPosition);
    this.socket.position.copy(this.characterRoot.worldToLocal(this.handWorldPosition));
    this.socket.quaternion.identity();
  }

  setVisible(visible: boolean): void {
    this.enabled = visible;
    this.updateVisibility();
  }

  getMuzzleWorldPosition(out: THREE.Vector3): boolean {
    if (!this.enabled) return false;
    const muzzle = this.muzzles.get(this.activeWeapon);
    if (!muzzle) return false;
    muzzle.getWorldPosition(out);
    return true;
  }

  dispose(): void {
    this.detach();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometries.splice(0);
    this.materials.splice(0);
  }

  private buildPistol(): { group: THREE.Group; muzzle: THREE.Object3D } {
    const group = new THREE.Group();
    group.name = 'weapon-pistol';

    const darkMetal = this.material({ color: 0x171b19, roughness: 0.3, metalness: 0.78 });
    const gripMaterial = this.material({ color: 0x252a27, roughness: 0.72, metalness: 0.18 });
    const sightMaterial = this.material({ color: 0x0b0d0c, roughness: 0.45, metalness: 0.5 });

    const slide = this.box(0.042, 0.036, 0.205, darkMetal);
    slide.position.set(0, 0.018, 0.105);
    const frame = this.box(0.038, 0.032, 0.125, darkMetal);
    frame.position.set(0, -0.008, 0.052);
    const barrel = this.cylinder(0.009, 0.135, darkMetal, 10);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.017, 0.135);
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
    group.add(slide, frame, barrel, grip, triggerGuard, frontSight, rearSight);

    const muzzle = new THREE.Object3D();
    muzzle.name = 'weapon-muzzle-pistol';
    muzzle.position.set(0, 0.017, 0.218);
    group.add(muzzle);
    return { group, muzzle };
  }

  private buildShotgun(): { group: THREE.Group; muzzle: THREE.Object3D } {
    const group = new THREE.Group();
    group.name = 'weapon-shotgun';

    const steel = this.material({ color: 0x202522, roughness: 0.34, metalness: 0.72 });
    const parkerized = this.material({ color: 0x121614, roughness: 0.48, metalness: 0.58 });
    const polymer = this.material({ color: 0x232824, roughness: 0.82, metalness: 0.08 });
    const wood = this.material({ color: 0x4b2e1d, roughness: 0.72, metalness: 0.02 });
    const bead = this.material({ color: 0xb3aa86, roughness: 0.35, metalness: 0.55 });

    // Pump-action proportions: ~98 cm overall. The animated hand sits near the
    // pistol grip/receiver while the barrel extends along Facefall local +Z.
    const receiver = this.box(0.074, 0.092, 0.285, steel);
    receiver.position.set(0, 0.005, 0.105);

    const barrel = this.cylinder(0.017, 0.605, parkerized, 12);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.044, 0.535);

    const magazineTube = this.cylinder(0.014, 0.49, parkerized, 10);
    magazineTube.rotation.x = Math.PI / 2;
    magazineTube.position.set(0, -0.005, 0.455);

    const pump = this.box(0.068, 0.082, 0.185, polymer);
    pump.position.set(0, -0.006, 0.385);
    for (const x of [-0.024, -0.012, 0, 0.012, 0.024]) {
      const rib = this.box(0.004, 0.086, 0.172, polymer);
      rib.position.set(x, -0.006, 0.385);
      group.add(rib);
    }

    const pistolGrip = this.box(0.058, 0.145, 0.085, polymer);
    pistolGrip.position.set(0, -0.092, -0.035);
    pistolGrip.rotation.x = -0.22;

    const stock = this.box(0.078, 0.105, 0.34, wood);
    stock.position.set(0, -0.006, -0.245);
    stock.rotation.x = -0.035;

    const buttPad = this.box(0.085, 0.118, 0.025, polymer);
    buttPad.position.set(0, -0.012, -0.425);

    const beadSight = this.box(0.012, 0.014, 0.012, bead);
    beadSight.position.set(0, 0.067, 0.827);

    group.add(receiver, barrel, magazineTube, pump, pistolGrip, stock, buttPad, beadSight);

    const muzzle = new THREE.Object3D();
    muzzle.name = 'weapon-muzzle-shotgun';
    muzzle.position.set(0, 0.044, 0.842);
    group.add(muzzle);
    return { group, muzzle };
  }

  private updateVisibility(): void {
    if (this.socket) this.socket.visible = this.enabled && this.weaponGroups.has(this.activeWeapon);
    for (const [weaponId, group] of this.weaponGroups) {
      group.visible = this.enabled && weaponId === this.activeWeapon;
    }
  }

  private detach(): void {
    this.socket?.removeFromParent();
    this.characterRoot = null;
    this.hand = null;
    this.socket = null;
    this.weaponGroups.clear();
    this.muzzles.clear();
  }

  private box(width: number, height: number, depth: number, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(width, height, depth)), material);
    mesh.castShadow = this.shadows;
    mesh.receiveShadow = false;
    return mesh;
  }

  private cylinder(radius: number, length: number, material: THREE.Material, segments: number): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.geometry(new THREE.CylinderGeometry(radius, radius, length, segments)),
      material
    );
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

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { WeaponId } from '../combat/types';

/**
 * Production weapon presentation driven by animated hand sockets.
 * Firearms follow the right hand, while the bow follows the left hand.
 * Weapon forward stays aligned with gameplay facing so authored wrist roll
 * cannot turn barrels or the arrow trajectory sideways.
 */
export class WeaponSocketVisual {
  private readonly loader = new GLTFLoader();
  private characterRoot: THREE.Object3D | null = null;
  private rightHand: THREE.Bone | null = null;
  private leftHand: THREE.Bone | null = null;
  private socket: THREE.Group | null = null;
  private readonly weaponGroups = new Map<WeaponId, THREE.Group>();
  private readonly muzzles = new Map<WeaponId, THREE.Object3D>();
  private readonly handWorldPosition = new THREE.Vector3();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private activeWeapon: WeaponId = 'pistol';
  private enabled = false;
  private assetGeneration = 0;

  private bowStringGeometry: THREE.BufferGeometry | null = null;
  private bowArrow: THREE.Group | null = null;
  private bowDraw = 1;
  private bowDrawTarget = 1;
  private bowArrowVisible = true;

  constructor(private readonly shadows: boolean) {}

  attach(characterRoot: THREE.Object3D, boneName = 'hand_r'): boolean {
    this.detach();
    characterRoot.updateWorldMatrix(true, true);

    const rightHand = characterRoot.getObjectByName(boneName);
    if (!(rightHand instanceof THREE.Bone)) return false;
    const left = characterRoot.getObjectByName('hand_l');

    const socket = new THREE.Group();
    socket.name = 'weapon-socket-production';

    const pistol = this.buildPistol();
    const shotgun = this.buildShotgun();
    const bow = this.buildBow();
    socket.add(pistol.group, shotgun.group, bow.group);
    this.weaponGroups.set('pistol', pistol.group);
    this.weaponGroups.set('shotgun', shotgun.group);
    this.weaponGroups.set('bow', bow.group);
    this.muzzles.set('pistol', pistol.muzzle);
    this.muzzles.set('shotgun', shotgun.muzzle);
    this.muzzles.set('bow', bow.muzzle);

    characterRoot.add(socket);
    this.characterRoot = characterRoot;
    this.rightHand = rightHand;
    this.leftHand = left instanceof THREE.Bone ? left : rightHand;
    this.socket = socket;
    this.updateBowGeometry();
    this.updateVisibility();
    this.update(0);
    const generation = ++this.assetGeneration;
    void this.hydrateWeaponGlb('shotgun', '/assets/weapons/shotgun.glb', generation);
    void this.hydrateWeaponGlb('bow', '/assets/weapons/bow-arrow.glb', generation);
    return true;
  }

  setActiveWeapon(weaponId: WeaponId): void {
    this.activeWeapon = weaponId;
    if (weaponId === 'bow' && this.bowDrawTarget >= 1) {
      this.bowDraw = 1;
      this.bowArrowVisible = true;
      this.updateBowGeometry();
    }
    this.updateVisibility();
  }

  playBowRelease(): boolean {
    if (this.activeWeapon !== 'bow' || !this.bowArrow) return false;
    this.bowDraw = 0;
    this.bowDrawTarget = 0;
    this.bowArrowVisible = false;
    this.updateBowGeometry();
    return true;
  }

  playBowReload(): boolean {
    if (!this.bowArrow) return false;
    this.bowDraw = 0;
    this.bowDrawTarget = 1;
    this.bowArrowVisible = true;
    this.updateBowGeometry();
    return true;
  }

  update(dt = 0): void {
    if (!this.characterRoot || !this.socket || !this.enabled) return;
    const hand = this.activeWeapon === 'bow' ? this.leftHand : this.rightHand;
    if (!hand) return;

    this.characterRoot.updateWorldMatrix(true, true);
    hand.getWorldPosition(this.handWorldPosition);
    this.socket.position.copy(this.characterRoot.worldToLocal(this.handWorldPosition));
    this.socket.quaternion.identity();

    if (this.bowDraw !== this.bowDrawTarget) {
      const speed = 3.6;
      const delta = Math.max(0, dt) * speed;
      if (this.bowDraw < this.bowDrawTarget) this.bowDraw = Math.min(this.bowDrawTarget, this.bowDraw + delta);
      else this.bowDraw = Math.max(this.bowDrawTarget, this.bowDraw - delta);
      this.updateBowGeometry();
    }
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
    const fallback = new THREE.Group();
    fallback.name = 'weapon-shotgun-procedural-fallback';

    const steel = this.material({ color: 0x202522, roughness: 0.34, metalness: 0.72 });
    const parkerized = this.material({ color: 0x121614, roughness: 0.48, metalness: 0.58 });
    const polymer = this.material({ color: 0x232824, roughness: 0.82, metalness: 0.08 });
    const wood = this.material({ color: 0x4b2e1d, roughness: 0.72, metalness: 0.02 });
    const bead = this.material({ color: 0xb3aa86, roughness: 0.35, metalness: 0.55 });

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
    fallback.add(receiver, barrel, magazineTube, pump, pistolGrip, stock, buttPad, beadSight);
    group.add(fallback);

    const muzzle = new THREE.Object3D();
    muzzle.name = 'weapon-muzzle-shotgun';
    muzzle.position.set(0, 0.044, 0.842);
    group.add(muzzle);
    return { group, muzzle };
  }

  private buildBow(): { group: THREE.Group; muzzle: THREE.Object3D } {
    const group = new THREE.Group();
    group.name = 'weapon-bow';
    const fallback = new THREE.Group();
    fallback.name = 'weapon-bow-procedural-fallback';
    // Keep the bow just forward of the left palm and vertically oriented.
    group.position.set(-0.035, 0.01, 0.05);

    const riserMaterial = this.material({ color: 0x443122, roughness: 0.68, metalness: 0.04 });
    const limbMaterial = this.material({ color: 0x181d1a, roughness: 0.52, metalness: 0.2 });
    const stringMaterial = this.lineMaterial({ color: 0xc9c4ad });
    const shaftMaterial = this.material({ color: 0x5f4931, roughness: 0.78, metalness: 0 });
    const pointMaterial = this.material({ color: 0x777d78, roughness: 0.28, metalness: 0.72 });
    const fletchingMaterial = this.material({ color: 0x6e2f25, roughness: 0.92, metalness: 0 });

    const riser = this.box(0.045, 0.29, 0.052, riserMaterial);
    riser.position.z = 0.012;
    const grip = this.box(0.058, 0.12, 0.068, riserMaterial);
    grip.position.z = -0.012;

    const upperCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0.13, 0.02),
      new THREE.Vector3(0, 0.43, 0.115),
      new THREE.Vector3(0, 0.70, 0.065)
    );
    const lowerCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, -0.13, 0.02),
      new THREE.Vector3(0, -0.43, 0.115),
      new THREE.Vector3(0, -0.70, 0.065)
    );
    const upperLimb = new THREE.Mesh(this.geometry(new THREE.TubeGeometry(upperCurve, 14, 0.014, 6, false)), limbMaterial);
    const lowerLimb = new THREE.Mesh(this.geometry(new THREE.TubeGeometry(lowerCurve, 14, 0.014, 6, false)), limbMaterial);
    upperLimb.castShadow = this.shadows;
    lowerLimb.castShadow = this.shadows;

    const stringGeometry = this.geometry(new THREE.BufferGeometry());
    stringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
    const bowString = new THREE.Line(stringGeometry, stringMaterial);
    bowString.name = 'bow-string';
    this.bowStringGeometry = stringGeometry;

    const arrow = new THREE.Group();
    arrow.name = 'bow-nocked-arrow';
    const shaft = this.cylinder(0.006, 0.82, shaftMaterial, 8);
    shaft.rotation.x = Math.PI / 2;
    const point = new THREE.Mesh(this.geometry(new THREE.ConeGeometry(0.015, 0.045, 8)), pointMaterial);
    point.rotation.x = Math.PI / 2;
    point.position.z = 0.432;
    point.castShadow = this.shadows;
    const fletchingA = this.box(0.035, 0.026, 0.075, fletchingMaterial);
    fletchingA.position.z = -0.345;
    const fletchingB = this.box(0.026, 0.035, 0.075, fletchingMaterial);
    fletchingB.position.z = -0.345;
    arrow.add(shaft, point, fletchingA, fletchingB);
    this.bowArrow = arrow;

    fallback.add(riser, grip, upperLimb, lowerLimb, arrow);
    group.add(fallback, bowString);

    const muzzle = new THREE.Object3D();
    muzzle.name = 'weapon-muzzle-bow';
    muzzle.position.set(0, 0, 0.54);
    group.add(muzzle);
    return { group, muzzle };
  }

  private async hydrateWeaponGlb(weaponId: 'shotgun' | 'bow', url: string, generation: number): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(url);
      if (generation !== this.assetGeneration) {
        this.disposeLoadedObject(gltf.scene);
        return;
      }
      const group = this.weaponGroups.get(weaponId);
      if (!group) {
        this.disposeLoadedObject(gltf.scene);
        return;
      }
      gltf.scene.name = `weapon-${weaponId}-glb-visual`;
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = this.shadows;
        object.receiveShadow = false;
        this.geometries.push(object.geometry);
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        this.materials.push(...materials);
      });
      group.add(gltf.scene);
      const fallback = group.getObjectByName(`weapon-${weaponId}-procedural-fallback`);
      if (fallback) fallback.visible = false;
      if (weaponId === 'bow') {
        const arrow = gltf.scene.getObjectByName('bow-arrow-glb');
        if (arrow instanceof THREE.Group) this.bowArrow = arrow;
        this.updateBowGeometry();
      }
    } catch (error) {
      console.warn(`[Facefall] ${weaponId} GLB unavailable; keeping procedural fallback.`, error);
    }
  }

  private disposeLoadedObject(root: THREE.Object3D): void {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
  }

  private updateBowGeometry(): void {
    if (!this.bowStringGeometry || !this.bowArrow) return;
    const drawZ = -0.34 * THREE.MathUtils.clamp(this.bowDraw, 0, 1);
    const positions = this.bowStringGeometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, 0, 0.70, 0.065);
    positions.setXYZ(1, 0, 0, drawZ);
    positions.setXYZ(2, 0, -0.70, 0.065);
    positions.needsUpdate = true;
    this.bowStringGeometry.computeBoundingSphere();

    this.bowArrow.position.z = drawZ + 0.34;
    this.bowArrow.visible = this.bowArrowVisible;
  }

  private updateVisibility(): void {
    if (this.socket) this.socket.visible = this.enabled && this.weaponGroups.has(this.activeWeapon);
    for (const [weaponId, group] of this.weaponGroups) {
      group.visible = this.enabled && weaponId === this.activeWeapon;
    }
  }

  private detach(): void {
    this.assetGeneration += 1;
    this.socket?.removeFromParent();
    this.characterRoot = null;
    this.rightHand = null;
    this.leftHand = null;
    this.socket = null;
    this.weaponGroups.clear();
    this.muzzles.clear();
    this.bowStringGeometry = null;
    this.bowArrow = null;
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

  private lineMaterial(parameters: THREE.LineBasicMaterialParameters): THREE.LineBasicMaterial {
    const material = new THREE.LineBasicMaterial(parameters);
    this.materials.push(material);
    return material;
  }
}

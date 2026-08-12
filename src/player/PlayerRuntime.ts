import * as THREE from 'three';
import { CharacterModel, type CharacterLoadResult } from '../characters/CharacterModel';
import { FaceSystem } from '../characters/FaceSystem';
import type { QualityProfile } from '../graphics/quality';
import { CollisionWorld } from '../physics/CollisionWorld';
import { PlayerCapsule } from '../physics/PlayerCapsule';
import type { LevelMarker } from '../world/LevelManifest';

export interface PlayerMovementResult {
  targetSpeed: number;
  movementSpreadMultiplier: number;
}

/** Owns player transform, collider, visual and face lifecycle. */
export class PlayerRuntime {
  readonly root = new THREE.Group();
  readonly controller = new PlayerCapsule();
  readonly facing = new THREE.Vector3(0, 0, -1);

  private readonly faceSystem: FaceSystem;
  private readonly characterModel: CharacterModel;
  private readonly desired = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly muzzleOffset = new THREE.Vector3(0, 1.15, 0);
  private productionVisualActive = false;

  constructor(scene: THREE.Scene, quality: QualityProfile) {
    const marker = this.makeCapsuleMarker(0.36, 0.85, 0x8d9c8d, quality.shadows);
    const weaponMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.1, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x1f2421, roughness: 0.32, metalness: 0.65 })
    );
    weaponMesh.position.set(0.32, 1.18, -0.52);
    marker.add(weaponMesh);
    this.root.add(marker);
    scene.add(this.root);

    // FaceSystem remains the production-safe visual until a GLB head is verified
    // to preserve the user's uploaded-face hook during the vertical-slice migration.
    this.faceSystem = new FaceSystem(this.root);
    this.characterModel = new CharacterModel(quality.shadows);
    this.root.add(this.characterModel.root);
  }

  get position(): THREE.Vector3 { return this.root.position; }
  get hasProductionCharacter(): boolean { return this.characterModel.isLoaded; }

  async setFaceDataUrl(dataUrl: string | null): Promise<void> { await this.faceSystem.setDataUrl(dataUrl); }

  /**
   * Loads a rigged GLTF/GLB behind the player runtime boundary.
   * The caller must opt into visual activation after face/head compatibility is verified.
   */
  async loadProductionCharacter(url: string, activate = false): Promise<CharacterLoadResult> {
    const result = await this.characterModel.load(url);
    this.setProductionVisualActive(activate);
    return result;
  }

  setProductionVisualActive(active: boolean): void {
    this.productionVisualActive = active && this.characterModel.isLoaded;
    this.characterModel.setVisible(this.productionVisualActive);
    this.faceSystem.setVisible(!this.productionVisualActive);
  }

  move(moveX: number, moveY: number, sprint: boolean, dt: number, collisionWorld: CollisionWorld): PlayerMovementResult {
    this.desired.set(moveX, 0, moveY);
    const moveAmount = Math.min(1, this.desired.length());
    const movementSpreadMultiplier = 1 + moveAmount * (sprint ? 1.35 : 0.55);
    const targetSpeed = this.desired.lengthSq() > 0 ? (sprint ? 7.1 : 5.0) : 0;
    if (this.desired.lengthSq() > 0) this.desired.normalize();
    this.velocity.copy(this.desired).multiplyScalar(targetSpeed);
    this.controller.moveToward(this.velocity, dt);
    this.controller.integrate(dt, collisionWorld);
    this.root.position.set(this.controller.position.x, this.controller.position.y - 0.35, this.controller.position.z);
    this.root.rotation.y = Math.atan2(-this.facing.x, -this.facing.z);
    this.characterModel.update(dt, targetSpeed);
    return { targetSpeed, movementSpreadMultiplier };
  }

  reset(spawnMarker: LevelMarker | undefined, _compatCameraMode?: unknown): void {
    const spawn = spawnMarker?.position ?? { x: 0, y: 0, z: 10 };
    this.controller.teleport(new THREE.Vector3(spawn.x, spawn.y + 0.35, spawn.z));
    if (typeof spawnMarker?.rotationY === 'number') {
      this.facing.set(-Math.sin(spawnMarker.rotationY), 0, -Math.cos(spawnMarker.rotationY)).normalize();
    } else {
      this.facing.set(0, 0, -1);
    }
    this.root.position.set(spawn.x, spawn.y, spawn.z);
    this.root.rotation.y = Math.atan2(-this.facing.x, -this.facing.z);
  }

  muzzle(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.root.position).add(this.muzzleOffset).addScaledVector(this.facing, 0.5);
  }

  dispose(): void {
    this.characterModel.dispose();
    this.faceSystem.dispose();
    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
    this.root.removeFromParent();
  }

  private makeCapsuleMarker(radius: number, bodyLength: number, color: number, shadows: boolean): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, bodyLength, 10), material);
    cylinder.position.y = bodyLength / 2 + radius;
    const lower = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material);
    lower.position.y = radius;
    const upper = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material);
    upper.position.y = bodyLength + radius;
    for (const mesh of [cylinder, lower, upper]) mesh.castShadow = shadows;
    group.add(cylinder, lower, upper);
    return group;
  }
}

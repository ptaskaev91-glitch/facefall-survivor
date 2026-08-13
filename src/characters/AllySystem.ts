import * as THREE from 'three';
import type { FacefallEvents } from '../combat/types';
import type { EventBus } from '../core/EventBus';
import { FaceSystem } from './FaceSystem';

export type AllyId = 'supermama' | 'superpapa';

interface AllyActor {
  id: AllyId;
  root: THREE.Group;
  face: FaceSystem;
  unlocked: boolean;
  fireCooldown: number;
  side: number;
}

export interface AllyFaces {
  supermama?: string | null;
  superpapa?: string | null;
}

/** Lightweight family companions: follow Super Makar and provide automatic covering fire. */
export class AllySystem {
  private readonly actors = new Map<AllyId, AllyActor>();
  private readonly temp = new THREE.Vector3();
  private readonly targetPosition = new THREE.Vector3();
  private readonly muzzle = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene, private readonly events: EventBus<FacefallEvents>) {
    this.actors.set('supermama', this.createActor('supermama', -1));
    this.actors.set('superpapa', this.createActor('superpapa', 1));
  }

  async setFaces(faces: AllyFaces): Promise<void> {
    await Promise.all([
      this.actors.get('supermama')?.face.setDataUrl(faces.supermama ?? null),
      this.actors.get('superpapa')?.face.setDataUrl(faces.superpapa ?? null)
    ]);
  }

  reset(): void {
    for (const actor of this.actors.values()) {
      actor.unlocked = false;
      actor.fireCooldown = 0;
      actor.root.visible = false;
    }
  }

  unlock(id: AllyId): boolean {
    const actor = this.actors.get(id);
    if (!actor || actor.unlocked) return false;
    actor.unlocked = true;
    actor.root.visible = true;
    return true;
  }

  get activeCount(): number {
    let count = 0;
    for (const actor of this.actors.values()) if (actor.unlocked) count++;
    return count;
  }

  update(dt: number, playerPosition: THREE.Vector3, playerFacing: THREE.Vector3, enemyTargets: readonly THREE.Object3D[]): void {
    const right = this.temp.set(playerFacing.z, 0, -playerFacing.x);
    if (right.lengthSq() < 1e-5) right.set(1, 0, 0);
    else right.normalize();

    for (const actor of this.actors.values()) {
      if (!actor.unlocked) continue;
      const backDistance = actor.id === 'supermama' ? 1.5 : 1.9;
      const sideDistance = actor.id === 'supermama' ? 1.15 : 1.35;
      this.targetPosition.copy(playerPosition)
        .addScaledVector(playerFacing, -backDistance)
        .addScaledVector(right, actor.side * sideDistance);
      actor.root.position.lerp(this.targetPosition, 1 - Math.exp(-dt * 7));

      const target = this.findNearest(actor.root.position, enemyTargets);
      if (target) {
        this.direction.copy(target.position).sub(actor.root.position);
        this.direction.y = 0;
        if (this.direction.lengthSq() > 1e-5) {
          this.direction.normalize();
          actor.root.rotation.y = Math.atan2(-this.direction.x, -this.direction.z);
        }
      } else {
        actor.root.rotation.y = Math.atan2(-playerFacing.x, -playerFacing.z);
      }

      actor.fireCooldown = Math.max(0, actor.fireCooldown - dt);
      if (!target || actor.fireCooldown > 0) continue;
      actor.fireCooldown = actor.id === 'supermama' ? 0.72 : 0.58;
      this.muzzle.copy(actor.root.position).add(new THREE.Vector3(0, 1.0, 0));
      this.direction.copy(target.position).add(new THREE.Vector3(0, 0.9, 0)).sub(this.muzzle).normalize();
      this.events.emit('shot', {
        weaponId: 'pistol',
        sourceId: actor.id,
        origin: this.muzzle.clone(),
        direction: this.direction.clone()
      });
    }
  }

  dispose(): void {
    for (const actor of this.actors.values()) {
      actor.face.dispose();
      actor.root.removeFromParent();
    }
    this.actors.clear();
  }

  private createActor(id: AllyId, side: number): AllyActor {
    const root = new THREE.Group();
    root.name = id;
    root.visible = false;
    this.scene.add(root);
    const face = new FaceSystem(root);
    return { id, root, face, unlocked: false, fireCooldown: 0, side };
  }

  private findNearest(origin: THREE.Vector3, targets: readonly THREE.Object3D[]): THREE.Object3D | null {
    let best: THREE.Object3D | null = null;
    let bestDistance = 22 * 22;
    for (const target of targets) {
      if (!target.visible || !target.userData.damageTargetId) continue;
      const distance = origin.distanceToSquared(target.position);
      if (distance >= bestDistance) continue;
      bestDistance = distance;
      best = target;
    }
    return best;
  }
}

import * as THREE from 'three';
import type { LevelMarker } from '../world/LevelManifest';

export type PickupKind = 'health' | 'ammo';

interface PickupActor {
  id: string;
  kind: PickupKind;
  amount: number;
  root: THREE.Group;
  active: boolean;
  respawn: number;
}

export interface PickupCallbacks {
  heal(amount: number): boolean;
  ammo(amount: number): boolean;
  collected?(kind: PickupKind, amount: number): void;
}

export class PickupSystem {
  private readonly actors: PickupActor[] = [];
  private readonly temp = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene, private readonly callbacks: PickupCallbacks) {}

  configure(markers: readonly LevelMarker[]): void {
    this.disposeActors();
    for (const marker of markers) {
      if (marker.kind !== 'loot') continue;
      const kind = marker.data?.type === 'health' ? 'health' : marker.data?.type === 'ammo' ? 'ammo' : null;
      if (!kind) continue;
      const amount = typeof marker.data?.amount === 'number'
        ? Math.max(1, marker.data.amount)
        : kind === 'health' ? 35 : 24;
      const root = this.createVisual(kind);
      root.position.set(marker.position.x, marker.position.y + 0.45, marker.position.z);
      this.scene.add(root);
      this.actors.push({ id: marker.id, kind, amount, root, active: true, respawn: 0 });
    }
  }

  reset(): void {
    for (const actor of this.actors) {
      actor.active = true;
      actor.respawn = 0;
      actor.root.visible = true;
    }
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    for (const actor of this.actors) {
      actor.root.rotation.y += dt * 1.6;
      actor.root.position.y += Math.sin(performance.now() * 0.002 + actor.root.position.x) * dt * 0.035;

      if (!actor.active) {
        actor.respawn -= dt;
        if (actor.respawn <= 0) {
          actor.active = true;
          actor.root.visible = true;
        }
        continue;
      }

      this.temp.copy(actor.root.position).sub(playerPosition);
      this.temp.y = 0;
      if (this.temp.lengthSq() > 1.25 * 1.25) continue;

      const consumed = actor.kind === 'health'
        ? this.callbacks.heal(actor.amount)
        : this.callbacks.ammo(actor.amount);
      if (!consumed) continue;

      actor.active = false;
      actor.root.visible = false;
      actor.respawn = 18;
      this.callbacks.collected?.(actor.kind, actor.amount);
    }
  }

  dispose(): void {
    this.disposeActors();
  }

  get activeCount(): number {
    return this.actors.filter((actor) => actor.active).length;
  }

  private createVisual(kind: PickupKind): THREE.Group {
    const group = new THREE.Group();
    const color = kind === 'health' ? 0x9ee56f : 0xdac36d;
    const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.22, roughness: 0.55 });

    if (kind === 'health') {
      const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), material);
      const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.18), material);
      group.add(vertical, horizontal);
    } else {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.32, 0.42), material);
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.36, 0.46),
        new THREE.MeshStandardMaterial({ color: 0x28291f, roughness: 0.72 })
      );
      group.add(box, band);
    }

    return group;
  }

  private disposeActors(): void {
    for (const actor of this.actors) {
      actor.root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      });
      actor.root.removeFromParent();
    }
    this.actors.length = 0;
  }
}

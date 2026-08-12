import * as THREE from 'three';
import type { WeaponId } from './types';

interface BulletVisual {
  mesh: THREE.Mesh;
  active: boolean;
  age: number;
  lifetime: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
}

/**
 * Visual-only bullet flight for hitscan weapons.
 * Damage remains immediate/responsive, but a tiny physical round travels from muzzle to resolved impact.
 */
export class HitscanVisuals {
  private readonly pool: BulletVisual[] = [];
  private readonly direction = new THREE.Vector3();
  private readonly position = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene, private readonly capacity = 72) {}

  spawn(weaponId: WeaponId, from: THREE.Vector3, to: THREE.Vector3): void {
    let visual = this.pool.find((entry) => !entry.active);
    if (!visual && this.pool.length < this.capacity) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6),
        new THREE.MeshStandardMaterial({
          color: 0xe7c46a,
          emissive: 0x6b531c,
          emissiveIntensity: 0.7,
          roughness: 0.32,
          metalness: 0.74
        })
      );
      mesh.visible = false;
      mesh.renderOrder = 3;
      this.scene.add(mesh);
      visual = {
        mesh,
        active: false,
        age: 0,
        lifetime: 0.05,
        from: new THREE.Vector3(),
        to: new THREE.Vector3()
      };
      this.pool.push(visual);
    }
    if (!visual) return;

    const distance = Math.max(0.01, from.distanceTo(to));
    visual.from.copy(from);
    visual.to.copy(to);
    visual.age = 0;
    // Keep flight readable on mobile while still feeling fast.
    visual.lifetime = THREE.MathUtils.clamp(distance / (weaponId === 'shotgun' ? 115 : 135), 0.035, 0.095);
    visual.active = true;
    visual.mesh.visible = true;
    visual.mesh.scale.setScalar(weaponId === 'shotgun' ? 0.85 : 1);

    this.direction.copy(to).sub(from).normalize();
    visual.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.direction);
    visual.mesh.position.copy(from);
  }

  update(dt: number): void {
    for (const visual of this.pool) {
      if (!visual.active) continue;
      visual.age += dt;
      const t = Math.min(1, visual.age / visual.lifetime);
      // Slight ease-out keeps the final few milliseconds readable near the target.
      const eased = 1 - Math.pow(1 - t, 1.35);
      visual.mesh.position.copy(visual.from).lerp(visual.to, eased);
      if (t >= 1) {
        visual.active = false;
        visual.mesh.visible = false;
      }
    }
  }

  reset(): void {
    for (const visual of this.pool) {
      visual.active = false;
      visual.mesh.visible = false;
      visual.age = 0;
    }
  }

  dispose(): void {
    for (const visual of this.pool) {
      visual.mesh.removeFromParent();
      visual.mesh.geometry.dispose();
      const materials = Array.isArray(visual.mesh.material) ? visual.mesh.material : [visual.mesh.material];
      for (const material of materials) material.dispose();
    }
    this.pool.length = 0;
  }
}

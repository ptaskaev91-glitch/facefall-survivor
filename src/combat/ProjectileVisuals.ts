import * as THREE from 'three';
import type { ProjectileState } from './ProjectileSystem';

interface ProjectileVisual {
  mesh: THREE.Mesh;
  projectileId: number;
  active: boolean;
}

export class ProjectileVisuals {
  private readonly visuals: ProjectileVisual[] = [];

  constructor(private readonly scene: THREE.Scene, private readonly capacity = 48) {}

  sync(projectiles: readonly ProjectileState[]): void {
    const activeIds = new Set<number>();

    for (const projectile of projectiles) {
      activeIds.add(projectile.id);
      let visual = this.visuals.find((candidate) => candidate.active && candidate.projectileId === projectile.id);
      if (!visual) visual = this.acquire(projectile.id);
      if (!visual) continue;

      visual.mesh.position.copy(projectile.position);
      const direction = projectile.velocity.clone().normalize();
      visual.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      visual.mesh.visible = true;
    }

    for (const visual of this.visuals) {
      if (!visual.active) continue;
      if (activeIds.has(visual.projectileId)) continue;
      visual.active = false;
      visual.mesh.visible = false;
    }
  }

  dispose(): void {
    for (const visual of this.visuals) {
      visual.mesh.removeFromParent();
      visual.mesh.geometry.dispose();
      const materials = Array.isArray(visual.mesh.material) ? visual.mesh.material : [visual.mesh.material];
      for (const material of materials) material.dispose();
    }
    this.visuals.length = 0;
  }

  private acquire(projectileId: number): ProjectileVisual | undefined {
    let visual = this.visuals.find((candidate) => !candidate.active);
    if (!visual && this.visuals.length < this.capacity) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.028, 0.9, 6),
        new THREE.MeshStandardMaterial({ color: 0x7d633e, roughness: 0.7, metalness: 0.05 })
      );
      mesh.visible = false;
      this.scene.add(mesh);
      visual = { mesh, projectileId: 0, active: false };
      this.visuals.push(visual);
    }
    if (!visual) return undefined;
    visual.projectileId = projectileId;
    visual.active = true;
    return visual;
  }
}

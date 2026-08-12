import * as THREE from 'three';

interface WoundMark {
  mesh: THREE.Mesh;
  age: number;
  lifetime: number;
}

/**
 * Short-lived wound marks attached to the exact enemy body transform hit by a round.
 * Multiple shotgun pellets therefore leave multiple readable impact points.
 */
export class WoundSystem {
  private readonly marks: WoundMark[] = [];

  constructor(private readonly capacity = 96) {}

  spawn(target: THREE.Object3D, worldPoint: THREE.Vector3, heavy = false): void {
    if (!target.visible) return;
    if (this.marks.length >= this.capacity) this.removeMark(this.marks.shift()!);

    const geometry = new THREE.SphereGeometry(heavy ? 0.075 : 0.052, 7, 5);
    const material = new THREE.MeshBasicMaterial({
      color: heavy ? 0x5e0606 : 0x7d1010,
      transparent: true,
      opacity: heavy ? 0.96 : 0.9,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'wound-mark';
    mesh.renderOrder = 2;
    const local = target.worldToLocal(worldPoint.clone());
    mesh.position.copy(local);
    target.add(mesh);
    this.marks.push({ mesh, age: 0, lifetime: heavy ? 5.0 : 3.8 });
  }

  update(dt: number): void {
    for (let index = this.marks.length - 1; index >= 0; index--) {
      const mark = this.marks[index];
      mark.age += dt;
      const remaining = 1 - mark.age / mark.lifetime;
      const material = mark.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, Math.min(0.96, remaining * 1.15));
      if (mark.age >= mark.lifetime || !mark.mesh.parent?.visible) {
        this.removeMark(mark);
        this.marks.splice(index, 1);
      }
    }
  }

  reset(): void {
    for (const mark of this.marks) this.removeMark(mark);
    this.marks.length = 0;
  }

  dispose(): void {
    this.reset();
  }

  private removeMark(mark: WoundMark): void {
    mark.mesh.removeFromParent();
    mark.mesh.geometry.dispose();
    const materials = Array.isArray(mark.mesh.material) ? mark.mesh.material : [mark.mesh.material];
    for (const material of materials) material.dispose();
  }
}

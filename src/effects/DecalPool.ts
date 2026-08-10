import { Material, Mesh, Object3D, Scene } from 'three';

export interface DecalInstance {
  mesh: Mesh;
  age: number;
  lifetime: number;
  active: boolean;
}

export class DecalPool {
  private readonly decals: DecalInstance[] = [];
  private cursor = 0;

  constructor(
    private readonly scene: Scene,
    private readonly capacity: number,
    private readonly factory: () => Mesh
  ) {
    if (capacity <= 0) throw new Error('DecalPool capacity must be positive');
  }

  spawn(parent: Object3D, lifetime: number): DecalInstance {
    let decal = this.decals.find((candidate) => !candidate.active);
    if (!decal && this.decals.length < this.capacity) {
      decal = { mesh: this.factory(), age: 0, lifetime, active: false };
      this.decals.push(decal);
    }

    if (!decal) {
      decal = this.decals[this.cursor % this.decals.length];
      this.cursor = (this.cursor + 1) % this.capacity;
      decal.mesh.removeFromParent();
    }

    decal.age = 0;
    decal.lifetime = Math.max(0.1, lifetime);
    decal.active = true;
    decal.mesh.visible = true;
    this.setOpacity(decal.mesh.material, 1);
    parent.add(decal.mesh);
    return decal;
  }

  update(dt: number): void {
    for (const decal of this.decals) {
      if (!decal.active) continue;
      decal.age += dt;
      const remaining = 1 - decal.age / decal.lifetime;
      const opacity = remaining < 0.2 ? Math.max(0, remaining / 0.2) : 1;
      this.setOpacity(decal.mesh.material, opacity);
      if (decal.age >= decal.lifetime) this.release(decal);
    }
  }

  release(decal: DecalInstance): void {
    decal.active = false;
    decal.mesh.visible = false;
    decal.mesh.removeFromParent();
  }

  get activeCount(): number {
    return this.decals.reduce((count, decal) => count + Number(decal.active), 0);
  }

  dispose(): void {
    for (const decal of this.decals) {
      decal.mesh.removeFromParent();
      decal.mesh.geometry.dispose();
      const materials = Array.isArray(decal.mesh.material) ? decal.mesh.material : [decal.mesh.material];
      for (const material of materials) material.dispose();
    }
    this.decals.length = 0;
  }

  private setOpacity(material: Material | Material[], opacity: number): void {
    const materials = Array.isArray(material) ? material : [material];
    for (const item of materials) {
      item.transparent = true;
      item.opacity = opacity;
    }
  }
}

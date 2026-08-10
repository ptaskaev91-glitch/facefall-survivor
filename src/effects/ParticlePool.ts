import { Object3D, Scene } from 'three';

export interface ParticleInstance {
  object: Object3D;
  age: number;
  lifetime: number;
  active: boolean;
  reset(): void;
  update(dt: number): void;
}

export class ParticlePool<T extends ParticleInstance> {
  private readonly items: T[] = [];
  private cursor = 0;

  constructor(
    private readonly scene: Scene,
    private readonly capacity: number,
    private readonly factory: () => T
  ) {
    if (capacity <= 0) throw new Error('ParticlePool capacity must be positive');
  }

  acquire(lifetime: number): T {
    let item = this.items.find((candidate) => !candidate.active);
    if (!item && this.items.length < this.capacity) {
      item = this.factory();
      this.items.push(item);
      this.scene.add(item.object);
    }

    if (!item) {
      item = this.items[this.cursor % this.items.length];
      this.cursor = (this.cursor + 1) % this.capacity;
    }

    item.reset();
    item.active = true;
    item.age = 0;
    item.lifetime = Math.max(0.01, lifetime);
    item.object.visible = true;
    return item;
  }

  update(dt: number): void {
    for (const item of this.items) {
      if (!item.active) continue;
      item.age += dt;
      item.update(dt);
      if (item.age >= item.lifetime) this.release(item);
    }
  }

  release(item: T): void {
    item.active = false;
    item.object.visible = false;
  }

  get activeCount(): number {
    let count = 0;
    for (const item of this.items) if (item.active) count++;
    return count;
  }

  dispose(): void {
    for (const item of this.items) this.scene.remove(item.object);
    this.items.length = 0;
  }
}

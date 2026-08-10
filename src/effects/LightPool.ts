import { PointLight, Scene, Vector3 } from 'three';

interface LightInstance {
  light: PointLight;
  age: number;
  lifetime: number;
  baseIntensity: number;
  active: boolean;
}

export interface TransientLightSpec {
  color: number;
  intensity: number;
  distance: number;
  lifetime: number;
  position: Vector3;
}

export class LightPool {
  private readonly items: LightInstance[] = [];
  private cursor = 0;

  constructor(private readonly scene: Scene, private readonly capacity: number) {
    if (capacity <= 0) throw new Error('LightPool capacity must be positive');
  }

  spawn(spec: TransientLightSpec): void {
    let item = this.items.find((candidate) => !candidate.active);
    if (!item && this.items.length < this.capacity) {
      const light = new PointLight(0xffffff, 0, 1, 2);
      light.visible = false;
      this.scene.add(light);
      item = { light, age: 0, lifetime: 0, baseIntensity: 0, active: false };
      this.items.push(item);
    }

    if (!item) {
      item = this.items[this.cursor % this.items.length];
      this.cursor = (this.cursor + 1) % this.capacity;
    }

    item.age = 0;
    item.lifetime = Math.max(0.01, spec.lifetime);
    item.baseIntensity = spec.intensity;
    item.active = true;
    item.light.color.setHex(spec.color);
    item.light.intensity = spec.intensity;
    item.light.distance = spec.distance;
    item.light.position.copy(spec.position);
    item.light.visible = true;
  }

  update(dt: number): void {
    for (const item of this.items) {
      if (!item.active) continue;
      item.age += dt;
      const remaining = Math.max(0, 1 - item.age / item.lifetime);
      item.light.intensity = item.baseIntensity * remaining;
      if (item.age >= item.lifetime) this.release(item);
    }
  }

  get activeCount(): number {
    return this.items.reduce((count, item) => count + Number(item.active), 0);
  }

  dispose(): void {
    for (const item of this.items) this.scene.remove(item.light);
    this.items.length = 0;
  }

  private release(item: LightInstance): void {
    item.active = false;
    item.light.visible = false;
    item.light.intensity = 0;
  }
}

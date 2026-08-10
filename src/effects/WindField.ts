import { Vector3 } from 'three';

interface WindImpulse {
  origin: Vector3;
  strength: number;
  radius: number;
  lifetime: number;
  age: number;
}

export class WindField {
  private readonly impulses: WindImpulse[] = [];
  private readonly scratch = new Vector3();
  private readonly global = new Vector3(0.24, 0, 0.08);

  constructor(private readonly maxImpulses = 12) {}

  setGlobal(direction: Vector3, strength: number): void {
    this.global.copy(direction).setY(0);
    if (this.global.lengthSq() > 0) this.global.normalize().multiplyScalar(strength);
  }

  addImpulse(origin: Vector3, strength: number, radius: number, lifetime: number): void {
    if (this.impulses.length >= this.maxImpulses) this.impulses.shift();
    this.impulses.push({
      origin: origin.clone(),
      strength,
      radius: Math.max(0.01, radius),
      lifetime: Math.max(0.01, lifetime),
      age: 0
    });
  }

  update(dt: number): void {
    for (let i = this.impulses.length - 1; i >= 0; i--) {
      const impulse = this.impulses[i];
      impulse.age += dt;
      if (impulse.age >= impulse.lifetime) this.impulses.splice(i, 1);
    }
  }

  sample(position: Vector3, target = new Vector3()): Vector3 {
    target.copy(this.global);

    for (const impulse of this.impulses) {
      this.scratch.copy(position).sub(impulse.origin);
      const distance = this.scratch.length();
      if (distance <= 1e-5 || distance >= impulse.radius) continue;
      const spatial = 1 - distance / impulse.radius;
      const temporal = 1 - impulse.age / impulse.lifetime;
      target.addScaledVector(this.scratch.normalize(), impulse.strength * spatial * temporal);
    }

    return target;
  }

  get activeImpulses(): number {
    return this.impulses.length;
  }
}

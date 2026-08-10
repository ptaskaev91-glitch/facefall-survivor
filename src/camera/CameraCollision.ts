import { Vector3 } from 'three';
import type { CollisionWorld } from '../physics/CollisionWorld';

export class CameraCollision {
  private readonly direction = new Vector3();
  private readonly resolved = new Vector3();

  constructor(
    private readonly world: CollisionWorld,
    private readonly padding = 0.22,
    private readonly minimumDistance = 0.65
  ) {}

  resolve(anchor: Vector3, desired: Vector3, target = this.resolved): Vector3 {
    this.direction.copy(desired).sub(anchor);
    const desiredDistance = this.direction.length();
    if (desiredDistance <= 1e-6) return target.copy(desired);

    this.direction.multiplyScalar(1 / desiredDistance);
    const hit = this.world.raycast(anchor, this.direction, desiredDistance);
    if (!hit) return target.copy(desired);

    const distance = Math.max(this.minimumDistance, hit.distance - this.padding);
    return target.copy(anchor).addScaledVector(this.direction, distance);
  }
}

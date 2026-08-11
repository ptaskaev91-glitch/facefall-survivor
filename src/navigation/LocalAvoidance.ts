import { Vector3 } from 'three';
import type { SpatialHashItem } from '../physics/SpatialHash';

/**
 * Cheap separation steering for mobile-sized infected crowds.
 * This is deliberately not pathfinding: it only prevents nearby actors from
 * collapsing into one point while preserving the desired nav/chase velocity.
 */
export class LocalAvoidance<T extends SpatialHashItem> {
  private readonly separation = new Vector3();
  private readonly offset = new Vector3();

  apply(
    self: T,
    neighbours: readonly T[],
    desiredVelocity: Vector3,
    radius: number,
    strength: number,
    out: Vector3
  ): Vector3 {
    out.copy(desiredVelocity);
    this.separation.set(0, 0, 0);
    let contributors = 0;

    for (const neighbour of neighbours) {
      if (neighbour === self || neighbour.id === self.id) continue;
      this.offset.copy(self.position).sub(neighbour.position).setY(0);
      const distanceSq = this.offset.lengthSq();
      if (distanceSq <= 1e-6 || distanceSq >= radius * radius) continue;
      const distance = Math.sqrt(distanceSq);
      const weight = 1 - distance / radius;
      this.separation.addScaledVector(this.offset, (weight * weight) / distance);
      contributors++;
    }

    if (contributors === 0 || this.separation.lengthSq() <= 1e-6) return out;
    this.separation.multiplyScalar(strength / contributors);
    out.add(this.separation);
    return out;
  }
}

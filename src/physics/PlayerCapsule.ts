import { Vector3 } from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import type { CollisionWorld } from './CollisionWorld';

/**
 * Capsule movement/collision response adapted from the MIT-licensed
 * ivanoskov/shooter Player implementation. See THIRD_PARTY_NOTICES.md.
 *
 * Facefall changes: no camera ownership, fixed-step friendly API, explicit
 * desired horizontal velocity, sprint-independent controller, and reusable
 * world collision boundary.
 */
export class PlayerCapsule {
  readonly collider: Capsule;
  readonly velocity = new Vector3();
  grounded = false;

  private readonly temp = new Vector3();

  constructor(
    start = new Vector3(0, 0.35, 0),
    end = new Vector3(0, 1.35, 0),
    radius = 0.35
  ) {
    this.collider = new Capsule(start.clone(), end.clone(), radius);
  }

  moveToward(desiredHorizontalVelocity: Vector3, dt: number, response = 10): void {
    const alpha = 1 - Math.exp(-response * dt);
    this.velocity.x += (desiredHorizontalVelocity.x - this.velocity.x) * alpha;
    this.velocity.z += (desiredHorizontalVelocity.z - this.velocity.z) * alpha;
  }

  integrate(dt: number, world: CollisionWorld): void {
    this.temp.copy(this.velocity).multiplyScalar(dt);
    this.collider.translate(this.temp);

    const result = world.resolveCapsule(this.collider);
    this.grounded = result.grounded;

    if (result.collided) {
      const intoSurface = this.velocity.dot(result.normal);
      if (intoSurface < 0) {
        this.velocity.addScaledVector(result.normal, -intoSurface);
      }
    }
  }

  teleport(position: Vector3): void {
    const offset = this.temp.copy(position).sub(this.collider.start);
    this.collider.translate(offset);
    this.velocity.set(0, 0, 0);
  }

  get position(): Vector3 {
    return this.collider.start;
  }
}

import { Vector3 } from 'three';
import type { CollisionWorld } from '../physics/CollisionWorld';
import type { NavigationQuery } from './NavigationQuery';

/**
 * Lightweight obstacle-aware query for the current procedural level.
 * It is intentionally not a replacement for the planned offline Recast navmesh.
 * Direct paths are preferred; blocked paths probe short left/right detours.
 */
export class CollisionNavigationQuery implements NavigationQuery {
  private readonly fromProbe = new Vector3();
  private readonly targetProbe = new Vector3();
  private readonly forward = new Vector3();
  private readonly left = new Vector3();
  private readonly candidateLeft = new Vector3();
  private readonly candidateRight = new Vector3();

  constructor(
    private readonly world: CollisionWorld,
    private readonly probeHeight = 0.8,
    private readonly lateralClearance = 2.8,
    private readonly forwardProbe = 4.5
  ) {}

  nextWaypoint(from: Vector3, target: Vector3, out: Vector3): Vector3 {
    this.fromProbe.copy(from).setY(from.y + this.probeHeight);
    this.targetProbe.copy(target).setY(target.y + this.probeHeight);
    if (!this.world.segmentCast(this.fromProbe, this.targetProbe)) return out.copy(target);

    this.forward.copy(target).sub(from).setY(0);
    if (this.forward.lengthSq() <= 1e-6) return out.copy(target);
    this.forward.normalize();
    this.left.set(-this.forward.z, 0, this.forward.x);

    this.candidateLeft.copy(from)
      .addScaledVector(this.forward, this.forwardProbe)
      .addScaledVector(this.left, this.lateralClearance);
    this.candidateRight.copy(from)
      .addScaledVector(this.forward, this.forwardProbe)
      .addScaledVector(this.left, -this.lateralClearance);

    const leftScore = this.scoreCandidate(from, this.candidateLeft, target);
    const rightScore = this.scoreCandidate(from, this.candidateRight, target);

    if (leftScore === Infinity && rightScore === Infinity) {
      // If both short detours are blocked, keep pressure on the obstacle while
      // local avoidance separates the crowd. Recast will replace this fallback.
      return out.copy(from).addScaledVector(this.left, this.lateralClearance * 0.65);
    }

    return out.copy(leftScore <= rightScore ? this.candidateLeft : this.candidateRight);
  }

  private scoreCandidate(from: Vector3, candidate: Vector3, target: Vector3): number {
    this.fromProbe.copy(from).setY(from.y + this.probeHeight);
    this.targetProbe.copy(candidate).setY(candidate.y + this.probeHeight);
    if (this.world.segmentCast(this.fromProbe, this.targetProbe)) return Infinity;

    // Prefer a detour that also sees farther toward the target.
    const remaining = candidate.distanceToSquared(target);
    this.fromProbe.copy(candidate).setY(candidate.y + this.probeHeight);
    this.targetProbe.copy(target).setY(target.y + this.probeHeight);
    const blockedAgain = this.world.segmentCast(this.fromProbe, this.targetProbe) ? 20 : 0;
    return remaining + blockedAgain;
  }
}

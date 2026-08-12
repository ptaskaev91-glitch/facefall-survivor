import { Vector3, type Object3D, type PerspectiveCamera } from 'three';

export interface AutoAimResult {
  target: Object3D;
  direction: Vector3;
  distance: number;
  screenX: number;
}

/**
 * Survivor-style mobile target selection.
 * TOP prefers the nearest visible infected around the player.
 * 3RD prefers a target already near the center of the camera and never drives pitch.
 */
export class MobileAutoAim {
  private readonly projected = new Vector3();
  private readonly direction = new Vector3();
  private readonly flatDirection = new Vector3();
  private readonly resultDirection = new Vector3();

  selectTop(
    playerPosition: Vector3,
    targets: readonly Object3D[],
    maxRange = 28,
    canSee?: (target: Object3D) => boolean
  ): AutoAimResult | null {
    let best: Object3D | null = null;
    let bestDistance = maxRange;

    for (const target of targets) {
      if (!target.visible) continue;
      if (canSee && !canSee(target)) continue;
      this.flatDirection.copy(target.position).sub(playerPosition).setY(0);
      const distance = this.flatDirection.length();
      if (distance <= 0.05 || distance >= bestDistance) continue;
      best = target;
      bestDistance = distance;
    }

    if (!best) return null;
    this.resultDirection.copy(best.position).sub(playerPosition).setY(0).normalize();
    return { target: best, direction: this.resultDirection.clone(), distance: bestDistance, screenX: 0 };
  }

  selectThird(
    camera: PerspectiveCamera,
    playerPosition: Vector3,
    targets: readonly Object3D[],
    maxRange = 34,
    maxScreenX = 0.72,
    canSee?: (target: Object3D) => boolean
  ): AutoAimResult | null {
    let best: Object3D | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    let bestDistance = 0;
    let bestScreenX = 0;

    for (const target of targets) {
      if (!target.visible) continue;
      if (canSee && !canSee(target)) continue;

      this.direction.copy(target.position).sub(playerPosition);
      const distance = this.direction.length();
      if (distance <= 0.05 || distance > maxRange) continue;

      this.projected.copy(target.position);
      this.projected.y += 1.05;
      this.projected.project(camera);
      if (this.projected.z < -1 || this.projected.z > 1) continue;
      if (Math.abs(this.projected.x) > maxScreenX) continue;

      // Strongly favour the target closest to the center, then the closest target.
      const score = Math.abs(this.projected.x) * 4.2 + distance / maxRange;
      if (score >= bestScore) continue;
      bestScore = score;
      best = target;
      bestDistance = distance;
      bestScreenX = this.projected.x;
    }

    if (!best) return null;
    this.resultDirection.copy(best.position).sub(playerPosition).setY(0).normalize();
    return {
      target: best,
      direction: this.resultDirection.clone(),
      distance: bestDistance,
      screenX: bestScreenX
    };
  }
}

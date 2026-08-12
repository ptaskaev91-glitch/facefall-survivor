import { Vector2, Vector3, type Object3D, type PerspectiveCamera } from 'three';

/**
 * Mobile auto-aim steering.
 * TOP behaves like a survivor game: player movement is independent and aim locks
 * to the best visible infected around the player/screen center.
 * 3RD keeps the reticle fixed and steers yaw until the selected infected sits under it.
 */
export class AimAssist {
  private readonly projected = new Vector3();
  private readonly targetNdc = new Vector2();

  findCorrection(
    camera: PerspectiveCamera,
    reticleNdc: Vector2,
    targets: readonly Object3D[],
    strength: number,
    mode: 'top' | 'third',
    out = new Vector2()
  ): Vector2 {
    out.set(0, 0);
    if (targets.length === 0) return out;

    const effectiveStrength = mode === 'top'
      ? Math.max(0.9, strength)
      : Math.max(0.9, strength);
    const maxX = mode === 'top' ? 0.92 : 0.82;
    const maxY = mode === 'top' ? 0.86 : 0.82;
    let bestScore = Number.POSITIVE_INFINITY;
    let found = false;

    for (const target of targets) {
      if (!target.visible) continue;
      this.projected.copy(target.position);
      this.projected.y += mode === 'third' ? 1.12 : 0.8;
      this.projected.project(camera);
      if (this.projected.z < -1 || this.projected.z > 1) continue;
      if (Math.abs(this.projected.x) > maxX || Math.abs(this.projected.y) > maxY) continue;

      const score = mode === 'top'
        ? this.projected.x * this.projected.x + this.projected.y * this.projected.y
        : Math.abs(this.projected.x) * 4.4 + Math.abs(this.projected.y) * 0.12;
      if (score >= bestScore) continue;
      bestScore = score;
      this.targetNdc.set(this.projected.x, this.projected.y);
      found = true;
    }

    if (!found) return out;

    if (mode === 'third') {
      // Fixed crosshair: only yaw is corrected. Strong enough to visibly center a target,
      // but the player can still override it with a horizontal swipe.
      const x = this.targetNdc.x;
      const pull = Math.min(0.48, effectiveStrength * (0.30 + Math.min(0.20, Math.abs(x) * 0.34)));
      out.set(x * pull, 0);
      return out;
    }

    const delta = out.copy(this.targetNdc).sub(reticleNdc);
    const distance = Math.min(1, delta.length());
    const pull = Math.min(0.58, effectiveStrength * (0.34 + distance * 0.24));
    return delta.multiplyScalar(pull);
  }
}

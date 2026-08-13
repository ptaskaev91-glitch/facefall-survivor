import { Vector2, Vector3, type Object3D, type PerspectiveCamera } from 'three';

/**
 * Mobile auto-aim steering.
 * TOP behaves like a survivor game: player movement is independent and aim locks
 * to the best visible infected around the player/screen center.
 * 3RD uses the same screen-space target point so the visible crosshair, ray and shot agree.
 */
export class AimAssist {
  private readonly projected = new Vector3();
  private readonly targetWorld = new Vector3();
  private readonly cameraForward = new Vector3();
  private readonly toTarget = new Vector3();
  private readonly targetNdc = new Vector2();
  private foundTarget = false;

  get hasTarget(): boolean { return this.foundTarget; }

  findCorrection(
    camera: PerspectiveCamera,
    reticleNdc: Vector2,
    targets: readonly Object3D[],
    strength: number,
    mode: 'top' | 'third',
    out = new Vector2()
  ): Vector2 {
    out.set(0, 0);
    this.foundTarget = false;
    if (targets.length === 0) return out;

    const effectiveStrength = Math.max(0.2, Math.min(1, strength));
    const maxX = mode === 'top' ? 0.92 : 0.82;
    const maxY = mode === 'top' ? 0.86 : 0.78;
    camera.getWorldDirection(this.cameraForward);
    let bestScore = Number.POSITIVE_INFINITY;

    for (const target of targets) {
      if (!target.visible) continue;

      // Use a world-space target point. The camera projection matrix is updated on the
      // render tick, while aim assist runs on the fixed tick, so projected.z can briefly
      // sit slightly outside [-1, 1] even for a target that is visibly in front of the camera.
      // A forward-vector test is the stable criterion for rejecting targets behind us.
      target.getWorldPosition(this.targetWorld);
      this.targetWorld.y += mode === 'third' ? 1.12 : 0.8;
      this.toTarget.copy(this.targetWorld).sub(camera.position);
      if (this.toTarget.dot(this.cameraForward) <= 0) continue;

      this.projected.copy(this.targetWorld).project(camera);
      if (Math.abs(this.projected.x) > maxX || Math.abs(this.projected.y) > maxY) continue;

      const dx = this.projected.x - reticleNdc.x;
      const dy = this.projected.y - reticleNdc.y;
      const score = mode === 'top'
        ? dx * dx + dy * dy
        : Math.abs(dx) * 2.6 + Math.abs(dy) * 1.35;
      if (score >= bestScore) continue;
      bestScore = score;
      this.targetNdc.set(this.projected.x, this.projected.y);
      this.foundTarget = true;
    }

    if (!this.foundTarget) return out;

    const delta = out.copy(this.targetNdc).sub(reticleNdc);
    const distance = Math.min(1, delta.length());
    const pull = mode === 'third'
      ? Math.min(0.72, 0.28 + effectiveStrength * 0.34 + distance * 0.16)
      : Math.min(0.58, effectiveStrength * (0.34 + distance * 0.24));
    return delta.multiplyScalar(pull);
  }
}

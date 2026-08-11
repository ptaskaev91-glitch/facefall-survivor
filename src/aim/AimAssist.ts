import { Vector2, Vector3, type Object3D, type PerspectiveCamera } from 'three';

/**
 * Soft screen-space magnetism. It never fires, switches targets, or teleports
 * the reticle. It only returns a small NDC correction toward the closest visible
 * infected near the current reticle.
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
    if (strength <= 0) return out;

    const radius = mode === 'top' ? 0.24 : 0.16;
    let bestDistanceSq = radius * radius;
    let found = false;

    for (const target of targets) {
      if (!target.visible) continue;
      this.projected.copy(target.position);
      this.projected.y += mode === 'third' ? 1.15 : 0.9;
      this.projected.project(camera);
      if (this.projected.z < -1 || this.projected.z > 1) continue;

      const dx = this.projected.x - reticleNdc.x;
      const dy = this.projected.y - reticleNdc.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq >= bestDistanceSq) continue;
      bestDistanceSq = distanceSq;
      this.targetNdc.set(this.projected.x, this.projected.y);
      found = true;
    }

    if (!found) return out;
    const normalizedDistance = Math.sqrt(bestDistanceSq) / radius;
    const falloff = Math.max(0, 1 - normalizedDistance);
    const pull = Math.min(0.24, strength * 0.055 * (0.35 + falloff * 0.65));
    return out.copy(this.targetNdc).sub(reticleNdc).multiplyScalar(pull);
  }
}

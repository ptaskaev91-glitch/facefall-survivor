import { Vector3 } from 'three';

export interface ThirdPersonAimHit {
  point: Vector3;
  distance: number;
}

export function resolveThirdPersonAimPoint(
  rayOrigin: Vector3,
  rayDirection: Vector3,
  enemyHit: ThirdPersonAimHit | null,
  worldHit: ThirdPersonAimHit | null,
  fallbackDistance: number,
  out: Vector3
): Vector3 {
  const enemyValid = Boolean(enemyHit && Number.isFinite(enemyHit.distance) && enemyHit.distance >= 0);
  const worldValid = Boolean(worldHit && Number.isFinite(worldHit.distance) && worldHit.distance >= 0);

  if (enemyValid && (!worldValid || enemyHit!.distance <= worldHit!.distance)) return out.copy(enemyHit!.point);
  if (worldValid) return out.copy(worldHit!.point);

  return out.copy(rayOrigin).addScaledVector(rayDirection, Math.max(0.1, fallbackDistance));
}

export function resolveThirdPersonShotDirection(
  muzzleOrigin: Vector3,
  aimPoint: Vector3,
  fallbackDirection: Vector3,
  out: Vector3
): Vector3 {
  out.copy(aimPoint).sub(muzzleOrigin);
  if (out.lengthSq() <= 1e-6) out.copy(fallbackDirection);
  if (out.lengthSq() <= 1e-6) out.set(0, 0, -1);
  return out.normalize();
}

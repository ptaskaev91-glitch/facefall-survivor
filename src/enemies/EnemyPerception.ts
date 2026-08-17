import type { WeaponId } from '../combat/types';

export const TARGET_STICK_SECONDS = 0.65;
export const VISUAL_ALERT_SECONDS = 3.8;

export function sightRangeFor(archetypeId: 'walker' | 'runner' | 'brute'): number {
  if (archetypeId === 'runner') return 30;
  if (archetypeId === 'brute') return 25;
  return 27;
}

/** Distance-based cadence for expensive static-world LOS checks. */
export function perceptionInterval(distance: number): number {
  if (distance <= 8) return 0.06;
  if (distance <= 18) return 0.12;
  if (distance <= 30) return 0.22;
  return 0.38;
}

/** Distance-based cadence for nav/SpatialHash steering refresh. Movement still integrates every fixed step. */
export function steeringInterval(distance: number): number {
  if (distance <= 8) return 0.05;
  if (distance <= 18) return 0.09;
  if (distance <= 30) return 0.16;
  return 0.28;
}

export function weaponNoiseRadius(weaponId: WeaponId): number {
  if (weaponId === 'shotgun') return 36;
  if (weaponId === 'bow') return 9;
  return 24;
}

export function footstepNoiseRadius(sprinting: boolean): number {
  return sprinting ? 10 : 4.5;
}

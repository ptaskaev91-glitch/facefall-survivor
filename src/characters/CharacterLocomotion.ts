export type LocomotionState = 'idle' | 'walk' | 'run';

export function resolveLocomotionState(speed: number): LocomotionState {
  const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  if (safeSpeed < 0.15) return 'idle';
  return safeSpeed < 6 ? 'walk' : 'run';
}

import type { WeaponId } from './types';

export type FireModel = 'hitscan' | 'projectile';

export interface RecoilProfile {
  pitchMin: number;
  pitchMax: number;
  yawMin: number;
  yawMax: number;
  cameraKick: number;
  recovery: number;
}

export interface WeaponDefinition {
  id: WeaponId;
  label: string;
  fireModel: FireModel;
  magazine: number;
  reserve: number;
  damage: number;
  pellets: number;
  spread: number;
  fireInterval: number;
  reloadTime: number;
  projectileSpeed?: number;
  projectileGravity?: number;
  impulse: number;
  headMultiplier: number;
  limbMultiplier: number;
  recoil: RecoilProfile;
  shotFx: string;
  hitFx: string;
}

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  pistol: {
    id: 'pistol',
    label: 'PISTOL',
    fireModel: 'hitscan',
    magazine: 12,
    reserve: 84,
    damage: 38,
    pellets: 1,
    // Small natural deviation around the fixed aim point. Movement multiplier is applied at runtime.
    spread: 0.0075,
    fireInterval: 0.21,
    reloadTime: 1.35,
    impulse: 2.5,
    headMultiplier: 1.8,
    limbMultiplier: 0.72,
    recoil: { pitchMin: 0.45, pitchMax: 0.9, yawMin: -0.2, yawMax: 0.2, cameraKick: 0.18, recovery: 9 },
    shotFx: 'pistol-shot',
    hitFx: 'flesh-hit'
  },
  shotgun: {
    id: 'shotgun',
    label: 'SHOTGUN',
    fireModel: 'hitscan',
    magazine: 6,
    reserve: 32,
    damage: 24,
    pellets: 8,
    // Real cone is resolved pellet-by-pellet; several pellets can hit the same infected at distinct points.
    spread: 0.09,
    fireInterval: 0.72,
    reloadTime: 1.9,
    impulse: 8.5,
    headMultiplier: 1.35,
    limbMultiplier: 0.8,
    recoil: { pitchMin: 2.0, pitchMax: 3.2, yawMin: -0.6, yawMax: 0.6, cameraKick: 0.8, recovery: 6.5 },
    shotFx: 'shotgun-shot',
    hitFx: 'flesh-hit-heavy'
  },
  bow: {
    id: 'bow',
    label: 'BOW',
    fireModel: 'projectile',
    magazine: 1,
    reserve: 34,
    damage: 110,
    pellets: 1,
    spread: 0.004,
    fireInterval: 0.76,
    reloadTime: 0.58,
    projectileSpeed: 42,
    projectileGravity: 8.5,
    impulse: 5.5,
    headMultiplier: 2.1,
    limbMultiplier: 0.75,
    recoil: { pitchMin: 0.05, pitchMax: 0.12, yawMin: -0.03, yawMax: 0.03, cameraKick: 0.04, recovery: 12 },
    shotFx: 'bow-shot',
    hitFx: 'arrow-hit'
  }
};

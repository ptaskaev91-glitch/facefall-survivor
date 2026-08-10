import type { Vector3 } from 'three';

export type DamageKind = 'bullet' | 'pellet' | 'arrow' | 'melee' | 'explosive';
export type HitZone = 'head' | 'torso' | 'limb' | 'environment';

export interface DamageEvent {
  amount: number;
  kind: DamageKind;
  sourceId: string;
  targetId: string;
  hitPoint: Vector3;
  direction: Vector3;
  impulse: number;
  hitZone: HitZone;
  critical: boolean;
}

export interface HitEvent extends DamageEvent {
  remainingHealth: number;
  lethal: boolean;
}

export interface ShotEvent {
  weaponId: WeaponId;
  sourceId: string;
  origin: Vector3;
  direction: Vector3;
}

export type WeaponId = 'pistol' | 'shotgun' | 'bow';

export interface FacefallEvents {
  shot: ShotEvent;
  hit: HitEvent;
  kill: HitEvent;
}

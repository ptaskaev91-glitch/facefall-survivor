export type AtmosphereId = 'dawn' | 'overcast' | 'dusk' | 'blood-moon';

export interface AtmospherePreset {
  id: AtmosphereId;
  background: number;
  fogColor: number;
  fogDensity: number;
  hemisphereSky: number;
  hemisphereGround: number;
  hemisphereIntensity: number;
  keyColor: number;
  keyIntensity: number;
  exposure: number;
  rainIntensity: number;
  stormIntensity: number;
  hazeIntensity: number;
  moonOpacity: number;
}

export const ATMOSPHERE_PRESETS: Record<AtmosphereId, AtmospherePreset> = {
  dawn: {
    id: 'dawn',
    background: 0x14201d,
    fogColor: 0x6d7d74,
    fogDensity: 0.012,
    hemisphereSky: 0xaebfbd,
    hemisphereGround: 0x27312b,
    hemisphereIntensity: 1.6,
    keyColor: 0xffc68b,
    keyIntensity: 2.15,
    exposure: 1.18,
    rainIntensity: 0.08,
    stormIntensity: 0,
    hazeIntensity: 0.28,
    moonOpacity: 0,
  },
  overcast: {
    id: 'overcast',
    background: 0x0c1512,
    fogColor: 0x44544d,
    fogDensity: 0.018,
    hemisphereSky: 0x87978f,
    hemisphereGround: 0x18211c,
    hemisphereIntensity: 1.25,
    keyColor: 0xaebcb4,
    keyIntensity: 1.55,
    exposure: 1.02,
    rainIntensity: 1,
    stormIntensity: 0.72,
    hazeIntensity: 0.58,
    moonOpacity: 0,
  },
  dusk: {
    id: 'dusk',
    background: 0x170f0d,
    fogColor: 0x664438,
    fogDensity: 0.021,
    hemisphereSky: 0xa77b68,
    hemisphereGround: 0x211714,
    hemisphereIntensity: 1.12,
    keyColor: 0xff8b55,
    keyIntensity: 2.35,
    exposure: 0.94,
    rainIntensity: 0.18,
    stormIntensity: 0.12,
    hazeIntensity: 0.68,
    moonOpacity: 0,
  },
  'blood-moon': {
    id: 'blood-moon',
    background: 0x050305,
    fogColor: 0x1c080c,
    fogDensity: 0.037,
    hemisphereSky: 0x371419,
    hemisphereGround: 0x060506,
    hemisphereIntensity: 0.72,
    keyColor: 0xc92c38,
    keyIntensity: 1.65,
    exposure: 0.72,
    rainIntensity: 0.04,
    stormIntensity: 0,
    hazeIntensity: 0.92,
    moonOpacity: 0.96,
  },
};

export function atmosphereForWave(wave: number): AtmosphereId {
  const normalized = Math.max(1, Math.floor(Number.isFinite(wave) ? wave : 1));
  if (normalized <= 2) return 'dawn';
  if (normalized <= 4) return 'overcast';
  if (normalized <= 6) return 'dusk';
  return 'blood-moon';
}

export function parseAtmosphereOverride(value: string | null | undefined): AtmosphereId | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'dawn') return 'dawn';
  if (normalized === 'overcast' || normalized === 'day' || normalized === 'rain') return 'overcast';
  if (normalized === 'dusk' || normalized === 'sunset') return 'dusk';
  if (normalized === 'blood-moon' || normalized === 'bloodmoon' || normalized === 'night') return 'blood-moon';
  return null;
}

/**
 * Presentation-only readability curve used by the Blood Moon phase.
 * It deliberately never reaches zero so close/critical gameplay remains legible.
 */
export function bloodMoonVisibility(distance: number): number {
  const d = Math.max(0, Number.isFinite(distance) ? distance : 0);
  if (d <= 6) return 1;
  if (d <= 12) return lerp(1, 0.58, (d - 6) / 6);
  if (d <= 24) return lerp(0.58, 0.18, (d - 12) / 12);
  return Math.max(0.1, 0.18 - (d - 24) * 0.01);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

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
  keyPosition: readonly [number, number, number];
  exposure: number;
  rainIntensity: number;
  stormIntensity: number;
  hazeIntensity: number;
  moonOpacity: number;
}

export const ATMOSPHERE_PRESETS: Record<AtmosphereId, AtmospherePreset> = {
  dawn: {
    id: 'dawn',
    background: 0x263a3b,
    fogColor: 0x829594,
    fogDensity: 0.011,
    hemisphereSky: 0xc3d3d3,
    hemisphereGround: 0x304038,
    hemisphereIntensity: 1.95,
    keyColor: 0xffd0a1,
    keyIntensity: 1.75,
    keyPosition: [-24, 13, -18],
    exposure: 1.16,
    rainIntensity: 0.05,
    stormIntensity: 0,
    hazeIntensity: 0.25,
    moonOpacity: 0,
  },
  overcast: {
    id: 'overcast',
    background: 0x26312e,
    fogColor: 0x697a73,
    fogDensity: 0.017,
    hemisphereSky: 0xb6c3bd,
    hemisphereGround: 0x29352f,
    hemisphereIntensity: 1.82,
    keyColor: 0xbfc9c4,
    keyIntensity: 1.7,
    keyPosition: [-18, 30, -12],
    exposure: 1.12,
    rainIntensity: 1,
    stormIntensity: 0.72,
    hazeIntensity: 0.57,
    moonOpacity: 0,
  },
  dusk: {
    id: 'dusk',
    background: 0x2e1713,
    fogColor: 0x875341,
    fogDensity: 0.022,
    hemisphereSky: 0xa86958,
    hemisphereGround: 0x261915,
    hemisphereIntensity: 1.24,
    keyColor: 0xff7947,
    keyIntensity: 2.55,
    keyPosition: [-31, 7, -20],
    exposure: 0.94,
    rainIntensity: 0.14,
    stormIntensity: 0.08,
    hazeIntensity: 0.68,
    moonOpacity: 0,
  },
  'blood-moon': {
    id: 'blood-moon',
    background: 0x050305,
    fogColor: 0x1c080c,
    fogDensity: 0.052,
    hemisphereSky: 0x371419,
    hemisphereGround: 0x060506,
    hemisphereIntensity: 0.78,
    keyColor: 0xc92c38,
    keyIntensity: 1.55,
    keyPosition: [-20, 24, -34],
    exposure: 0.76,
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

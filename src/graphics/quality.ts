export type QualityId = 'mobile-low' | 'mobile-high' | 'desktop-high';

export interface QualityProfile {
  id: QualityId;
  maxPixelRatio: number;
  shadows: boolean;
  shadowMapSize: number;
  grassInstances: number;
  grassDistance: number;
  rainParticles: number;
  maxDynamicLights: number;
  maxDecals: number;
  fogDensity: number;
  antialias: boolean;
}

export const QUALITY_PROFILES: Record<QualityId, QualityProfile> = {
  'mobile-low': {
    id: 'mobile-low',
    maxPixelRatio: 1,
    shadows: false,
    shadowMapSize: 512,
    grassInstances: 550,
    grassDistance: 24,
    rainParticles: 160,
    maxDynamicLights: 3,
    maxDecals: 48,
    fogDensity: 0.022,
    antialias: false
  },
  'mobile-high': {
    id: 'mobile-high',
    maxPixelRatio: 1.25,
    shadows: true,
    shadowMapSize: 1024,
    grassInstances: 950,
    grassDistance: 34,
    rainParticles: 320,
    maxDynamicLights: 5,
    maxDecals: 96,
    fogDensity: 0.019,
    antialias: false
  },
  'desktop-high': {
    id: 'desktop-high',
    maxPixelRatio: 1.75,
    shadows: true,
    shadowMapSize: 2048,
    grassInstances: 2400,
    grassDistance: 48,
    rainParticles: 750,
    maxDynamicLights: 10,
    maxDecals: 192,
    fogDensity: 0.015,
    antialias: true
  }
};

export function detectQuality(): QualityProfile {
  const coarse = matchMedia('(hover:none),(pointer:coarse)').matches;
  if (!coarse) return QUALITY_PROFILES['desktop-high'];

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  return memory >= 6 && cores >= 6
    ? QUALITY_PROFILES['mobile-high']
    : QUALITY_PROFILES['mobile-low'];
}

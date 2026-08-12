export interface ParticleRecipe {
  kind: 'smoke' | 'spark' | 'blood' | 'debris' | 'casing' | 'tracer' | 'impact';
  count: number;
  lifetime: number;
  speed: number;
  size: number;
  spread?: number;
}

export interface LightRecipe {
  color: number;
  intensity: number;
  distance: number;
  lifetime: number;
}

export interface DecalRecipe {
  kind: 'blood' | 'bullet' | 'mud';
  size: number;
  lifetime: number;
}

export interface WindImpulseRecipe {
  strength: number;
  radius: number;
  lifetime: number;
}

export interface EffectRecipe {
  particles?: ParticleRecipe[];
  light?: LightRecipe;
  decal?: DecalRecipe;
  wind?: WindImpulseRecipe;
  cameraShake?: number;
  hitStopMs?: number;
}

export const EFFECTS: Record<string, EffectRecipe> = {
  'pistol-shot': {
    particles: [
      { kind: 'tracer', count: 1, lifetime: 0.13, speed: 118, size: 0.035, spread: 0.012 },
      { kind: 'smoke', count: 3, lifetime: 0.35, speed: 0.6, size: 0.09 },
      { kind: 'casing', count: 1, lifetime: 1.4, speed: 2.2, size: 0.035 }
    ],
    light: { color: 0xffb34f, intensity: 7, distance: 4.5, lifetime: 0.045 },
    wind: { strength: 0.22, radius: 1.8, lifetime: 0.08 },
    cameraShake: 0.12
  },
  'shotgun-shot': {
    particles: [
      { kind: 'tracer', count: 8, lifetime: 0.11, speed: 105, size: 0.028, spread: 0.13 },
      { kind: 'smoke', count: 8, lifetime: 0.55, speed: 1.1, size: 0.13 },
      { kind: 'casing', count: 1, lifetime: 1.8, speed: 2.8, size: 0.05 }
    ],
    light: { color: 0xffa83f, intensity: 13, distance: 7.5, lifetime: 0.07 },
    wind: { strength: 0.7, radius: 3.2, lifetime: 0.12 },
    cameraShake: 0.55,
    hitStopMs: 24
  },
  'bow-shot': {
    particles: [{ kind: 'debris', count: 2, lifetime: 0.28, speed: 0.35, size: 0.025 }],
    cameraShake: 0.025
  },
  'flesh-hit': {
    particles: [
      { kind: 'impact', count: 1, lifetime: 0.24, speed: 0, size: 0.085 },
      { kind: 'blood', count: 5, lifetime: 0.48, speed: 2.8, size: 0.055 }
    ],
    decal: { kind: 'blood', size: 0.34, lifetime: 13 },
    hitStopMs: 10
  },
  'flesh-hit-heavy': {
    particles: [
      { kind: 'impact', count: 1, lifetime: 0.3, speed: 0, size: 0.12 },
      { kind: 'blood', count: 12, lifetime: 0.62, speed: 4.1, size: 0.075 }
    ],
    decal: { kind: 'blood', size: 0.55, lifetime: 16 },
    wind: { strength: 0.18, radius: 1.4, lifetime: 0.08 },
    hitStopMs: 20
  },
  'arrow-hit': {
    particles: [
      { kind: 'impact', count: 1, lifetime: 0.28, speed: 0, size: 0.1 },
      { kind: 'blood', count: 4, lifetime: 0.5, speed: 2.2, size: 0.05 },
      { kind: 'debris', count: 2, lifetime: 0.4, speed: 1.1, size: 0.025 }
    ],
    decal: { kind: 'blood', size: 0.28, lifetime: 14 },
    hitStopMs: 12
  },
  'surface-hit': {
    particles: [
      { kind: 'spark', count: 3, lifetime: 0.22, speed: 2.0, size: 0.025 },
      { kind: 'debris', count: 3, lifetime: 0.38, speed: 1.3, size: 0.03 }
    ],
    decal: { kind: 'bullet', size: 0.16, lifetime: 18 }
  }
};

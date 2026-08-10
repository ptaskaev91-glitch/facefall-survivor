import type { Object3D, Vector3 } from 'three';
import { EFFECTS, type DecalRecipe, type EffectRecipe, type LightRecipe, type ParticleRecipe } from './recipes';
import { WindField } from './WindField';

export interface EffectContext {
  origin: Vector3;
  direction?: Vector3;
  normal?: Vector3;
  parent?: Object3D;
}

export interface EffectAdapters {
  spawnParticle?(recipe: ParticleRecipe, context: EffectContext): void;
  spawnLight?(recipe: LightRecipe, context: EffectContext): void;
  spawnDecal?(recipe: DecalRecipe, context: EffectContext): void;
  cameraShake?(strength: number, context: EffectContext): void;
  hitStop?(milliseconds: number): void;
}

export class EffectSystem {
  readonly wind: WindField;

  constructor(
    private readonly adapters: EffectAdapters = {},
    wind = new WindField()
  ) {
    this.wind = wind;
  }

  play(id: string, context: EffectContext): boolean {
    const recipe = EFFECTS[id];
    if (!recipe) return false;
    this.playRecipe(recipe, context);
    return true;
  }

  playRecipe(recipe: EffectRecipe, context: EffectContext): void {
    for (const particle of recipe.particles ?? []) {
      this.adapters.spawnParticle?.(particle, context);
    }

    if (recipe.light) this.adapters.spawnLight?.(recipe.light, context);
    if (recipe.decal) this.adapters.spawnDecal?.(recipe.decal, context);

    if (recipe.wind) {
      this.wind.addImpulse(
        context.origin,
        recipe.wind.strength,
        recipe.wind.radius,
        recipe.wind.lifetime
      );
    }

    if (recipe.cameraShake) this.adapters.cameraShake?.(recipe.cameraShake, context);
    if (recipe.hitStopMs) this.adapters.hitStop?.(recipe.hitStopMs);
  }

  update(dt: number): void {
    this.wind.update(dt);
  }
}

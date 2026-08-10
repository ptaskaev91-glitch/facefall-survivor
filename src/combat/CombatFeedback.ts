import { EventBus } from '../core/EventBus';
import { EFFECTS, type EffectRecipe } from '../effects/recipes';
import { WEAPONS } from './weapons';
import type { FacefallEvents, HitEvent, ShotEvent } from './types';

export interface CombatFeedbackSink {
  play(recipe: EffectRecipe, context: ShotEvent | HitEvent): void;
}

export class CombatFeedback {
  private unsubscribers: Array<() => void> = [];

  constructor(
    private readonly events: EventBus<FacefallEvents>,
    private readonly sink: CombatFeedbackSink
  ) {}

  attach(): void {
    if (this.unsubscribers.length) return;

    this.unsubscribers.push(
      this.events.on('shot', (shot) => {
        const key = WEAPONS[shot.weaponId].shotFx;
        const recipe = EFFECTS[key];
        if (recipe) this.sink.play(recipe, shot);
      }),
      this.events.on('hit', (hit) => {
        const key = WEAPONS[hit.kind === 'pellet' ? 'shotgun' : hit.kind === 'arrow' ? 'bow' : 'pistol'].hitFx;
        const recipe = EFFECTS[key];
        if (recipe) this.sink.play(recipe, hit);
      })
    );
  }

  detach(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
  }
}

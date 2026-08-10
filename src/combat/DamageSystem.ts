import { EventBus } from '../core/EventBus';
import { Health } from './Health';
import type { DamageEvent, FacefallEvents, HitEvent } from './types';

export interface DamageTarget {
  id: string;
  health: Health;
}

export class DamageSystem {
  private targets = new Map<string, DamageTarget>();

  constructor(private readonly events: EventBus<FacefallEvents>) {}

  register(target: DamageTarget): () => void {
    this.targets.set(target.id, target);
    return () => this.targets.delete(target.id);
  }

  apply(event: DamageEvent): HitEvent | null {
    const target = this.targets.get(event.targetId);
    if (!target || !target.health.alive) return null;

    const applied = target.health.damage(event.amount);
    if (applied <= 0) return null;

    const hit: HitEvent = {
      ...event,
      amount: applied,
      remainingHealth: target.health.value,
      lethal: !target.health.alive
    };

    this.events.emit('hit', hit);
    if (hit.lethal) this.events.emit('kill', hit);
    return hit;
  }
}

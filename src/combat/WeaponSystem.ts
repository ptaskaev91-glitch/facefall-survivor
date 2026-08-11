import { Vector3 } from 'three';
import { aimController } from '../aim/AimController';
import { EventBus } from '../core/EventBus';
import { WEAPONS, type WeaponDefinition } from './weapons';
import type { FacefallEvents, WeaponId } from './types';

export type WeaponState = 'idle' | 'cooldown' | 'reloading';

export interface WeaponRuntime {
  id: WeaponId;
  magazine: number;
  reserve: number;
  state: WeaponState;
  stateTime: number;
}

export class WeaponSystem {
  readonly runtimes = new Map<WeaponId, WeaponRuntime>();
  selected: WeaponId = 'pistol';
  private readonly resolvedDirection = new Vector3();

  constructor(private readonly events: EventBus<FacefallEvents>) {
    this.reset();
  }

  reset(): void {
    this.runtimes.clear();
    for (const definition of Object.values(WEAPONS)) {
      this.runtimes.set(definition.id, {
        id: definition.id,
        magazine: definition.magazine,
        reserve: definition.reserve,
        state: 'idle',
        stateTime: 0
      });
    }
    this.selected = 'pistol';
  }

  update(dt: number): void {
    for (const runtime of this.runtimes.values()) {
      if (runtime.state === 'idle') continue;
      runtime.stateTime = Math.max(0, runtime.stateTime - dt);
      if (runtime.stateTime > 0) continue;

      if (runtime.state === 'reloading') this.completeReload(runtime);
      runtime.state = 'idle';
    }
  }

  definition(id: WeaponId = this.selected): WeaponDefinition {
    return WEAPONS[id];
  }

  runtime(id: WeaponId = this.selected): WeaponRuntime {
    const runtime = this.runtimes.get(id);
    if (!runtime) throw new Error(`Missing weapon runtime: ${id}`);
    return runtime;
  }

  select(id: WeaponId): boolean {
    const current = this.runtime();
    if (current.state === 'reloading') return false;
    this.selected = id;
    return true;
  }

  cycle(): WeaponId {
    const order: WeaponId[] = ['pistol', 'shotgun', 'bow'];
    const next = order[(order.indexOf(this.selected) + 1) % order.length];
    this.select(next);
    return this.selected;
  }

  addReserve(amount: number, id: WeaponId = this.selected): boolean {
    if (amount <= 0) return false;
    const runtime = this.runtime(id);
    runtime.reserve += Math.floor(amount);
    return true;
  }

  fire(sourceId: string, origin: Vector3, fallbackDirection: Vector3): boolean {
    const definition = this.definition();
    const runtime = this.runtime();
    if (runtime.state !== 'idle' || runtime.magazine <= 0) return false;

    runtime.magazine--;
    runtime.state = 'cooldown';
    runtime.stateTime = definition.fireInterval;

    const direction = sourceId === 'player'
      ? aimController.getWorldDirection(this.resolvedDirection)
      : this.resolvedDirection.copy(fallbackDirection);

    if (direction.lengthSq() <= 1e-6) direction.copy(fallbackDirection);

    this.events.emit('shot', {
      weaponId: definition.id,
      sourceId,
      origin: origin.clone(),
      direction: direction.clone().normalize()
    });
    return true;
  }

  reload(): boolean {
    const definition = this.definition();
    const runtime = this.runtime();
    if (runtime.state !== 'idle' || runtime.reserve <= 0 || runtime.magazine >= definition.magazine) return false;
    runtime.state = 'reloading';
    runtime.stateTime = definition.reloadTime;
    this.events.emit('weaponReload', { weaponId: definition.id });
    return true;
  }

  private completeReload(runtime: WeaponRuntime): void {
    const definition = WEAPONS[runtime.id];
    const needed = definition.magazine - runtime.magazine;
    const loaded = Math.min(needed, runtime.reserve);
    runtime.magazine += loaded;
    runtime.reserve -= loaded;
  }
}

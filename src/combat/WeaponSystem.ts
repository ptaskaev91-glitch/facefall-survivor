import { Vector3 } from 'three';
import { EventBus } from '../core/EventBus';
import { WEAPONS, type WeaponDefinition } from './weapons';
import type { FacefallEvents, WeaponId } from './types';

export type WeaponState = 'idle' | 'cooldown' | 'reloading';
export interface WeaponRuntime { id: WeaponId; magazine: number; reserve: number; state: WeaponState; stateTime: number; }
export type PlayerAimResolver = (out: Vector3) => Vector3;

export class WeaponSystem {
  readonly runtimes = new Map<WeaponId, WeaponRuntime>();
  selected: WeaponId = 'pistol';
  private readonly unlocked = new Set<WeaponId>(['pistol']);
  private readonly resolvedDirection = new Vector3();

  constructor(private readonly events: EventBus<FacefallEvents>, private readonly resolvePlayerAim?: PlayerAimResolver) { this.reset(); }

  reset(): void {
    this.runtimes.clear();
    for (const definition of Object.values(WEAPONS)) this.runtimes.set(definition.id, { id: definition.id, magazine: definition.magazine, reserve: definition.reserve, state: 'idle', stateTime: 0 });
    this.selected = 'pistol';
    this.unlocked.clear(); this.unlocked.add('pistol');
  }

  update(dt: number): void { for (const runtime of this.runtimes.values()) { if (runtime.state === 'idle') continue; runtime.stateTime = Math.max(0, runtime.stateTime - dt); if (runtime.stateTime > 0) continue; if (runtime.state === 'reloading') this.completeReload(runtime); runtime.state = 'idle'; } }
  definition(id: WeaponId = this.selected): WeaponDefinition { return WEAPONS[id]; }
  runtime(id: WeaponId = this.selected): WeaponRuntime { const runtime = this.runtimes.get(id); if (!runtime) throw new Error(`Missing weapon runtime: ${id}`); return runtime; }
  isUnlocked(id: WeaponId): boolean { return this.unlocked.has(id); }
  unlock(id: WeaponId): boolean { const before = this.unlocked.size; this.unlocked.add(id); return this.unlocked.size > before; }

  select(id: WeaponId): boolean { if (!this.unlocked.has(id)) return false; const current = this.runtime(); if (current.state === 'reloading') return false; this.selected = id; return true; }
  cycle(): WeaponId { const order: WeaponId[] = ['pistol', 'shotgun', 'bow']; const available = order.filter((id) => this.unlocked.has(id)); const next = available[(available.indexOf(this.selected) + 1) % available.length] ?? 'pistol'; this.select(next); return this.selected; }
  addReserve(amount: number, id: WeaponId = this.selected): boolean { if (amount <= 0) return false; this.runtime(id).reserve += Math.floor(amount); return true; }

  fire(sourceId: string, origin: Vector3, fallbackDirection: Vector3): boolean {
    const definition = this.definition(); const runtime = this.runtime();
    if (runtime.state !== 'idle' || runtime.magazine <= 0) return false;
    runtime.magazine--; runtime.state = 'cooldown'; runtime.stateTime = definition.fireInterval;
    const direction = sourceId === 'player' && this.resolvePlayerAim ? this.resolvePlayerAim(this.resolvedDirection) : this.resolvedDirection.copy(fallbackDirection);
    if (direction.lengthSq() <= 1e-6) direction.copy(fallbackDirection);
    this.events.emit('shot', { weaponId: definition.id, sourceId, origin: origin.clone(), direction: direction.clone().normalize() }); return true;
  }

  reload(): boolean { const definition = this.definition(); const runtime = this.runtime(); if (runtime.state !== 'idle' || runtime.reserve <= 0 || runtime.magazine >= definition.magazine) return false; runtime.state = 'reloading'; runtime.stateTime = definition.reloadTime; this.events.emit('weaponReload', { weaponId: definition.id }); return true; }
  private completeReload(runtime: WeaponRuntime): void { const definition = WEAPONS[runtime.id]; const needed = definition.magazine - runtime.magazine; const loaded = Math.min(needed, runtime.reserve); runtime.magazine += loaded; runtime.reserve -= loaded; }
}

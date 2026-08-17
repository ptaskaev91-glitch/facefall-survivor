import * as THREE from 'three';
import type { DamageSystem } from '../combat/DamageSystem';
import type { ProjectileSystem } from '../combat/ProjectileSystem';
import type { FacefallEvents, HitZone, ShotEvent } from '../combat/types';
import { WEAPONS, type WeaponDefinition } from '../combat/weapons';
import type { EventBus } from '../core/EventBus';
import type { EffectSystem } from '../effects/EffectSystem';
import { weaponNoiseRadius } from '../enemies/EnemyPerception';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { PlayerRuntime } from '../player/PlayerRuntime';
import type { WorldRuntime } from '../world/WorldRuntime';
import type { GameHud } from './GameHud';
import type { RunSession } from './RunSession';

export interface CombatRuntimeOptions {
  events: EventBus<FacefallEvents>; damageSystem: DamageSystem; projectileSystem: ProjectileSystem;
  enemySystem: EnemySystem; player: PlayerRuntime; world: WorldRuntime; effects: EffectSystem;
  hud: GameHud; session: RunSession; movementSpread: () => number;
  applyWeaponRecoil: (definition: WeaponDefinition) => void;
  resolveHitZone: (object: THREE.Object3D, point: THREE.Vector3) => HitZone;
  refreshStatus: () => void; endRun: () => void;
}

export class CombatRuntime {
  private readonly raycaster = new THREE.Raycaster();
  private readonly unsubs: Array<() => void> = [];
  constructor(private readonly o: CombatRuntimeOptions) { this.bind(); }
  dispose(): void { for (const u of this.unsubs.splice(0)) u(); }

  private bind(): void {
    const o = this.o;
    this.unsubs.push(o.events.on('shot', (shot) => {
      o.effects.play(`${shot.weaponId}-shot`, { origin: shot.origin, direction: shot.direction });
      const definition = WEAPONS[shot.weaponId];
      o.enemySystem.hearNoise(shot.origin, weaponNoiseRadius(shot.weaponId), 4.8);
      if (shot.sourceId === 'player') { o.player.playWeaponFire(shot.weaponId); o.applyWeaponRecoil(definition); }
      if (definition.fireModel === 'projectile') {
        const direction = this.spreadDirection(shot.direction, definition.spread * o.movementSpread());
        const projectileShot: ShotEvent = { ...shot, direction };
        o.projectileSystem.spawnFromShot(projectileShot); return;
      }
      this.resolveHitscan(shot, definition);
    }));
    this.unsubs.push(o.events.on('weaponReload', ({ weaponId }) => o.player.playWeaponReload(weaponId)));
    this.unsubs.push(o.events.on('hit', (hit) => {
      o.effects.play(hit.critical || hit.amount >= 60 ? 'flesh-hit-heavy' : 'flesh-hit', { origin: hit.hitPoint, direction: hit.direction, parent: o.world.scene });
      if (hit.targetId === 'player') { o.player.playHit(); o.hud.setLastEvent(`PLAYER -${Math.round(hit.amount)} HP`); }
      else {
        const stagger = hit.critical ? 0.42 : hit.amount >= 60 ? 0.32 : hit.amount >= 25 ? 0.16 : 0.08;
        o.enemySystem.stagger(hit.targetId, stagger, hit.direction, hit.impulse * 0.16);
        o.hud.setLastEvent(`${hit.hitZone.toUpperCase()} ${Math.round(hit.amount)} DMG`);
      }
      o.refreshStatus();
    }));
    this.unsubs.push(o.events.on('kill', (hit) => {
      if (hit.targetId === 'player') { o.player.playDeath(); o.endRun(); return; }
      if (!o.enemySystem.kill(hit.targetId)) return;
      const award = o.session.recordKill(hit); o.hud.setLastEvent(`KILL +${award}`); o.refreshStatus();
    }));
  }

  private resolveHitscan(shot: ShotEvent, definition: WeaponDefinition): void {
    const o = this.o; const spread = definition.spread * o.movementSpread();
    for (let pellet = 0; pellet < definition.pellets; pellet++) {
      const direction = this.spreadDirection(shot.direction, spread);
      this.raycaster.set(shot.origin, direction); this.raycaster.far = 70;
      const intersection = this.raycaster.intersectObjects([...o.enemySystem.meshes], true).find(e => e.object.visible && e.object.userData.damageTargetId);
      if (!intersection) continue;
      const worldHit = o.world.collisionWorld.raycast(shot.origin, direction, intersection.distance);
      if (worldHit && worldHit.distance < intersection.distance) continue;
      const targetId = intersection.object.userData.damageTargetId as string;
      const hitZone = o.resolveHitZone(intersection.object, intersection.point);
      const multiplier = hitZone === 'head' ? definition.headMultiplier : hitZone === 'limb' ? definition.limbMultiplier : 1;
      o.damageSystem.apply({ amount: definition.damage * multiplier, kind: shot.weaponId === 'shotgun' ? 'pellet' : 'bullet', sourceId: shot.sourceId, targetId, hitPoint: intersection.point.clone(), direction: direction.clone(), impulse: definition.impulse, hitZone, critical: hitZone === 'head' });
    }
  }

  private spreadDirection(base: THREE.Vector3, spread: number): THREE.Vector3 {
    const r = base.clone(); r.x += (Math.random() - 0.5) * spread; r.y += (Math.random() - 0.5) * spread * 0.45; r.z += (Math.random() - 0.5) * spread; return r.normalize();
  }
}

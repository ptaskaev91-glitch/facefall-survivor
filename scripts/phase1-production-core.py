from pathlib import Path

Path('src/app/RunSession.ts').write_text("""import type { DamageEvent } from '../combat/types';

export interface RunSessionSnapshot { kills: number; score: number; }

export class RunSession {
  private _kills = 0;
  private _score = 0;
  get kills(): number { return this._kills; }
  get score(): number { return this._score; }
  reset(): void { this._kills = 0; this._score = 0; }
  recordKill(hit: DamageEvent): number {
    this._kills += 1;
    const award = 100 + Math.round(hit.amount * 2) + (hit.critical ? 75 : 0);
    this._score += award;
    return award;
  }
  snapshot(): RunSessionSnapshot { return { kills: this._kills, score: this._score }; }
}
""")

Path('src/app/CombatRuntime.ts').write_text("""import * as THREE from 'three';
import type { DamageSystem } from '../combat/DamageSystem';
import type { ProjectileSystem } from '../combat/ProjectileSystem';
import type { FacefallEvents, HitZone, ShotEvent } from '../combat/types';
import { WEAPONS, type WeaponDefinition } from '../combat/weapons';
import type { EventBus } from '../core/EventBus';
import type { EffectSystem } from '../effects/EffectSystem';
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
""")

Path('tests/unit/run-session.test.ts').write_text("""import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { RunSession } from '../../src/app/RunSession';
const hit = (critical = false) => ({ amount: 50, kind: 'bullet' as const, sourceId: 'player', targetId: 'enemy-1', hitPoint: new THREE.Vector3(), direction: new THREE.Vector3(0,0,-1), impulse: 1, hitZone: critical ? 'head' as const : 'torso' as const, critical });
test('RunSession owns resettable kill and score accounting', () => { const s = new RunSession(); assert.equal(s.recordKill(hit()), 200); assert.equal(s.recordKill(hit(true)), 275); assert.deepEqual(s.snapshot(), {kills:2, score:475}); s.reset(); assert.deepEqual(s.snapshot(), {kills:0, score:0}); });
""")

p = Path('src/app/GameApp.ts'); s = p.read_text()
s = s.replace("import type { FacefallEvents, HitZone, ShotEvent } from '../combat/types';", "import type { FacefallEvents, HitZone } from '../combat/types';")
s = s.replace("import { GameHud } from './GameHud';\nimport { GameStateController } from './GameState';", "import { CombatRuntime } from './CombatRuntime';\nimport { GameHud } from './GameHud';\nimport { GameStateController } from './GameState';\nimport { RunSession } from './RunSession';")
s = s.replace("  private readonly hud: GameHud;\n", "  private readonly hud: GameHud;\n  private readonly session = new RunSession();\n  private readonly combat: CombatRuntime;\n")
s = s.replace("  private score = 0;\n  private kills = 0;\n", "")
start = s.index('  private bindCombatEvents(): void {'); end = s.index('  private bindUi(): void {', start); s = s[:start] + s[end:]
s = s.replace('    this.enemySystem.setNavigationQuery(new CollisionNavigationQuery(this.world.collisionWorld));\n    this.bindCombatEvents();\n    this.bindUi();', '''    this.enemySystem.setNavigationQuery(new CollisionNavigationQuery(this.world.collisionWorld));
    this.combat = new CombatRuntime({ events: this.events, damageSystem: this.damageSystem, projectileSystem: this.projectileSystem, enemySystem: this.enemySystem, player: this.player, world: this.world, effects: this.effects, hud: this.hud, session: this.session, movementSpread: () => this.movementSpreadMultiplier, applyWeaponRecoil: (definition) => this.applyWeaponRecoil(definition), resolveHitZone: (object, point) => this.getHitZone(object, point), refreshStatus: () => this.refreshStatus(), endRun: () => this.endRun() });
    this.bindUi();''')
s = s.replace('    for (const unsubscribe of this.unsubscribeEvents.splice(0)) unsubscribe();\n\n    this.unregisterPlayerDamage();', '    for (const unsubscribe of this.unsubscribeEvents.splice(0)) unsubscribe();\n    this.combat.dispose();\n\n    this.unregisterPlayerDamage();')
s = s.replace('    this.score = 0;\n    this.kills = 0;\n', '    this.session.reset();\n')
s = s.replace('this.waveDirector.wave, this.kills, this.score', 'this.waveDirector.wave, this.session.kills, this.session.score')
s = s.replace('kills: this.kills,\n      score: this.score,', 'kills: this.session.kills,\n      score: this.session.score,')
p.write_text(s)

p = Path('src/player/PlayerRuntime.ts'); s = p.read_text(); anchor = '  playWeaponReload(weaponId: WeaponId): boolean {'
if 'playHit(): boolean' not in s: s = s.replace(anchor, "  playHit(): boolean { return this.productionVisualActive && this.characterModel.playHit(); }\n\n  playDeath(): boolean { return this.productionVisualActive && this.characterModel.playDeath(); }\n\n" + anchor)
p.write_text(s)

p = Path('src/characters/CharacterModel.ts'); s = p.read_text(); anchor = '  playShotgunReload(): boolean {'
if '  playHit(): boolean {' not in s:
    insert = "  playHit(): boolean { const clip = this.findClip(['Hit', 'Hit_Reaction', 'Damage'], [/hit/i, /damage/i, /impact/i]); return clip ? this.playOverride(clip, Math.min(0.55, Math.max(0.2, clip.duration)), 0.04) : false; }\n\n  playDeath(): boolean { const clip = this.findClip(['Death', 'Die', 'Death_01'], [/death/i, /die/i, /dying/i]); return clip ? this.playOverride(clip, Math.max(0.8, clip.duration), 0.08) : false; }\n\n"
    s = s.replace(anchor, insert + anchor)
p.write_text(s)

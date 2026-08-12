import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from 'three';
import { WeaponSystem } from '../../src/combat/WeaponSystem';
import type { FacefallEvents } from '../../src/combat/types';
import { EventBus } from '../../src/core/EventBus';

test('WeaponSystem fire consumes ammo and respects cooldown', () => {
  const events = new EventBus<FacefallEvents>();
  const weapons = new WeaponSystem(events);
  let shots = 0;
  events.on('shot', () => shots++);

  const origin = new Vector3();
  const direction = new Vector3(0, 0, -1);
  const startAmmo = weapons.runtime('pistol').magazine;
  assert.equal(weapons.fire('enemy-test', origin, direction), true);
  assert.equal(weapons.runtime('pistol').magazine, startAmmo - 1);
  assert.equal(weapons.fire('enemy-test', origin, direction), false);
  assert.equal(shots, 1);

  weapons.update(10);
  assert.equal(weapons.fire('enemy-test', origin, direction), true);
  assert.equal(shots, 2);
});

test('WeaponSystem reload transfers reserve only after reload timer completes', () => {
  const events = new EventBus<FacefallEvents>();
  const weapons = new WeaponSystem(events);
  const runtime = weapons.runtime('pistol');
  runtime.magazine = 2;
  const reserveBefore = runtime.reserve;

  assert.equal(weapons.reload(), true);
  assert.equal(runtime.state, 'reloading');
  assert.equal(weapons.select('shotgun'), false);
  weapons.update(weapons.definition('pistol').reloadTime + 0.01);
  assert.equal(runtime.magazine, weapons.definition('pistol').magazine);
  assert.equal(runtime.reserve, reserveBefore - (weapons.definition('pistol').magazine - 2));
  assert.equal(runtime.state, 'idle');
});

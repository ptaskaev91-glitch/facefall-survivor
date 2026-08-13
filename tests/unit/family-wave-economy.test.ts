import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../../src/core/EventBus';
import { WeaponSystem } from '../../src/combat/WeaponSystem';
import type { FacefallEvents } from '../../src/combat/types';
import { WaveDirector } from '../../src/waves/WaveDirector';

test('weapon shop keeps shotgun and bow locked until purchase', () => {
  const weapons = new WeaponSystem(new EventBus<FacefallEvents>());
  assert.equal(weapons.isUnlocked('pistol'), true);
  assert.equal(weapons.isUnlocked('shotgun'), false);
  assert.equal(weapons.isUnlocked('bow'), false);
  assert.equal(weapons.select('shotgun'), false);
  weapons.unlock('shotgun');
  assert.equal(weapons.select('shotgun'), true);
});

test('family size and later waves increase zombie pressure', () => {
  const director = new WaveDirector() as unknown as { buildComposition: (wave: number, heroes: number) => string[] };
  const earlySolo = director.buildComposition(2, 1).length;
  const lateSolo = director.buildComposition(7, 1).length;
  const lateFamily = director.buildComposition(7, 3).length;
  assert.ok(lateSolo > earlySolo);
  assert.ok(lateFamily > lateSolo);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from 'three';
import { resolveThirdPersonAimPoint, resolveThirdPersonShotDirection } from '../../src/aim/ThirdPersonShotResolver';
import { WeaponSystem } from '../../src/combat/WeaponSystem';
import type { FacefallEvents } from '../../src/combat/types';
import { EventBus } from '../../src/core/EventBus';

test('third-person aim chooses the nearest camera-ray intersection', () => {
  const origin = new Vector3(0, 2, 4);
  const ray = new Vector3(0, 0, -1);
  const out = new Vector3();

  resolveThirdPersonAimPoint(
    origin,
    ray,
    { point: new Vector3(0, 2, -8), distance: 12 },
    { point: new Vector3(0, 2, -2), distance: 6 },
    70,
    out
  );

  assert.deepEqual(out.toArray(), [0, 2, -2]);
});

test('third-person shot converges from physical muzzle to camera aim point', () => {
  const muzzle = new Vector3(0.65, 1.2, 0.4);
  const aimPoint = new Vector3(-1.2, 1.75, -8.5);
  const direction = resolveThirdPersonShotDirection(muzzle, aimPoint, new Vector3(1, 0, 0), new Vector3());
  const expected = aimPoint.clone().sub(muzzle).normalize();

  assert.ok(direction.distanceTo(expected) < 1e-10);
  assert.ok(direction.dot(new Vector3(1, 0, 0)) < 0.9);
});

test('WeaponSystem passes the exact physical muzzle origin into player aim resolver', () => {
  const events = new EventBus<FacefallEvents>();
  const muzzle = new Vector3(3, 1.2, -2);
  let seenOrigin: Vector3 | null = null;
  let shotDirection: Vector3 | null = null;

  const weapons = new WeaponSystem(events, (out, origin) => {
    seenOrigin = origin.clone();
    return out.set(0.25, 0.1, -1).normalize();
  });
  events.on('shot', (shot) => { shotDirection = shot.direction.clone(); });

  assert.equal(weapons.fire('player', muzzle, new Vector3(1, 0, 0)), true);
  assert.deepEqual(seenOrigin?.toArray(), muzzle.toArray());
  assert.ok(shotDirection);
  assert.ok(shotDirection!.dot(new Vector3(1, 0, 0)) < 0.9);
});

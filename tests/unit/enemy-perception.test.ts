import assert from 'node:assert/strict';
import test from 'node:test';
import {
  footstepNoiseRadius,
  perceptionInterval,
  sightRangeFor,
  steeringInterval,
  weaponNoiseRadius,
} from '../../src/enemies/EnemyPerception';

test('enemy perception LOD reduces expensive work with distance', () => {
  assert.ok(perceptionInterval(5) < perceptionInterval(15));
  assert.ok(perceptionInterval(15) < perceptionInterval(25));
  assert.ok(perceptionInterval(25) < perceptionInterval(40));

  assert.ok(steeringInterval(5) < steeringInterval(15));
  assert.ok(steeringInterval(15) < steeringInterval(25));
  assert.ok(steeringInterval(25) < steeringInterval(40));
});

test('weapon and movement noise follow the intended stealth hierarchy', () => {
  assert.ok(weaponNoiseRadius('shotgun') > weaponNoiseRadius('pistol'));
  assert.ok(weaponNoiseRadius('pistol') > weaponNoiseRadius('bow'));
  assert.ok(footstepNoiseRadius(true) > footstepNoiseRadius(false));
  assert.ok(weaponNoiseRadius('bow') > footstepNoiseRadius(false));
});

test('runner sees farther than walker and brute', () => {
  assert.ok(sightRangeFor('runner') > sightRangeFor('walker'));
  assert.ok(sightRangeFor('runner') > sightRangeFor('brute'));
});

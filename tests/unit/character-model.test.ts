import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLocomotionState } from '../../src/characters/CharacterModel';

test('CharacterModel locomotion state resolves idle at rest and tiny drift', () => {
  assert.equal(resolveLocomotionState(0), 'idle');
  assert.equal(resolveLocomotionState(0.149), 'idle');
  assert.equal(resolveLocomotionState(Number.NaN), 'idle');
  assert.equal(resolveLocomotionState(-5), 'idle');
});

test('CharacterModel locomotion state maps normal movement to walk', () => {
  assert.equal(resolveLocomotionState(0.15), 'walk');
  assert.equal(resolveLocomotionState(5), 'walk');
  assert.equal(resolveLocomotionState(5.99), 'walk');
});

test('CharacterModel locomotion state maps sprint speed to run', () => {
  assert.equal(resolveLocomotionState(6), 'run');
  assert.equal(resolveLocomotionState(7.1), 'run');
  assert.equal(resolveLocomotionState(Number.POSITIVE_INFINITY), 'idle');
});

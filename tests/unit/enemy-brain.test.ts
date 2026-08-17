import assert from 'node:assert/strict';
import test from 'node:test';
import { EnemyBrain, type EnemyBrainContext } from '../../src/enemies/EnemyBrain';

const base: EnemyBrainContext = {
  distanceToPlayer: 10,
  attackRange: 1.5,
  attackTimer: 0,
  staggerTimer: 0,
  hasLineOfSight: false,
  targetStickTimer: 0,
  alertTimer: 0
};

test('EnemyBrain prioritizes stagger above every other intent', () => {
  const brain = new EnemyBrain();
  assert.equal(brain.decide({ ...base, staggerTimer: 0.2, hasLineOfSight: true, distanceToPlayer: 1 }), 'stagger');
});

test('EnemyBrain maps perception and range to wander/investigate/chase/attack/hold', () => {
  const brain = new EnemyBrain();
  assert.equal(brain.decide(base), 'wander');
  assert.equal(brain.decide({ ...base, alertTimer: 2 }), 'investigate');
  assert.equal(brain.decide({ ...base, targetStickTimer: 0.4, alertTimer: 2 }), 'chase');
  assert.equal(brain.decide({ ...base, hasLineOfSight: true }), 'chase');
  assert.equal(brain.decide({ ...base, hasLineOfSight: true, distanceToPlayer: 1.2, attackTimer: 0 }), 'attack');
  assert.equal(brain.decide({ ...base, hasLineOfSight: true, distanceToPlayer: 1.2, attackTimer: 0.3 }), 'hold');
});

test('EnemyBrain falls from sticky chase to investigate after sight memory expires', () => {
  const brain = new EnemyBrain();
  assert.equal(brain.decide({ ...base, targetStickTimer: 0.01, alertTimer: 3 }), 'chase');
  assert.equal(brain.decide({ ...base, targetStickTimer: 0, alertTimer: 3 }), 'investigate');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from 'three';
import { DamageSystem } from '../../src/combat/DamageSystem';
import { Health } from '../../src/combat/Health';
import type { FacefallEvents } from '../../src/combat/types';
import { EventBus } from '../../src/core/EventBus';

test('Health clamps damage/heal and reset restores maximum', () => {
  const health = new Health(100);
  assert.equal(health.damage(35), 35);
  assert.equal(health.value, 65);
  assert.equal(health.heal(20), 20);
  assert.equal(health.value, 85);
  assert.equal(health.heal(999), 15);
  assert.equal(health.value, 100);
  assert.equal(health.damage(999), 100);
  assert.equal(health.value, 0);
  assert.equal(health.alive, false);
  assert.equal(health.heal(10), 0);
  health.reset();
  assert.equal(health.value, 100);
  assert.equal(health.alive, true);
});

test('DamageSystem emits one hit and one kill for lethal damage', () => {
  const events = new EventBus<FacefallEvents>();
  const damage = new DamageSystem(events);
  const health = new Health(50);
  damage.register({ id: 'target', health });

  const hits: number[] = [];
  const kills: number[] = [];
  events.on('hit', (event) => hits.push(event.amount));
  events.on('kill', (event) => kills.push(event.amount));

  const common = {
    kind: 'bullet' as const,
    sourceId: 'player',
    targetId: 'target',
    hitPoint: new Vector3(),
    direction: new Vector3(0, 0, -1),
    impulse: 1,
    hitZone: 'torso' as const,
    critical: false
  };

  const first = damage.apply({ ...common, amount: 20 });
  assert.equal(first?.remainingHealth, 30);
  assert.equal(first?.lethal, false);

  const lethal = damage.apply({ ...common, amount: 100 });
  assert.equal(lethal?.amount, 30);
  assert.equal(lethal?.remainingHealth, 0);
  assert.equal(lethal?.lethal, true);
  assert.deepEqual(hits, [20, 30]);
  assert.deepEqual(kills, [30]);

  assert.equal(damage.apply({ ...common, amount: 10 }), null);
  assert.deepEqual(kills, [30]);
});

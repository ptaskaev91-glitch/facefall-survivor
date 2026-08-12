import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from 'three';
import { GameStateController } from '../../src/app/GameState';
import { LocalAvoidance } from '../../src/navigation/LocalAvoidance';
import { SpatialHash, type SpatialHashItem } from '../../src/physics/SpatialHash';

test('SpatialHash insert/update/remove keeps radius queries and cell count correct', () => {
  const hash = new SpatialHash<SpatialHashItem>(4);
  const a = { id: 'a', position: new Vector3(1, 0, 1) };
  const b = { id: 'b', position: new Vector3(2, 0, 1) };
  const c = { id: 'c', position: new Vector3(12, 0, 12) };
  hash.insert(a);
  hash.insert(b);
  hash.insert(c);
  assert.deepEqual(hash.queryRadius(new Vector3(0, 0, 0), 4).map((item) => item.id).sort(), ['a', 'b']);
  assert.equal(hash.occupiedCellCount, 2);

  b.position.set(10, 0, 10);
  hash.update(b);
  assert.deepEqual(hash.queryRadius(new Vector3(0, 0, 0), 4).map((item) => item.id), ['a']);
  hash.remove(a);
  assert.equal(hash.queryRadius(new Vector3(0, 0, 0), 4).length, 0);
  hash.clear();
  assert.equal(hash.occupiedCellCount, 0);
});

test('LocalAvoidance preserves desired velocity without neighbours and separates close actors', () => {
  const avoidance = new LocalAvoidance<SpatialHashItem>();
  const self = { id: 'self', position: new Vector3(0, 0, 0) };
  const neighbour = { id: 'n', position: new Vector3(0.5, 0, 0) };
  const desired = new Vector3(0, 0, -1);
  const out = new Vector3();

  avoidance.apply(self, [], desired, 2, 1, out);
  assert.deepEqual(out.toArray(), desired.toArray());

  avoidance.apply(self, [self, neighbour], desired, 2, 1, out);
  assert.ok(out.x < 0, 'close neighbour on +X should steer self toward -X');
  assert.equal(out.z, -1);
});

test('GameStateController allows canonical lifecycle and rejects illegal transitions', () => {
  const state = new GameStateController();
  assert.equal(state.current, 'boot');
  state.transition('menu');
  state.transition('loading');
  state.transition('playing');
  state.transition('paused');
  state.transition('playing');
  state.transition('gameover');
  state.transition('loading');
  state.transition('playing');
  assert.throws(() => state.transition('boot'), /Invalid game state transition/);
  state.transition('disposed');
  assert.throws(() => state.transition('menu'), /Invalid game state transition/);
});

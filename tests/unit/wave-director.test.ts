import assert from 'node:assert/strict';
import test from 'node:test';
import { WaveDirector } from '../../src/waves/WaveDirector';
import type { LevelMarker } from '../../src/world/LevelManifest';

const markers: LevelMarker[] = [
  { id: 'spawn-a', kind: 'enemy-spawn', position: { x: 5, y: 0, z: -4 }, radius: 3 },
  { id: 'spawn-b', kind: 'enemy-spawn', position: { x: -5, y: 0, z: 4 }, radius: 4 }
];

test('WaveDirector stays idle before configure/reset and starts wave after intermission', () => {
  const waves = new WaveDirector();
  assert.deepEqual(waves.update(10, 0, 20), []);

  waves.configure(markers);
  waves.reset();
  assert.deepEqual(waves.update(0.4, 0, 20), []);
  assert.equal(waves.wave, 0);
  assert.deepEqual(waves.update(0.5, 0, 20), []);
  assert.equal(waves.wave, 1);

  const spawn = waves.update(1, 0, 20);
  assert.equal(spawn.length, 1);
  assert.equal(['walker', 'runner', 'brute'].includes(spawn[0].type), true);
});

test('WaveDirector respects max-active cap and stop', () => {
  const waves = new WaveDirector();
  waves.configure(markers);
  waves.reset();
  waves.update(1, 0, 2);
  assert.deepEqual(waves.update(1, 2, 2), []);
  waves.stop();
  assert.deepEqual(waves.update(10, 0, 20), []);
});

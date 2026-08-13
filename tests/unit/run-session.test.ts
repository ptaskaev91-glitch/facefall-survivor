import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { RunSession } from '../../src/app/RunSession';
const hit = (critical = false) => ({ amount: 50, kind: 'bullet' as const, sourceId: 'player', targetId: 'enemy-1', hitPoint: new THREE.Vector3(), direction: new THREE.Vector3(0,0,-1), impulse: 1, hitZone: critical ? 'head' as const : 'torso' as const, critical });
test('RunSession owns resettable kill and score accounting', () => { const s = new RunSession(); assert.equal(s.recordKill(hit()), 200); assert.equal(s.recordKill(hit(true)), 275); assert.deepEqual(s.snapshot(), {kills:2, score:475}); s.reset(); assert.deepEqual(s.snapshot(), {kills:0, score:0}); });

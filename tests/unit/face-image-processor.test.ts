import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveFaceCrop } from '../../src/characters/FaceImageProcessor';

function assertFourByFive(width: number, height: number): void {
  assert.ok(Math.abs(width / height - 0.8) < 1e-9);
}

test('detected face crop follows the face instead of the image center', () => {
  const crop = resolveFaceCrop(1600, 900, { x: 1120, y: 150, width: 240, height: 300 }, 'makar');
  assert.equal(crop.detected, true);
  assertFourByFive(crop.width, crop.height);
  assert.ok(crop.x > 800, `expected right-side crop, got x=${crop.x}`);
  assert.ok(crop.x >= 0 && crop.y >= 0);
  assert.ok(crop.x + crop.width <= 1600 + 1e-6);
  assert.ok(crop.y + crop.height <= 900 + 1e-6);
});

test('portrait fallback keeps a bounded 4:5 crop with upward face bias', () => {
  const crop = resolveFaceCrop(1200, 1800, null, 'makar');
  assert.equal(crop.detected, false);
  assertFourByFive(crop.width, crop.height);
  assert.ok(crop.y < (1800 - crop.height) / 2, 'fallback should bias toward the upper portrait area');
  assert.ok(crop.x >= 0 && crop.y >= 0);
  assert.ok(crop.x + crop.width <= 1200 + 1e-6);
  assert.ok(crop.y + crop.height <= 1800 + 1e-6);
});

test('role profiles keep valid framing while allowing family-specific fitting', () => {
  const face = { x: 330, y: 180, width: 260, height: 320 };
  const makar = resolveFaceCrop(1000, 1400, face, 'makar');
  const mama = resolveFaceCrop(1000, 1400, face, 'mama');
  const papa = resolveFaceCrop(1000, 1400, face, 'papa');

  for (const crop of [makar, mama, papa]) {
    assert.equal(crop.detected, true);
    assertFourByFive(crop.width, crop.height);
    assert.ok(crop.x >= 0 && crop.y >= 0);
    assert.ok(crop.x + crop.width <= 1000 + 1e-6);
    assert.ok(crop.y + crop.height <= 1400 + 1e-6);
  }
  assert.notEqual(mama.height, papa.height);
  assert.notEqual(mama.y, papa.y);
});

test('tiny false-positive detections fall back safely', () => {
  const crop = resolveFaceCrop(1200, 900, { x: 20, y: 20, width: 10, height: 10 }, 'makar');
  assert.equal(crop.detected, false);
  assertFourByFive(crop.width, crop.height);
});

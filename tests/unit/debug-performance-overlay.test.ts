import assert from 'node:assert/strict';
import test from 'node:test';
import { compactNumber } from '../../src/debug/DebugMetricFormat';

test('debug metric display keeps large triangle counts compact', () => {
  assert.equal(compactNumber(999), '999');
  assert.equal(compactNumber(12_345), '12.3k');
  assert.equal(compactNumber(2_345_678), '2.35m');
});

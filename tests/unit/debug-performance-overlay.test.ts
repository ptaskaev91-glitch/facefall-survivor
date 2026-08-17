import assert from 'node:assert/strict';
import test from 'node:test';

// Keep this tiny test focused on the display contract that is safe to run in Node.
// Runtime instrumentation itself is covered by the Playwright smoke test.
function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

test('debug metric display keeps large triangle counts compact', () => {
  assert.equal(compactNumber(999), '999');
  assert.equal(compactNumber(12_345), '12.3k');
  assert.equal(compactNumber(2_345_678), '2.35m');
});

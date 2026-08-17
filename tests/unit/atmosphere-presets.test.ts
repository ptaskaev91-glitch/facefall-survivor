import assert from 'node:assert/strict';
import test from 'node:test';
import { ATMOSPHERE_PRESETS, atmosphereForWave, bloodMoonVisibility, parseAtmosphereOverride } from '../../src/world/AtmospherePresets';

test('wave progression maps to dawn, overcast, dusk and blood moon', () => {
  assert.equal(atmosphereForWave(1), 'dawn');
  assert.equal(atmosphereForWave(2), 'dawn');
  assert.equal(atmosphereForWave(3), 'overcast');
  assert.equal(atmosphereForWave(4), 'overcast');
  assert.equal(atmosphereForWave(5), 'dusk');
  assert.equal(atmosphereForWave(6), 'dusk');
  assert.equal(atmosphereForWave(7), 'blood-moon');
  assert.equal(atmosphereForWave(99), 'blood-moon');
});

test('atmosphere presets keep weather and exposure parameters in sane ranges', () => {
  for (const preset of Object.values(ATMOSPHERE_PRESETS)) {
    assert.ok(preset.fogDensity > 0 && preset.fogDensity < 0.08);
    assert.ok(preset.exposure > 0.4 && preset.exposure < 1.5);
    assert.ok(preset.rainIntensity >= 0 && preset.rainIntensity <= 1);
    assert.ok(preset.stormIntensity >= 0 && preset.stormIntensity <= 1);
    assert.ok(preset.hazeIntensity >= 0 && preset.hazeIntensity <= 1);
    assert.ok(preset.moonOpacity >= 0 && preset.moonOpacity <= 1);
  }
  assert.ok(ATMOSPHERE_PRESETS['blood-moon'].fogDensity > ATMOSPHERE_PRESETS.dawn.fogDensity);
  assert.ok(ATMOSPHERE_PRESETS.overcast.rainIntensity > ATMOSPHERE_PRESETS.dusk.rainIntensity);
});

test('blood moon visibility gets worse with distance but preserves a playable floor', () => {
  const samples = [0, 6, 9, 12, 18, 24, 36, 60].map(bloodMoonVisibility);
  for (let i = 1; i < samples.length; i += 1) assert.ok(samples[i] <= samples[i - 1]);
  assert.equal(samples[0], 1);
  assert.ok(bloodMoonVisibility(12) < 0.65);
  assert.ok(bloodMoonVisibility(24) < 0.25);
  assert.ok(bloodMoonVisibility(100) >= 0.1);
});

test('debug atmosphere aliases are explicit and invalid values do not override gameplay', () => {
  assert.equal(parseAtmosphereOverride('dawn'), 'dawn');
  assert.equal(parseAtmosphereOverride('rain'), 'overcast');
  assert.equal(parseAtmosphereOverride('sunset'), 'dusk');
  assert.equal(parseAtmosphereOverride('night'), 'blood-moon');
  assert.equal(parseAtmosphereOverride('unknown'), null);
});

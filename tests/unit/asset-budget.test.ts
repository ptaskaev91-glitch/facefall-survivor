import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { ASSET_BUDGET } from '../../src/assets/AssetBudget';

const bytes = (path: string) => statSync(resolve(process.cwd(), path)).size;

test('noncritical production GLBs stay within mobile byte budgets', () => {
  const shotgun = bytes('public/assets/weapons/shotgun.glb');
  const bow = bytes('public/assets/weapons/bow-arrow.glb');
  const infected = bytes('public/assets/enemies/mesh2motion-human-zombie/human-zombie.glb');
  assert.ok(shotgun <= ASSET_BUDGET.weaponGlbBytes, `shotgun.glb ${shotgun} > ${ASSET_BUDGET.weaponGlbBytes}`);
  assert.ok(bow <= ASSET_BUDGET.weaponGlbBytes, `bow-arrow.glb ${bow} > ${ASSET_BUDGET.weaponGlbBytes}`);
  assert.ok(infected <= ASSET_BUDGET.sharedInfectedGlbBytes, `human-zombie.glb ${infected} > ${ASSET_BUDGET.sharedInfectedGlbBytes}`);
});

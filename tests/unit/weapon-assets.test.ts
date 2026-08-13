import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function glbJson(file: string): any {
  const bytes = readFileSync(resolve(process.cwd(), file));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  const len = bytes.readUInt32LE(12);
  return JSON.parse(bytes.subarray(20, 20 + len).toString('utf8').replace(/[\u0000\u0020]+$/g, ''));
}

test('production shotgun and bow/arrow are real GLB assets', () => {
  const shotgun = glbJson('public/assets/weapons/shotgun.glb');
  const bow = glbJson('public/assets/weapons/bow-arrow.glb');
  const shotgunNames = (shotgun.nodes ?? []).map((node: any) => node.name ?? '');
  const bowNames = (bow.nodes ?? []).map((node: any) => node.name ?? '');
  assert.ok(shotgunNames.includes('shotgun-glb-root'));
  assert.ok(bowNames.includes('bow-glb-root'));
  assert.ok(bowNames.includes('bow-arrow-glb'));
});

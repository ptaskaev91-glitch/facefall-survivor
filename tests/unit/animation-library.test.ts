import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

interface GltfAnimation { name?: string }
interface GltfDocument { animations?: GltfAnimation[] }

function animationNames(): string[] {
  const path = resolve(process.cwd(), 'public/assets/animations/quaternius-universal-animation-library/UAL1_Standard.glb');
  const bytes = readFileSync(path);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF', 'Expected GLB magic');
  assert.equal(bytes.readUInt32LE(4), 2, 'Expected GLB v2');

  const jsonChunkLength = bytes.readUInt32LE(12);
  const jsonChunkType = bytes.readUInt32LE(16);
  assert.equal(jsonChunkType, 0x4e4f534a, 'Expected JSON as first GLB chunk');

  const json = bytes
    .subarray(20, 20 + jsonChunkLength)
    .toString('utf8')
    .replace(/[\u0000\u0020]+$/g, '');
  const document = JSON.parse(json) as GltfDocument;
  return (document.animations ?? []).map((animation) => animation.name ?? '').filter(Boolean);
}

test('vendored Universal Animation Library contains pistol combat clips', () => {
  const names = animationNames();
  const fire = names.find((name) => /pistol.*(fire|shoot|shot)|(fire|shoot|shot).*pistol/i.test(name));
  const reload = names.find((name) => /pistol.*reload|reload.*pistol/i.test(name));

  assert.ok(fire, `Missing pistol fire/shoot clip. Available clips: ${names.join(', ')}`);
  assert.ok(reload, `Missing pistol reload clip. Available clips: ${names.join(', ')}`);
});


test('vendored Universal Animation Library contains long-gun combat clips', () => {
  const names = animationNames();
  const fire = names.find((name) => /(shotgun|rifle).*(fire|shoot|shot)|(fire|shoot|shot).*(shotgun|rifle)/i.test(name));
  const reload = names.find((name) => /(shotgun|rifle).*reload|reload.*(shotgun|rifle)/i.test(name));

  assert.ok(fire, `Missing shotgun/rifle fire clip. Available clips: ${names.join(', ')}`);
  assert.ok(reload, `Missing shotgun/rifle reload clip. Available clips: ${names.join(', ')}`);
});

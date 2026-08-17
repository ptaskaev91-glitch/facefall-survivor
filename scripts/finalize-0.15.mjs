import { readFile, writeFile } from 'node:fs/promises';

const VERSION = '0.15.0';
const DATE = '2026-08-17';

async function replace(path, transform) {
  const before = await readFile(path, 'utf8');
  const after = transform(before);
  if (after !== before) await writeFile(path, after);
}

await replace('package.json', (text) => text.replace('"version": "0.14.0"', `"version": "${VERSION}"`));
await replace('package-lock.json', (text) => {
  let out = text;
  out = out.replace('"version": "0.14.0"', `"version": "${VERSION}"`);
  out = out.replace('"version": "0.14.0"', `"version": "${VERSION}"`);
  return out;
});
await replace('engine-lab.html', (text) => text.replaceAll('0.14.0', VERSION));

const readmeBlock = `\n## 0.15.0 — Face System 2.0 checkpoint (${DATE})\n\n- Family portrait uploads are normalized locally to a bounded **512×640 / 4:5** texture before storage and rendering.\n- When the browser exposes the native Shape Detection \\`FaceDetector\\`, the largest detected face drives the crop, including off-center phone photos.\n- Browsers without \\`FaceDetector\\` use a deterministic upward-biased 4:5 fallback, so photo upload never depends on that optional API.\n- Makar, Mama and Papa have separate crop profiles for slightly different face framing.\n- The normalized portrait is stored as a compact JPEG instead of retaining the original multi-megabyte phone image in localStorage.\n- Existing v1 local face entries are migrated on-device to v2 before a run starts; photos are never uploaded to a server.\n- \\`CharacterModel\\` remains the owner of the curved shell attached to the real \\`Head\\` bone; image preparation now lives separately in \\`FaceImageProcessor\\`.\n- Unit tests cover detected, off-center, fallback and role-specific crops; mobile Playwright covers upload → face-aware crop → 512×640 JPEG → all three production face shells.\n`;

await replace('README.md', (text) => {
  let out = text.replace('Engine Next 0.14.0', `Engine Next ${VERSION}`);
  out = out.replace(
    'With authored navigation and infected perception now active, the next ordered work is **Face System 2.0 crop/fitting polish**, followed by a debug/performance overlay, Android profiling and final HUD/performance work.',
    'With Face System 2.0 now active, the next ordered work is **`?debug=1` performance/AI/nav metrics**, followed by Android profiling, budget tuning and final HUD cleanup.'
  );
  if (!out.includes('## 0.15.0 — Face System 2.0 checkpoint')) {
    const marker = '## 0.14.0 — infected perception + AI LOD checkpoint';
    out = out.includes(marker) ? out.replace(marker, `${readmeBlock}\n${marker}`) : `${out.trimEnd()}\n${readmeBlock}\n`;
  }
  return out;
});

const devBlock = `\n## 0.15.0 — Face System 2.0 checkpoint (${DATE})\n\n> This checkpoint is authoritative for family portrait preprocessing and supersedes the older raw-photo fitting path.\n\n- [x] local 512×640 / 4:5 portrait normalization before persistence;\n- [x] optional native FaceDetector crop for off-center faces;\n- [x] deterministic fallback when Shape Detection is unavailable;\n- [x] separate Makar / Mama / Papa crop profiles;\n- [x] compact JPEG v2 storage with local v1 migration;\n- [x] production curved Head-bone shell retained as the 3D fitting boundary;\n- [x] unit crop-policy coverage;\n- [x] mobile browser coverage for detector path, normalized dimensions and all three family face shells.\n\nNext ordered work:\n- [ ] \\`?debug=1\\` FPS/frame-time/draw-call/triangle/active-enemy/AI-nav metrics;\n- [ ] Android profiling and budget tuning;\n- [ ] final HUD cleanup after profiling;\n- [ ] optional nav debug overlay only if it materially helps profiling.\n`;
await replace('dev.md', (text) => text.includes('## 0.15.0 — Face System 2.0 checkpoint') ? text : `${text.trimEnd()}\n${devBlock}\n`);

const historyBlock = `\n## 0.15.0 — Face System 2.0 (${DATE})\n\n- Continued from the stable 0.14.0 infected-perception checkpoint.\n- Added \\`FaceImageProcessor\\` as the client-side preprocessing boundary for family portraits.\n- Portraits are normalized to 512×640 / 4:5 before entering FaceStore or CharacterModel.\n- Native FaceDetector is used when available to follow the largest off-center face; unsupported/failing browsers fall back safely.\n- Added family-specific crop profiles for Makar, Mama and Papa.\n- FaceStore moved to v2 compact JPEG entries and locally migrates existing v1 portraits.\n- No photo network transfer was introduced; the complete pipeline remains on-device/browser-local.\n- Existing curved face shell on the real Head bone remains the production 3D fitting approach.\n- Added unit and live mobile browser coverage for the new preprocessing path.\n- Development PR: #35.\n`;
await replace('history.md', (text) => text.includes('## 0.15.0 — Face System 2.0') ? text : `${text.trimEnd()}\n${historyBlock}\n`);

const structureBlock = `\n## Engine Next 0.15.0 Face System structure\n\nFace ownership is now split into two explicit layers:\n\n- \\`src/characters/FaceImageProcessor.ts\\` — browser-local detection/crop/resize/compression policy;\n- \\`src/persistence/FaceStore.ts\\` — normalized v2 family portrait persistence and v1 migration;\n- \\`src/app/ProductShell.ts\\` — upload orchestration and migration gate before run start;\n- \\`src/characters/CharacterModel.ts\\` — production curved front/rear face shells attached to the real \\`Head\\` bone;\n- \\`src/characters/FaceSystem.ts\\` — low-poly fallback only.\n\nThe preprocessing layer has no Three.js dependency and the 3D fitting layer has no file-input/localStorage responsibility. No server/backend owns face data.\n`;
await replace('structure.md', (text) => text.includes('## Engine Next 0.15.0 Face System structure') ? text : `${text.trimEnd()}\n${structureBlock}\n`);

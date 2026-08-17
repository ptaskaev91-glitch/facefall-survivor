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

const readmeBlock = `
## 0.15.0 — Face System 2.0 checkpoint (${DATE})

- Family portrait uploads are normalized locally to a bounded **512×640 / 4:5** texture before storage and rendering.
- When the browser exposes the native Shape Detection FaceDetector, the largest detected face drives the crop, including off-center phone photos.
- Browsers without FaceDetector use a deterministic upward-biased 4:5 fallback, so photo upload never depends on that optional API.
- Makar, Mama and Papa have separate crop profiles for slightly different face framing.
- The normalized portrait is stored as a compact JPEG instead of retaining the original multi-megabyte phone image in localStorage.
- Existing v1 local face entries are migrated on-device to v2 before a run starts; photos are never uploaded to a server.
- CharacterModel remains the owner of the curved shell attached to the real Head bone; image preparation now lives separately in FaceImageProcessor.
- Unit tests cover detected, off-center, fallback and role-specific crops; mobile Playwright covers upload → face-aware crop → 512×640 JPEG → all three production face shells.
`;

await replace('README.md', (text) => {
  let out = text.replace('Engine Next 0.14.0', `Engine Next ${VERSION}`);
  out = out.replace(
    'With authored navigation and infected perception now active, the next ordered work is **Face System 2.0 crop/fitting polish**, followed by a debug/performance overlay, Android profiling and final HUD/performance work.',
    'With Face System 2.0 now active, the next ordered work is **?debug=1 performance/AI/nav metrics**, followed by Android profiling, budget tuning and final HUD cleanup.'
  );
  if (!out.includes('## 0.15.0 — Face System 2.0 checkpoint')) {
    const marker = '## 0.14.0 — infected perception + AI LOD checkpoint';
    out = out.includes(marker) ? out.replace(marker, `${readmeBlock}\n${marker}`) : `${out.trimEnd()}\n${readmeBlock}\n`;
  }
  return out;
});

const devBlock = `
## 0.15.0 — Face System 2.0 checkpoint (${DATE})

> This checkpoint is authoritative for family portrait preprocessing and supersedes the older raw-photo fitting path.

- [x] local 512×640 / 4:5 portrait normalization before persistence;
- [x] optional native FaceDetector crop for off-center faces;
- [x] deterministic fallback when Shape Detection is unavailable;
- [x] separate Makar / Mama / Papa crop profiles;
- [x] compact JPEG v2 storage with local v1 migration;
- [x] production curved Head-bone shell retained as the 3D fitting boundary;
- [x] unit crop-policy coverage;
- [x] mobile browser coverage for detector path, normalized dimensions and all three family face shells.

Next ordered work:
- [ ] ?debug=1 FPS/frame-time/draw-call/triangle/active-enemy/AI-nav metrics;
- [ ] Android profiling and budget tuning;
- [ ] final HUD cleanup after profiling;
- [ ] optional nav debug overlay only if it materially helps profiling.
`;
await replace('dev.md', (text) => text.includes('## 0.15.0 — Face System 2.0 checkpoint') ? text : `${text.trimEnd()}\n${devBlock}\n`);

const historyBlock = `
## 0.15.0 — Face System 2.0 (${DATE})

- Continued from the stable 0.14.0 infected-perception checkpoint.
- Added FaceImageProcessor as the client-side preprocessing boundary for family portraits.
- Portraits are normalized to 512×640 / 4:5 before entering FaceStore or CharacterModel.
- Native FaceDetector is used when available to follow the largest off-center face; unsupported/failing browsers fall back safely.
- Added family-specific crop profiles for Makar, Mama and Papa.
- FaceStore moved to v2 compact JPEG entries and locally migrates existing v1 portraits.
- No photo network transfer was introduced; the complete pipeline remains on-device/browser-local.
- Existing curved face shell on the real Head bone remains the production 3D fitting approach.
- Added unit and live mobile browser coverage for the new preprocessing path.
- Development PR: #35.
`;
await replace('history.md', (text) => text.includes('## 0.15.0 — Face System 2.0') ? text : `${text.trimEnd()}\n${historyBlock}\n`);

const structureBlock = `
## Engine Next 0.15.0 Face System structure

Face ownership is now split into two explicit layers:

- src/characters/FaceImageProcessor.ts — browser-local detection/crop/resize/compression policy;
- src/persistence/FaceStore.ts — normalized v2 family portrait persistence and v1 migration;
- src/app/ProductShell.ts — upload orchestration and migration gate before run start;
- src/characters/CharacterModel.ts — production curved front/rear face shells attached to the real Head bone;
- src/characters/FaceSystem.ts — low-poly fallback only.

The preprocessing layer has no Three.js dependency and the 3D fitting layer has no file-input/localStorage responsibility. No server/backend owns face data.
`;
await replace('structure.md', (text) => text.includes('## Engine Next 0.15.0 Face System structure') ? text : `${text.trimEnd()}\n${structureBlock}\n`);

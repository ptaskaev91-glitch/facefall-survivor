import { readFile, writeFile } from 'node:fs/promises';

const VERSION = '0.16.0';
const DATE = '2026-08-17';

async function replace(path, transform) {
  const before = await readFile(path, 'utf8');
  const after = transform(before);
  if (after !== before) await writeFile(path, after);
}

await replace('package.json', (text) => text.replace('"version": "0.15.0"', `"version": "${VERSION}"`));
await replace('package-lock.json', (text) => text.replaceAll('"version": "0.15.0"', `"version": "${VERSION}"`));
await replace('engine-lab.html', (text) => text.replaceAll('0.15.0', VERSION));

const readmeBlock = `\n## 0.16.0 — debug/performance overlay checkpoint (${DATE})\n\n- Added an opt-in **\\`?debug=1\\`** profiler panel for real-device tuning; normal runs do not create the panel or install LOS/navigation instrumentation.\n- The panel samples at roughly 4 Hz and reports FPS, average/max frame time, Three.js draw calls, triangle count and renderer DPR.\n- AI diagnostics report active infected plus chase / investigate / attack intent counts.\n- Existing expensive boundaries are instrumented without changing their decisions: LOS queries are shown as \\`LOS/s\\` with blocked share, and navigation/steering requests as \\`NAV/s\\`.\n- SpatialHash occupied cells, active quality profile and current navigation mode are shown beside the performance metrics.\n- Navigation instrumentation follows runtime switches from collision fallback to the authored Recast query.\n- Browser smoke verifies the overlay is absent normally, then verifies real non-zero renderer, LOS and Recast navigation metrics under \\`?debug=1\\`.\n- The next checkpoint is Android profiling and budget tuning using these metrics, followed by final HUD cleanup.\n`;

await replace('README.md', (text) => {
  let out = text.replace('Engine Next 0.15.0', `Engine Next ${VERSION}`);
  out = out.replace(
    'With Face System 2.0 now active, the next ordered work is **?debug=1 performance/AI/nav metrics**, followed by Android profiling, budget tuning and final HUD cleanup.',
    'With the opt-in performance overlay now active, the next ordered work is **Android profiling and adaptive budget tuning** using real FPS/frame/draw/AI/nav measurements, followed by final HUD cleanup.'
  );
  const devMarker = 'The Vite development entrypoint is `/engine-lab.html`; production promotes the exact same compiled document to `/` and CI verifies the two built HTML files are byte-identical.';
  const debugNote = `${devMarker}\n\nFor profiling, append \\`?debug=1\\` to the game URL. The overlay is intentionally opt-in so ordinary runs do not install its LOS/navigation counters or DOM panel.`;
  if (!out.includes('For profiling, append `?debug=1`')) out = out.replace(devMarker, debugNote);
  if (!out.includes('## 0.16.0 — debug/performance overlay checkpoint')) {
    out = out.replace('## 0.15.0 — Face System 2.0 checkpoint', `${readmeBlock}\n## 0.15.0 — Face System 2.0 checkpoint`);
  }
  return out;
});

const devBlock = `\n## 0.16.0 — debug/performance overlay checkpoint (${DATE})\n\n> This checkpoint is authoritative for on-device performance instrumentation. The profiler is opt-in and does not change normal gameplay behavior.\n\n- [x] \\`?debug=1\\` overlay with ~4 Hz sampling;\n- [x] FPS plus average/max frame time;\n- [x] Three.js draw-call / triangle / DPR metrics;\n- [x] active infected and intent distribution;\n- [x] LOS query cadence + blocked share;\n- [x] navigation/steering query cadence + SpatialHash cells;\n- [x] quality profile + active navigation mode;\n- [x] normal-mode regression proving no profiler DOM/instrumentation;\n- [x] live browser regression proving non-zero renderer, LOS and Recast-nav measurements.\n\nNext ordered work:\n- [ ] profile the published build on Android in TOP and 3RD with low/medium/high enemy pressure;\n- [ ] establish frame-time, draw-call, triangle and AI-query budgets per mobile quality tier;\n- [ ] tune DPR, shadows, FX, enemy cap and LOS/nav cadence from measured bottlenecks;\n- [ ] final HUD cleanup after performance budgets stabilize;\n- [ ] optional nav visualization only if measurements show it is needed.\n`;
await replace('dev.md', (text) => text.includes('## 0.16.0 — debug/performance overlay checkpoint') ? text : `${text.trimEnd()}\n${devBlock}\n`);

const historyBlock = `\n## 0.16.0 — debug/performance overlay (${DATE})\n\n- Continued from the stable 0.15.0 Face System 2.0 checkpoint.\n- Added an opt-in \\`DebugPerformanceOverlay\\` activated only by \\`?debug=1\\`.\n- Added FPS, average/max frame time, draw calls, triangles and DPR from the live Three.js renderer.\n- Added active infected and AI intent distribution to the panel.\n- Counted LOS and navigation requests at their existing runtime boundaries without changing EnemySystem decision semantics.\n- The navigation counter follows collision → Recast runtime switching and reports active navigation mode.\n- Added SpatialHash occupied-cell and quality-profile visibility for mobile tuning.\n- Added regression coverage proving normal runs have no debug panel and debug runs produce non-zero renderer/LOS/Recast-nav metrics.\n- Development PR: #36.\n`;
await replace('history.md', (text) => text.includes('## 0.16.0 — debug/performance overlay') ? text : `${text.trimEnd()}\n${historyBlock}\n`);

const structureBlock = `\n## Engine Next 0.16.0 debug/performance structure\n\nPerformance instrumentation is intentionally outside the gameplay ownership tree:\n\n- \\`src/debug/DebugPerformanceOverlay.ts\\` — browser-only opt-in sampler and presentation;\n- \\`src/debug/DebugMetricFormat.ts\\` — zero-dependency metric formatting helpers;\n- \\`src/main.ts\\` — attaches the profiler only when \\`?debug=1\\` is present;\n- existing \\`GameApp.canEnemySeeTarget\\` and \\`NavigationQuery.nextWaypoint\\` boundaries are counted only in debug mode;\n- \\`WorldRuntime.renderer.info\\` remains the source of render calls/triangles; no rendering framework or production telemetry SDK was added.\n\nNormal gameplay has no profiler DOM or instrumentation. This checkpoint creates the measurement layer for Android budget tuning rather than changing budgets speculatively.\n`;
await replace('structure.md', (text) => text.includes('## Engine Next 0.16.0 debug/performance structure') ? text : `${text.trimEnd()}\n${structureBlock}\n`);

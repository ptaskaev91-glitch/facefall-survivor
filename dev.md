# Супер Макар — Development Plan

Последняя актуализация: **2026-08-19**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main` + активная feature-ветка только до merge  
Production/preview deploy: **Vercel из GitHub** после зелёного Moscow CI.

Текущий стабильный checkpoint: **0.17.0 — Blood Moon / Weather Pass**.  
Текущий активный этап: **MIGRATION GATE — перевод проекта на Moscow Development Platform (`server-control-ru`)**.

> **ЖЁСТКОЕ ПРАВИЛО:** до полного завершения и проверки Migration Gate никакая новая игровая механика, визуальный pass, HUD cleanup, profiling/tuning или рефакторинг gameplay не начинается. Сначала переводим проект на новую технологию разработки и доказываем, что новый цикл работает end-to-end. Только после этого продолжаем реализацию step by step.

Этот файл — актуальный roadmap. Подробные завершённые изменения фиксируются в `history.md`, ownership — в `structure.md`.

---

# 1. Product goal

**Супер Макар** — mobile-first browser 3D family action-survival против заражённых.

Обязательная формула:

- TOP survivor/action-RPG camera;
- third-person over-the-shoulder camera;
- одна simulation для обеих камер;
- pistol / shotgun / bow;
- Walker / Runner / Brute;
- waves + рост сложности;
- локальные фото Макара / Супермамы / Суперпапы;
- Android — главная real-device платформа;
- authored `Abandoned Outskirts`;
- Recast navigation;
- атмосферная погода / время суток;
- стабильные mobile performance budgets.

Главный hook: **«Твоё лицо — твой герой в survival shooter.»**

---

# 2. Canonical technology

## 2.1 Game/runtime technology

> **TypeScript strict + Vite + bundled Three.js + glTF/GLB + manifest-driven authored level + Octree/Capsule + offline Recast/Detour + SpatialHash/local avoidance + data-driven combat + event-driven presentation + bounded FX/audio + local-first Face System + mobile-first controls + Playwright/CI.**

Hard runtime rules:

- не возвращать gameplay ownership в God Object;
- не генерировать navmesh на телефоне;
- не отправлять пользовательские фото на сервер;
- не добавлять тяжёлый volumetric fog без реального Android-профиля;
- обычный запуск не должен платить за `?debug=1` instrumentation;
- не заявлять real-device/preview проверку без фактического evidence.

## 2.2 Canonical development / CI / deploy technology — NEW

Источник стандарта: `ptaskaev91-glitch/server-control-ru` → `DEVELOPMENT_PLATFORM.md` + `NEW_PROJECT_STANDARD.md`.

Каноническая схема проекта после Migration Gate:

```text
ChatGPT / developer
        ↓
GitHub feature branch / PR
        ↓
Moscow VPS 72.56.14.168
self-hosted runner: moscow-game
        ↓
typecheck / unit / build / Playwright
        ↓
local diagnostics on Moscow VPS
        ↓
PR / review / merge main
        ↓
Moscow main CI green
        ↓
Vercel Preview / Production from GitHub
        ↓
smoke test
```

Роли:

- **GitHub** — source of truth: code, branches, PR, history, tags;
- **Moscow VPS `72.56.14.168`** — CI/build/tests/Playwright/caches/local diagnostics;
- **`server-control-ru`** — control plane московской development platform;
- **Vercel** — web preview/production deploy из GitHub;
- **GitHub-hosted Actions** — не использовать для штатного CI;
- **GitHub Artifacts** — не использовать как рабочее хранилище;
- **Netherlands VPS** — не development node проекта игры.

Canonical Moscow paths for Game:

```text
/srv/dev-platform/workspaces/game
/srv/dev-platform/services/game
/var/lib/dev-platform/artifacts/game
/var/lib/dev-platform/logs/game
/var/lib/dev-platform/state/game
/etc/dev-platform/projects.d/game.conf
```

Heavy browser/build jobs:

```bash
dev-heavy <command>
```

GitHub workflow target:

```yaml
runs-on: [self-hosted, linux, x64, moscow-game]
```

CI rules after migration:

- `concurrency.cancel-in-progress: true`;
- no `ubuntu-latest` for штатный project CI;
- no normal `actions/upload-artifact` pipeline;
- Playwright screenshots/reports → `/var/lib/dev-platform/artifacts/game/<run-id>`;
- npm cache → Moscow local cache;
- Playwright/Chromium and other heavy jobs → through `dev-heavy`;
- Vercel deploy remains separated from Moscow computation;
- no gameplay/runtime service is introduced unless the game actually needs one.

---

# 3. Current implemented baseline

## Gameplay / family

- [x] menu / loading / playing / paused / game-over / restart;
- [x] TOP + 3RD на одной simulation;
- [x] mobile dynamic joystick + manual fire;
- [x] mobile 3RD horizontal camera control + X/Y aim-assist reticle;
- [x] pistol / shotgun / bow;
- [x] health / ammo / reload / recoil / hit zones / stagger / death;
- [x] Walker / Runner / Brute;
- [x] waves / pickups / coins / weapon shop;
- [x] Супермама с wave 4, Суперпапа с wave 7;
- [x] family allies follow + shoot infected.

## Face System 2.0

- [x] три независимых локальных фото;
- [x] 512×640 / 4:5 JPEG normalization;
- [x] optional native `FaceDetector` crop;
- [x] deterministic fallback crop;
- [x] v1 → v2 local migration;
- [x] curved face shell on real `Head` bone;
- [x] TOP/3RD browser visual coverage.

## World / AI

- [x] authored `Abandoned Outskirts level.glb`;
- [x] authored structural collision;
- [x] manifest spawn / loot / light markers;
- [x] offline Recast/Detour bake + browser import;
- [x] collision-navigation fallback;
- [x] LOS perception;
- [x] weapon / footstep / family-fire noise perception;
- [x] target stickiness / last-seen memory;
- [x] distance-based perception + steering/nav cadence;
- [x] SpatialHash + local avoidance.

## Presentation / performance

- [x] grass;
- [x] rain field;
- [x] lightning/thunder foundation;
- [x] `FogExp2` foundation;
- [x] bounded particles / decals / dynamic lights;
- [x] WebAudio ambience/combat/zombie layer;
- [x] `?debug=1` FPS / frame time / draw / TRI / DPR / AI / LOS / NAV metrics;
- [x] debug instrumentation absent from normal mode.

---

# 4. Completed checkpoints

## 0.11.0 — Abandoned Outskirts

- [x] authored level active through `WorldRuntime`;
- [x] structural collision + procedural fallback;
- [x] manifest spawn/loot/light markers.

## 0.12.0 — Family Survival

- [x] three family photos;
- [x] mama/papa join logic;
- [x] family combat;
- [x] coins + shotgun/bow shop;
- [x] zombie audio.

## 0.13.0 — Recast navigation

- [x] offline navmesh bake;
- [x] browser Recast query;
- [x] cached paths / repath cadence;
- [x] collision fallback;
- [x] CI nav validation.

## 0.14.0 — Perception + AI LOD

- [x] static-world LOS;
- [x] noise hearing;
- [x] sticky target memory;
- [x] distance-based AI/nav cadence;
- [x] hidden → heard → visible → sticky → investigate regression.

## 0.15.0 — Face System 2.0

- [x] local auto crop / 4:5 normalization;
- [x] face-aware crop when supported;
- [x] compact v2 persistence;
- [x] production head fitting preserved.

## 0.16.0 — Performance debug overlay

- [x] ~4 Hz debug panel;
- [x] FPS + average/max frame time;
- [x] draw calls / triangles / DPR;
- [x] active infected + intent counts;
- [x] LOS/s + blocked share;
- [x] NAV/s + SpatialHash cells;
- [x] deterministic cumulative browser instrumentation verification.

---

# 5. 0.17.0 — Blood Moon / Weather Pass

**Status: COMPLETE.**

User-facing goal: сцена должна перестать выглядеть как один постоянный сумрачный preset и получить заметный survival-horror ритм: **рассвет → сумрачный дождливый день → закат → кровавая ночь**.

## 5.1 Touch/UI selection hardening

Problem evidence: на Android long-press по `FIRE / WEAP / CAM` иногда включает системное выделение текста и contextual search UI.

- [x] `user-select: none` / `-webkit-user-select: none` на gameplay controls;
- [x] `-webkit-touch-callout: none`;
- [x] prevent gameplay `contextmenu` / `selectstart` where appropriate;
- [x] сохранить `aria-label` и button semantics для accessibility;
- [x] Playwright regression: long-press/selection не создаёт text selection на action controls.

## 5.2 Atmosphere presets

### DAWN

- [x] холодный зелёно-синий ambient + мягкий тёплый key light;
- [x] умеренный туман;
- [x] дождь слабый/отсутствует;
- [x] visibility высокая.

### OVERCAST

- [x] серо-зелёный ambient;
- [x] постоянный дождь;
- [x] мокрый/холодный визуальный тон;
- [x] умеренно плотный haze;
- [x] storm/lightning разрешены.

### DUSK

- [x] оранжево-красный directional tint;
- [x] длинное/контрастное ощущение света;
- [x] туман чуть плотнее дня;
- [x] rain reduced.

### BLOOD_MOON

- [x] почти чёрный фон/ambient;
- [x] красная moon/key light;
- [x] красноватый дальний fog;
- [x] rain минимальный или выключен;
- [x] самая короткая визуальная дальность.

## 5.3 Progression policy

- [x] waves 1–2 → `DAWN`;
- [x] waves 3–4 → `OVERCAST`;
- [x] waves 5–6 → `DUSK`;
- [x] wave 7+ → `BLOOD_MOON`;
- [x] debug override `?atmosphere=dawn|overcast|dusk|blood-moon`.

## 5.4 Silent-Hill-style fog without mobile volumetrics

- [x] dynamic `FogExp2` density/color by preset;
- [x] cheap ground haze only inside mobile budget;
- [x] smooth phase interpolation;
- [x] no heavy new multi-pass volumetric chain.

## 5.5 Night enemy visibility falloff

- [x] near zone ~0–6 m readable;
- [x] mid zone 6–12 m blends stronger with fog/background;
- [x] far zone 12+ m darker/less contrast;
- [x] presentation LOD cadence, no heavy material cloning each frame;
- [x] hit proxies/raycast/damage semantics unchanged;
- [x] close attacker remains readable.

## 5.6 Weather controls

- [x] `RainField.setIntensity(0..1)` without particle-buffer recreation;
- [x] `StormSystem.setEnabled()` / intensity policy;
- [x] no large resource allocation per wave transition;
- [x] debug overlay exposes atmosphere preset.

## 5.7 Automated evidence

- [x] wave → atmosphere mapping;
- [x] preset parameter sanity;
- [x] night visibility curve monotonic;
- [x] near-night visibility floor playable;
- [x] no gameplay text selection regression;
- [x] force each atmosphere preset and assert world state;
- [x] Blood Moon screenshot TOP;
- [x] Blood Moon screenshot 3RD;
- [x] overcast/rain screenshot;
- [x] no page errors;
- [x] existing aim/face/family/Recast tests remain green.

---

# 6. MIGRATION GATE — Moscow Development Platform

**Status: ACTIVE — highest priority.**

**No gameplay changes are allowed until section 6 is COMPLETE.**

Current known mismatch in repository before migration:

- current `engine-next-ci.yml` uses `runs-on: ubuntu-latest`;
- current CI installs Chromium on GitHub-hosted runner;
- current CI uploads visual screenshots to GitHub Artifacts;
- current CI uploads deploy bundle to GitHub Artifacts;
- current CI publishes `engine-next-preview` branch itself;
- this is legacy relative to the new `server-control-ru` development standard.

Target: move the development loop to **GitHub + Moscow self-hosted compute + local Moscow diagnostics + Vercel deploy** while preserving game behavior.

## 6.0 Freeze / migration discipline

- [x] declare infrastructure migration as the only active next stage in `dev.md`;
- [x] preserve 0.17.0 as the current gameplay checkpoint;
- [x] explicitly prohibit new gameplay work until migration DoD;
- [ ] create dedicated migration branch before infrastructure changes;
- [ ] snapshot current main SHA / working Vercel URL / last known CI behavior in migration notes;
- [ ] do not modify gameplay source files during infrastructure migration unless required solely to keep tests runnable, and document any such exception.

**Exit:** migration has a clean baseline and can be rolled back to the exact pre-migration checkpoint.

## 6.1 Register Game in Moscow platform

Canonical identity:

```text
slug: game
repository: ptaskaev91-glitch/facefall-survivor
runner label: moscow-game
profile: node
Moscow VPS: 72.56.14.168
```

Required:

- [ ] create/register `game` in `/etc/dev-platform/projects.d`;
- [ ] create canonical project directories;
- [ ] install/register dedicated self-hosted runner;
- [ ] runner expected name: `moscow-game-01`;
- [ ] labels include `self-hosted`, `linux`, `x64`, `moscow-game`;
- [ ] runner systemd service active;
- [ ] verify runner is visible/online in GitHub repository settings;
- [ ] verify runner user has access to shared Moscow npm/browser caches;
- [ ] verify project has no unrestricted root access.

**Exit:** `moscow-game-01` is online and can accept a trivial repository job.

## 6.2 Project metadata alignment

Goal: repository documentation explicitly knows where and how it is developed.

Required during migration:

- [ ] add/align `PROJECT.md` with repository, production URL, runtime, deploy, Moscow runner label, external services, current version/status;
- [ ] add/align `ARCHITECTURE.md` if absent;
- [ ] preserve and align existing `README.md`, `dev.md`, `history.md`, `structure.md` rather than replacing useful project-specific documentation;
- [ ] document Moscow/Vercel responsibility boundary;
- [ ] document where CI diagnostics live;
- [ ] document that Netherlands VPS is outside normal Game CI/runtime.

**Exit:** a new session can reconstruct the project lifecycle from repository documentation without relying on chat memory.

## 6.3 Rewrite CI for Moscow runner

Current workflow: `.github/workflows/engine-next-ci.yml`.

Target requirements:

- [ ] change штатный CI to `runs-on: [self-hosted, linux, x64, moscow-game]`;
- [ ] keep `concurrency` + `cancel-in-progress: true`;
- [ ] preserve locked dependency installation;
- [ ] preserve TypeScript typecheck;
- [ ] preserve unit tests;
- [ ] preserve browser smoke/visual coverage;
- [ ] preserve production bundle build verification;
- [ ] use Moscow-local npm cache;
- [ ] use shared/preinstalled browser cache where practical;
- [ ] run heavy Playwright/browser phase through `dev-heavy`;
- [ ] remove штатную dependency on GitHub-hosted Actions compute;
- [ ] remove heavy `actions/upload-artifact` usage;
- [ ] write Playwright screenshots/reports/logs to `/var/lib/dev-platform/artifacts/game/${GITHUB_RUN_ID}`;
- [ ] keep diagnostics even when browser tests fail;
- [ ] never print secrets into logs/reports.

**Exit:** pull-request CI executes fully on Moscow VPS and produces all required evidence locally.

## 6.4 Separate CI from deploy

New rule:

```text
Moscow = validate/build/test
Vercel = preview/production web deploy
GitHub = source/history/events
```

Required:

- [ ] remove GitHub Artifact bundle as deploy hand-off;
- [ ] review whether `engine-next-preview` branch is still necessary;
- [ ] eliminate legacy preview-branch publishing if Vercel Git integration fully replaces it;
- [ ] confirm feature branch → Vercel Preview behavior;
- [ ] confirm main → Vercel Production behavior;
- [ ] verify deploy does not require a GitHub-hosted Actions job;
- [ ] keep Vercel config compatible with current `dist-next` deployment root or intentionally document any changed deployment contract.

**Exit:** deploy is independent from GitHub-hosted compute and succeeds from the canonical GitHub/Vercel lifecycle.

## 6.5 Local diagnostics / retention

Required:

- [ ] Game diagnostics root exists: `/var/lib/dev-platform/artifacts/game`;
- [ ] CI creates per-run subdirectory;
- [ ] Playwright screenshots saved there;
- [ ] test/browser reports saved there;
- [ ] optional build diagnostics saved there when useful;
- [ ] project logs use `/var/lib/dev-platform/logs/game` where applicable;
- [ ] diagnostics follow platform retention policy (7 days unless Game needs explicit override);
- [ ] no project state is accidentally subject to generic artifact cleanup;
- [ ] GitHub artifact storage is effectively zero for normal Game development.

**Exit:** failed and successful CI runs are diagnosable from Moscow without GitHub Artifacts.

## 6.6 End-to-end migration verification

Run the complete development lifecycle with **documentation/CI-only migration change**, not a new game feature.

Required evidence:

- [ ] migration branch push triggers Moscow runner;
- [ ] typecheck green;
- [ ] unit tests green;
- [ ] Playwright/browser smoke green;
- [ ] build green;
- [ ] deployment-root verification green;
- [ ] diagnostics visible on Moscow VPS;
- [ ] PR can be reviewed normally in GitHub;
- [ ] merge to main triggers Moscow main CI;
- [ ] main CI green;
- [ ] Vercel production deploy succeeds;
- [ ] deployed game opens;
- [ ] basic TOP smoke passes;
- [ ] basic 3RD smoke passes;
- [ ] existing 0.17 atmosphere behavior is intact;
- [ ] no regression in Face/Family/Recast baseline;
- [ ] no GitHub-hosted runner required for the normal path;
- [ ] no heavy GitHub Artifact required for the normal path.

### Migration Gate Definition of Done

Migration Gate becomes **COMPLETE** only when all are true:

- [ ] `moscow-game-01` online;
- [ ] `game` registered in Moscow project registry;
- [ ] canonical directories exist;
- [ ] Game CI runs on `moscow-game`;
- [ ] heavy browser work respects `dev-heavy`;
- [ ] diagnostics are local on Moscow;
- [ ] GitHub-hosted runner removed from normal Game CI path;
- [ ] GitHub Artifacts removed from normal Game CI/deploy path;
- [ ] Vercel Preview/Production lifecycle verified;
- [ ] full CI green on migration branch;
- [ ] full CI green on main after merge;
- [ ] production smoke green;
- [ ] documentation reflects the final architecture;
- [ ] `history.md` records the migration checkpoint.

> **Only after every Migration Gate blocking item is complete do we unlock section 7.**

---

# 7. Post-migration implementation — strict step-by-step order

**Status: BLOCKED BY SECTION 6.**

After migration we do not start several large feature streams in parallel. One step → tests/evidence → checkpoint → next step.

## Step 1 — Third-person Aim/Camera correctness

Highest gameplay priority after migration.

Problem: in third-person the visual crosshair/reticle can disagree with the real target/shooting direction.

Goal: one explicit reusable aim/camera contract for third-person.

Required:

- [ ] audit current 3RD screen reticle → camera ray → aim point → weapon/fire direction chain;
- [ ] define one authoritative aim point;
- [ ] ensure reticle corresponds to actual gameplay ray/hit semantics;
- [ ] separate reusable camera/aim ownership from unrelated gameplay code;
- [ ] preserve TOP camera behavior;
- [ ] preserve aim-assist policy intentionally;
- [ ] regression tests for center target / near target / off-axis target / no target;
- [ ] real Android 3RD verification.

**Exit:** when crosshair is on a hittable enemy, the actual shot semantics agree with what the player sees.

## Step 2 — Runtime Aim/Camera debug gizmo

Only after Step 1 contract is clear.

- [ ] dev/debug-only visual gizmo;
- [ ] show camera forward ray;
- [ ] show authoritative aim point;
- [ ] show weapon/fire direction;
- [ ] show hit/intersection point where applicable;
- [ ] zero normal-mode cost/visibility;
- [ ] useful for future camera regression diagnosis.

**Exit:** third-person aim errors can be diagnosed visually without guessing from screenshots.

## Step 3 — Android profiling with 0.17 atmosphere

- [ ] TOP profile under low/medium/high enemy pressure;
- [ ] 3RD profile under low/medium/high enemy pressure;
- [ ] capture frame ms / draw calls / triangles / DPR / LOS / NAV;
- [ ] inspect Blood Moon / Overcast cost;
- [ ] record actual real-device evidence.

**Exit:** we have measured budgets, not assumptions.

## Step 4 — Adaptive mobile budgets

Tune only from Step 3 evidence:

- [ ] DPR policy;
- [ ] shadow policy;
- [ ] FX budgets;
- [ ] enemy caps if required;
- [ ] atmosphere density/cost if required;
- [ ] LOS/NAV cadence if required;
- [ ] avoid visual downgrade unless measurement justifies it.

**Exit:** stable mobile target established and documented.

## Step 5 — HUD cleanup

- [ ] shorten/clean build badge;
- [ ] reduce normal debug/status noise;
- [ ] safe-area polish;
- [ ] replace temporary textual controls with final icon-first action button art where appropriate;
- [ ] preserve accessibility labels/semantics;
- [ ] Android long-press regression remains fixed.

**Exit:** gameplay HUD looks intentional and production-like on phone.

## Step 6 — Navigation/debug visualization if still needed

Optional and evidence-driven.

- [ ] only implement if profiling/debugging demonstrates value;
- [ ] keep debug-only;
- [ ] no normal runtime cost.

## Step 7 — Progression / special infected

Blocked until visual + performance + aiming foundation is stable.

Candidate work:

- [ ] progression depth;
- [ ] special infected;
- [ ] new encounters;
- [ ] difficulty pacing;
- [ ] rewards/upgrades.

Exact feature selection is decided only when Steps 1–6 are complete.

---

# 8. Working rule for every future step

For each step after migration:

```text
1. Read current main + dev.md + relevant architecture/history
2. Create focused feature branch
3. Implement one bounded step
4. Add/update tests
5. Push
6. Moscow self-hosted CI
7. Inspect local Moscow diagnostics/screenshots when relevant
8. PR/diff/review
9. Merge only after green evidence
10. Moscow main CI
11. Vercel deploy
12. Smoke test
13. Update history.md/dev.md/structure.md when checkpoint requires it
14. Move to next step
```

Rules:

- one major implementation step at a time;
- infrastructure regressions block gameplay work;
- no simultaneous unrelated refactors;
- completed/partial/pending must reflect factual state;
- visual claims require screenshot/device evidence;
- real-device claims require actual real-device evidence;
- preserve rollback point at every major checkpoint.

---

# 9. Immediate next action

**The next action is NOT gameplay development.**

Immediate sequence:

1. create migration branch;
2. register Game on Moscow Development Platform;
3. bring `moscow-game-01` online;
4. rewrite Game CI for Moscow runner + local diagnostics;
5. separate CI from Vercel deploy;
6. execute end-to-end migration verification;
7. merge/document migration only after green evidence;
8. mark Migration Gate COMPLETE;
9. only then start **Step 1 — Third-person Aim/Camera correctness**.

Until points 1–8 are complete, all gameplay roadmap work is **BLOCKED**.

# Супер Макар — History

Последняя актуализация: **2026-08-19**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`

---

# 1. Назначение

`history.md` хранит восстановимую историю проекта: требования пользователя, архитектурные решения, неудачные подходы, audits, PR/checkpoints, CI/device evidence и причины изменения приоритетов.

Это проектная память, а не dump tool-calls или скрытых рассуждений.

---

# 2. Исходная идея

Проект начался как Facefall Survivor — browser survival shooter против заражённых; с checkpoint 0.12.0 продукт называется **«Супер Макар»**.

Ключевая продуктовая идея:

> пользователь загружает фотографию и видит своё лицо на игровом герое.

Базовые требования закрепились как:

- TOP / Diablo-survivor gameplay;
- полноценный third-person over-the-shoulder режим;
- pistol / shotgun / bow;
- Walker / Runner / Brute;
- mobile-first управление;
- Android как обязательная real-device платформа;
- authored 3D world;
- family survival — Макар / Супермама / Суперпапа;
- переход от prototype к атмосферной полноценной 3D-игре.

Создан публичный GitHub repository `ptaskaev91-glitch/facefall-survivor`; `main` выбран source of truth.

---

# 3. Hosting evolution

## Early

Ранний GitHub Pages путь оказался лишним/ненадёжным. Затем production был перенесён на Vercel, а GitHub оставлен source repository.

Ранее использовавшиеся Vercel deployment URLs считаются историческими и не являются текущим production contract.

## Current production contract — 2026-08-19

Canonical public production:

`https://super-makar-live.vercel.app`

GitHub хранит source; Moscow Development Platform валидирует build/test; Vercel публикует production из точного green Git SHA.

---

# 4. 0.3 — cinematic browser prototype

Ранний runtime был большим vanilla-JS/canvas/WebGL prototype.

Появились:

- face upload/local storage;
- pistol/shotgun/bow;
- waves;
- rain/fog/lightning;
- blood/decals/particles;
- pickups;
- mobile controls;
- Walker/Runner/Brute.

Ключевые ранние ошибки: initialization order rain/fog, lighting compositing, слишком тесная связь UI и engine initialization.

Урок: monolithic runtime быстро становится хрупким.

---

# 5. 0.4–0.5 — Three.js dual-camera generation

Проект перешёл на Three.js 3D и получил TOP + third-person cameras, procedural terrain/grass/road/rain, 3D player/enemies, weapons и touch controls.

На Android выявились startup-проблемы:

- UI мог перестать работать, если engine initialization падал до binding;
- dynamic CDN import Three.js мог зависнуть;
- внешние runtime imports создавали точку отказа.

Несколько safe/legacy runtime вариантов помогли стабилизировать prototype, но позднее стали technical debt.

0.5 Character Pass проверил GLB/AnimationMixer pipeline на временной модели; это был proof-of-concept, не production asset.

---

# 6. `dev.md` и архитектурный переход

После visual audit зафиксировано:

- процедурные Box/Sphere/Capsule модели достигли потолка качества;
- нужен production GLB pipeline;
- нужна authored локация;
- нельзя дальше растить один большой JS runtime.

Создан `dev.md`; начался переход к TypeScript/Vite/module ownership.

---

# 7. External architecture audits

## `ivanoskov/shooter`

Полезные идеи: TypeScript, Vite/npm Three.js, GLB loading, static Octree, Capsule player collider, quality/debug tooling.

Не переносились 1:1 desktop-only FPS input, questionable sensitivity/physics patterns, dynamic Octree as crowd system.

## `Unvanquished`

Полезные идеи: simulation/presentation separation, data-driven weapons/entities, Damage/Hit/Kill pipeline, projectile abstraction, Recast/Detour, behavior/state architecture, animation blending philosophy.

GPL game code напрямую не переносился.

## `Red Eclipse`

Полезные идеи: weapon states/recoil/spread, hit zones, composable FX, bounded decals, grass budgets/culling, wind impulses, level entities/markers.

Финальная формула:

> browser foundation + structured gameplay architecture + readable combat/FX + own mobile-first controls.

---

# 8. Engine Next foundation — 0.5A–0.7

Создан TypeScript/Vite runtime, позднее ставший production root.

Появились:

- strict TypeScript;
- npm Three.js;
- fixed GameLoop;
- typed EventBus;
- Octree/Capsule collision;
- unified InputManager;
- touch/desktop adapters;
- data-driven weapons;
- Health/Damage/Projectile systems;
- quality profiles;
- pooled FX;
- camera modules;
- AssetManager/LevelManifest boundaries;
- WaveDirector;
- EnemyBrain;
- SpatialHash + LocalAvoidance;
- NavigationQuery abstraction;
- Playwright browser smoke;
- package lock / reproducible `npm ci`.

---

# 9. Mobile aiming evolution — 0.8.x

Управление несколько раз менялось после Android-тестов.

TOP постепенно пришёл к full auto-aim + automatic hero turn + dynamic touch joystick + manual FIRE.

3RD получил over-the-shoulder camera, сначала fixed-center crosshair, затем X/Y aim assist. Камера была поднята/отодвинута после реального feedback.

0.8.4 добавил stronger 3RD auto-aim, pistol deviation, shotgun pellet spread, readable tracers/impacts и humanoid infected presentation.

Важный будущий долг, проявившийся позже: screen reticle и actual fire direction не имели одного явно закреплённого authoritative contract.

---

# 10. Repository hardening — 0.8.5–0.8.7

Проведён внешний audit и подтверждены проблемы: большой `GameApp`, отсутствие focused unit baseline, stale metadata/legacy runtimes, stale Vercel rewrites.

Решения:

1. hygiene;
2. tests;
3. GameApp decomposition;
4. только затем heavy GLB/animation integration.

В 0.8.5:

- README/metadata обновлены;
- old CDN/model rewrites убраны;
- legacy runtime JS removed;
- production root стал одним compiled Vite app;
- rollback переведён на Git history + immutable deployments.

В 0.8.6 добавлен Node `node:test` baseline для Health/Damage/Weapon/Enemy/Wave/SpatialHash/LocalAvoidance/GameState. Tests выявили лишнюю dependency `WeaponSystem` → global AimController; она была удалена.

В 0.8.7 ownership вынесен в `WorldRuntime`, `PlayerRuntime`, `GameHud`. `GameApp` оставлен orchestrator, а не принудительно раздроблен на десятки абстракций.

---

# 11. Production hero / combat vertical slice — 0.9.x

В production hero pipeline вошли verified CC0 Quaternius character/animation assets.

`CharacterModel` получил GLTFLoader/SkeletonUtils/AnimationMixer, locomotion blending, face shell на real `Head` bone и weapon socket.

Pistol muzzle стал физическим origin для gameplay fire. Visual CI поймал неверный масштаб раннего pistol prototype и исправил его.

Далее combat events были связаны с fire/reload animation overlays; production root assertions стали version-independent.

---

# 12. 0.10.0 — Production Core

PR #27 закрыл архитектурный и visual vertical slice core:

- `CombatRuntime` extracted from `GameApp`;
- `RunSession` extracted;
- no service locator / DI framework;
- shotgun + bow production visuals/animations;
- shared CC0 zombie GLB reused by Walker/Runner/Brute;
- skeletal hit proxies;
- distance presentation LOD;
- asset byte budgets;
- expanded Playwright visual gates.

Design rule: shared assets + data-driven archetype presentation; runtime extraction только при реальном ownership pressure.

---

# 13. 0.11.0 — Abandoned Outskirts

PR #28 перевёл production на authored GLB level с structural collision и gameplay manifest при сохранении procedural fallback.

`LevelLoader` отделяет decorative meshes от collision; visual CI получил authored-level checkpoint.

---

# 14. 0.12.0 — «Супер Макар» Family Survival

Checkpoint 2026-08-14:

- игра переименована в «Супер Макар»;
- три независимых local portraits;
- Супермама присоединяется с wave 4;
- Суперпапа — с wave 7;
- allies follow + shoot infected;
- difficulty scales with wave/hero count;
- zombie WebAudio;
- coins/rewards;
- shotgun/bow shop;
- `FamilyCompanionSystem`, `CoinSystem`;
- family Playwright visual regression.

---

# 15. 0.13.0 — Offline Recast navigation

Development PR #32.

- `RecastNavigationQuery` behind existing abstraction;
- per-enemy path caching/repath throttling;
- Node/build-time navmesh bake from authored level;
- browser imports baked binary only — no phone navmesh generation;
- authored spawn → player path validation;
- collision fallback preserved;
- HUD exposes navigation mode;
- unit + browser Recast regression.

---

# 16. 0.14.0 — Infected perception + AI LOD

Development PR #34.

- LOS wired to actual authored/static collision;
- eye-to-torso LOS;
- last-seen memory + sticky chase;
- weapon hearing hierarchy;
- walking/sprinting/family fire noise;
- distance-based LOS/nav/SpatialHash cadence;
- behavior regression hidden → heard → visible → sticky → investigate.

---

# 17. 0.15.0 — Face System 2.0

Development PR #35.

- `FaceImageProcessor` client boundary;
- portraits normalized to 512×640 / 4:5;
- native `FaceDetector` when available;
- deterministic fallback;
- family-specific crop profiles;
- compact local JPEG storage + v1→v2 migration;
- no server photo upload;
- curved face shell stays on real Head bone;
- unit + mobile browser coverage.

---

# 18. 0.16.0 — Debug/performance overlay

Development PR #36.

- opt-in `?debug=1` overlay;
- FPS / frame time / draw calls / triangles / DPR;
- active infected + intent distribution;
- LOS/s + blocked share;
- NAV/s + active navigation mode;
- SpatialHash cells + quality profile;
- normal mode verified without debug panel/instrumentation UI.

---

# 19. 0.17.0 — Blood Moon / Weather Pass

PR #38, 2026-08-17.

Android feedback showed long-press on textual action controls could invoke browser/system selection UI. Mobile action controls were made icon-first with aria semantics and stronger selection/context/touch-callout suppression.

Environment progression became deterministic by wave:

- 1–2 dawn;
- 3–4 rainy overcast;
- 5–6 dusk;
- 7+ Blood Moon.

`AtmosphereSystem` owned by `WorldRuntime` blends background, `FogExp2`, lighting, exposure, rain, storm and low haze. Heavy volumetric post-processing was deliberately rejected until Android profiling proves budget.

Blood Moon distance visibility is presentation-only; infected LOS/hearing/Recast/damage semantics do not receive artificial night blindness.

Unit and mobile Playwright coverage includes all four states, icon controls, TOP/3RD screenshots and debug atmosphere id.

0.17.0 became the gameplay checkpoint frozen during the following infrastructure migration.

---

# 20. 2026-08-19 — Moscow Development Platform Migration

## User requirement

Пользователь зафиксировал строгий порядок:

> сначала полностью перейти на новую development technology из `server-control-ru`; только после этого продолжать игру step by step.

Gameplay work был заморожен до закрытия Migration Gate.

## Baseline / rollback

Pre-migration `main`:

`5f2c4751c2813970924e17fd3b7bb3aa6b1476c2`

Gameplay baseline оставался 0.17.0; gameplay source в процессе migration не менялся.

## PR #39 — Moscow migration

Создан migration branch и PR #39 `Migrate Super Makar development to Moscow platform`.

Изменения:

- добавлены `PROJECT.md` / `ARCHITECTURE.md`;
- Engine Next CI переведён с `ubuntu-latest` на `[self-hosted, linux, x64, moscow-game]`;
- GitHub Artifact transport removed;
- legacy `engine-next-preview` publishing removed;
- Moscow npm/Playwright caches;
- heavy browser/build через `dev-heavy`;
- local diagnostics instead of GitHub Artifacts.

## Dedicated runner

На Moscow VPS `72.56.14.168` установлен repo-scoped runner через canonical `server-control-ru` installer.

Фактическая identity:

```text
project slug: game
runner: moscow-game-01
label: moscow-game
user: github-runner-game
```

Canonical registration is produced by `dev-platform-register-project game ...`, therefore paths are:

```text
/srv/dev-platform/workspaces/game
/srv/dev-platform/services/game
/var/lib/dev-platform/artifacts/game
/var/lib/dev-platform/logs/game
/var/lib/dev-platform/state/game
/etc/dev-platform/projects.d/game.conf
```

Ранние docs/CI mistakenly used `super-makar` as infrastructure slug; closeout explicitly corrected this to `game`.

## Migration failures that were useful

### Node PATH

Первый repository job дошёл до Moscow runner, но новый service user не видел `npm`. Решение: Node 20 explicitly provisioned with `actions/setup-node@v6` inside workflow. Compute remained on Moscow self-hosted runner.

### Chromium runtime libraries

Следующий run прошёл `npm ci`, typecheck и **39/39 unit tests**, но Chromium crashed on missing `libnspr4.so` / related Linux runtime dependencies.

Playwright/Chromium system libraries were installed on Moscow host. After that browser smoke and deploy build completed successfully.

Это подтвердило, что проблемы были platform/bootstrap issues, а не gameplay regressions.

## Green evidence

Final migration PR run on `moscow-game-01`:

- locked install — green;
- typecheck — green;
- 39/39 unit tests — green;
- Chromium — green;
- Playwright/browser smoke — green;
- `npm run build:deploy` — green;
- deployment-root assertions — green;
- local diagnostics — green.

PR #39 merged to `main`:

`90a394b4242a91f0d6efdae8975f4c0d843bea4b`

## `server-control-ru` hardening discovered during Game onboarding

`bootstrap-moscow.sh` was adjusted to include `github-runner-*` service users in the platform group so new dedicated runners follow the same standard automatically.

Game runner remains restricted by canonical project sudo boundary rather than receiving unrestricted root shell.

---

# 21. 2026-08-19 — Vercel production closeout

## Problem

Connected Vercel account initially exposed only another project (`Projekt_B` / `projekt_b`), not Facefall.

The Vercel MCP connector can deploy files and create a project, but does not expose Git repository import/link or project-protection mutation. No `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` or automation bypass secret existed in Game GitHub Secrets.

## Chosen release method

A small Vercel deployment bootstrap was created programmatically. It:

1. checks out an **exact known green Git SHA** from the public repository;
2. runs locked `npm ci`;
3. runs `npm run build:deploy`;
4. publishes `dist-next`.

For the migration checkpoint the pinned SHA was the merged migration commit:

`90a394b4242a91f0d6efdae8975f4c0d843bea4b`

This keeps source/release identity deterministic even without Vercel Git Integration.

## Vercel Authentication investigation

Generated deployment URLs and team-qualified aliases returned a 302 to `vercel.com/sso-api` / Vercel login. Passing `ssoProtection: null` at deploy creation did not override the account's protection behavior for those technical URLs.

A temporary diagnostic draft PR #40 was created only to issue independent no-auth HTTP probes. It was **closed without merge** after evidence collection.

Critical finding:

- technical/team URL → Vercel SSO;
- **short production alias `https://super-makar-live.vercel.app` → public HTTP 200 and real `<title>Супер Макар</title>`**.

Therefore the short domain is the only canonical public production URL. Technical deployment aliases are not part of the product contract.

## Final release architecture

```text
GitHub source of truth
      ↓
Moscow CI / Playwright / build validation
      ↓
exact green SHA
      ↓
Vercel SHA-pinned production build
      ↓
https://super-makar-live.vercel.app
```

Normal Game CI no longer depends on GitHub-hosted compute or GitHub Artifact transport.

---

# 22. Post-migration Step 1 audit — Third-person aim root cause

While migration was being closed, current aim/camera code was inspected without changing gameplay.

Files inspected:

- `src/aim/AimController.ts`;
- `src/aim/AimAssist.ts`;
- `src/camera/CameraDirector.ts`;
- `src/camera/ThirdPersonCamera.ts`;
- `src/app/GameApp.ts`;
- `src/app/CombatRuntime.ts`.

Root cause:

- `AimController` calculates a correct screen-reticle camera ray/world aim direction;
- `AimAssist` moves the screen reticle;
- TOP mode rotates `player.facing` toward that direction;
- 3RD intentionally does not perform the TOP facing alignment;
- but player fire still calls `WeaponSystem.fire(..., player.facing)`;
- `CombatRuntime` correctly uses the direction it receives.

So 3RD had two competing truths: visible reticle direction and body facing. The actual shot used body facing. This explains the user's screenshot where the crosshair does not represent the real target line.

Next mandatory implementation: make the aim layer provide one authoritative shot direction from the visible reticle/camera ray and use it for player fire while preserving body facing as presentation/orientation.

Only after that Step 1 passes Moscow CI + production evidence do we implement the debug aim/camera gizmo.

---

# 23. How to continue this file

At every major checkpoint record:

- user request/feedback that caused the change;
- architecture decision;
- branch/PR/merge SHA;
- what failed and why;
- CI/browser/device evidence;
- deployment evidence;
- rollback point;
- next ordered milestone.

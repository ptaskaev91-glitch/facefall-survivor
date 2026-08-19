# Супер Макар — Development Plan

Последняя актуализация: **2026-08-19**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`; рабочие изменения — только через focused feature branch / PR.  
Public production: **https://super-makar-live.vercel.app**.

Текущий стабильный gameplay checkpoint: **0.17.0 — Blood Moon / Weather Pass**.  
Infrastructure checkpoint: **Moscow Development Platform migration — COMPLETE**.  
Текущий активный gameplay этап: **Step 1 — Third-person Aim/Camera correctness**.

> Правило после миграции: один bounded step → тесты → Moscow CI → review/merge → production release/smoke → следующий step. Несвязанные крупные рефакторинги параллельно не начинаем.

`dev.md` — актуальный roadmap. История решений и checkpoint’ов — в `history.md`, архитектурные границы — в `ARCHITECTURE.md` / `structure.md`, проектные метаданные — в `PROJECT.md`.

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
- offline Recast/Detour navigation;
- атмосферная погода / время суток;
- стабильные mobile performance budgets;
- предсказуемый и воспроизводимый development/release lifecycle.

Главный hook: **«Твоё лицо — твой герой в survival shooter.»**

---

# 2. Canonical technology

## 2.1 Runtime

> **TypeScript strict + Vite + bundled Three.js + glTF/GLB + manifest-driven authored level + Octree/Capsule + offline Recast/Detour + SpatialHash/local avoidance + data-driven combat + event-driven presentation + bounded FX/audio + local-first Face System + mobile-first controls + Playwright.**

Hard runtime rules:

- не возвращать gameplay ownership в God Object;
- не генерировать navmesh на телефоне;
- не отправлять пользовательские фото на сервер;
- не добавлять тяжёлый volumetric fog без реального Android-профиля;
- обычный запуск не должен платить за `?debug=1` instrumentation;
- visual/device claims требуют фактического evidence.

## 2.2 Development platform — ACTIVE STANDARD

Источник стандарта: `ptaskaev91-glitch/server-control-ru` → `DEVELOPMENT_PLATFORM.md` + `NEW_PROJECT_STANDARD.md`.

```text
ChatGPT / developer
        ↓
GitHub focused branch / PR
        ↓
Moscow VPS 72.56.14.168
runner: moscow-game-01
label: moscow-game
        ↓
typecheck / unit / Playwright / build
        ↓
local Moscow diagnostics
        ↓
review / merge
        ↓
release from exact green Git SHA
        ↓
Vercel production
        ↓
public smoke
```

Роли:

- **GitHub** — source of truth: code, branches, PR, history, tags;
- **Moscow VPS `72.56.14.168`** — штатные CI/build/tests/Playwright/caches/diagnostics;
- **`server-control-ru`** — control plane московской development platform;
- **Vercel** — public production hosting/release target;
- **Netherlands VPS** — не Game development node;
- **GitHub-hosted Actions** — не штатный compute path проекта;
- **GitHub Artifacts** — не рабочее хранилище и не deploy transport.

## 2.3 Canonical Moscow identity

```text
project slug: game
repository: ptaskaev91-glitch/facefall-survivor
runner: moscow-game-01
runner label: moscow-game
runner user: github-runner-game
profile: node
```

Paths:

```text
/srv/dev-platform/workspaces/game
/srv/dev-platform/services/game
/var/lib/dev-platform/artifacts/game
/var/lib/dev-platform/logs/game
/var/lib/dev-platform/state/game
/etc/dev-platform/projects.d/game.conf
```

Shared caches:

```text
/var/cache/dev-platform/npm
/var/cache/dev-platform/browsers
```

Heavy work:

```bash
dev-heavy <command>
```

## 2.4 CI contract

`.github/workflows/engine-next-ci.yml`:

- `runs-on: [self-hosted, linux, x64, moscow-game]`;
- `concurrency.cancel-in-progress: true`;
- locked `npm ci`;
- TypeScript typecheck;
- unit tests;
- Chromium/Playwright smoke + visual coverage;
- `npm run build:deploy`;
- production-root assertions;
- heavy browser/build phase через `dev-heavy`;
- diagnostics → `/var/lib/dev-platform/artifacts/game/<run-id>`;
- no normal `actions/upload-artifact`;
- no legacy `engine-next-preview` publishing.

## 2.5 Vercel release contract

Фактический release path после миграции **не использует автоматическую Vercel Git Integration**, потому что текущий Vercel connector не предоставляет действие link/import Git repository и не предоставляет project-protection mutation.

Вместо этого production release SHA-pinned:

```text
known green Git SHA
        ↓
Vercel deployment bootstrap
        ↓
checkout exact SHA from public GitHub repository
        ↓
npm ci
        ↓
npm run build:deploy
        ↓
publish dist-next
```

Repository contract остаётся:

```text
vercel.json
buildCommand: npm run build:deploy
outputDirectory: dist-next
```

Canonical public URL:

```text
https://super-makar-live.vercel.app
```

Важно: технические deployment/team aliases текущего Vercel account могут редиректить в Vercel Authentication. **Они не являются public production contract.** Короткий production domain `super-makar-live.vercel.app` проверен извне без авторизации: HTTP 200 + реальный HTML игры.

---

# 3. Implemented gameplay baseline

## Core / family

- [x] menu / loading / playing / paused / game-over / restart;
- [x] TOP + 3RD на одной simulation;
- [x] mobile dynamic joystick + manual fire;
- [x] mobile 3RD camera control + X/Y aim-assist reticle;
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

## Presentation / performance foundation

- [x] grass;
- [x] rain field;
- [x] lightning/thunder foundation;
- [x] `FogExp2`;
- [x] bounded particles / decals / dynamic lights;
- [x] WebAudio ambience/combat/zombie layer;
- [x] `?debug=1` FPS / frame time / draw / TRI / DPR / AI / LOS / NAV metrics;
- [x] debug instrumentation absent from normal mode.

---

# 4. Completed gameplay checkpoints

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
- [x] deterministic browser instrumentation verification.

## 0.17.0 — Blood Moon / Weather Pass

**COMPLETE.**

- [x] gameplay touch controls suppress text selection/context menu/touch callout;
- [x] icon-first mobile action controls with accessibility labels;
- [x] `DAWN`, `OVERCAST`, `DUSK`, `BLOOD_MOON` presets;
- [x] waves 1–2 dawn, 3–4 rainy overcast, 5–6 dusk, 7+ Blood Moon;
- [x] debug atmosphere override;
- [x] dynamic `FogExp2`, lighting, exposure, rain/storm/haze;
- [x] mobile-safe implementation without heavy volumetric chain;
- [x] Blood Moon distance readability falloff without changing AI semantics;
- [x] weather intensity controls without particle-buffer rebuild;
- [x] unit coverage for preset mapping/ranges/visibility;
- [x] Playwright coverage for controls + all atmosphere states;
- [x] TOP/3RD visual checkpoints inspected.

---

# 5. Infrastructure checkpoint — Moscow Development Platform migration

**STATUS: COMPLETE. Gameplay work is unlocked.**

Pre-migration baseline: `main` at `5f2c4751c2813970924e17fd3b7bb3aa6b1476c2`.  
Migration PR: **#39 — Migrate Super Makar development to Moscow platform**.  
Merged migration checkpoint: `90a394b4242a91f0d6efdae8975f4c0d843bea4b`.

## 5.1 Freeze / rollback discipline

- [x] migration declared blocking before gameplay work;
- [x] dedicated migration branch used;
- [x] 0.17 gameplay checkpoint preserved;
- [x] gameplay source files were not changed as part of infrastructure migration;
- [x] pre-migration SHA recorded;
- [x] rollback point preserved through Git history.

## 5.2 Moscow registration

- [x] project registered with canonical slug `game`;
- [x] repository `ptaskaev91-glitch/facefall-survivor` registered;
- [x] canonical project directories created by `dev-platform-register-project`;
- [x] dedicated self-hosted runner installed;
- [x] runner name `moscow-game-01`;
- [x] labels include `self-hosted`, `linux`, `x64`, `moscow-game`;
- [x] runner user `github-runner-game`;
- [x] runner systemd service observed active after installation;
- [x] runner actually accepted and completed repository CI;
- [x] shared npm/browser caches used;
- [x] no unrestricted root shell granted by project standard; reviewed sudo boundary remains canonical project entry points only.

## 5.3 CI migration

- [x] normal CI moved from `ubuntu-latest` to `moscow-game`;
- [x] Node 20 provisioned deterministically by `actions/setup-node@v6`;
- [x] locked dependencies install from Moscow cache;
- [x] typecheck green;
- [x] **39/39 unit tests green** on migration run;
- [x] Chromium Linux runtime dependencies installed on Moscow host;
- [x] Playwright/browser smoke green;
- [x] production deploy build green;
- [x] `dist-next/index.html` / `engine-lab.html` deployment-root assertions green;
- [x] heavy browser/build work through `dev-heavy`;
- [x] GitHub Artifact upload removed from normal CI;
- [x] legacy preview-branch publishing removed;
- [x] diagnostics stored locally on Moscow;
- [x] diagnostics path corrected to canonical `/var/lib/dev-platform/artifacts/game/<run-id>`.

## 5.4 Vercel release verification

- [x] CI and deploy separated: Moscow validates; Vercel hosts production;
- [x] Vercel production project/deployment created programmatically through connected Vercel tooling;
- [x] production built from exact green migration SHA `90a394b...`;
- [x] public production domain established: `https://super-makar-live.vercel.app`;
- [x] independent no-auth probe returned HTTP 200 and actual `<title>Супер Макар</title>`;
- [x] Vercel SSO behavior investigated rather than hidden: generated deployment/team aliases are protected, short production domain is public;
- [x] no Vercel token/project secret exists in the game repository;
- [x] release therefore does not depend on a GitHub-hosted deploy job or GitHub Artifact hand-off;
- [x] exact current Vercel release method documented in `PROJECT.md` / `ARCHITECTURE.md`.

Not part of the canonical contract right now:

- automatic feature-branch Vercel Preview;
- Vercel Git repository linking;
- repository-stored `VERCEL_TOKEN`.

These are intentionally **not blockers** because the current connected Vercel tool can publish the exact green SHA directly and the public production domain is verified. If Vercel later exposes project linking/protection mutation through the connector, we can simplify this release path without changing gameplay architecture.

## 5.5 Migration Gate Definition of Done

- [x] dedicated `moscow-game-01` runner works;
- [x] canonical `game` registry/path boundary defined;
- [x] full migration CI green on Moscow;
- [x] browser/build work respects `dev-heavy`;
- [x] normal GitHub-hosted compute removed from project CI;
- [x] GitHub Artifacts removed from normal CI/deploy path;
- [x] local Moscow diagnostics used;
- [x] Vercel production release verified from exact green SHA;
- [x] public production URL verified without login;
- [x] final architecture documented;
- [x] migration checkpoint recorded in `history.md` as closeout requirement.

**Result:** section unlocked. We now continue gameplay strictly step by step.

---

# 6. Step 1 — Third-person Aim/Camera correctness

**STATUS: ACTIVE. Highest gameplay priority.**

User-visible defect: в 3RD крестик/reticle может визуально находиться на заражённом, но реальный выстрел идёт не по той же линии.

## 6.1 Audit — COMPLETE

Current chain was inspected across:

- `src/aim/AimController.ts`;
- `src/aim/AimAssist.ts`;
- `src/camera/CameraDirector.ts`;
- `src/camera/ThirdPersonCamera.ts`;
- `src/app/GameApp.ts`;
- `src/app/CombatRuntime.ts`.

Root cause found:

1. `AimController` correctly converts the visible reticle NDC into a camera ray and calculates a world aim direction.
2. `AimAssist` moves that same reticle in screen space.
3. In TOP, `GameApp.updateAim()` rotates `player.facing` toward the calculated aim direction, so firing via facing approximately agrees with the reticle.
4. In 3RD, `GameApp.updateAim()` intentionally returns before this TOP-only facing alignment.
5. **But player firing still calls `WeaponSystem.fire(..., this.player.facing)`**.
6. `CombatRuntime` then faithfully uses the supplied `ShotEvent.direction` for real hitscan/projectile behavior.

Therefore the current contract is internally inconsistent: **3RD reticle direction is calculated, but the actual shot uses body facing.** This directly explains the observed mismatch.

- [x] audit reticle → camera ray → aim direction → weapon/fire chain;
- [x] locate ownership mismatch;
- [x] confirm TOP behavior must remain separate from shot-direction authority;
- [x] confirm `CombatRuntime` is not the bug; it consumes the direction it is given.

## 6.2 Implementation contract

Goal: separate **body facing** from **authoritative shot direction**.

Required:

- [ ] expose one explicit authoritative shot direction from aim layer;
- [ ] fire player weapons using that direction rather than unconditional `player.facing`;
- [ ] in 3RD preserve vertical component from reticle/camera ray;
- [ ] keep TOP movement/facing presentation behavior intact;
- [ ] keep aim-assist policy intact unless a test proves it contributes to error;
- [ ] keep muzzle as physical shot origin;
- [ ] no changes to enemy hit-zone semantics, world occlusion or damage math;
- [ ] no hidden second aim point in HUD/camera/combat code.

Preferred boundary:

```text
screen reticle NDC
      ↓
AimController
      ↓
authoritative camera ray / world aim point
      ↓
authoritative shot direction from muzzle
      ↓
WeaponSystem.fire
      ↓
ShotEvent.direction
      ↓
CombatRuntime
```

`player.facing` remains body/animation orientation, not the universal definition of where a 3RD shot goes.

## 6.3 Regression tests

- [ ] center reticle → shot direction matches center ray;
- [ ] off-axis reticle → shot direction follows off-axis reticle, not stale body facing;
- [ ] vertical 3RD reticle offset → shot direction retains Y component;
- [ ] no-target / no-assist path remains deterministic;
- [ ] nearby target does not create pathological muzzle-to-ray inversion;
- [ ] world collision still blocks enemy hit behind cover;
- [ ] TOP existing auto-aim tests remain green;
- [ ] existing 3RD auto-aim tests updated to assert **real shot semantics**, not only reticle movement.

## 6.4 Browser / Android evidence

- [ ] Moscow Playwright smoke green;
- [ ] 3RD visual checkpoint with reticle on target;
- [ ] actual hit/shot assertion agrees with reticle;
- [ ] TOP visual/gameplay regression green;
- [ ] real Android 3RD verification by user after production deploy.

**Exit:** when the 3RD crosshair is on a hittable enemy, the actual shot semantics agree with what the player sees.

---

# 7. Step 2 — Runtime Aim/Camera debug gizmo

**BLOCKED until Step 1 contract is implemented.**

Dev/debug-only visual diagnostic:

- [ ] camera forward ray;
- [ ] reticle camera ray;
- [ ] authoritative world aim point;
- [ ] muzzle → shot direction;
- [ ] actual hit/intersection point where applicable;
- [ ] optional body-facing vector for comparison;
- [ ] zero normal-mode visibility/cost;
- [ ] useful future camera regression evidence.

Exit: aim/camera mismatch can be diagnosed visually without guessing from screenshots.

---

# 8. Step 3 — Android profiling with 0.17 atmosphere

- [ ] TOP profile under low/medium/high enemy pressure;
- [ ] 3RD profile under low/medium/high enemy pressure;
- [ ] capture frame ms / draw calls / triangles / DPR / LOS / NAV;
- [ ] inspect Blood Moon / Overcast cost;
- [ ] record actual real-device evidence.

Exit: measured budgets exist before tuning.

---

# 9. Step 4 — Adaptive mobile budgets

Tune only from Step 3 evidence:

- [ ] DPR policy;
- [ ] shadow policy;
- [ ] FX budgets;
- [ ] enemy caps if required;
- [ ] atmosphere cost if required;
- [ ] LOS/NAV cadence if required;
- [ ] no visual downgrade without measurement.

---

# 10. Step 5 — HUD cleanup

- [ ] shorten/clean build badge;
- [ ] reduce normal debug/status noise;
- [ ] safe-area polish;
- [ ] final icon-first action art where needed;
- [ ] preserve accessibility semantics;
- [ ] Android long-press regression remains fixed.

---

# 11. Step 6 — Navigation/debug visualization if evidence requires it

- [ ] only implement if profiling/debugging demonstrates value;
- [ ] debug-only;
- [ ] zero normal runtime cost.

---

# 12. Step 7 — Progression / special infected

Blocked until aiming + performance + HUD foundation is stable.

Candidate work:

- [ ] progression depth;
- [ ] special infected;
- [ ] new encounters;
- [ ] difficulty pacing;
- [ ] rewards/upgrades.

Exact selection is decided after Steps 1–6.

---

# 13. Working rule for every future implementation step

```text
1. Read current main + dev.md + relevant history/architecture
2. Create focused feature branch
3. Implement one bounded step
4. Add/update tests
5. Push
6. Moscow self-hosted CI (`moscow-game`)
7. Inspect Moscow-local diagnostics/screenshots when relevant
8. PR / diff / review
9. Merge only after green evidence
10. Revalidate release SHA
11. Vercel production release from that exact green SHA
12. Public production smoke
13. Update history.md/dev.md/structure.md when checkpoint requires it
14. Move to next step
```

Rules:

- one major implementation step at a time;
- infrastructure regressions block gameplay work;
- no simultaneous unrelated refactors;
- completed/partial/pending reflects factual state only;
- visual claims require screenshot/browser evidence;
- real-device claims require actual device evidence;
- preserve rollback point at every major checkpoint;
- do not request manual server/Vercel work from the user when connected tooling can perform it.

---

# 14. Immediate next action

Migration Gate is complete. Next implementation sequence:

1. branch from current `main` for **Third-person Aim/Camera correctness**;
2. formalize authoritative shot direction in aim layer;
3. switch player firing from unconditional `player.facing` to that direction;
4. add center/off-axis/vertical/no-target regression coverage;
5. add live 3RD shot-vs-reticle Playwright assertion;
6. run full Moscow CI;
7. inspect evidence;
8. merge;
9. deploy exact green SHA to `https://super-makar-live.vercel.app`;
10. public smoke;
11. then Step 2 debug gizmo.

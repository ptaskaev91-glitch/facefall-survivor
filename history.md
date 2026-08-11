# Facefall Survivor — History

Последняя актуализация: **2026-08-12**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`

---

# 1. Назначение

`history.md` хранит восстановимую историю Facefall Survivor: пользовательские требования, решения, ошибки, audits, PR/checkpoints, deployment transitions и причины архитектурных изменений.

Это не dump tool-calls и не скрытые рассуждения. Новые решения добавляются хронологически.

---

# 2. Исходная идея

Пользователь предложил browser survival shooter против заражённых.

Базовые требования:

- TOP / Diablo-like gameplay;
- полноценный third-person mode;
- pistol / shotgun / bow;
- загруженное фото пользователя становится лицом героя;
- mobile controls;
- постепенный переход от prototype к атмосферной качественной 3D-игре.

Позже зафиксированы Walker / Runner / Brute.

Создан repository `ptaskaev91-glitch/facefall-survivor`; `main` — source-of-truth.

---

# 3. Hosting decision

Ранний GitHub Pages путь оказался лишним и ненадёжным.

Решение пользователя:

- GitHub → source/version history;
- Vercel → единственный hosting target;
- GitHub Pages не используется.

Primary alias:

`https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

---

# 4. 0.3 cinematic prototype

Появились:

- face persistence;
- pistol/shotgun/bow;
- waves;
- rain/fog/night;
- muzzle/smoke/casing/blood effects;
- pickups;
- mobile input;
- procedural ambience.

Были найдены initialization/compositing bugs. Главное следствие: monolithic runtime слишком быстро становился хрупким.

---

# 5. Переход в Three.js

По запросу пользователя добавлены:

- WebGL/Three.js;
- 3D terrain;
- TOP + 3RD cameras;
- grass/materials;
- props;
- rain/fog/lights.

На Android возникли реальные startup/input проблемы: inert buttons и зависание loading.

Из этого появились важные правила:

- UI не должен зависеть от успешного 3D init;
- загрузка должна иметь error/timeout;
- runtime CDN dependencies нежелательны для mobile production.

---

# 6. Visual audit prototype

По пользовательскому скриншоту зафиксировано:

- procedural mannequin выглядит недостаточно качественно;
- temporary face накладка не выглядит естественно;
- сцена слишком тёмная;
- оружие/заражённые плохо читаются;
- environment пустой;
- HUD слишком web-like.

Решение: не бесконечно улучшать primitives, а перейти к GLB characters/weapons/authored environment.

---

# 7. 0.5 ALPHA character prototype

Прототипирован humanoid GLB pipeline:

- GLB loading;
- AnimationMixer;
- idle/walk/run proof;
- weapon visual proof;
- temporary face integration;
- improved camera;
- procedural fallback.

Three.js Soldier использовался только как pipeline proof.

Эта версия долго оставалась stable legacy production checkpoint.

---

# 8. Три архитектурных аудита

## Audit 1 — `ivanoskov/shooter`

Полезно:

- TypeScript/Vite/npm Three.js;
- GLB loading;
- Octree/Capsule;
- quality/debug architecture.

Не перенесено 1:1:

- double physics update;
- FPS camera;
- desktop-only input assumptions.

MIT позволил безопасно адаптировать отдельные изолированные patterns с attribution.

## Audit 2 — `Unvanquished`

Полезно:

- simulation vs presentation;
- data-driven weapons/entities;
- Damage/Hit/Kill pipeline;
- projectile abstraction;
- navmesh;
- state/behavior AI;
- animation blending.

GPL game code напрямую не копируется.

## Audit 3 — `Red Eclipse`

Полезно:

- recoil/spread/weapon states;
- hit zones;
- composable FX;
- bounded decals;
- grass/wind budgets;
- level semantic markers.

Итог:

> browser foundation + gameplay/event architecture + Red-Eclipse-like combat/FX philosophy + собственный mobile-first layer.

---

# 9. Documentation freeze

По запросу пользователя созданы/актуализированы:

- `dev.md`;
- `structure.md`;
- `history.md`.

После фиксации архитектуры пользователь разрешил продолжить разработку.

---

# 10. PR #1 — GameApp / cameras / EffectSystem

Checkpoint: `0a599032`.

Добавлены:

- thin bootstrap;
- GameApp/GameState;
- lifecycle;
- separate TOP/3RD camera classes;
- EffectSystem/LightPool.

CI green.

---

# 11. Reuse policy

Пользователь уточнил:

> где можно безопасно копировать — копировать; где нельзя — писать с нуля.

Зафиксировано:

- permissive isolated reuse с notice;
- GPL code не копируется;
- media license проверяется отдельно.

Создан `THIRD_PARTY_NOTICES.md`.

---

# 12. PR #2 — physics / level / aim foundations

Checkpoint: `29008e7d`.

Direct MIT adaptations from `ivanoskov/shooter`:

- Capsule/Octree collision response;
- GLTF loading/traverse preparation.

Facefall originals:

- SpatialHash;
- CameraCollision;
- mobile/pointer aim;
- LevelManifest;
- combat/world integration.

CI green.

---

# 13. PR #3 / #4 — projectiles, FX and release tooling

PR #3 checkpoint `bec7b5f8`:

- ballistic bow;
- projectile/world/enemy collision;
- pooled arrows;
- runtime particles/decals;
- manifest-first runtime.

PR #4 checkpoint `6d051dae`:

- combined Vercel build;
- CI deploy artifact;
- transitional legacy+engine-next bundle.

---

# 14. PR #5 — gameplay loop

Checkpoint `dcdee8b0`.

Добавлены:

- EnemySystem;
- Walker/Runner/Brute runtime;
- infected melee;
- player HP;
- WaveDirector;
- kills/score;
- game over/restart.

---

# 15. Android feedback: movement and reticle

Пользователь протестировал engine-next на Android.

Feedback:

1. joystick direction was unclear;
2. нужен небольшой aim reticle.

PR #6 checkpoint `276ef78c`:

- camera-relative movement;
- clearer joystick;
- visible reticle.

Затем пользователь отметил, что reticle не двигался свайпом и попросил сфокусироваться только на aiming.

---

# 16. PR #7 — AimController

Checkpoint `967993a3`.

Главный invariant:

> visible reticle and actual weapon shot use the same aim state.

TOP:

- free movable reticle;
- swipe-trackpad behavior;
- reticle ray → world aim.

3RD:

- floating reticle;
- vertical aim;
- soft-edge turn demand.

---

# 17. PR #8 / #9 — product flow + parity

PR #8 checkpoint `56f90d50`:

- ProductShell;
- local face picker/persistence;
- pre-game camera select;
- menu/loading/play flow.

PR #9 checkpoint `0876eff1`:

- health/ammo pickups from LevelManifest;
- bounded RainField;
- TOP visual facing synchronized with AimController.

---

# 18. PR #10 — reproducible browser CI

Merged checkpoint `018d78c1`.

Added:

- package-lock;
- `npm ci`;
- Playwright Chromium;
- automated menu → start → playing → 3RD smoke;
- failure on fatal page errors.

This became mandatory validation for future gameplay PRs.

---

# 19. PR #11 — audio + settings

Checkpoint `99ed3b53`.

Added:

- `SettingsStore`;
- persisted aim sensitivity;
- persisted 3RD deadzone;
- persisted master volume;
- procedural Web Audio shot/hit/kill sounds;
- rain/wind ambience.

All audio remains presentation-layer and event-driven.

CI green including Chromium smoke.

---

# 20. PR #12 — EnemyBrain / LocalAvoidance

Checkpoint `ed015609`.

Added:

- EnemyBrain high-level intent boundary;
- SpatialHash-backed LocalAvoidance;
- archetype-specific separation.

Goal: prevent infected from collapsing into one point while preserving a clean future navmesh contract.

CI green.

---

# 21. PR #13 — NavigationQuery seam

Checkpoint `d8a840c3`.

Added:

- `NavigationQuery` interface;
- `DirectNavigationQuery` fallback;
- EnemySystem asks for next waypoint before avoidance.

Architecture decision:

> final authored level will use offline Recast/Detour navmesh + runtime browser query adapter.

A WASM navmesh dependency was intentionally deferred until authored level geometry exists.

CI green.

---

# 22. User request: big block through 0.8

On 2026-08-12 user requested:

> make a large block, bring the game to 0.8, merge to main and make the primary deploy for testing.

This explicitly authorizes switching primary Vercel `/` from legacy checkpoint to engine-next for testing after CI passes.

---

# 23. PR #14 — 0.8 COMBAT+AI release candidate

Branch: `engine-next/0.8-combat-navigation-release`.

Major additions:

## Navigation / AI

- `CollisionNavigationQuery` for obstacle-aware movement on current procedural level;
- direct path when clear;
- short left/right detour probes when blocked;
- LocalAvoidance remains layered after NavigationQuery;
- EnemyBrain expanded to explicit states:
  - wander;
  - investigate;
  - chase;
  - hold;
  - attack;
  - stagger;
- last-known target;
- alert timers;
- `hearNoise()` API;
- distance sight range;
- optional line-of-sight hook.

Important limitation:

`CollisionNavigationQuery` is the practical 0.8 fallback, **not final Recast navmesh**. Actual authored-map navmesh still waits for `level.glb`.

## Mobile aiming

- new soft `AimAssist`;
- persisted AIM ASSIST slider;
- assist moves the same reticle used by WeaponSystem;
- no auto-fire;
- no hard snap.

## Combat feel

- recoil profile now affects visible reticle;
- camera recoil;
- movement-dependent spread;
- bow spread passes through ballistic projectile direction;
- hit severity causes stagger;
- Brute has greater stagger resistance;
- knock impulse;
- reload emits presentation event.

## Audio / atmosphere

- procedural reload sound;
- footsteps;
- infected attack cues;
- StormSystem;
- lightning flash;
- procedural thunder;
- rain/wind ambience retained.

## Architecture cleanup

- `GameApp.events` becomes explicit presentation port;
- Bootstrap no longer casts into a private EventBus.

## Deployment transition

Build pipeline changed:

- compiled engine-next becomes `dist-next/index.html` → primary `/`;
- old 0.5 ALPHA is copied to `/legacy/`;
- CI asserts that deployment root contains `ENGINE NEXT 0.8`;
- legacy is retained only for comparison/rollback during test phase.

## Validation

During PR development repeatedly passed:

- locked `npm ci`;
- strict TypeScript;
- Playwright Chromium gameplay smoke;
- Vite combined deployment build.

Final merge and primary Vercel deployment follow only after the last CI run is fully green.

---

# 24. State after 0.8 deployment

Expected test state:

- primary `/` = engine-next 0.8;
- `/legacy/` = previous 0.5 checkpoint;
- mobile user should test:
  - TOP/3RD aiming;
  - joystick direction;
  - aim assist;
  - recoil;
  - weapons/reload;
  - enemy obstacle/crowd behavior;
  - audio/storm;
  - face persistence;
  - pickups;
  - game over/restart.

The next development direction after device feedback is the visual vertical slice: real GLB hero/weapons/infected and authored Abandoned Outskirts, followed by final Recast navmesh.

---

# 25. Future history format

For every major checkpoint append:

```text
## YYYY-MM-DD — checkpoint
### User request
### Decision
### Changes
### Reuse / licensing
### CI / tests
### PR / commit
### Deployment
### Limitations
### Next step
```

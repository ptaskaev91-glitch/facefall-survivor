# Facefall Survivor — History

Последняя актуализация: **2026-08-12**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`

---

# 1. Назначение

`history.md` хранит восстановимую историю проекта: требования пользователя, архитектурные решения, неудачные подходы, audits, PR/checkpoints и причины изменения приоритетов.

Это проектная память, а не dump tool-calls или скрытых рассуждений.

---

# 2. Исходная идея

Facefall Survivor начался как browser survival shooter против заражённых.

Ключевая продуктовая идея:

> пользователь загружает фотографию и видит своё лицо на игровом герое.

Базовые требования постепенно закрепились как:

- TOP / Diablo-survivor gameplay;
- полноценный third-person over-the-shoulder режим;
- pistol / shotgun / bow;
- Walker / Runner / Brute;
- mobile-first управление;
- Android как обязательная тестовая платформа;
- переход от prototype к атмосферной полноценной 3D-игре.

Создан публичный GitHub repository `ptaskaev91-glitch/facefall-survivor`; `main` выбран source-of-truth.

---

# 3. Hosting — GitHub Pages → Vercel

Ранний GitHub Pages путь оказался лишним/ненадёжным.

Принято решение:

- GitHub хранит source;
- Vercel — единственный production hosting target;
- GitHub Pages не используется.

Основной production URL:

`https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

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

Важные ранние ошибки:

- initialization order rain/fog;
- lighting compositing;
- слишком тесная связь UI и engine initialization.

Урок: большой monolithic runtime быстро становится хрупким.

---

# 5. 0.4–0.5 — Three.js dual-camera generation

Проект перешёл на Three.js 3D и получил:

- TOP и third-person cameras;
- procedural terrain/grass/road/rain;
- 3D player/enemies;
- weapons;
- touch controls.

На Android выявились критические startup проблемы:

- кнопки могли не работать, если engine initialization падал раньше UI binding;
- dynamic CDN import Three.js мог зависнуть без timeout;
- внешние CDN/runtime imports создавали ненужную точку отказа.

Были созданы несколько safe/legacy runtime вариантов. Они помогли стабилизировать prototype, но позже стали техническим долгом.

0.5 Character Pass впервые проверил GLB/AnimationMixer pipeline на временной Three.js Soldier model. Это был proof-of-concept, не production asset.

---

# 6. `dev.md` и переход к архитектурному плану

После визуального аудита prototype было зафиксировано:

- процедурные Box/Sphere/Capsule модели достигли потолка качества;
- нужен настоящий hero/infected/weapon GLB pipeline;
- нужна authored локация;
- нельзя продолжать наращивать один большой JS-файл.

Создан `dev.md` и начался переход к модульной архитектуре.

---

# 7. Аудит №1 — `ivanoskov/shooter`

Главная польза:

- TypeScript;
- Vite/npm Three.js;
- GLB level loading;
- static Octree;
- Capsule player collider;
- quality profiles/debug tooling.

Не переносились 1:1:

- desktop-only FPS input;
- двойной physics update;
- questionable sensitivity math;
- dynamic Octree as crowd system.

Вывод: использовать как browser-foundation reference.

Отдельные permissive MIT patterns позже адаптированы с attribution:

- Capsule/Octree collision response;
- GLTF load/traverse preparation.

---

# 8. Аудит №2 — `Unvanquished`

Главная польза:

- simulation vs presentation separation;
- data-driven weapons/entities;
- Damage/Hit/Kill pipeline;
- CombatFeedback separation;
- projectile abstraction;
- Recast/Detour navigation;
- behavior/state architecture;
- animation blending philosophy.

GPL game code напрямую не переносится.

Вывод: использовать как gameplay-architecture reference.

---

# 9. Аудит №3 — `Red Eclipse`

Главная польза:

- weapon states/recoil/spread;
- hit zones;
- composable FX;
- bounded decals/stains;
- grass budgets/culling;
- wind impulses;
- level entities/markers.

Вывод: использовать как combat-feel / FX / environment reference.

Финальная формула после трёх аудитов:

> browser foundation + structured gameplay architecture + readable combat/FX + собственный mobile-first control layer.

---

# 10. 0.5A — Engine Next foundation

Создан параллельный TypeScript/Vite runtime без немедленного переключения production.

Появились:

- strict TypeScript;
- npm Three.js;
- Vite;
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
- AssetManager/LevelManifest boundaries.

Позже Vite engine-next достиг parity и стал production root.

---

# 11. 0.5B–0.7 — functional parity and gameplay

Engine-next получил:

- menu/product flow;
- local face persistence;
- player HP;
- enemy melee damage;
- WaveDirector;
- score/kills/game-over/restart;
- pickups;
- EnemyBrain;
- SpatialHash + LocalAvoidance;
- NavigationQuery abstraction;
- obstacle-aware fallback navigation;
- Playwright browser smoke;
- package lock / `npm ci`.

---

# 12. Mobile aiming evolution

Управление несколько раз менялось после реального Android-теста.

## Early

Статический/двигающийся reticle оказался непонятным и расходился с ожиданиями пользователя.

## 0.8.1

- TOP пробовал faint laser/manual direction;
- 3RD fixed-center crosshair;
- low-poly human player вместо capsule pillar;
- photo mapped onto actual head face rather than floating plane.

## 0.8.2

По референсам mobile survivor управление было переработано:

TOP:

- full auto-aim;
- hero automatically turns to target;
- joystick appears under first gameplay touch;
- FIRE remains manual.

3RD:

- fixed-center crosshair;
- horizontal yaw only;
- horizontal auto-aim;
- no vertical manual aiming.

Добавлен mobile touch smoke test.

## 0.8.3

3RD camera поднята и немного отодвинута после Android feedback.

---

# 13. 0.8.4 — readable combat + humanoid infected

PR #18 merged to `main`, checkpoint `795e1086b408fae832f0e0817978f62d93514bf4`.

Реализовано:

- stronger 3RD auto-aim centering;
- pistol small natural random deviation;
- movement still reduces accuracy;
- shotgun 8-pellet spread;
- visible physical-looking tracer layer for pistol/shotgun;
- exact hit-point impact feedback;
- separate readable shotgun pellet impacts;
- capsule infected replaced with low-poly humanoid Walker/Runner/Brute visuals;
- simple procedural gait;
- per-part hit metadata foundation.

Damage for pistol/shotgun intentionally remains hitscan for responsiveness; tracers are presentation.

CI passed locked install, strict TS, desktop/mobile browser smoke and production build.

---

# 14. External codebase audit reconciliation

Пользователь принёс внешний аудит Facefall.

Подтверждено:

- `GameApp.ts` was ~31,998 bytes and effectively a God Object;
- focused unit tests were absent;
- README/package metadata were stale;
- repository had no project LICENSE;
- four legacy runtime JS files remained;
- stale Vercel CDN/model rewrites remained.

Важная корректировка:

- `threejs.org/examples/.../Soldier.glb` was **not** the active engine-next production hero;
- it was a stale legacy Vercel rewrite from the old prototype pipeline.

Decision:

1. hygiene;
2. tests;
3. GameApp decomposition;
4. only then heavy GLB/animation integration.

ESLint intentionally not treated as P0 because strict TypeScript + tests + browser CI provide higher current value.

---

# 15. 0.8.5 — repository hygiene

Large hardening PR #19 started on branch `engine-next/0.8.5-0.8.7-hardening`.

Completed in branch:

- README rewritten for Engine Next 0.8.x;
- package version advanced to 0.8.5 development generation;
- `vercel.json` stripped to bundled build/output only;
- old Three/GLTFLoader CDN rewrites removed;
- stale Soldier model rewrite removed;
- old `game.js`, `game-safe.js`, `game-safe2.js`, `game-v050.js` removed;
- old legacy stylesheet/source index removed;
- `copy-legacy.mjs` removed;
- new `promote-engine-next.mjs` makes one compiled Vite app the production root;
- `/legacy/` no longer shipped with every deployment.

Rollback strategy becomes Git history + immutable Vercel deployments rather than dead code in the repository.

Project source LICENSE remains an intentional unresolved product/legal choice; no license is guessed automatically.

---

# 16. 0.8.6 — focused unit-test baseline

A zero-extra-framework unit suite was added using TypeScript + Node built-in `node:test`.

Covered:

- Health;
- DamageSystem;
- WeaponSystem;
- EnemyBrain;
- WaveDirector;
- SpatialHash;
- LocalAvoidance;
- GameStateController.

Important result: the first unit run exposed that `WeaponSystem` directly depended on global `AimController`, dragging camera/physics dependencies into pure gameplay tests.

Fix:

- global AimController import removed from WeaponSystem;
- player aim is now optional injected direction/fallback;
- WeaponSystem is independently testable.

This is an example of tests finding architecture coupling rather than only checking arithmetic.

---

# 17. 0.8.7 — first GameApp decomposition pass

The God Object was reduced by moving real ownership, not by making cosmetic helper files.

Created `WorldRuntime`:

- renderer;
- scene;
- camera/camera collision;
- collision world;
- procedural fallback environment;
- grass/rain/storm;
- manifest loading/fallback;
- manifest lights;
- render/resize/dispose.

Created `PlayerRuntime`:

- player transform;
- PlayerCapsule;
- movement/facing;
- spawn/reset;
- muzzle transform;
- FaceSystem and player visual lifecycle.

Created `GameHud`:

- HP/wave/kills/score;
- debug status;
- last-event presentation;
- game-over summary.

`GameApp` remains orchestration plus combat/enemy/wave/session wiring. Future CombatRuntime/RunSession extraction is allowed only when it reduces actual growth/coupling.

---

# 18. Visual CI checkpoints

User explicitly allowed the assistant to generate and inspect screenshots independently.

Added Playwright mobile screenshot test:

- `mobile-top.png`;
- `mobile-third.png`.

CI uploads them as `facefall-visual-checkpoints`.

The first hardening screenshots were downloaded and manually inspected before merge:

- TOP rendered successfully;
- 3RD rendered successfully;
- controls/HUD remained visible;
- camera layout did not regress due to decomposition;
- long dev build badge is visibly cramped against camera buttons on narrow mobile — recorded for HUD cleanup, not mixed into architecture refactor.

---

# 19. Current direction after hardening

Once PR #19 is green and merged, the next high-impact line is the visual vertical slice:

1. production hero GLB behind PlayerRuntime;
2. CharacterModel + AnimationMixer idle/walk/run;
3. real weapon socket + pistol animation;
4. shotgun/bow assets;
5. production Walker/Runner/Brute models/animation;
6. authored Abandoned Outskirts level GLB through WorldRuntime;
7. offline Recast navmesh;
8. Face System 2.0 on production head;
9. final HUD;
10. Android performance profiling/asset optimization.

Broad new gameplay mechanics remain lower priority until the game visually stops looking like an engine prototype.

---

# 20. How to continue this file

At every major checkpoint record:

- user request/feedback that caused the change;
- architecture decision;
- PR/merge checkpoint;
- what failed and what tests found;
- CI/device evidence;
- next ordered milestone.

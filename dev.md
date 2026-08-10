# Facefall Survivor — Development Plan

Последняя актуализация: **2026-08-10**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`  
Production hosting: **Vercel only**  
Production URL: `https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

Текущая production-контрольная точка: **0.5 ALPHA — legacy runtime**  
Текущий активный этап: **0.5A — Engine Foundation / engine-next**  
Текущий engine-next checkpoint: **PR #1 merged, commit `0a599032`**  
Режим работы: **разработка возобновлена после Documentation Freeze**.

Связанные документы:

- `structure.md` — текущая и целевая файловая/системная структура;
- `history.md` — история обсуждения, решений, проблем и контрольных точек;
- `dev.md` — выполненные и будущие этапы разработки.

---

# 1. Цель проекта

Facefall Survivor — mobile-first браузерная 3D action-survival игра против заражённых.

Обязательная игровая формула:

- top-down / Diablo-like камера;
- third-person over-the-shoulder камера;
- одна simulation для обеих камер;
- pistol / shotgun / bow;
- Walker / Runner / Brute;
- волны заражённых;
- загружаемая фотография пользователя становится лицом героя;
- реалистичное мрачное окружение;
- desktop + touch управление;
- стабильная работа на реальном Android;
- Vercel production;
- backend для MVP не обязателен.

Главная продуктовая особенность:

> Игрок загружает свою фотографию и видит себя героем survival shooter.

---

# 2. Архитектурное решение после трёх аудитов

Проведены подробные аудиты:

1. `ivanoskov/shooter` — browser foundation;
2. `Unvanquished/Unvanquished` — gameplay architecture;
3. `redeclipse/base` — combat feel / FX / environment.

Итоговая формула:

> **Three.js/Vite browser foundation + event/component gameplay architecture + data-driven combat + pooled FX + authored GLB levels + mobile-first performance.**

Берём идеи, но не форкаем ни один из проектов.

Ключевые решения:

- TypeScript strict + Vite + npm Three.js;
- runtime CDN Three.js в целевой версии не используется;
- один fixed timestep loop;
- static collision → Octree;
- player → Capsule;
- crowd neighbours → SpatialHash/grid;
- AI navigation → navmesh;
- enemy decision logic → lightweight State Tree;
- weapons/enemies → data-driven;
- simulation отделена от presentation;
- effects → recipes + pools + budgets;
- levels → GLB geometry + LevelManifest + navmesh;
- Android — обязательная реальная тестовая платформа.

---

# 3. Технологический стек

## Runtime / build

- TypeScript strict mode;
- Vite;
- npm;
- Node 20 в CI;
- Three.js;
- ES2020 baseline на текущем этапе.

## Rendering

- Three.js WebGLRenderer;
- sRGB output;
- ACES Filmic tone mapping;
- Standard/Physical materials;
- ограниченные dynamic lights;
- post-processing только после profiling.

## Assets

- glTF 2.0 / GLB;
- Blender;
- glTF optimization;
- KTX2/Basis для texture compression там, где даёт реальный выигрыш;
- Meshopt предпочтителен после проверки;
- каждый внешний asset получает source/license/attribution запись.

## Physics

- static Octree;
- Capsule hero;
- sphere/capsule/AABB для простых dynamic colliders;
- полноценный physics engine пока не нужен.

## Navigation

- browser-compatible Recast/Detour-style navmesh;
- LocalAvoidance;
- SpatialHash;
- worker рассматривается, если pathfinding нагружает main thread.

## UI / persistence

- DOM/CSS overlay;
- React пока не нужен;
- localStorage для настроек/face profile;
- IndexedDB позже при необходимости progression/save.

## Hosting / CI

- GitHub `main` — canonical source;
- GitHub Actions — typecheck/build/tests;
- Vercel — preview/production;
- GitHub Pages не используется.

---

# 4. Архитектурные правила

1. `src/main.ts` остаётся тонким bootstrap.
2. Один fixed timestep simulation loop.
3. Input нормализуется в единое action state.
4. Simulation не запускает DOM/particle/audio напрямую.
5. Presentation подписывается на events.
6. Collision и navigation — разные системы.
7. Octree не используется как crowd database.
8. Weapon balance не размазывается magic numbers по update loop.
9. Enemy archetypes data-driven.
10. FX data-driven через recipes.
11. Particles/decals/lights/projectiles имеют pool/budget/TTL.
12. Обе камеры используют одну Player/World simulation.
13. Asset loading централизуется в AssetManager.
14. Level GLB не хранит всю gameplay logic.
15. Level gameplay markers живут в LevelManifest.
16. Mobile budget проектируется сразу.
17. Production не переключается на engine-next до functional parity + Android smoke-test.
18. После крупной контрольной точки обновляются `dev.md`, `history.md`, `structure.md`.

---

# 5. Definition of Success для 1.0 MVP

- стабильная загрузка без бесконечного loader;
- face upload/replace/local persistence;
- полноценные TOP и 3RD режимы;
- pistol/shotgun/bow ощущаются по-разному;
- Walker/Runner/Brute различаются визуально и поведением;
- authored `Abandoned Outskirts`;
- collision уровня;
- заражённые обходят препятствия;
- waves/difficulty curve;
- combat feedback;
- audio/ambient;
- mobile HUD/controls;
- 30+ FPS target на реальном Android;
- 60 FPS target desktop;
- Vite production bundle без runtime Three.js CDN;
- CI typecheck/build/tests;
- лицензии assets зафиксированы.

---

# 6. Статусы задач

- `[x]` — выполнено;
- `[~]` — prototype/частично;
- `[?]` — реализовано, но требуется обязательная runtime/device проверка;
- `[ ]` — не начато;
- `[HOLD]` — осознанно отложено.

---

# 7. D0 — Documentation & Architecture Freeze

**Статус: ЗАВЕРШЁН.**

- [x] три архитектурных аудита сведены;
- [x] определён technology stack;
- [x] создан `structure.md`;
- [x] создан `history.md`;
- [x] сформирован полный roadmap;
- [x] зафиксирована asset/licensing strategy;
- [x] зафиксирована CI/testing strategy;
- [x] documentation freeze завершён и разработка возобновлена.

---

# 8. 0.5A — Engine Foundation

**Статус: В РАБОТЕ.**

## 8.1 Build / CI

- [x] `package.json`;
- [x] Three.js npm dependency;
- [x] strict TypeScript;
- [x] Vite build;
- [x] ES2020 target;
- [x] isolated `engine-lab.html`;
- [x] GitHub Actions workflow;
- [x] фактически подтверждён зелёный CI: install + typecheck + Vite build;
- [ ] закрепить `package-lock.json`;
- [ ] после lockfile перейти в CI с `npm install` на `npm ci`;
- [ ] unit-test runner добавить после стабилизации core systems.

## 8.2 Core lifecycle

- [x] fixed timestep `GameLoop`;
- [x] typed `EventBus`;
- [x] `GameApp` lifecycle container;
- [x] `GameStateController`;
- [x] resilient `Bootstrap`;
- [x] `src/main.ts` сокращён до bootstrap;
- [x] centralized dispose foundation;
- [x] pause/resume;
- [x] visibility/background-tab handling;
- [~] loading/error state foundation;
- [ ] финальная MENU/LOADING/PLAYING/GAME_OVER state machine будет завершена на parity этапе.

## 8.3 Input

- [x] `InputManager` foundation;
- [x] KeyboardMouse adapter;
- [x] TouchInput adapter;
- [x] TouchInput теперь полностью detach-ится при cleanup;
- [~] joystick/actions prototype;
- [ ] unified action map/config;
- [ ] pointer aim;
- [ ] third-person look;
- [ ] mobile aim assist;
- [ ] deadzone/sensitivity settings;
- [ ] landscape/safe-area tuning.

## 8.4 Physics

- [x] static Octree foundation;
- [x] Capsule player proof;
- [ ] выделить `PlayerCapsule` abstraction;
- [ ] robust wall sliding;
- [ ] slopes/steps policy;
- [ ] dynamic primitive colliders;
- [ ] `SpatialHash`;
- [ ] camera collision query;
- [ ] projectile/world collision query.

## 8.5 Cameras

- [x] старый `DualCameraRig` proof;
- [x] создан `TopDownCamera`;
- [x] создан `ThirdPersonCamera`;
- [x] создан `CameraDirector`;
- [x] `DualCameraRig` оставлен временным compatibility shim;
- [ ] перевести `GameApp` на прямой `CameraDirector` import и удалить shim;
- [ ] third-person camera collision;
- [ ] shoulder offset tuning;
- [ ] top-down zoom/follow tuning;
- [ ] camera-relative movement;
- [ ] recoil/shake interface;
- [ ] плавный переход при переключении камеры.

## 8.6 Combat simulation

- [x] typed combat contracts;
- [x] data-driven pistol/shotgun/bow;
- [x] `WeaponSystem`;
- [x] ammo/cooldown/reload;
- [x] `Health`;
- [x] `DamageSystem`;
- [x] Hit/Kill event pipeline;
- [~] pistol hitscan proof;
- [~] shotgun multi-hitscan proof;
- [x] ballistic ProjectileSystem foundation для bow;
- [ ] real world/enemy collision queries;
- [ ] spread model tied to player state;
- [ ] recoil application;
- [ ] character hit zones;
- [ ] bow draw/release state;
- [ ] switching/reload interrupt rules.

## 8.7 Presentation / FX

- [x] composable `recipes.ts`;
- [x] bounded `ParticlePool` foundation;
- [x] bounded/fading `DecalPool` foundation;
- [x] `WindField`;
- [x] `CombatFeedback` boundary;
- [x] bounded `LightPool`;
- [x] `EffectSystem` orchestrator создан;
- [ ] подключить EffectSystem в реальный shot/hit pipeline;
- [ ] concrete particle adapters;
- [ ] concrete decal adapter;
- [ ] muzzle flash/smoke;
- [ ] flesh/surface hits;
- [ ] camera shake;
- [ ] controlled hit-stop;
- [ ] quality-dependent FX budgets.

## 8.8 Quality / debug

- [x] mobile-low/mobile-high/desktop-high profiles;
- [x] clustered GrassField prototype;
- [ ] `Metrics`;
- [ ] `DebugOverlay ?debug=1`;
- [ ] renderer stats;
- [ ] frame-time moving average;
- [ ] manual quality selector;
- [ ] automatic profile selection tuning.

### 0.5A Definition of Done

- [ ] lockfile + clean reproducible install;
- [x] CI green на текущем foundation;
- [?] engine-next Vite bundle boots в реальном browser;
- [x] Three.js bundled через npm/Vite architecture;
- [x] один fixed loop;
- [~] desktop/mobile input foundation;
- [~] player collision foundation;
- [~] обе камеры foundation;
- [~] все три weapons используют unified data/system foundation;
- [~] hit/damage/kill pipeline foundation;
- [~] pooled FX foundation;
- [ ] desktop browser smoke-test;
- [ ] Android smoke-test.

---

# 9. 0.5B — Legacy Functional Parity

Цель: engine-next воспроизводит весь необходимый функционал текущего 0.5 legacy runtime.

## Lifecycle/UI

- [ ] menu;
- [ ] face picker;
- [ ] pre-game camera choice;
- [ ] loading/error UX;
- [ ] start/restart/game over;
- [ ] pause.

## Gameplay

- [ ] movement desktop;
- [ ] movement touch;
- [ ] pistol;
- [ ] shotgun;
- [ ] bow;
- [ ] reload/swap;
- [ ] waves;
- [ ] kills/score;
- [ ] Walker/Runner/Brute;
- [ ] health/ammo pickups;
- [ ] face persistence;
- [ ] TOP/3RD switching.

## Atmosphere

- [ ] rain;
- [ ] fog;
- [ ] lights;
- [ ] muzzle FX;
- [ ] blood/decals;
- [ ] grass.

## Validation

- [ ] desktop smoke;
- [ ] Android smoke;
- [ ] no infinite loader;
- [ ] feature comparison with legacy.

---

# 10. 0.5C — Production Migration

- [ ] Vite index становится production entrypoint;
- [ ] Vercel legacy proxy configuration удаляется/упрощается;
- [ ] runtime Three.js/GLTFLoader proxy удаляется;
- [ ] `game-v050.js` выводится из production path;
- [ ] legacy CSS интегрируется в новую UI architecture;
- [ ] `engine-lab.html` становится debug-only или удаляется;
- [ ] README обновляется;
- [ ] production deploy;
- [ ] Android verification;
- [ ] version checkpoint/tag.

---

# 11. 0.6 — Visual Vertical Slice

Цель: первый билд, который выглядит как настоящая игра на статичном скриншоте.

## Hero / weapons

- [ ] качественный humanoid GLB;
- [ ] skeleton/scale/outfit/head;
- [ ] weapon sockets;
- [ ] pistol/shotgun/bow/arrow GLB;
- [ ] idle/walk/run;
- [ ] aim/fire/reload;
- [ ] hit/death;
- [ ] animation crossfade.

## Infected

- [ ] Walker GLB + animations;
- [ ] Runner GLB + animations;
- [ ] Brute GLB + animations;
- [ ] силуэты читаются на расстоянии.

## Abandoned Outskirts

- [ ] wet asphalt road;
- [ ] dirt road;
- [ ] 2–3 buildings;
- [ ] garage/barn;
- [ ] fences/gates;
- [ ] abandoned car;
- [ ] lamps/poles;
- [ ] trees/bushes/grass;
- [ ] mud/puddles/debris;
- [ ] collision geometry;
- [ ] LevelManifest;
- [ ] initial navmesh.

## Lighting

- [ ] moon/fill;
- [ ] hero readability/rim;
- [ ] flashlight;
- [ ] street lamps;
- [ ] wet material response;
- [ ] тёмная, но читаемая сцена.

---

# 12. 0.7 — Navigation / Enemy Gameplay

- [ ] navmesh spike и выбор browser integration;
- [ ] bake/load navmesh;
- [ ] path query/repath policy;
- [ ] SpatialHash;
- [ ] LocalAvoidance;
- [ ] EnemySystem;
- [ ] EnemyBrain;
- [ ] State Tree;
- [ ] sight/sound perception;
- [ ] wander/investigate/chase/attack/stagger/death;
- [ ] update frequency LOD;
- [ ] navigation debug view.

---

# 13. 0.75 — Wave Director

- [ ] spawn zones;
- [ ] WaveDirector;
- [ ] composition rules;
- [ ] max active enemies by quality/performance;
- [ ] difficulty curve;
- [ ] downtime between waves;
- [ ] pickup/drop rules;
- [ ] mini-event hooks;
- [ ] no unavoidable spawn on player.

---

# 14. 0.8 — Combat Feel / FX / Audio

- [ ] pistol feel;
- [ ] shotgun heavy feel;
- [ ] bow draw/release feel;
- [ ] head/torso/limb reactions;
- [ ] stagger;
- [ ] blood/decal/sparks/dust;
- [ ] death variants;
- [ ] weapon/reload sounds;
- [ ] footsteps by surface;
- [ ] infected sounds;
- [ ] rain/wind/thunder/ambient;
- [ ] optional music intensity layers.

---

# 15. 0.82 — Environment Reactivity

- [ ] grass responds to WindField;
- [ ] weapon/explosion local wind impulses;
- [ ] destructible light prototype;
- [ ] explosive barrel prototype;
- [ ] hit decals;
- [ ] puddle/wet polish;
- [ ] small debris feedback.

Не превращать игру в full physics sandbox.

---

# 16. 0.85 — Face System 2.0

- [ ] face editor;
- [ ] crop/zoom/pan;
- [ ] oval mask;
- [ ] brightness/contrast normalization;
- [ ] local persistence;
- [ ] integration into real hero head;
- [ ] fallback head;
- [ ] replace/remove photo;
- [ ] portrait/landscape photo tests;
- [ ] privacy copy.

Advanced:

- [HOLD] automatic landmark detection;
- [HOLD] advanced skin blending;
- [HOLD] multiple hairstyles/heads.

---

# 17. 0.87 — HUD / UX

- [ ] compact mobile HP/ammo;
- [ ] joystick/FIRE/reload/swap/CAM;
- [ ] safe areas;
- [ ] desktop crosshair/weapon slots;
- [ ] settings;
- [ ] quality selector;
- [ ] sensitivity/audio;
- [ ] pause;
- [ ] clear loading errors.

---

# 18. 0.9 — Performance

- [ ] draw-call audit;
- [ ] texture/geometry/material audit;
- [ ] shadow/light audit;
- [ ] DPR tuning;
- [ ] GLB optimization;
- [ ] texture compression;
- [ ] mesh compression;
- [ ] LOD;
- [ ] path query throttling;
- [ ] no hot-path uncontrolled allocations;
- [ ] restart/resource disposal leak test.

Targets:

- mobile: 30+ FPS;
- desktop: 60 FPS;
- initial vertical-slice download желательно удерживать примерно в диапазоне 15–30 MB compressed.

---

# 19. 0.92 — QA / Stability

- [ ] Android real browser;
- [ ] desktop Chrome/Chromium;
- [ ] portrait/landscape;
- [ ] slow-network first load;
- [ ] failed asset load;
- [ ] cancelled/denied face upload;
- [ ] repeated restart;
- [ ] repeated camera switching;
- [ ] 15+ minute session;
- [ ] high-wave stress test.

---

# 20. 0.95 — Replay / Progression

Только после стабильного combat vertical slice.

- [ ] score;
- [ ] best score;
- [ ] wave progression;
- [ ] run stats;
- [ ] простой upgrade choice между волнами/этапами;
- [ ] local persistence.

Не строить сложный RPG inventory до подтверждения core gameplay.

---

# 21. 1.0 — MVP Release

Must-have:

- [ ] Vite production architecture;
- [ ] authored level;
- [ ] dual camera;
- [ ] face integration;
- [ ] 3 weapons;
- [ ] 3 infected archetypes;
- [ ] navigation;
- [ ] waves;
- [ ] combat feedback;
- [ ] audio;
- [ ] mobile controls;
- [ ] settings;
- [ ] stable restart/game over;
- [ ] quality profiles;
- [ ] CI/tests;
- [ ] asset attribution;
- [ ] Android performance target;
- [ ] production deploy;
- [ ] final docs.

---

# 22. Post-1.0 backlog

- special infected;
- bosses;
- multiple maps;
- interiors;
- perks/XP;
- richer weapon upgrades;
- inventory;
- dodge/stamina;
- environmental traps;
- mini-events;
- auto face alignment;
- hairstyles/clothing presets;
- PWA evaluation;
- gamepad;
- richer iOS validation.

Не планируется для MVP:

- multiplayer/networking;
- dedicated server;
- MMO/backend architecture;
- native engine rewrite;
- full destruction sandbox.

---

# 23. Known technical debt

- [ ] package lockfile отсутствует;
- [ ] CI пока использует `npm install`, а не `npm ci`;
- [ ] `DualCameraRig.ts` остаётся compatibility shim;
- [ ] EffectSystem создан, но ещё не подключён к реальному combat pipeline;
- [ ] current Soldier GLB — pipeline proof, не final asset;
- [ ] procedural weapons — temporary;
- [ ] current legacy scene — не authored level;
- [ ] asset attribution registry ещё не создан;
- [ ] navigation package/integration ещё не выбран;
- [ ] automated browser smoke test отсутствует;
- [ ] engine-next ещё не проверен на реальном Android;
- [ ] README описывает старое состояние и обновляется при следующем production milestone.

---

# 24. Следующий рабочий блок

Официальная очередь после checkpoint `0a599032`:

1. Закрепить package lock и воспроизводимую CI installation.
2. Перевести `GameApp` напрямую на `CameraDirector`, удалить compatibility shim.
3. Выделить `PlayerCapsule` и `SpatialHash` foundations.
4. Добавить camera/world collision query.
5. Довести unified input: pointer-look/aim + mobile aim.
6. Подключить `EffectSystem` к shot/hit events и существующим pools.
7. Добавить AssetManager / LevelLoader / LevelManifest.
8. Начать 0.5B functional parity.
9. Desktop smoke-test.
10. Android smoke-test.
11. Только после parity — production migration.

---

# 25. Правило ведения dev.md

После каждого рабочего захода:

1. обновить статусы `[ ]/[~]/[?]/[x]`;
2. записать новый technical debt;
3. обновить active milestone/checkpoint;
4. добавить запись в `history.md`;
5. если менялась архитектура — обновить `structure.md`;
6. milestone считается закрытым только после соответствующей проверки.

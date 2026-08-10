# Facefall Survivor — Development Plan

Последняя актуализация: **2026-08-10**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`  
Production hosting: **Vercel only**  
Production URL: `https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

Текущая production-контрольная точка: **0.5 ALPHA — legacy runtime**  
Текущий активный этап: **0.5A — Engine Foundation / engine-next**  
Текущий engine-next checkpoint: **PR #2 merged, commit `29008e7d`**

Связанные документы:

- `structure.md` — current/target architecture;
- `history.md` — история решений/checkpoints;
- `THIRD_PARTY_NOTICES.md` — direct code reuse notices;
- `public/assets/ATTRIBUTION.md` — media asset licensing registry.

---

# 1. Цель проекта

Facefall Survivor — mobile-first браузерная 3D action-survival игра против заражённых.

Обязательная игровая формула:

- TOP / Diablo-like camera;
- third-person over-the-shoulder camera;
- одна simulation для обеих камер;
- pistol / shotgun / bow;
- Walker / Runner / Brute;
- waves;
- загружаемая фотография пользователя становится лицом героя;
- реалистичное мрачное окружение;
- desktop + touch управление;
- стабильная работа на реальном Android;
- Vercel production;
- backend для MVP не обязателен.

Главная продуктовая особенность:

> Игрок загружает свою фотографию и видит себя героем survival shooter.

---

# 2. Итог трёх аудитов

References:

1. `ivanoskov/shooter` — browser/Three.js foundation;
2. `Unvanquished/Unvanquished` — gameplay architecture;
3. `redeclipse/base` — combat feel / FX / environment.

Целевая формула:

> **Three.js/Vite browser foundation + event/component gameplay architecture + data-driven combat + pooled FX + authored GLB levels + mobile-first performance.**

---

# 3. Reuse policy

Новый зафиксированный принцип:

- подходящий изолированный код из permissive-compatible repository можно копировать/адаптировать;
- source revision и license фиксируются в `THIRD_PARTY_NOTICES.md`;
- GPL/несовместимый код напрямую не переносится;
- native/engine-specific C++ решения переписываются под TypeScript/Three.js;
- media assets проверяются отдельно от source-code license;
- если адаптация чужого блока сложнее собственного clean implementation — пишем с нуля.

На checkpoint PR #2 прямо адаптированы из MIT `ivanoskov/shooter`:

- Capsule/Octree collision-response pattern → `PlayerCapsule.ts`;
- GLTF loading/traverse preparation pattern → `AssetManager.ts` / `LevelLoader.ts`.

С нуля для Facefall написаны:

- `SpatialHash`;
- `CameraCollision`;
- pointer/touch aiming;
- Facefall `LevelManifest`;
- combat/FX orchestration текущего integration layer.

---

# 4. Технологический стек

## Runtime/build

- TypeScript strict;
- Vite;
- npm;
- Node 20 в CI;
- Three.js npm package;
- ES2020 baseline.

## Rendering/assets

- Three.js WebGLRenderer;
- sRGB + ACES;
- Standard/Physical materials;
- GLB/glTF 2.0;
- Blender;
- KTX2/Basis и Meshopt после profiling/asset pipeline setup.

## Physics/navigation

- static collision → Octree;
- player → Capsule;
- dynamic neighbour lookup → SpatialHash;
- AI navigation → Recast/Detour-style navmesh later;
- general rigid-body engine пока не добавляем.

## UI/persistence

- DOM/CSS overlay;
- React пока не нужен;
- localStorage для face/settings;
- IndexedDB только если progression/save перерастёт localStorage.

## Hosting/CI

- GitHub `main` source-of-truth;
- GitHub Actions;
- Vercel;
- GitHub Pages не используется.

---

# 5. Архитектурные правила

1. `src/main.ts` — thin bootstrap.
2. Один fixed timestep loop.
3. Input → normalized action/aim state.
4. Simulation не создаёт visual/audio effects напрямую.
5. Presentation реагирует на events.
6. Collision ≠ navigation.
7. Octree ≠ crowd database.
8. Weapons/enemies data-driven.
9. FX recipes + pools + budgets.
10. Обе камеры используют одну simulation.
11. Asset loading централизован.
12. Gameplay markers отдельно от GLB geometry.
13. Mobile budget проектируется сразу.
14. Production не переключается на engine-next до parity + Android smoke.
15. Прямой reused code получает license notice.
16. После checkpoint обновляются MD-файлы.

---

# 6. Definition of Success — 1.0 MVP

- стабильный boot без infinite loader;
- face upload/replace/local persistence;
- полноценные TOP и 3RD;
- pistol/shotgun/bow ощущаются по-разному;
- Walker/Runner/Brute различаются;
- authored `Abandoned Outskirts`;
- static collision;
- infected обходят препятствия;
- waves/difficulty curve;
- combat feedback;
- audio/ambient;
- mobile HUD/controls;
- 30+ FPS target Android;
- 60 FPS target desktop;
- production Vite bundle без runtime Three CDN;
- CI/tests;
- asset licensing registry.

---

# 7. Статусы

- `[x]` — выполнено;
- `[~]` — foundation/prototype;
- `[?]` — реализовано, требуется runtime/device verification;
- `[ ]` — не начато;
- `[HOLD]` — отложено.

---

# 8. D0 — Documentation & Architecture Freeze

**Статус: ЗАВЕРШЁН.**

- [x] три аудита сведены;
- [x] technology stack;
- [x] `structure.md`;
- [x] `history.md`;
- [x] roadmap до 1.0;
- [x] asset/licensing strategy;
- [x] CI/testing strategy;
- [x] development resumed.

---

# 9. 0.5A — Engine Foundation

**Статус: В РАБОТЕ, существенно продвинут.**

## 9.1 Build / CI

- [x] `package.json`;
- [x] Three.js npm dependency;
- [x] strict TypeScript;
- [x] Vite build;
- [x] ES2020 target;
- [x] `engine-lab.html`;
- [x] GitHub Actions workflow;
- [x] многократно подтверждён green install/typecheck/build;
- [ ] закрепить `package-lock.json`;
- [ ] перейти на `npm ci` после lockfile;
- [ ] unit-test runner после стабилизации core systems.

Ограничение: локальная execution environment не имеет наружного DNS к npm/GitHub, поэтому lockfile не генерируем вручную/угадыванием.

## 9.2 Core lifecycle

- [x] `GameLoop`;
- [x] `EventBus`;
- [x] `GameApp`;
- [x] `GameStateController`;
- [x] `Bootstrap`;
- [x] thin `src/main.ts`;
- [x] dispose foundation;
- [x] pause/resume;
- [x] visibility handling;
- [~] loading/error foundation;
- [ ] MENU/FACE_SETUP/GAME_OVER product states на parity этапе.

## 9.3 Input / aim

- [x] `InputManager`;
- [x] KeyboardMouse adapter;
- [x] TouchInput;
- [x] clean detach/reset;
- [x] normalized pointer NDC;
- [x] aim delta;
- [x] TOP cursor/touch ground aim;
- [~] 3RD mouse/touch look;
- [~] joystick/actions;
- [ ] pitch/crosshair aiming;
- [ ] mobile aim assist;
- [ ] deadzone/sensitivity config;
- [ ] safe-area/landscape tuning;
- [ ] camera-relative movement.

## 9.4 Physics

- [x] static Octree;
- [x] `PlayerCapsule` abstraction;
- [~] wall sliding/collision response;
- [x] world raycast;
- [x] world segmentCast;
- [x] `SpatialHash`;
- [x] enemy registration/removal in SpatialHash proof;
- [x] third-person camera collision query;
- [~] projectile/world query foundation;
- [ ] slopes/steps policy;
- [ ] dynamic colliders;
- [ ] SpatialHash update cycle when enemies begin moving.

## 9.5 Cameras

- [x] `TopDownCamera`;
- [x] `ThirdPersonCamera`;
- [x] `CameraDirector`;
- [x] old `DualCameraRig` compatibility shim removed;
- [x] third-person camera collision/auto push-in foundation;
- [~] shoulder offset;
- [ ] top-down zoom/follow tuning;
- [ ] crosshair target ray/pitch;
- [ ] camera recoil/shake interface;
- [ ] smooth mode transition.

## 9.6 Combat simulation

- [x] combat contracts;
- [x] data-driven pistol/shotgun/bow;
- [x] `WeaponSystem`;
- [x] ammo/cooldown/reload;
- [x] `Health`;
- [x] `DamageSystem`;
- [x] Hit/Kill events;
- [x] pistol hitscan proof;
- [x] shotgun multi-hitscan proof;
- [x] static-world occlusion for hitscan;
- [x] ballistic `ProjectileSystem` foundation;
- [~] primitive head/torso/limb zone proof;
- [ ] connect ballistic projectiles to real world/enemy collision;
- [ ] bow draw/release;
- [ ] movement-dependent spread;
- [ ] recoil application;
- [ ] weapon switch/reload interruption rules.

## 9.7 Presentation / FX

- [x] effect recipes;
- [x] ParticlePool foundation;
- [x] DecalPool foundation;
- [x] WindField;
- [x] CombatFeedback boundary;
- [x] LightPool;
- [x] EffectSystem orchestrator;
- [x] EffectSystem connected to real Shot/Hit events;
- [x] transient muzzle-light adapter;
- [x] wind impulse orchestration;
- [ ] concrete particle renderer/adapters;
- [ ] concrete decal adapter;
- [ ] muzzle smoke/casing visuals;
- [ ] flesh/surface visual hit adapters;
- [ ] camera shake;
- [ ] controlled hit-stop;
- [ ] quality-dependent FX budgets tuning.

## 9.8 World / assets

- [x] `AssetManager` GLB cache/load foundation;
- [x] renderable preparation/bounds foundation;
- [x] asset dispose helper;
- [x] `LevelManifest` typed schema + runtime validation;
- [x] `LevelLoader` GLB + manifest pipeline;
- [x] optional static collision rebuild after level load;
- [x] `Abandoned Outskirts` manifest skeleton;
- [x] media `ATTRIBUTION.md` registry;
- [ ] actual `level.glb`;
- [ ] connect `LevelLoader` to GameApp/runtime;
- [ ] replace lab BoxGeometry world;
- [ ] loading progress/error handling;
- [ ] navmesh data.

## 9.9 Quality / debug

- [x] mobile-low/mobile-high/desktop-high;
- [x] clustered GrassField proof;
- [ ] Metrics;
- [ ] `?debug=1` overlay;
- [ ] renderer stats;
- [ ] frame-time average;
- [ ] manual quality selector;
- [ ] profile auto-selection tuning.

### 0.5A Definition of Done

- [ ] lockfile/reproducible install;
- [x] CI green;
- [?] engine-next Vite bundle boots in real browser;
- [x] Three.js bundled via npm/Vite architecture;
- [x] one fixed loop;
- [~] desktop/mobile input;
- [~] player collision;
- [~] both cameras;
- [~] all 3 weapons unified foundation;
- [~] damage/kill pipeline;
- [~] pooled/effect architecture;
- [~] level loading architecture;
- [ ] desktop browser smoke;
- [ ] Android smoke.

---

# 10. 0.5B — Legacy Functional Parity

Цель: engine-next воспроизводит весь необходимый legacy 0.5 функционал.

## Lifecycle/UI

- [ ] menu;
- [ ] face picker;
- [ ] pre-game camera choice;
- [ ] loading/error UX;
- [ ] start/restart/game over;
- [ ] pause UI.

## Gameplay

- [~] movement desktop foundation;
- [~] movement touch foundation;
- [~] pistol;
- [~] shotgun;
- [~] bow system foundation;
- [x] reload/swap foundation;
- [ ] waves;
- [ ] kills/score product loop;
- [~] Walker/Runner/Brute data/proof;
- [ ] pickups;
- [ ] face persistence integration;
- [~] TOP/3RD switching.

## Atmosphere

- [ ] rain;
- [x] fog foundation;
- [x] lights foundation;
- [~] muzzle FX foundation;
- [~] blood/decals architecture;
- [x] grass foundation.

## Validation

- [ ] desktop smoke;
- [ ] Android smoke;
- [ ] no infinite loader;
- [ ] feature comparison with legacy.

---

# 11. 0.5C — Production Migration

- [ ] Vite index → production;
- [ ] simplify Vercel config;
- [ ] remove legacy runtime Three/GLTF proxy;
- [ ] remove `game-v050.js` from production path;
- [ ] migrate UI/CSS;
- [ ] engine-lab debug-only/remove;
- [ ] README update;
- [ ] production deploy;
- [ ] Android verification;
- [ ] version checkpoint/tag.

---

# 12. 0.6 — Visual Vertical Slice

Цель: билд выглядит как настоящая игра на статичном скриншоте.

## Hero/weapons

- [ ] production-direction humanoid GLB;
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
- [ ] readable silhouettes.

## Abandoned Outskirts

- [ ] `level.glb`;
- [x] manifest skeleton;
- [ ] wet asphalt/dirt road;
- [ ] buildings/garage;
- [ ] fences/gates;
- [ ] abandoned car;
- [ ] lamps/poles;
- [ ] vegetation;
- [ ] mud/puddles/debris;
- [ ] collision source;
- [ ] navmesh.

## Lighting

- [ ] moon/fill polish;
- [ ] hero rim/readability;
- [ ] flashlight;
- [ ] street lamps;
- [ ] wet response;
- [ ] dark but readable scene.

---

# 13. 0.7 — Navigation / Enemy Gameplay

- [ ] navmesh spike/implementation choice;
- [ ] bake/load navmesh;
- [ ] path query/repath;
- [x] SpatialHash foundation;
- [ ] LocalAvoidance;
- [ ] EnemySystem;
- [ ] EnemyBrain;
- [ ] State Tree;
- [ ] sight/sound perception;
- [ ] wander/investigate/chase/attack/stagger/death;
- [ ] update-frequency LOD;
- [ ] navigation debug view.

---

# 14. 0.75 — Wave Director

- [x] enemy spawn marker schema;
- [ ] WaveDirector;
- [ ] spawn-zone runtime;
- [ ] composition rules;
- [ ] max active by quality;
- [ ] difficulty curve;
- [ ] downtime;
- [ ] pickup/drop rules;
- [ ] mini-events.

---

# 15. 0.8 — Combat Feel / FX / Audio

- [ ] pistol tuning;
- [ ] shotgun heavy feel;
- [ ] bow draw/release feel;
- [~] hit zones;
- [ ] stagger;
- [ ] particles/decals/surface hits;
- [ ] death variants;
- [ ] weapons/reload audio;
- [ ] footsteps;
- [ ] infected vocals;
- [ ] rain/wind/thunder/ambient.

---

# 16. 0.82 — Environment Reactivity

- [~] WindField foundation;
- [~] weapon local wind impulses;
- [ ] grass response to wind;
- [ ] destructible light prototype;
- [ ] explosive barrel;
- [ ] environmental decals;
- [ ] puddle/wet polish;
- [ ] debris feedback.

---

# 17. 0.85 — Face System 2.0

- [ ] editor;
- [ ] crop/zoom/pan;
- [ ] mask;
- [ ] brightness/contrast;
- [ ] local persistence;
- [ ] real hero head integration;
- [ ] fallback;
- [ ] replace/remove;
- [ ] portrait/landscape tests;
- [ ] privacy copy.

Advanced:

- [HOLD] automatic landmarks;
- [HOLD] advanced skin blending;
- [HOLD] hair/head presets.

---

# 18. 0.87 — HUD / UX

- [ ] compact mobile HUD;
- [~] joystick/FIRE/reload/swap/CAM lab controls;
- [ ] safe areas;
- [ ] desktop crosshair;
- [ ] settings;
- [ ] quality selector;
- [ ] sensitivity/audio;
- [ ] pause UI;
- [ ] loading errors/progress.

---

# 19. 0.9 — Performance

- [ ] draw-call audit;
- [ ] texture/geometry/material audit;
- [ ] shadow/light audit;
- [ ] DPR tuning;
- [ ] GLB optimization;
- [ ] KTX2/Meshopt evaluation;
- [ ] LOD;
- [ ] path throttling;
- [ ] hot-path allocation audit;
- [ ] restart/resource leak test.

Targets:

- mobile 30+ FPS;
- desktop 60 FPS;
- vertical-slice initial download ориентир 15–30 MB compressed.

---

# 20. 0.92 — QA / Stability

- [ ] Android real browser;
- [ ] desktop Chromium;
- [ ] portrait/landscape;
- [ ] slow network;
- [ ] failed asset load;
- [ ] cancelled face upload;
- [ ] repeated restart;
- [ ] repeated camera switching;
- [ ] 15+ minute session;
- [ ] high-wave stress.

---

# 21. 0.95 — Replay / Progression

- [ ] score;
- [ ] best score;
- [ ] wave progression;
- [ ] run stats;
- [ ] simple upgrades;
- [ ] local persistence.

Не строить сложный RPG inventory до подтверждения core gameplay.

---

# 22. 1.0 — MVP Release

Must-have:

- [ ] Vite production;
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
- [ ] restart/game over;
- [ ] quality profiles;
- [ ] CI/tests;
- [x] licensing registries foundation;
- [ ] Android performance target;
- [ ] production deploy;
- [ ] final docs.

---

# 23. Known technical debt

- [ ] package lockfile отсутствует;
- [ ] CI пока `npm install`, не `npm ci`;
- [ ] real particle/decal adapters ещё не подключены;
- [ ] ballistic projectiles не соединены с collision/damage;
- [ ] `GameApp` всё ещё содержит lab-world/combat wiring, которое предстоит выносить;
- [ ] current Soldier GLB — proof, не final asset;
- [ ] procedural weapons — temporary;
- [ ] current lab geometry — не authored level;
- [ ] navmesh integration не выбран;
- [ ] automated browser smoke test отсутствует;
- [ ] engine-next не проверен на реальном Android;
- [ ] README обновится при production migration.

Закрытый debt:

- [x] `DualCameraRig` compatibility shim удалён;
- [x] EffectSystem подключён к shot/hit;
- [x] code reuse notice создан;
- [x] media attribution registry создан;
- [x] AssetManager/LevelLoader/LevelManifest foundations созданы.

---

# 24. Следующий рабочий блок

Официальная очередь после checkpoint `29008e7d`:

1. Найти безопасный способ закрепить `package-lock.json`, затем CI → `npm ci`.
2. Подключить ballistic ProjectileSystem к world/enemy collision + DamageSystem.
3. Реализовать concrete Particle/Decal adapters и camera shake.
4. Подключить `LevelLoader` в engine runtime и убрать hardcoded lab world из `GameApp`.
5. Начать разносить player/world/combat wiring из `GameApp` в systems.
6. Начать `0.5B` lifecycle/menu/face parity.
7. Desktop smoke-test.
8. Android smoke-test.
9. Только после parity — production migration.

---

# 25. Правило ведения dev.md

После каждого рабочего захода:

1. обновить `[ ]/[~]/[?]/[x]`;
2. technical debt;
3. active checkpoint;
4. history.md;
5. structure.md при architecture changes;
6. milestone закрывается только после соответствующей проверки.

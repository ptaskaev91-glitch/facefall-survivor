# Facefall Survivor — Development Plan

Последняя актуализация: **2026-08-10**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Branch/source of truth: `main`  
Production hosting: **Vercel only**  
Production URL: `https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

Текущая production-контрольная точка: **0.5 ALPHA — legacy runtime**  
Текущий архитектурный этап: **0.5A — Engine Foundation / engine-next**  
Текущий режим работы: **DOCUMENTATION FREEZE — код игры временно не развиваем, фиксируем архитектуру и roadmap.**

Связанные документы:

- `structure.md` — текущая и целевая файловая/системная структура;
- `history.md` — история обсуждения, решений, проблем и контрольных точек;
- `dev.md` — выполненные и будущие этапы разработки.

---

# 1. Цель проекта

Facefall Survivor — браузерная mobile-first action-survival игра против заражённых.

Игровая формула:

- **Top-down / Diablo-like** режим;
- **Third-person over-the-shoulder** режим;
- один герой и одна simulation для обеих камер;
- pistol / shotgun / bow;
- несколько типов заражённых;
- волны и постепенное увеличение сложности;
- пользователь загружает фотографию, и лицо используется на герое;
- реалистичное, мрачное и атмосферное окружение;
- mobile и desktop управление;
- основная реальная тестовая платформа — Android browser;
- no mandatory backend для MVP.

Главная продуктовая особенность:

> Игрок загружает собственную фотографию и видит себя героем survival shooter.

Главная техническая цель:

> Достичь визуально убедительной 3D-игры без потери стабильности и производительности на мобильном браузере.

---

# 2. Definition of Success

Версия 1.0 MVP считается успешной, если одновременно выполнено:

- игра открывается по Vercel URL без бесконечной загрузки;
- пользователь может загрузить/заменить лицо;
- лицо хранится и обрабатывается локально;
- top-down режим полностью играбелен;
- third-person режим полностью играбелен;
- переключение камеры не ломает simulation;
- pistol / shotgun / bow ощущаются по-разному;
- Walker / Runner / Brute визуально и поведенчески различаются;
- есть полноценная authored локация `Abandoned Outskirts`;
- есть collision с геометрией уровня;
- заражённые обходят препятствия;
- есть waves/spawning/difficulty curve;
- есть полноценный combat feedback;
- есть audio/ambient layer;
- UI адаптирован под touch;
- mobile quality profile обеспечивает целевые 30+ FPS на реальном Android в нормальном игровом сценарии;
- desktop target — 60 FPS на обычном современном устройстве;
- crash/loading failure показывает понятный fallback/error, а не бесконечный loader;
- production build идёт через Vite, без runtime CDN зависимости от Three.js;
- CI проверяет build/typecheck/tests;
- все внешние assets имеют понятное происхождение и лицензию.

---

# 3. Итог трёх архитектурных аудитов

## 3.1 `ivanoskov/shooter` — browser foundation

Используем как ориентир:

- npm / Vite / TypeScript;
- Three.js package dependency;
- GLB loading;
- static Octree;
- Capsule collider;
- modular Input / Camera / Physics / Game;
- quality profiles;
- debug tooling.

Не переносим:

- desktop-only Pointer Lock architecture;
- FPS camera;
- двойной physics update;
- конкретную mouse sensitivity implementation;
- dynamic Octree как crowd system;
- проект как готовую shooter codebase.

## 3.2 `Unvanquished/Unvanquished` — gameplay architecture

Используем как ориентир:

- simulation отдельно от presentation;
- Damage → Hit → Kill event pipeline;
- CombatFeedback отдельно от damage simulation;
- data-driven weapons/enemies;
- component-oriented entities;
- projectile abstraction;
- navmesh;
- state/behavior-based enemy decision logic;
- animation transitions/blending.

Не переносим:

- GPL game code напрямую;
- Dæmon engine;
- C++/CMake stack;
- multiplayer prediction/networking;
- тяжёлый CBSE code generator;
- RTS/building systems.

## 3.3 `redeclipse/base` — combat feel / FX / environment

Используем как ориентир:

- explicit weapon states;
- recoil yaw/pitch/recovery;
- movement-dependent spread;
- head/torso/limb hit zones;
- hitscan vs physical projectile;
- composable FX recipe;
- particles/light/sound/decal/wind/camera feedback;
- bounded stains/decals;
- grass culling/taper/budgets;
- global + local wind;
- level gameplay markers отдельно от geometry.

Не переносим:

- native renderer;
- macro-heavy weapon implementation;
- waypoint AI как основной navigation layer;
- content assets без отдельной license check.

## 3.4 Итог

Целевая формула:

> **Facefall = Three.js/Vite browser foundation + event/component gameplay architecture + data-driven combat + pooled presentation systems + authored GLB levels + mobile-first controls/performance.**

---

# 4. Зафиксированный технологический стек

## Core

- TypeScript strict mode.
- Vite.
- npm.
- Node 20 в CI на текущем этапе.
- Three.js — WebGL renderer / scene graph.
- glTF 2.0 / GLB — основной 3D asset format.

## Rendering

- Three.js `WebGLRenderer`.
- `SRGBColorSpace`.
- ACES Filmic tone mapping.
- `MeshStandardMaterial` / `MeshPhysicalMaterial`.
- dynamic lighting только в пределах budgets.
- post-processing — только после profiling; не является обязательным фундаментом.

## Physics

- static world: Three.js Octree;
- player: Capsule;
- simple dynamic hit/collision shapes: capsule/sphere/AABB;
- crowd lookup: spatial hash/grid;
- general physics engine пока **не добавляем**.

Причина: MVP не требует полноценной rigid-body simulation. Новый physics engine будет рассмотрен только если ragdoll/destructibles нельзя качественно реализовать облегчённым способом.

## Navigation

Цель:

- Recast/Detour-style navmesh через browser-compatible JS/WASM integration;
- NavMeshQuery;
- local avoidance;
- SpatialHash для соседей;
- NavigationWorker при необходимости вынести path work из main thread.

Конкретный npm package выбирается на этапе реализации после небольшого spike-test; архитектура не должна зависеть от одного wrapper package.

## AI

- lightweight State Tree;
- не внедряем тяжёлый Behavior Tree framework до появления реальной сложности;
- специальные заражённые смогут иметь дополнительные states/substates.

Базовая схема:

```text
WANDER
  ↓ sound/vision
INVESTIGATE
  ↓ target found
CHASE
  ↓ attack range
ATTACK
  ↓ hit/stun
STAGGER
  ↓ recover
CHASE
  ↓ hp <= 0
DEAD
```

## UI

- HTML + CSS overlay;
- без React на текущем этапе;
- touch UI и desktop UI используют один InputManager;
- UI не содержит gameplay rules.

## Face

- Canvas 2D local image processing;
- localStorage для lightweight profile;
- возможный IndexedDB позже;
- никакой обязательной отправки пользовательской фотографии на сервер.

## Audio

- Web Audio API;
- Three.js positional audio там, где полезно;
- AudioSystem подписывается на game events.

## Assets

Основной pipeline:

```text
source asset / Blender
       ↓
cleanup + scale + naming + skeleton
       ↓
GLB export
       ↓
glTF optimization
       ↓
texture compression / KTX2 where useful
       ↓
asset budget validation
       ↓
public/assets
```

Предпочтение:

- KTX2/Basis для GPU textures;
- Meshopt для geometry compression после тестирования;
- Draco только когда реально оправдан.

## Hosting

- GitHub source;
- Vercel production/preview;
- GitHub Pages не используется.

---

# 5. Инструменты разработки

## Основные

- GitHub — repository/version history/review;
- Vercel — deployment;
- GitHub Actions — CI;
- npm / Node — dependencies/build tooling;
- TypeScript compiler;
- Vite;
- browser DevTools;
- real Android device test.

## 3D / art

- Blender — scene/character/environment preparation;
- glTF Transform или эквивалент — optimization;
- image generation / visual concept tools — для art direction и референсов, но не как замена технической asset pipeline;
- texture authoring tools по необходимости.

## Debugging

Целевой `?debug=1` overlay:

- FPS;
- frame time;
- draw calls;
- triangles;
- textures;
- active enemies;
- nav paths;
- collision shapes;
- particles;
- decals;
- lights;
- grass cells/instances;
- quality profile;
- player coordinates;
- selected weapon/state.

---

# 6. Архитектурные правила

1. `src/main.ts` — bootstrap, а не monolith.
2. Один fixed timestep simulation loop.
3. Input читается один раз и нормализуется в action state.
4. Simulation не создаёт particles/sounds/DOM напрямую.
5. Presentation реагирует на events.
6. Static collision и AI navigation — разные структуры.
7. Octree не используется для crowd neighbour lookup.
8. Weapons data-driven.
9. Enemy archetypes data-driven.
10. FX data-driven через recipes.
11. Все runtime-spawned visuals имеют max count/TTL/pool.
12. Camera system не дублирует Player simulation.
13. Asset loading централизован в AssetManager.
14. GLB level geometry не содержит всю gameplay logic.
15. Level markers хранятся в LevelManifest.
16. Все external assets имеют attribution/license record.
17. Mobile budget проектируется сразу, а не после desktop версии.
18. Нельзя переключать production на engine-next до functional parity и Android smoke-test.
19. Любая крупная архитектурная смена отражается в `structure.md`.
20. Любая крупная контрольная точка отражается в `history.md` и `dev.md`.

---

# 7. Game state architecture

Целевые состояния приложения:

```text
BOOT
 ↓
MENU
 ↓
FACE_SETUP / SETTINGS
 ↓
LOADING
 ↓
PLAYING
 ↔ PAUSED
 ↓
GAME_OVER
 ↓
MENU / RESTART
```

Обязательное правило:

- MENU должен оставаться рабочим даже если 3D loading закончился ошибкой;
- loading имеет timeout/error state;
- user никогда не должен видеть бесконечное «включается» без результата.

---

# 8. Runtime flow

```text
Browser
 ↓
Bootstrap
 ↓
GameApp
 ├── AssetManager
 ├── Renderer
 ├── InputManager
 ├── World
 ├── Physics
 ├── Navigation
 ├── Simulation
 ├── CameraDirector
 └── Presentation

GameLoop fixed tick
 ↓
Input snapshot
 ↓
Player / Enemy / Weapon / Projectile simulation
 ↓
Physics + Navigation
 ↓
Events
 ↓
Animation / FX / Audio / HUD
 ↓
Camera
 ↓
Render
```

---

# 9. Combat pipeline

```text
Input.fire
 ↓
WeaponSystem
 ↓ validates ammo/state/cooldown
ShotEvent
 ├── pistol → hitscan
 ├── shotgun → multi-hitscan
 └── bow → ProjectileSystem
                ↓
           collision query
                ↓
DamageEvent
 ↓
DamageSystem / Health
 ├── HitEvent
 └── KillEvent
       ↓
CombatFeedback
 ├── animation reaction
 ├── blood particles
 ├── decal
 ├── audio
 ├── transient light
 ├── wind impulse
 ├── camera feedback
 └── optional damage indicator
```

---

# 10. Weapon design targets

## Pistol

Роль: надёжное базовое оружие.

- hitscan;
- высокая точность;
- умеренная отдача;
- быстрый reload;
- умеренный damage;
- headshot заметно полезен.

## Shotgun

Роль: close-range crowd control.

- multi-hitscan pellets;
- spread;
- высокий impulse;
- сильный recoil/camera kick;
- мощный muzzle flash;
- smoke;
- заметный stagger/knockback;
- медленнее reload/fire cycle.

## Bow

Роль: тяжёлый точный projectile weapon.

- physical arrow;
- gravity;
- draw/release timing;
- видимая trajectory feel;
- высокая headshot reward;
- arrow sticking рассматривается как presentation effect;
- не должен ощущаться как reskinned pistol.

---

# 11. Enemy design targets

## Walker

- стандартный pressure unit;
- медленный;
- среднее HP;
- простая melee attack;
- легко читаемый силуэт.

## Runner

- низкое/среднее HP;
- высокая скорость;
- быстрый chase;
- агрессивная attack animation;
- должен заставлять менять позицию.

## Brute

- большой размер;
- высокое HP;
- медленнее;
- высокий stagger resistance;
- сильный melee impact;
- опасен в choke points.

Позже:

- special infected;
- boss;
- ranged infected — только после проверки, что core melee crowd работает.

---

# 12. Camera design

## Top-down

Цель: modern Diablo/action-RPG readability.

- диагональный угол;
- smooth follow;
- camera-relative movement;
- pointer/touch aiming;
- небольшая динамика zoom;
- игрок читается на фоне;
- толпа читается;
- occlusion handling для высоких объектов позже.

## Third-person

Цель: полноценный over-the-shoulder shooter mode.

- right shoulder offset;
- camera collision;
- auto push-in near wall;
- look target из screen/crosshair;
- player upper body/weapon aims at target;
- FOV expands slightly during sprint;
- controlled recoil;
- mobile aim assist;
- camera не должна занимать пол-экрана спиной героя.

---

# 13. Face System 2.0

Основная уникальная система продукта.

## MVP

- выбрать фото;
- crop;
- zoom;
- pan;
- oval/face mask;
- brightness/contrast normalization;
- сохранить локально;
- применить к face region персонажа;
- neutral fallback;
- заменить фото из menu.

## Advanced

- local face detection;
- automatic eye/nose alignment;
- skin tone blending;
- несколько head/hair presets;
- optional face texture baking.

Privacy rule:

> face image local-first; server upload не является обязательным для базовой игры.

---

# 14. Level 1 — Abandoned Outskirts

Первая authored vertical-slice локация.

## Visual composition

- мокрая основная дорога;
- грунтовая боковая дорога;
- 2–3 здания;
- гараж/сарай;
- заборы;
- ворота;
- разбитый автомобиль;
- street lamps;
- utility poles;
- деревья нескольких видов;
- bushes;
- tall/short grass;
- rocks;
- crates;
- barrels;
- road signs;
- garbage;
- puddles;
- mud;
- tyre tracks;
- leaves/debris.

## Gameplay layout

- open combat field;
- narrow passage;
- choke point;
- flank path;
- retreat route;
- visual landmark;
- spawn zones вне прямой видимости;
- loot points;
- минимум один environment interaction позже.

## Data layout

```text
level.glb
level.manifest.json
navmesh data
preview image
```

Manifest:

- player spawn;
- enemy spawn zones;
- light anchors;
- audio zones;
- wind zones;
- loot points;
- choke tags;
- interactables;
- event anchors;
- navigation modifiers.

---

# 15. Materials / terrain / vegetation

## Materials target

- wet asphalt;
- dry asphalt;
- dirt;
- mud;
- grass;
- flattened grass;
- gravel;
- concrete;
- wood;
- painted metal;
- rusty metal;
- glass;
- wet surfaces.

## Vegetation

- InstancedMesh / merged strategy;
- clustered placement;
- exclude road/building zones;
- several grass variants;
- distance culling;
- taper/fade;
- wind sway;
- quality density;
- no individual heavyweight mesh per blade.

---

# 16. Lighting / atmosphere

Ночь должна быть атмосферной, но читаемой.

## Base

- hemisphere/ambient fill;
- moon directional light;
- hero rim/readability light;
- player flashlight;
- emissive environment sources;
- local lamps;
- limited dynamic muzzle lights.

## Atmosphere

- fog;
- ground haze approximation;
- rain;
- puddles/wetness;
- occasional lightning;
- smoke;
- film grain/vignette очень умеренно;
- no post-effect, который мешает видеть enemies.

---

# 17. Effects System budgets

Все значения — стартовые ориентиры и должны корректироваться profiling-ом.

## Mobile low provisional targets

- particle pool: порядка 256–384 concurrent particles/effect units;
- decals: порядка 64 active;
- physical projectiles: до 32–48;
- transient dynamic lights: минимальный budget, без лишних shadow casters;
- grass: примерно 600–1000 visible instances/clumps в зависимости от реализации;
- rain: уменьшенная density;
- DPR: примерно 1.0–1.2.

## Mobile high

- particle/decal/grass budget повышается;
- ограниченные shadows;
- DPR примерно до 1.4–1.5 при достаточной производительности.

## Desktop high

- richer shadows;
- more grass;
- richer particles;
- more lighting detail;
- DPR всё равно capped, чтобы 4K/HiDPI не уничтожил performance.

Правило: budgets определяются не визуальным желанием, а frame-time profiling.

---

# 18. Performance targets

## Mobile

Главная цель:

- **30+ FPS** в реальном combat scenario;
- frame time желательно ≤ 33.3 ms;
- без длинных GC spikes;
- старт без зависания;
- manageable initial download.

## Desktop

- 60 FPS target;
- frame time около 16.7 ms;
- higher quality profile.

## Provisional asset budgets для vertical slice

- initial gameplay download желательно удерживать примерно в диапазоне 15–30 MB compressed;
- environment textures преимущественно до 1K на mobile path;
- hero/key character textures допускают более высокий detail только после profiling;
- reused materials/atlases предпочтительнее большого числа уникальных textures;
- LOD обязательнее, чем бесконечное повышение polygon count.

---

# 19. Asset licensing policy

Каждый внешний asset должен иметь:

- source URL;
- author/source name;
- license;
- modification note;
- attribution requirement.

Хранить сведения в:

`public/assets/ATTRIBUTION.md`

Предпочтение:

1. собственные assets;
2. CC0;
3. permissive/compatible assets;
4. другие варианты только после явной license check.

Unvanquished GPL game code не копируется.

Red Eclipse media не считается автоматически разрешённой только из-за открытого source repository.

---

# 20. Testing strategy

## Layer 1 — TypeScript

- `tsc --noEmit`.

## Layer 2 — build

- clean npm install / `npm ci` после lockfile;
- Vite production build.

## Layer 3 — unit tests

План: Vitest или лёгкий compatible runner.

Первые test targets:

- WeaponSystem state transitions;
- reload/ammo;
- DamageSystem;
- hit multipliers;
- Health death once-only;
- Projectile integration;
- State Tree transitions;
- wave progression.

## Layer 4 — browser smoke

План: Playwright или эквивалент после стабилизации entrypoint.

Проверить:

- page boots;
- menu interactive;
- game starts;
- no fatal console errors;
- top camera;
- third camera;
- touch controls synthetic smoke where possible.

## Layer 5 — real device

Обязательный ручной Android test:

- load/start;
- buttons;
- joystick;
- fire/reload/swap;
- camera switching;
- face upload;
- 5–10 минут play session;
- thermals/performance субъективно;
- no infinite loading;
- orientation/safe area.

---

# 21. CI / deployment process

Целевая pipeline:

```text
feature work
 ↓
GitHub
 ↓
CI
 ├── npm ci
 ├── typecheck
 ├── unit tests
 ├── Vite build
 └── later: bundle budget / smoke test
 ↓
preview deploy
 ↓
manual verification
 ↓
main
 ↓
production Vercel
 ↓
real Android verification
```

До переключения engine-next на production legacy build остаётся доступным как fallback checkpoint.

---

# 22. Branch / commit discipline

На следующих крупных этапах:

- documentation / tiny safe fixes могут идти напрямую в `main`;
- engine migration / major visual changes лучше вести отдельной branch;
- после рабочей проверки — merge в `main`;
- production milestone получает понятный version/tag позже;
- каждый commit должен описывать один логический шаг;
- не объединять asset dump, architecture change и unrelated UI fix в один commit.

---

# 23. Статусы задач

Обозначения:

- `[x]` — реализовано/зафиксировано;
- `[~]` — реализовано частично или prototype;
- `[?]` — реализовано, но требует обязательной проверки;
- `[ ]` — не начато;
- `[HOLD]` — сознательно отложено;
- `[DROP]` — решено не делать.

---

# 24. Этап D0 — Documentation & Architecture Freeze

**Статус: выполнено в текущем заходе.**

- [x] свести выводы `ivanoskov/shooter`;
- [x] свести выводы `Unvanquished`;
- [x] свести выводы `Red Eclipse`;
- [x] определить итоговый technology stack;
- [x] определить runtime/system boundaries;
- [x] создать `structure.md`;
- [x] зафиксировать current structure;
- [x] зафиксировать target structure;
- [x] создать `history.md`;
- [x] восстановить хронологию ключевых решений;
- [x] полностью актуализировать `dev.md`;
- [x] зафиксировать asset strategy;
- [x] зафиксировать CI/testing strategy;
- [x] зафиксировать roadmap до 1.0;
- [x] не изменять game runtime в рамках documentation freeze.

### Exit criteria

Документация достаточна, чтобы следующий чат мог продолжить проект без потери ключевых решений.

---

# 25. Этап 0.5A — Engine Foundation

**Статус: частично реализован до documentation freeze.**

## 25.1 Project/build foundation

- [x] `package.json`;
- [x] npm Three.js 0.160.0;
- [x] strict TypeScript config;
- [x] Vite config;
- [x] ES2020 build target;
- [x] `engine-lab.html`;
- [x] GitHub Actions workflow;
- [ ] создать/закрепить `package-lock.json` через clean install;
- [?] получить фактически зелёный CI run;
- [ ] устранить все TypeScript/build warnings/errors, если CI их покажет;
- [ ] добавить lint только если он не создаёт лишний процессный шум;

## 25.2 Core runtime

- [x] fixed timestep `GameLoop`;
- [x] typed `EventBus`;
- [ ] `GameApp` lifecycle;
- [ ] `GameState` state machine;
- [ ] centralized dispose/cleanup lifecycle;
- [ ] loading/error state;
- [ ] pause/resume handling;
- [ ] visibility/background-tab handling;

## 25.3 Input

- [x] `InputManager` foundation;
- [x] KeyboardMouse adapter;
- [x] Touch adapter;
- [~] joystick/actions prototype;
- [ ] unified action map;
- [ ] pointer aim;
- [ ] third-person look control;
- [ ] mobile aim assist;
- [ ] deadzone/sensitivity config;
- [ ] touch safe-area tuning;
- [ ] landscape handling;

## 25.4 Physics

- [x] static Octree foundation;
- [x] Capsule player proof;
- [ ] separate player collider class;
- [ ] gravity/ground state if needed by final movement;
- [ ] sliding along walls robustly;
- [ ] steps/slopes policy;
- [ ] dynamic obstacle primitives;
- [ ] SpatialHash;
- [ ] camera collision query;
- [ ] projectile/world collision query;

## 25.5 Cameras

- [x] `DualCameraRig` proof;
- [ ] split into `TopDownCamera` / `ThirdPersonCamera`;
- [ ] `CameraDirector`;
- [ ] third-person shoulder offset tuning;
- [ ] third-person collision;
- [ ] top-down zoom/follow;
- [ ] camera-relative movement;
- [ ] camera recoil interface;
- [ ] transition between camera modes;

## 25.6 Combat simulation

- [x] combat type contracts;
- [x] data-driven weapons;
- [x] `WeaponSystem` foundation;
- [x] ammo/cooldown/reload state;
- [x] `Health` component;
- [x] `DamageSystem` foundation;
- [x] Hit/Kill event pipeline;
- [~] pistol hitscan proof;
- [~] shotgun multi-hit proof;
- [x] ballistic `ProjectileSystem` foundation;
- [ ] real world/enemy hit queries;
- [ ] spread model;
- [ ] recoil model application;
- [ ] hit zones from character colliders;
- [ ] bow draw/release state;
- [ ] weapon switching transitions;
- [ ] interrupt/reload rules;

## 25.7 Presentation/FX foundation

- [x] composable effect recipe data;
- [x] bounded ParticlePool foundation;
- [x] bounded DecalPool foundation;
- [x] WindField foundation;
- [x] CombatFeedback boundary;
- [ ] EffectSystem orchestrator;
- [ ] LightPool;
- [ ] muzzle flash recipe;
- [ ] muzzle smoke;
- [ ] shell casing visuals;
- [ ] flesh hit;
- [ ] surface hit;
- [ ] blood decal orientation;
- [ ] camera shake;
- [ ] hit-stop policy;
- [ ] effect LOD/budgets by quality profile;

## 25.8 Quality/performance

- [x] quality profile foundation;
- [x] clustered GrassField prototype;
- [ ] Metrics/DebugOverlay;
- [ ] renderer stats;
- [ ] frame-time moving average;
- [ ] automatic default quality choice;
- [ ] manual quality selector;
- [ ] adaptive downgrade only if profiling proves useful;

### 0.5A Definition of Done

- [ ] clean install works;
- [ ] CI green;
- [ ] engine-next boots from Vite bundle;
- [ ] no runtime Three.js CDN;
- [ ] fixed loop only one;
- [ ] input desktop/mobile functional;
- [ ] player collision functional;
- [ ] both cameras functional;
- [ ] all 3 weapons use unified systems;
- [ ] basic hit/damage/kill pipeline functional;
- [ ] pooled FX functional;
- [ ] no production switch yet unless parity milestone also complete.

---

# 26. Этап 0.5B — Legacy Functional Parity

Цель: engine-next умеет всё, что важно в legacy 0.5, до удаления старого runtime.

## Menu / lifecycle

- [ ] start menu;
- [ ] face picker;
- [ ] camera selection before game;
- [ ] game start;
- [ ] restart;
- [ ] game over;
- [ ] error/fallback UX.

## Gameplay parity

- [ ] player movement desktop;
- [ ] player movement touch;
- [ ] pistol;
- [ ] shotgun;
- [ ] bow;
- [ ] reload;
- [ ] weapon swap;
- [ ] waves;
- [ ] kills/score;
- [ ] Walker/Runner/Brute;
- [ ] pickups: health/ammo;
- [ ] face persistence;
- [ ] top camera;
- [ ] third camera;
- [ ] camera switch in-game.

## Atmosphere parity

- [ ] rain;
- [ ] fog;
- [ ] lighting;
- [ ] muzzle effects;
- [ ] blood;
- [ ] decals;
- [ ] basic grass;

## Validation

- [ ] desktop smoke;
- [ ] Android smoke;
- [ ] no infinite loader;
- [ ] production bundle loads from same origin;
- [ ] compare feature checklist with legacy.

### Exit

Только после этого разрешается удалить CDN proxy и monolithic `game-v050.js` из production path.

---

# 27. Этап 0.5C — Production Migration

- [ ] Vite `index.html` становится production entrypoint;
- [ ] Vercel config переводится с legacy proxies на normal static Vite deployment;
- [ ] удалить Three.js/GLTFLoader runtime proxy;
- [ ] `game-v050.js` перевести в archive branch/tag либо удалить после сохранённой Git history;
- [ ] `styles-safe.css` интегрировать/перенести в новую UI структуру;
- [ ] `engine-lab.html` оставить debug-only или удалить;
- [ ] обновить README;
- [ ] production deploy;
- [ ] Android check;
- [ ] зафиксировать checkpoint/tag.

---

# 28. Этап 0.6 — Visual Vertical Slice

Цель: первый билд, который на скриншоте выглядит как настоящая игра.

## Hero

- [ ] final-direction humanoid GLB;
- [ ] clean skeleton;
- [ ] correct scale;
- [ ] outfit;
- [ ] head suitable for FaceSystem;
- [ ] weapon sockets;
- [ ] LOD if needed;

## Hero animations

- [ ] idle;
- [ ] walk;
- [ ] run;
- [ ] pistol aim;
- [ ] shotgun aim;
- [ ] bow aim;
- [ ] pistol fire;
- [ ] shotgun fire;
- [ ] bow draw/release;
- [ ] reload;
- [ ] hit;
- [ ] death;
- [ ] crossfade state machine;

## Weapons art

- [ ] pistol GLB;
- [ ] shotgun GLB;
- [ ] bow GLB;
- [ ] arrow GLB;
- [ ] correct sockets/hand alignment;

## Infected art

- [ ] Walker GLB;
- [ ] Runner GLB;
- [ ] Brute GLB;
- [ ] visually distinct silhouettes;
- [ ] idle/move/attack/stagger/death animations;

## Level

- [ ] authored Abandoned Outskirts geometry;
- [ ] materials;
- [ ] props;
- [ ] collision;
- [ ] LevelManifest;
- [ ] initial navmesh;

## Lighting

- [ ] moon/fill;
- [ ] player readability;
- [ ] flashlight;
- [ ] street lamps;
- [ ] wet material response;
- [ ] readable darkness;

### 0.6 Definition of Done

На одном статичном скриншоте:

- герой не procedural mannequin;
- оружие читается;
- заражённые читаются;
- окружение имеет конкретное место/композицию;
- grass/materials заметны;
- ночь атмосферная, но gameplay читается.

---

# 29. Этап 0.7 — Navigation / Enemy Gameplay

## Navigation

- [ ] navmesh spike;
- [ ] choose browser integration;
- [ ] bake/load navmesh;
- [ ] path query;
- [ ] repath policy;
- [ ] off-mesh decisions if needed;
- [ ] LocalAvoidance;
- [ ] SpatialHash neighbour lookup;
- [ ] navigation debug view;

## EnemySystem

- [ ] entity registry;
- [ ] EnemySystem update batches;
- [ ] EnemyBrain;
- [ ] State Tree;
- [ ] perception: sight;
- [ ] perception: sound events;
- [ ] chase;
- [ ] attack;
- [ ] stagger;
- [ ] death cleanup;
- [ ] pooling/reuse strategy;
- [ ] LOD update frequency for distant enemies;

## Archetype behavior

### Walker
- [ ] standard chase/melee;

### Runner
- [ ] faster pursue;
- [ ] shorter reaction delay;
- [ ] aggressive attack;

### Brute
- [ ] slower pathing;
- [ ] stronger hit;
- [ ] high stagger resistance;
- [ ] collision/crowd mass feel.

---

# 30. Этап 0.75 — Wave Director / Encounter Design

- [ ] WaveDirector;
- [ ] spawn zones;
- [ ] spawn out of immediate camera view;
- [ ] composition rules by wave;
- [ ] max active enemies by quality/performance;
- [ ] difficulty scaling;
- [ ] downtime between waves;
- [ ] wave notifications;
- [ ] mini-event hooks;
- [ ] pickup/drop rules;
- [ ] no unavoidable spawn directly on player.

---

# 31. Этап 0.8 — Combat Feel / Effects / Audio

## Weapon feel

- [ ] pistol recoil/audio/flash tuned;
- [ ] shotgun high-impact recoil/audio/flash/smoke;
- [ ] bow draw/release/audio/arrow feedback;

## Hits

- [ ] head/torso/limb reactions;
- [ ] stagger;
- [ ] impact sounds;
- [ ] blood particles;
- [ ] blood decals;
- [ ] environmental sparks/dust;
- [ ] optional damage numbers;
- [ ] subtle strong-hit stop;

## Death

- [ ] death animation variants;
- [ ] corpse lifetime;
- [ ] corpse/decal budget;
- [ ] ragdoll-lite only if feasible within mobile budget.

## Audio

- [ ] weapon shots;
- [ ] reload;
- [ ] bow;
- [ ] footsteps by surface;
- [ ] infected vocals;
- [ ] melee impact;
- [ ] rain;
- [ ] wind;
- [ ] thunder;
- [ ] distant ambience;
- [ ] UI sounds;
- [ ] music/intensity layers later if justified.

---

# 32. Этап 0.82 — Environment Reactivity

- [ ] WindField connected to grass;
- [ ] shotgun/explosion local wind impulses;
- [ ] destructible light prototype;
- [ ] explosive barrel prototype;
- [ ] hit decals on environment;
- [ ] puddle/wet response polish;
- [ ] interactive door only if it adds gameplay value;
- [ ] small environmental debris feedback.

Не превращать этап в full physics sandbox.

---

# 33. Этап 0.85 — Face System 2.0

- [ ] dedicated face editor UI;
- [ ] crop/zoom/pan;
- [ ] mask;
- [ ] brightness/contrast;
- [ ] local persistence;
- [ ] actual head integration;
- [ ] face mesh/decal avoids floating-card look;
- [ ] fallback head;
- [ ] replace/remove photo;
- [ ] test landscape/portrait source photos;
- [ ] privacy copy in UI;

Advanced only after MVP:

- [HOLD] local automatic face landmark detection;
- [HOLD] advanced skin blending;
- [HOLD] multiple hairstyles/heads.

---

# 34. Этап 0.87 — HUD / UX

## Mobile

- [ ] compact HP;
- [ ] ammo;
- [ ] reload state;
- [ ] FIRE button;
- [ ] joystick;
- [ ] weapon swap;
- [ ] camera switch;
- [ ] safe areas;
- [ ] no overlap with gameplay center;
- [ ] opacity tuning;

## Desktop

- [ ] crosshair;
- [ ] weapon slots;
- [ ] ammo/HP;
- [ ] contextual reload warning;
- [ ] camera indicator minimal;

## General

- [ ] settings;
- [ ] quality selector;
- [ ] sensitivity;
- [ ] audio volume;
- [ ] face replace;
- [ ] pause;
- [ ] clear loading progress/errors.

---

# 35. Этап 0.9 — Performance / Optimization

## Renderer

- [ ] draw-call audit;
- [ ] texture memory audit;
- [ ] geometry audit;
- [ ] shadows audit;
- [ ] dynamic lights audit;
- [ ] material count audit;
- [ ] pixel ratio tuning;

## Assets

- [ ] GLB optimization;
- [ ] texture compression;
- [ ] mesh compression;
- [ ] LOD;
- [ ] remove unused animations/materials;
- [ ] preload priorities;
- [ ] lazy-load noncritical assets.

## AI

- [ ] update frequency LOD;
- [ ] path query throttling;
- [ ] local avoidance budget;
- [ ] SpatialHash profiling;

## Effects

- [ ] pools verified;
- [ ] no uncontrolled allocations in hot path;
- [ ] mobile limits tuned;

## Memory

- [ ] dispose old levels/assets correctly;
- [ ] no duplicated textures/materials;
- [ ] game restart does not leak scene resources.

---

# 36. Этап 0.92 — QA / Stability

Test matrix:

- [ ] Android Chromium-class browser;
- [ ] Android browser used for real user checks;
- [ ] desktop Chrome;
- [ ] desktop Edge/Chromium;
- [ ] Safari/iOS later if available;
- [ ] portrait mobile;
- [ ] landscape mobile;
- [ ] low-memory/reload scenarios;
- [ ] network-throttled first load;
- [ ] failed asset load;
- [ ] face photo denied/cancelled;
- [ ] restart repeatedly;
- [ ] switch cameras repeatedly;
- [ ] 15+ minute survival session;
- [ ] high-wave stress test.

---

# 37. Этап 0.95 — Progression / Replay Loop

Только после стабильного combat vertical slice.

MVP-минимум:

- [ ] score;
- [ ] wave progression;
- [ ] basic run stats;
- [ ] best score/local record;
- [ ] simple weapon upgrade choices between milestones/waves OR другой лёгкий progression mechanic;
- [ ] save local settings/progression.

Не строить сложный inventory/loot RPG до подтверждения core gameplay.

---

# 38. Этап 1.0 — MVP Release

## Must-have

- [ ] production Vite architecture;
- [ ] one authored level;
- [ ] dual camera;
- [ ] face upload/integration;
- [ ] three weapons;
- [ ] three infected archetypes;
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
- [ ] final README/docs.

---

# 39. Post-1.0 backlog

Не входит в текущий обязательный MVP.

## Gameplay

- special infected;
- bosses;
- multiple levels;
- doors/interactions;
- richer pickups;
- perks;
- XP;
- weapon upgrades;
- inventory;
- dodge;
- stamina;
- sprint enhancements;
- environmental traps;
- mini-events;
- challenge modes.

## Face/customization

- auto face alignment;
- hairstyles;
- clothing variants;
- multiple body/head presets.

## Content

- additional maps;
- interiors;
- weather variants;
- day/night variants;
- narrative fragments.

## Platform

- PWA/offline cache — evaluate separately;
- gamepad;
- richer iOS support.

## Explicitly not planned for MVP

- multiplayer/networking;
- dedicated server;
- MMO/backend architecture;
- full rigid-body destruction sandbox;
- native engine rewrite.

---

# 40. Known technical debt / inconsistencies

- [ ] `README.md` отражает более старую build description и должен быть обновлён после documentation freeze / следующего milestone;
- [ ] legacy `vercel.json` содержит proxy Three.js/GLTF/hero model и должен исчезнуть из целевой production architecture;
- [ ] current test Soldier GLB — pipeline proof, не final asset;
- [ ] current procedural weapon geometry — temporary;
- [ ] current legacy scene is not the final authored level;
- [ ] CI workflow создан, но фактический green run должен быть подтверждён;
- [ ] package lockfile необходимо закрепить;
- [ ] asset licensing registry ещё не создан;
- [ ] `src/main.ts` engine lab пока слишком много делает и должен быть decomposed;
- [ ] target navigation implementation ещё не выбрана/не протестирована;
- [ ] no automated browser smoke test yet.

---

# 41. Следующий шаг после documentation freeze

**Не начинать визуальный polish сразу.**

Следующий рабочий порядок:

1. Проверить/починить CI и clean Vite build.
2. Закрепить package lock.
3. Создать `GameApp`/GameState lifecycle и разгрузить `src/main.ts`.
4. Довести unified input.
5. Довести physics/camera foundation.
6. Довести Weapon/Damage/Projectile pipeline.
7. Подключить real EffectSystem к pools/recipes.
8. Добавить AssetManager/LevelLoader/LevelManifest.
9. Достичь legacy functional parity.
10. Провести desktop + Android smoke-test.
11. Переключить production на Vite engine-next.
12. Только после этого начать полноценный visual vertical slice 0.6 с authored assets.

Это является **официальным следующим порядком разработки** до следующей актуализации `dev.md`.

---

# 42. Правило ведения `dev.md`

После каждого рабочего захода:

1. выполненные задачи `[ ] → [x]`;
2. частичные `[~]`;
3. задачи, требующие проверки `[?]`;
4. добавить выявленный technical debt;
5. обновить текущий active milestone;
6. записать ключевой результат в `history.md`;
7. если менялась архитектура — обновить `structure.md`;
8. только после проверки на production считать milestone закрытым.

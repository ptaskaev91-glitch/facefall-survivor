# Facefall Survivor — History

Последняя актуализация: **2026-08-10**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`

---

# 1. Назначение файла

`history.md` — проектный журнал переписки и решений Facefall Survivor.

Он хранит:

- исходную идею;
- ключевые запросы пользователя;
- сделанные версии;
- ошибки и неудачные подходы;
- причины архитектурных изменений;
- результаты исследований;
- контрольные commits/PR;
- текущий статус и следующий шаг.

Это не dump tool-calls и не скрытые рассуждения, а восстановимая история проекта.

---

# 2. 2026-08-10 — исходная идея

Пользователь предложил браузерную survival shooter игру против заражённых.

Ключевые требования:

- top-down gameplay в духе Diablo;
- позже — полноценный third-person вариант;
- огнестрельное оружие + лук;
- пользователь загружает фотографию;
- фото становится лицом героя;
- игра должна работать на телефоне;
- внешний вид должен постепенно стать качественным и атмосферным, а не остаться canvas/procedural demo.

Закрепились три базовых weapons:

- pistol;
- shotgun;
- bow.

И три infected archetypes:

- Walker;
- Runner;
- Brute.

---

# 3. Первые browser prototypes

Проект начинался с минимальной HTML/CSS/JavaScript версии:

- загрузка лица;
- game loop;
- shooting;
- waves;
- mobile controls;
- публичный GitHub repository.

Создан repository:

`ptaskaev91-glitch/facefall-survivor`

`main` выбран source-of-truth.

---

# 4. GitHub Pages → Vercel

На раннем этапе пробовали GitHub Pages.

Проблемы:

- Pages возвращал 404;
- workflow добавлял лишнюю инфраструктуру;
- Vercel оказался надёжнее.

Пользователь выбрал:

> «Окей, если можно без pages и только с Vercel — давай делать так.»

С этого момента:

- GitHub = source repository;
- Vercel = единственный production hosting target;
- GitHub Pages удалён из architecture.

Production URL:

`https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

---

# 5. Build 0.3 — Cinematic prototype

После запроса пользователя продолжать и добавлять эффекты был сделан большой visual/combat pass.

Добавлялись:

- cinematic menu;
- face persistence;
- pistol/shotgun/bow;
- ammo/reload/recoil;
- rain/fog/lightning;
- night lighting;
- muzzle flash/smoke/casings;
- tracers/arrows;
- camera shake;
- wet road/puddles;
- Walker/Runner/Brute;
- blood/decal/damage feedback;
- pickups;
- mobile auto-aim;
- procedural audio.

К этому моменту стало заметно, что monolithic runtime быстро усложняется.

---

# 6. Runtime bugs раннего прототипа

Были исправлены важные проблемы:

## Initialization

Rain/fog arrays могли использоваться до корректной initialization.

## Lighting compositing

Темнота/маска света первоначально могла стирать уже отрисованный мир.

Был сделан отдельный light mask и локальные runtime проверки.

Главный вывод: красивый эффект нельзя добавлять ценой хрупкой initialization architecture.

---

# 7. Переход в Three.js / 3D

Пользователь попросил:

> «Продолжай, делай прям качественно. И сделай вариант вида от 3го лица. Добавь траву и другие текстуры».

Направление проекта изменилось:

- Three.js/WebGL;
- 3D terrain;
- top-down camera;
- third-person camera;
- переключение camera;
- grass;
- dirt/asphalt;
- trees/props;
- rain/fog/lights;
- mobile controls.

---

# 8. Mobile startup failures

После merge пользователь сообщил:

> «Ни одна кнопка не нажимается».

После первого fix появилась вторая проблема — бесконечное состояние загрузки 3D.

Были добавлены:

- menu bootstrap отдельно от 3D initialization;
- timeout/fallback механизмы;
- `styles-safe.css`;
- Vercel same-origin proxy для Three.js/GLTFLoader/hero model;
- несколько production stabilization passes.

Главный урок:

> Runtime CDN + monolithic JS являются риском для mobile startup.

Это позже стало ключевой причиной перехода на npm/Vite bundle.

---

# 9. Визуальный аудит third-person prototype

Пользователь прислал скриншот и спросил:

> «Что тебя смущает?»

Были зафиксированы проблемы:

- mannequin/primitive hero;
- face выглядело как накладка;
- слишком тёмная сцена;
- materials/grass почти не читались;
- camera слишком близко/низко;
- оружие плохо читалось;
- заражённые выглядели procedural;
- мир был пустым;
- HUD выглядел как web UI.

Принято решение:

> Не улучшать бесконечно BoxGeometry/SphereGeometry, а перейти к нормальным GLB characters/weapons/environment.

---

# 10. Первый dev.md

По запросу пользователя создан roadmap.

Основные направления:

- Character Quality;
- Infected Quality;
- authored location;
- materials/terrain;
- lighting;
- TOP/3RD cameras;
- combat feel;
- Face System 2.0;
- HUD;
- performance;
- production discipline.

---

# 11. Build 0.5 ALPHA — Character prototype

После команды «Делай» был прототипирован GLB character pipeline:

- humanoid GLB;
- AnimationMixer;
- idle/walk/run;
- face mask/head attachment;
- weapon visuals;
- upgraded third-person camera;
- character lighting;
- fallback mannequin.

Для proof использовался Three.js Soldier example. Он не является final Facefall asset.

Legacy production checkpoint закрепился как `0.5 ALPHA`.

---

# 12. Решение провести архитектурные аудиты

Стало понятно, что дальше развивать один большой runtime опасно.

Пользователь предложил последовательно изучить три open-source проекта и после этого продолжить игру.

Цель каждого аудита:

- что сделано правильно;
- что подходит Facefall;
- что нельзя переносить;
- как должна измениться architecture.

---

# 13. Аудит №1 — `ivanoskov/shooter`

Главный вывод:

> Хороший browser/Three.js foundation, но не полноценная готовая shooter game.

Полезное:

- TypeScript;
- Vite;
- npm Three.js;
- GLB level loading;
- static Octree;
- Capsule player;
- quality presets;
- debug tooling;
- separate Player/Camera/Input/Game.

Не переносим 1:1:

- double physics update;
- desktop-only Pointer Lock;
- сомнительный mouse sensitivity path;
- dynamic Octree как crowd solution;
- FPS camera.

После аудита появился обязательный этап **0.5A Engine Foundation**.

---

# 14. Аудит №2 — `Unvanquished/Unvanquished`

Главный вывод:

> Shooter даёт browser foundation, Unvanquished показывает правильную gameplay architecture.

Полезное:

- simulation/presentation separation;
- data-driven weapons;
- data-driven entity attributes;
- Damage/Hit/Kill pipeline;
- CombatFeedback отдельно;
- projectile abstraction;
- component-oriented logic;
- animation state/blending;
- Recast/Detour navmesh;
- behavior/state decision architecture.

Не переносим:

- Dæmon engine;
- C++/CMake;
- networking/prediction;
- heavy CBSE generator;
- GPL game code напрямую.

Для Facefall принято:

- static collision и navigation — разные systems;
- navmesh для infected pathfinding;
- lightweight State Tree вместо тяжёлого general Behavior Tree framework.

---

# 15. Аудит №3 — `redeclipse/base`

Главный вывод:

> Red Eclipse особенно полезен как reference для weapon feel, FX и environment systems.

Полезное:

- explicit weapon states;
- recoil yaw/pitch/recovery;
- spread/accuracy;
- head/torso/limb hit zones;
- hitscan vs physical projectile;
- FX recipe как composition particles/light/sound/decal/wind/camera feedback;
- bounded decals/stains;
- grass distance budgets;
- global/local wind;
- gameplay markers отдельно от level geometry.

Waypoint AI не выбран для Facefall — navmesh architecture лучше подходит authored environment.

Лицензионное правило:

- architecture ideas изучаем;
- external media/assets отдельно проверяются по лицензии.

---

# 16. Итог трёх аудитов

Формула зафиксирована:

> **Facefall = browser foundation из идей shooter + gameplay architecture из идей Unvanquished + combat/FX/environment philosophy Red Eclipse + собственная mobile-first реализация.**

Технология:

- TypeScript;
- Vite;
- npm Three.js;
- GLB;
- Octree/Capsule;
- navmesh;
- SpatialHash/local avoidance;
- data-driven weapons/enemies;
- event-based simulation;
- pooled FX;
- Vercel.

---

# 17. Documentation Freeze

Пользователь попросил временно не продолжать gameplay coding и создать три source-of-truth файла:

- `structure.md`;
- `history.md`;
- полностью актуализированный `dev.md`.

В них были зафиксированы:

- current/target structure;
- технология;
- инструменты;
- три аудита;
- roadmap до 1.0;
- правила разработки.

После завершения пользователь сказал:

> «Отлично, делай».

Documentation Freeze завершён.

---

# 18. 2026-08-10 — первый engine-next development checkpoint после freeze

Работа продолжена строго по `dev.md`.

## Branch / PR

Создана branch:

`engine-next/0.5a-foundation`

Открыт GitHub PR **#1**:

`Engine Next 0.5A: establish GameApp lifecycle`

PR использован как безопасный CI gate перед merge в `main`.

## Core lifecycle

Добавлены:

- `src/app/GameState.ts`;
- `src/app/GameApp.ts`;
- `src/app/Bootstrap.ts`.

`src/main.ts` сокращён до thin bootstrap.

Добавлены:

- controlled state transitions;
- start/pause/resume/dispose lifecycle;
- visibility/background-tab handling;
- centralized renderer/input/event cleanup;
- error path в bootstrap.

## Touch cleanup

`TouchInput` переделан так, чтобы `detach()` снимал не только joystick listeners, но и action listeners FIRE/RELOAD/WEAPON/CAM, после чего reset-ил InputManager.

Это важно для restart/lifecycle без накопления обработчиков.

## Cameras

Старый `DualCameraRig` разделён архитектурно на:

- `TopDownCamera`;
- `ThirdPersonCamera`;
- `CameraDirector`.

`DualCameraRig.ts` временно оставлен как compatibility shim, чтобы не делать опасный большой caller rewrite одним commit.

## Effects

Добавлены:

- `LightPool` с bounded transient point lights;
- `EffectSystem` orchestrator.

`EffectSystem` уже умеет собрать один recipe из:

- particles adapter;
- light adapter;
- decal adapter;
- WindField impulse;
- camera shake adapter;
- hit-stop adapter.

Следующий шаг — подключить orchestrator к реальным Shot/Hit events.

## CI

GitHub Actions несколько раз прогнал изменения PR.

Успешно прошли:

- install dependencies;
- strict TypeScript typecheck;
- Vite production build.

Это первая фактически подтверждённая зелёная engine-next CI checkpoint после архитектурного freeze.

## Merge

PR #1 был переведён из draft и squash-merged в `main`.

Merge commit/checkpoint:

`0a59903209790ee2e12a21e5e4f5da5d27bd6896`

Production legacy runtime **не переключался и не менялся**.

---

# 19. Текущее состояние

Production:

- legacy 0.5 ALPHA;
- Vercel URL остаётся прежним.

`main` одновременно содержит новый engine-next foundation.

Уже есть:

- Vite/TypeScript/npm Three.js;
- fixed GameLoop;
- typed EventBus;
- GameApp/GameState/Bootstrap;
- keyboard/touch input foundation;
- Octree/Capsule foundation;
- data-driven weapons;
- Health/Damage/Weapon systems;
- ProjectileSystem foundation;
- infected archetypes;
- quality profiles;
- split camera controllers;
- grass foundation;
- recipes/pools/WindField/EffectSystem;
- green CI.

---

# 20. Следующий порядок

После checkpoint `0a599032`:

1. закрепить package lock / reproducible install;
2. убрать CameraDirector compatibility shim;
3. выделить PlayerCapsule;
4. добавить SpatialHash;
5. camera/world collision query;
6. довести pointer-look/mobile aim input;
7. подключить EffectSystem к Shot/Hit;
8. AssetManager / LevelLoader / LevelManifest;
9. functional parity с legacy;
10. desktop smoke-test;
11. Android smoke-test;
12. только потом production migration;
13. после migration — visual vertical slice 0.6.

---

# 21. Правило дальнейшего ведения history.md

Каждый крупный этап добавляется новой секцией:

```text
## YYYY-MM-DD — checkpoint

### Запрос пользователя
### Решение
### Что сделано
### Что сломалось / ограничения
### Проверка
### Commit / PR
### Следующий шаг
```

Прошлые решения не переписываются задним числом. Если architecture меняется — добавляется новая запись с объяснением причины.

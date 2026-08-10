# Facefall Survivor — History

Последняя актуализация: **2026-08-10**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`

---

# 1. Назначение файла

`history.md` — проектный журнал переписки и решений Facefall Survivor.

Он хранит исходную идею, ключевые запросы, версии, ошибки, причины architecture changes, результаты аудитов, commits/PR и следующий шаг. Это не dump tool-calls и не скрытые рассуждения, а восстановимая история проекта.

---

# 2. 2026-08-10 — исходная идея

Пользователь предложил браузерную survival shooter игру против заражённых.

Ключевые требования:

- top-down gameplay в духе Diablo;
- полноценный third-person вариант;
- pistol / shotgun / bow;
- пользователь загружает фотографию, которая становится лицом героя;
- игра должна работать на телефоне;
- внешний вид должен стать качественным и атмосферным, а не остаться procedural demo.

Базовые infected archetypes: Walker / Runner / Brute.

Создан repository `ptaskaev91-glitch/facefall-survivor`, `main` выбран source-of-truth.

---

# 3. GitHub Pages → Vercel

На раннем этапе пробовали GitHub Pages, но Pages возвращал 404 и добавлял лишний workflow. Пользователь выбрал Vercel-only hosting.

С этого момента:

- GitHub = source repository;
- Vercel = production/preview;
- GitHub Pages не используется.

Production URL:

`https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

---

# 4. Build 0.3 — Cinematic prototype

После запроса пользователя продолжать и добавлять эффекты был сделан большой visual/combat pass:

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

Стало заметно, что monolithic runtime быстро усложняется.

---

# 5. Runtime bugs раннего прототипа

Были исправлены initialization ошибки rain/fog и некорректное lighting compositing. Появился отдельный light mask и локальные runtime checks.

Главный вывод: visual effect нельзя добавлять ценой хрупкой initialization architecture.

---

# 6. Переход в Three.js / 3D

После запроса:

> «Продолжай, делай прям качественно. И сделай вариант вида от 3го лица. Добавь траву и другие текстуры»

проект перешёл к Three.js/WebGL:

- 3D terrain;
- TOP + 3RD cameras;
- camera switching;
- grass;
- dirt/asphalt;
- trees/props;
- rain/fog/lights;
- touch controls.

---

# 7. Mobile startup failures

Пользователь сообщил сначала «Ни одна кнопка не нажимается», затем появилась бесконечная загрузка 3D.

Были введены:

- menu bootstrap отдельно от 3D initialization;
- timeout/fallback;
- `styles-safe.css`;
- Vercel same-origin proxy для Three.js/GLTFLoader/hero model;
- несколько stabilization passes.

Главный урок:

> Runtime CDN + monolithic JS являются риском для mobile startup.

Это стало одной из главных причин перехода на npm/Vite bundle.

---

# 8. Визуальный аудит third-person prototype

По скриншоту пользователя были зафиксированы проблемы:

- primitive/mannequin hero;
- face выглядело как накладка;
- сцена слишком тёмная;
- materials/grass слабо читались;
- camera слишком близко/низко;
- оружие плохо читалось;
- заражённые procedural;
- мир пустой;
- HUD похож на web UI.

Принято решение не полировать BoxGeometry бесконечно, а переходить к GLB characters/weapons/environment.

---

# 9. Первый dev.md и Build 0.5 ALPHA

Создан roadmap: Character/Infected quality, authored location, materials, lighting, cameras, combat feel, Face System, HUD, performance и production discipline.

После команды «Делай» прототипирован GLB character pipeline:

- humanoid GLB;
- AnimationMixer;
- idle/walk/run;
- face mask/head attachment;
- weapon visuals;
- upgraded third-person camera;
- fallback mannequin.

Three.js Soldier example использовался только как pipeline proof, не как final asset.

Legacy production checkpoint: `0.5 ALPHA`.

---

# 10. Решение провести три архитектурных аудита

Чтобы не строить второй monolith, пользователь предложил изучить open-source проекты и после этого продолжить игру.

## Аудит №1 — `ivanoskov/shooter`

Полезное:

- TypeScript/Vite/npm Three.js;
- GLB loading;
- static Octree;
- Capsule;
- quality/debug architecture.

Не переносить 1:1:

- double physics update;
- desktop-only Pointer Lock;
- mouse sensitivity implementation;
- dynamic Octree as crowd solution;
- FPS camera.

Именно после этого появился этап **0.5A Engine Foundation**.

## Аудит №2 — `Unvanquished/Unvanquished`

Полезное:

- simulation/presentation separation;
- data-driven weapons/entities;
- Damage/Hit/Kill;
- CombatFeedback;
- projectiles;
- components;
- animation state/blending;
- Recast/Detour navmesh;
- behavior/state decision architecture.

Не переносить:

- Dæmon engine;
- C++/CMake;
- multiplayer prediction;
- heavy CBSE;
- GPL game code напрямую.

Для Facefall: collision и navigation — разные systems; infected pathfinding → navmesh; lightweight State Tree.

## Аудит №3 — `redeclipse/base`

Полезное:

- explicit weapon states;
- recoil/spread;
- hit zones;
- hitscan vs projectile;
- FX recipes = particles/light/sound/decal/wind/camera;
- bounded decals;
- grass budgets;
- global/local wind;
- gameplay markers отдельно от geometry.

Waypoint AI не выбран — navmesh лучше для authored environment.

---

# 11. Итог трёх аудитов

Формула:

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

# 12. Documentation Freeze

Пользователь попросил временно не продолжать coding и создать:

- `structure.md`;
- `history.md`;
- полностью актуальный `dev.md`.

В них были зафиксированы current/target structure, технология, инструменты, все три аудита, roadmap до 1.0 и правила разработки.

После завершения пользователь сказал: «Отлично, делай». Freeze завершён.

---

# 13. PR #1 — GameApp lifecycle checkpoint

Создана branch `engine-next/0.5a-foundation`, открыт PR #1 `Engine Next 0.5A: establish GameApp lifecycle`.

Добавлены:

- `GameState`;
- `GameApp`;
- `Bootstrap`;
- thin `src/main.ts`;
- start/pause/resume/dispose;
- visibility handling;
- clean TouchInput detach;
- `TopDownCamera` / `ThirdPersonCamera` / `CameraDirector`;
- `LightPool`;
- `EffectSystem`.

GitHub Actions несколько раз успешно прошёл install + strict TypeScript + Vite build.

PR #1 squash-merged в main:

`0a59903209790ee2e12a21e5e4f5da5d27bd6896`

Production legacy runtime не менялся.

---

# 14. Пользователь меняет политику переиспользования

Пользователь уточнил, что разработку можно ускорять прямым reuse:

> «Там где можно скопировать — копируй. Где нельзя — пиши с 0.»

После этого принято правило:

- permissive-compatible изолированные блоки можно адаптировать напрямую;
- обязательно фиксировать source/license;
- GPL/несовместимый код не копировать;
- C++/native engine-specific системы адаптировать архитектурно, а не copy-paste;
- если integration cost выше собственного clean implementation — писать с нуля.

Для этого создан `THIRD_PARTY_NOTICES.md`.

---

# 15. PR #2 — physics / aiming / level foundation

Branch:

`engine-next/0.5a-core-physics`

PR:

`#2 Engine Next 0.5A: core physics and camera collision`

## Что переиспользовано напрямую с адаптацией

Из MIT `ivanoskov/shooter`, revision `70a7b9f7fc43d99db1e2833e0042b00da00d9cf0`:

1. Capsule/Octree collision-response pattern из `Player.ts` → новый `PlayerCapsule.ts`.
2. GLTFLoader/traverse preparation pattern из `Game.ts` → `AssetManager.ts` / `LevelLoader.ts`.

MIT notice сохранён в `THIRD_PARTY_NOTICES.md`.

## Что написано с нуля для Facefall

- `SpatialHash`;
- `CameraCollision`;
- static world ray/segment queries orchestration;
- desktop pointer aiming;
- touch free-screen look;
- TOP cursor/touch ground aiming;
- 3RD look-delta facing;
- `LevelManifest` schema/validation;
- Facefall integration of effect/world/combat systems.

## Physics

Добавлены/подключены:

- `PlayerCapsule` вместо raw Capsule wiring;
- `CollisionWorld.raycast()`;
- `CollisionWorld.segmentCast()`;
- `SpatialHash`;
- enemy registration/removal в SpatialHash;
- static-world occlusion для hitscan.

Теперь bullet damage не должен проходить через static wall, если world hit ближе enemy hit.

## Cameras

Добавлены:

- `CameraCollision`;
- third-person auto push-in при препятствии между look anchor и desired camera position;
- `GameApp` переведён на прямой `CameraDirector`;
- obsolete `DualCameraRig` shim удалён.

## Input / aim

`InputManager` теперь хранит:

- movement;
- aim delta;
- pointer/touch NDC;
- held/pressed actions.

Desktop:

- mouse position → TOP aim;
- mouse movement → 3RD look.

Touch:

- left joystick → move;
- свободная область canvas → look/aim;
- action buttons отдельно.

## FX

`EffectSystem` подключён к реальным Shot/Hit events.

Подключён transient `LightPool` adapter для muzzle recipes и WindField impulses. Concrete particle/decal adapters остаются следующим этапом.

## World/assets

Созданы:

- `AssetManager`;
- `LevelLoader`;
- `LevelManifest`;
- `public/assets/ATTRIBUTION.md`;
- первый `Abandoned Outskirts` manifest skeleton.

Manifest уже умеет описывать player/enemy spawns, lights, wind zones и choke point foundation.

## Lockfile limitation

Попытка выполнить local clean install через container показала отсутствие наружного DNS к GitHub/npm. Поэтому `package-lock.json` не создавался вручную и не выдумывался. CI при этом имеет network access и продолжает подтверждать install/typecheck/build.

## CI

После всех изменений, включая удаление compatibility shim, финальный GitHub Actions run полностью green:

- dependency install;
- strict TypeScript typecheck;
- Vite production build.

## Merge

PR #2 squash-merged в `main`.

Checkpoint:

`29008e7d53638f37e4c541dce23128952dd4732f`

Production Vercel legacy 0.5 ALPHA намеренно не переключался.

---

# 16. Текущее состояние после PR #2

В `main` уже есть:

- Vite/TypeScript/npm Three.js foundation;
- GameApp/GameState/Bootstrap;
- fixed GameLoop/EventBus;
- desktop + touch InputManager;
- pointer/touch aim foundation;
- Octree/PlayerCapsule;
- world ray/segment queries;
- SpatialHash;
- TopDown/ThirdPerson/CameraDirector/CameraCollision;
- data-driven weapons;
- Weapon/Health/Damage systems;
- hitscan world occlusion;
- ProjectileSystem foundation;
- infected archetypes;
- EffectSystem + LightPool/WindField/pool foundations;
- AssetManager/LevelLoader/LevelManifest;
- Abandoned Outskirts manifest skeleton;
- code/media attribution registries;
- green CI.

Production по-прежнему остаётся безопасным legacy checkpoint.

---

# 17. Следующий порядок после `29008e7d`

1. Найти безопасный способ закрепить lockfile и перейти CI на `npm ci`.
2. Соединить ballistic ProjectileSystem с world/enemy collision + DamageSystem.
3. Concrete Particle/Decal adapters + camera shake.
4. Подключить LevelLoader к runtime вместо hardcoded lab world.
5. Разносить player/world/combat wiring из GameApp в отдельные systems.
6. Начать 0.5B functional parity: menu/face/lifecycle/waves/pickups.
7. Desktop smoke-test.
8. Android smoke-test.
9. Только после parity — Vite production migration.
10. Затем visual vertical slice 0.6.

---

# 18. Правило дальнейшего ведения history.md

Каждый крупный этап добавляется новой секцией с запросом пользователя, решением, фактическими изменениями, ограничениями, проверкой, commit/PR и следующим шагом. Прошлые решения не переписываются задним числом; если architecture меняется, добавляется новое событие с причиной.

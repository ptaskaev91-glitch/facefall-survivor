# Facefall Survivor — Structure

Последняя актуализация: **2026-08-10**  
Репозиторий: `ptaskaev91-glitch/facefall-survivor`  
Основная ветка: `main`  
Production: Vercel  
Статус архитектуры: **legacy 0.5 ALPHA + параллельный engine-next 0.5A**

---

# 1. Назначение файла

`structure.md` — источник истины по файловой и системной архитектуре Facefall Survivor.

Файл всегда должен отвечать на четыре вопроса:

1. Какие файлы и подсистемы существуют сейчас.
2. Какие из них временные / legacy.
3. К какой целевой структуре мы идём.
4. За что отвечает каждый модуль и как модули взаимодействуют.

После любого крупного изменения структуры этот файл обновляется одновременно с `dev.md` и `history.md`.

---

# 2. Исходная задача проекта

Facefall Survivor — браузерная action-survival игра с заражёнными.

Основные требования:

- две полноценные камеры: **top-down / Diablo-like** и **third-person over-the-shoulder**;
- реалистичный мрачный визуальный стиль;
- pistol / shotgun / bow;
- разные типы заражённых и волны;
- загружаемая пользователем фотография становится лицом героя;
- обработка лица локально в браузере, без обязательной отправки на сервер;
- desktop и mobile управление;
- Android является обязательной реальной тестовой платформой;
- трава, грязь, асфальт, лужи, дождь, туман, свет, кровь, decals и другие детали окружения;
- игра должна постепенно перейти от procedural prototype к полноценным GLB-ассетам;
- GitHub `main` — источник истины;
- Vercel — единственный production hosting target.

---

# 3. Архитектурное решение после трёх аудитов

Изучены три референса:

- `ivanoskov/shooter` — browser / Three.js foundation;
- `Unvanquished/Unvanquished` — gameplay architecture;
- `redeclipse/base` — weapons / combat feel / FX / environment.

Итоговая формула Facefall:

> **Browser foundation в духе shooter + gameplay separation в духе Unvanquished + combat/FX philosophy Red Eclipse + собственная mobile-first реализация.**

Мы не форкаем ни один из этих проектов и не переносим их архитектуру 1:1.

---

# 4. Технологическая схема

## Runtime

- Browser / WebGL.
- Three.js — renderer и scene graph.
- TypeScript strict mode — основной язык новой архитектуры.
- Vite — development/build pipeline.
- npm — dependency management.
- ES2020 — целевой baseline новой сборки на текущем этапе.

## 3D assets

- glTF 2.0 / GLB — основной формат моделей и уровней.
- Blender — основной внешний инструмент подготовки моделей/сцен.
- glTF Transform / аналогичный CLI — оптимизация GLB перед production.
- KTX2/Basis — целевой формат сжатых GPU-текстур после подключения texture pipeline.
- Meshopt — предпочтительный вариант геометрического сжатия после проверки поддержки/выигрыша.
- Draco не является обязательным и используется только если конкретный asset уже обоснованно требует его.

## Physics

- static world geometry → Three.js `Octree`;
- player → `Capsule` collider;
- простые dynamic entities → sphere/capsule/AABB по необходимости;
- crowd neighbour lookup → spatial hash/grid;
- полноценный general-purpose physics engine пока **не добавляем**;
- вопрос Rapier/другого physics engine возвращаем только при появлении реальной необходимости в ragdoll, сложной динамике или destructibles.

## Navigation / AI

- collision и AI navigation — разные системы;
- целевой navigation layer — Recast/Detour-style navmesh в browser-compatible JS/WASM реализации;
- local avoidance — lightweight собственный слой;
- enemy decision logic — lightweight State Tree, а не тяжёлый универсальный Behavior Tree framework;
- waypoint AI Red Eclipse не переносим как основную систему.

## UI

- DOM/CSS overlay поверх Three.js canvas;
- React не нужен на текущем масштабе игры;
- mobile controls являются частью input layer, а не отдельной логикой игры.

## Audio

- Web Audio API / Three.js positional audio там, где это уместно;
- simulation только создаёт события, а AudioSystem решает, какой звук воспроизвести.

## Persistence

- `localStorage` для лёгких настроек и текущего face profile;
- IndexedDB рассматривается для более крупной локальной progression/save data;
- backend на стадии MVP не обязателен.

## Hosting / CI

- GitHub — source control;
- `main` — canonical source;
- GitHub Actions — typecheck/build/tests;
- Vercel — production и preview deployments;
- GitHub Pages не используется.

---

# 5. Текущая файловая структура

Ниже отражена фактическая структура, сформированная к текущей контрольной точке. Часть legacy-файлов временно сосуществует с `engine-next`.

```text
facefall-survivor/
├── .github/
│   └── workflows/
│       └── engine-next-ci.yml
│
├── src/
│   ├── main.ts
│   │
│   ├── core/
│   │   ├── EventBus.ts
│   │   └── GameLoop.ts
│   │
│   ├── input/
│   │   ├── InputManager.ts
│   │   ├── KeyboardMouseInput.ts
│   │   └── TouchInput.ts
│   │
│   ├── physics/
│   │   └── CollisionWorld.ts
│   │
│   ├── camera/
│   │   └── DualCameraRig.ts
│   │
│   ├── combat/
│   │   ├── types.ts
│   │   ├── weapons.ts
│   │   ├── Health.ts
│   │   ├── WeaponSystem.ts
│   │   ├── DamageSystem.ts
│   │   ├── ProjectileSystem.ts
│   │   └── CombatFeedback.ts
│   │
│   ├── enemies/
│   │   └── archetypes.ts
│   │
│   ├── effects/
│   │   ├── recipes.ts
│   │   ├── ParticlePool.ts
│   │   ├── DecalPool.ts
│   │   └── WindField.ts
│   │
│   ├── graphics/
│   │   └── quality.ts
│   │
│   └── world/
│       └── GrassField.ts
│
├── index.html                 # текущий production/legacy entrypoint
├── styles-safe.css            # текущий production UI/CSS
├── game-v050.js               # текущий monolithic legacy runtime 0.5 ALPHA
├── engine-lab.html            # изолированный entrypoint engine-next 0.5A
├── vercel.json                # legacy proxy/config; будет пересмотрен после миграции
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── README.md
├── dev.md
├── structure.md
└── history.md
```

Примечание: в репозитории могут сохраняться дополнительные старые prototype-файлы до отдельного cleanup-этапа. Удаление legacy производится только после достижения функционального parity и успешного Android smoke-test нового runtime.

---

# 6. Роль текущих engine-next файлов

## `src/main.ts`

Пока это integration/lab bootstrap. Он не должен оставаться главным контейнером всей логики игры. Его задача в будущем — только создать `GameApp`, подключить DOM и запустить приложение.

## `core/GameLoop.ts`

Единый fixed timestep loop:

```text
input snapshot
    ↓
fixed simulation update
    ↓
animation / presentation update
    ↓
camera
    ↓
render
```

Запрещается создавать второй независимый physics loop.

## `core/EventBus.ts`

Typed event communication между системами. Особенно важен для отделения simulation от presentation.

## `physics/CollisionWorld.ts`

Static Octree + Capsule collisions. Используется для уровня и героя. Не используется как crowd database для всех заражённых.

## `combat/*`

Формируется единый simulation pipeline:

```text
Input
  ↓
WeaponSystem
  ↓
ShotEvent
  ├── hitscan → DamageSystem
  └── ProjectileSystem → collision → DamageSystem
                                  ↓
                              Hit/Kill events
```

## `effects/*`

Presentation infrastructure с жёсткими лимитами количества объектов и времени жизни.

## `world/GrassField.ts`

Prototype целевой vegetation architecture: instancing, spatial clusters, distance culling и quality budget.

---

# 7. Целевая файловая структура

Это структура, к которой проект должен прийти после завершения engine migration и vertical slice.

```text
facefall-survivor/
├── public/
│   └── assets/
│       ├── characters/
│       │   ├── hero/
│       │   └── infected/
│       │       ├── walker/
│       │       ├── runner/
│       │       └── brute/
│       │
│       ├── weapons/
│       │   ├── pistol/
│       │   ├── shotgun/
│       │   └── bow/
│       │
│       ├── levels/
│       │   └── abandoned-outskirts/
│       │       ├── level.glb
│       │       ├── level.manifest.json
│       │       ├── navmesh.bin
│       │       └── preview.webp
│       │
│       ├── environment/
│       ├── textures/
│       ├── audio/
│       ├── ui/
│       └── ATTRIBUTION.md
│
├── src/
│   ├── main.ts
│   │
│   ├── app/
│   │   ├── GameApp.ts
│   │   ├── GameState.ts
│   │   └── Bootstrap.ts
│   │
│   ├── core/
│   │   ├── GameLoop.ts
│   │   ├── EventBus.ts
│   │   ├── Disposable.ts
│   │   └── ids.ts
│   │
│   ├── config/
│   │   ├── game.ts
│   │   ├── performance.ts
│   │   └── controls.ts
│   │
│   ├── input/
│   │   ├── InputManager.ts
│   │   ├── actions.ts
│   │   ├── KeyboardMouseInput.ts
│   │   └── TouchInput.ts
│   │
│   ├── physics/
│   │   ├── CollisionWorld.ts
│   │   ├── PlayerCapsule.ts
│   │   ├── DynamicColliders.ts
│   │   └── SpatialHash.ts
│   │
│   ├── navigation/
│   │   ├── NavMesh.ts
│   │   ├── NavMeshQuery.ts
│   │   ├── LocalAvoidance.ts
│   │   └── NavigationWorker.ts
│   │
│   ├── simulation/
│   │   ├── entities/
│   │   │   ├── Entity.ts
│   │   │   ├── EntityRegistry.ts
│   │   │   └── components/
│   │   │       ├── Health.ts
│   │   │       ├── Transform.ts
│   │   │       └── Team.ts
│   │   │
│   │   ├── player/
│   │   │   ├── PlayerController.ts
│   │   │   └── PlayerState.ts
│   │   │
│   │   ├── combat/
│   │   │   ├── types.ts
│   │   │   ├── weapons.ts
│   │   │   ├── WeaponSystem.ts
│   │   │   ├── DamageSystem.ts
│   │   │   └── ProjectileSystem.ts
│   │   │
│   │   ├── enemies/
│   │   │   ├── archetypes.ts
│   │   │   ├── EnemySystem.ts
│   │   │   ├── EnemyBrain.ts
│   │   │   ├── EnemySpawner.ts
│   │   │   └── EnemyStateTree.ts
│   │   │
│   │   ├── waves/
│   │   │   └── WaveDirector.ts
│   │   │
│   │   └── pickups/
│   │       └── PickupSystem.ts
│   │
│   ├── characters/
│   │   ├── PlayerCharacter.ts
│   │   ├── CharacterAnimator.ts
│   │   ├── InfectedAnimator.ts
│   │   └── FaceSystem.ts
│   │
│   ├── cameras/
│   │   ├── CameraDirector.ts
│   │   ├── TopDownCamera.ts
│   │   ├── ThirdPersonCamera.ts
│   │   └── CameraCollision.ts
│   │
│   ├── world/
│   │   ├── World.ts
│   │   ├── AssetManager.ts
│   │   ├── LevelLoader.ts
│   │   ├── LevelManifest.ts
│   │   ├── MaterialLibrary.ts
│   │   ├── GrassField.ts
│   │   └── InteractableRegistry.ts
│   │
│   ├── rendering/
│   │   ├── Renderer.ts
│   │   ├── Lighting.ts
│   │   ├── Atmosphere.ts
│   │   ├── QualityManager.ts
│   │   └── VisibilityManager.ts
│   │
│   ├── presentation/
│   │   ├── combat/
│   │   │   └── CombatFeedback.ts
│   │   ├── effects/
│   │   │   ├── EffectSystem.ts
│   │   │   ├── recipes.ts
│   │   │   ├── ParticlePool.ts
│   │   │   ├── DecalPool.ts
│   │   │   ├── LightPool.ts
│   │   │   └── WindField.ts
│   │   ├── audio/
│   │   │   ├── AudioSystem.ts
│   │   │   └── AudioLibrary.ts
│   │   └── ui/
│   │       ├── Hud.ts
│   │       ├── Menu.ts
│   │       ├── MobileControls.ts
│   │       └── FaceEditor.ts
│   │
│   ├── persistence/
│   │   ├── SettingsStore.ts
│   │   ├── FaceStore.ts
│   │   └── SaveStore.ts
│   │
│   └── debug/
│       ├── DebugOverlay.ts
│       └── Metrics.ts
│
├── tests/
│   ├── unit/
│   └── smoke/
│
├── scripts/
│   ├── optimize-assets.mjs
│   └── check-asset-budget.mjs
│
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── README.md
├── dev.md
├── structure.md
└── history.md
```

---

# 8. Главные системные границы

## Simulation

Отвечает только на вопрос **что произошло в игре**.

Примеры:

- игрок выстрелил;
- пуля попала;
- заражённый получил 30 damage;
- заражённый умер;
- волна завершилась.

Simulation не создаёт particle, DOM, звук или camera shake напрямую.

## Presentation

Отвечает на вопрос **как событие выглядит и звучит**.

Например `HitEvent` может породить:

- blood particles;
- decal;
- hit sound;
- damage number;
- infected stagger animation;
- небольшую camera feedback.

## World

Загружает уровень и environment assets, но не хранит правила боя.

## Physics

Определяет допустимое физическое положение объектов.

## Navigation

Определяет, куда AI может пройти. Navigation не заменяет collision.

---

# 9. Level architecture

Первая полноценная локация: **Abandoned Outskirts / Заброшенная окраина**.

Мы не храним весь уровень в TypeScript и не строим его сотнями `BoxGeometry`.

Целевая схема:

```text
level.glb
  = визуальная и collision геометрия

level.manifest.json
  = gameplay/environment markers

navmesh
  = проходимая поверхность для AI
```

`level.manifest.json` содержит как минимум:

- player spawn;
- zombie spawn zones;
- loot points;
- light anchors;
- audio zones;
- wind zones;
- choke points;
- interactables;
- navigation modifiers;
- scripted event anchors.

---

# 10. Camera architecture

Обе камеры управляют одним и тем же Player/Simulation.

## Top-down

- Diablo-like диагональный угол;
- camera-relative movement;
- pointer/touch aim;
- crowd readability;
- мягкий zoom/follow.

## Third-person

- over-the-shoulder;
- side offset;
- camera collision;
- ray из camera/crosshair в target point;
- оружие/верх тела ориентируются в target;
- mobile aim assist работает как слой ввода/наведения, а не как отдельный damage mechanic.

Переключение камеры не создаёт второго игрового режима и не дублирует simulation.

---

# 11. Weapon architecture

Data-driven definitions:

```text
WeaponDefinition
├── magazine / reserve
├── fire interval
├── reload time
├── damage
├── head / torso / limb multipliers
├── spread
├── recoil profile
├── impulse
├── hitscan | projectile
├── projectile speed / gravity
└── FX recipe IDs
```

Модели:

- pistol → hitscan;
- shotgun → multi-hitscan;
- bow → ballistic projectile.

---

# 12. Enemy architecture

Минимальные archetypes:

- Walker;
- Runner;
- Brute.

Decision model:

```text
spawn
 ↓
wander
 ↓
investigate (sound/event)
 ↓
chase
 ↓
attack
 ↓
stagger
 ↓
recover / chase
 ↓
dead
```

Pathfinding:

```text
EnemyBrain
  ↓ target
NavMeshQuery
  ↓ path corridor
LocalAvoidance
  ↓ desired velocity
Enemy movement / collision
```

---

# 13. FX architecture

Вдохновлено подходом Red Eclipse, но реализуется собственным TypeScript-кодом.

Один Effect Recipe может включать:

- particles;
- transient light;
- decal;
- sound;
- wind impulse;
- camera shake;
- hit-stop;
- screen flash.

Все ресурсы ограничены budget/pool/TTL.

Никакие effects не создаются бесконечно.

---

# 14. Mobile-first performance architecture

Профили:

- `mobile-low`;
- `mobile-high`;
- `desktop-high`.

Quality Manager управляет:

- renderer DPR;
- shadow maps;
- количеством shadow-casting lights;
- grass density/distance;
- particle budget;
- decal budget;
- fog quality;
- texture level;
- max visible infected / LOD;
- rain density;
- post-processing.

Первичная цель: **стабильные 30+ FPS на реальном Android**, а не максимальное качество на desktop за счёт мобильной версии.

---

# 15. Legacy → target migration

```text
index.html + game-v050.js + styles-safe.css
                    │
                    │ остаются production checkpoint
                    ↓
engine-lab.html + src/*
                    │
                    │ достигает functional parity
                    ↓
Vite build становится production
                    │
                    ├── legacy proxy Three.js удаляется
                    ├── game-v050.js архивируется/удаляется
                    ├── engine-lab.html превращается в debug-only или удаляется
                    └── index.html становится тонким Vite entrypoint
```

Переключение разрешено только после:

- зелёного CI;
- desktop smoke-test;
- Android smoke-test;
- обеих камер;
- touch controls;
- всех трёх weapons;
- face upload;
- базовых waves/enemies;
- отсутствия бесконечной загрузки.

---

# 16. Правила изменения структуры

1. Новый subsystem сначала добавляется в `structure.md`, если он меняет архитектуру.
2. Файл не создаётся только ради одного маленького helper — избегаем бессмысленной фрагментации.
3. `src/main.ts` не должен снова превращаться в monolith.
4. Presentation не импортируется в simulation для запуска эффектов напрямую.
5. Enemy archetype/weapon balance не размазывается magic numbers по разным файлам.
6. Static collision не используется как navigation database.
7. Assets не помещаются в репозиторий без понятного происхождения/лицензии.
8. После завершения этапа временные файлы удаляются отдельным cleanup commit, а не оставляются навсегда.
9. `structure.md`, `dev.md` и `history.md` обновляются при каждой крупной контрольной точке.

# Facefall Survivor — Development Plan

Текущая production-контрольная точка: **0.5 ALPHA (legacy runtime)**  
Текущий активный технический этап: **0.5A — Engine Foundation / engine-next**  
Production: `https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

## Цель

Сделать мобильную и desktop браузерную action-survival игру с двумя полноценными камерами:

- top-down / Diablo-like;
- third-person over-the-shoulder;
- реалистичное мрачное окружение;
- огнестрельное оружие + лук;
- толпы заражённых;
- загружаемое пользователем лицо героя;
- стабильная работа на реальном Android-устройстве;
- Vercel как единственный production-хостинг;
- GitHub `main` как источник истины.

---

# 1. Итог архитектурного аудита референсов

Перед продолжением визуального производства изучены три проекта.

## 1.1 `ivanoskov/shooter`

Берём как ориентир браузерного foundation:

- npm / Vite / TypeScript;
- Three.js как package dependency, а не runtime CDN;
- Capsule collider для персонажа;
- static Octree для столкновений с уровнем;
- GLB level loading;
- отдельные Input / Camera / Game / Physics modules;
- quality presets;
- runtime debug settings.

Не переносим 1:1:

- FPS camera;
- desktop-only Pointer Lock input;
- двойной physics update из исходного проекта;
- dynamic Octree для большого количества врагов;
- конкретную реализацию mouse sensitivity.

## 1.2 `Unvanquished/Unvanquished`

Берём как ориентир gameplay architecture:

- simulation отдельно от presentation;
- DamageEvent / HitEvent / Death pipeline;
- CombatFeedback отдельной системой;
- data-driven weapons;
- data-driven enemy archetypes;
- component-based entities без глубокой иерархии;
- projectile abstraction;
- navmesh для AI;
- lightweight behavior/state tree;
- animation state transitions / blending.

Не переносим 1:1:

- native Dæmon engine;
- multiplayer prediction / networking;
- C++/CMake;
- полный CBSE code generator;
- RTS/building systems;
- GPL game code напрямую.

## 1.3 `redeclipse/base`

Берём как ориентир combat feel, FX и environment systems:

- полноценный weapon state machine: idle / primary / secondary / reload / power / zoom / switch / wait;
- recoil как отдельный профиль с yaw / pitch / recovery;
- spread, зависящий от состояния игрока;
- hit zones: head / torso / limb;
- hitscan и физические projectiles как разные модели выстрела;
- единый FX recipe, который может одновременно запускать particles + light + sound + wind + decal;
- decals/stains с жёстким budget, fade и TTL;
- grass distance culling / taper / quality budget;
- глобальный ветер + локальные wind impulses от взрывов/выстрелов;
- уровни как геометрия + отдельные gameplay/environment markers.

Не переносим 1:1:

- Cube/Tesseract native renderer;
- macro-heavy weapon definitions;
- waypoint AI вместо navmesh;
- native C++ engine;
- content assets без отдельной проверки лицензии.

## 1.4 Лицензионное правило

- `ivanoskov/shooter`: MIT — возможны прямые заимствования с соблюдением лицензии, но предпочтительнее собственная чистая реализация.
- `Unvanquished`: game logic GPL — используем архитектурные идеи, не копируем GPL-код в Facefall.
- Red Eclipse source: zlib, но media имеет отдельные лицензии — кодовые идеи допустимы, ассеты нельзя считать автоматически свободными для переноса.
- Для Facefall приоритет: собственный код + собственные / CC0 / явно совместимые игровые ассеты.

---

# 2. Главные правила разработки после аудита

1. **Никаких runtime CDN для Three.js.** Движок собирается Vite в наш bundle.
2. Legacy 0.5 остаётся рабочим production до достижения parity новым engine-next.
3. Один fixed game loop — без двойного physics update.
4. Static world collision и navigation — разные системы.
5. Static geometry: Octree; AI navigation: navmesh; толпа: spatial hash / lightweight local avoidance.
6. Оружие и враги — data-driven, без magic numbers внутри update loop.
7. Simulation не создаёт визуальные эффекты напрямую — она генерирует события.
8. Effects System имеет budgets для mobile.
9. Никакой бесконечной травы / decals / particles — всё имеет distance, LOD, TTL и max count.
10. Реальный Android — обязательная тестовая платформа каждого production milestone.
11. Не переключать production entrypoint на engine-next, пока новый runtime не проходит CI и smoke-test.
12. Box/Sphere/Cylinder модели допустимы только в engine lab и как fallback, не как финальные игровые assets.

---

# 3. Целевая архитектура

```text
src/
  core/
    Game.ts
    GameLoop.ts
    EventBus.ts

  input/
    InputManager.ts
    KeyboardMouseInput.ts
    TouchInput.ts

  physics/
    CollisionWorld.ts
    SpatialHash.ts

  navigation/
    NavMesh.ts
    LocalAvoidance.ts

  player/
    PlayerController.ts
    PlayerCharacter.ts
    FaceSystem.ts

  camera/
    DualCameraRig.ts
    TopDownCamera.ts
    ThirdPersonCamera.ts

  combat/
    types.ts
    weapons.ts
    WeaponSystem.ts
    DamageSystem.ts
    ProjectileSystem.ts
    CombatFeedback.ts

  enemies/
    archetypes.ts
    EnemySystem.ts
    EnemyBrain.ts

  animation/
    CharacterAnimator.ts
    InfectedAnimator.ts

  effects/
    recipes.ts
    EffectSystem.ts
    ParticlePool.ts
    DecalPool.ts
    WindField.ts

  graphics/
    quality.ts
    Lighting.ts
    Materials.ts

  world/
    AssetManager.ts
    LevelLoader.ts
    LevelManifest.ts
    GrassField.ts

  ui/
    Hud.ts
    MobileControls.ts
```

---

# 4. Этап 0.5A — Engine Foundation

**Статус: В РАБОТЕ.**

Цель: построить новую модульную основу параллельно текущей 0.5 alpha, не ломая production.

## Уже выполнено

- [x] `package.json` и npm dependency на Three.js 0.160.0.
- [x] TypeScript strict mode.
- [x] Vite build с target ES2020.
- [x] отдельный `engine-lab.html`, не затрагивающий legacy production entrypoint.
- [x] fixed timestep `GameLoop` с accumulator и max substeps.
- [x] typed `EventBus` foundation.
- [x] `CollisionWorld`: static Octree + Capsule collision.
- [x] data-driven definitions `pistol / shotgun / bow`.
- [x] recoil profiles и hitscan/projectile distinction в weapon data.
- [x] data-driven `Walker / Runner / Brute` archetypes.
- [x] mobile/desktop quality profiles.
- [x] composable FX recipes: particles / light / decal / wind / shake / hit-stop.
- [x] новый `DualCameraRig` с отдельными параметрами TOP и 3RD.
- [x] clustered grass field с distance culling и quality budget.
- [x] isolated engine-next browser lab.
- [x] GitHub Actions CI для typecheck + Vite build.

## Следующие задачи 0.5A

- [ ] дождаться/проверить первый зелёный CI build и исправить TypeScript/build issues, если появятся;
- [ ] InputManager с единым интерфейсом keyboard/mouse/touch;
- [ ] перенести mobile joystick в новый input layer;
- [ ] DamageSystem + Health component;
- [ ] CombatFeedback event pipeline;
- [ ] hitscan implementation для pistol/shotgun;
- [ ] настоящий projectile implementation для arrow;
- [ ] bounded ParticlePool;
- [ ] bounded DecalPool с fade/TTL;
- [ ] WindField: global breeze + local impulses;
- [ ] LevelManifest + LevelLoader;
- [ ] GLB AssetManager без внешних CDN;
- [ ] CharacterAnimator с crossfade idle/walk/run/aim/fire/reload;
- [ ] lightweight enemy State Tree: wander → investigate → chase → attack → stagger/death;
- [ ] navigation layer для Abandoned Outskirts;
- [ ] debug overlay `?debug=1`: FPS, triangles, enemies, grass, decals, lights, quality profile;
- [ ] engine-next smoke test на Android;
- [ ] только после parity переключить основной Vercel build с legacy на Vite bundle.

### Definition of Done 0.5A

- Three.js и addons приходят только из нашего bundled JS;
- новый runtime стартует без CDN proxy и timeout-костылей;
- TOP и 3RD работают;
- touch input работает;
- player collision работает со статической геометрией;
- pistol / shotgun / bow проходят через единый WeaponSystem;
- Walker / Runner / Brute используют единый EnemySystem;
- CI зелёный;
- Android smoke test пройден;
- legacy runtime можно удалить без потери функций.

---

# 5. Этап 0.5 — Visual Vertical Slice

После Engine Foundation возвращаемся к визуальному milestone.

## Character Quality Pass

- [x] humanoid GLB hero pipeline уже прототипирован в legacy 0.5 alpha;
- [x] idle / walk / run уже прототипированы;
- [~] pistol визуально привязан, но временная procedural модель не считается финальной;
- [~] пользовательское лицо накладывается маской, но Face System 2.0 ещё не готов;
- [ ] качественный герой / одежда;
- [ ] pistol GLB;
- [ ] shotgun GLB;
- [ ] bow + arrow GLB;
- [ ] aim/fire/reload animations;
- [ ] hit/death animations.

## Infected Quality Pass

- [ ] качественный Walker GLB;
- [ ] Runner GLB;
- [ ] Brute GLB;
- [ ] walk/run;
- [ ] attack;
- [ ] stagger;
- [ ] минимум 2 death animations;
- [ ] силуэты типов читаются на расстоянии.

---

# 6. Abandoned Outskirts — первая настоящая локация

Не делать бесконечное пустое поле.

## Level geometry

- основная мокрая асфальтовая дорога;
- грунтовая боковая дорога;
- 2–3 дома / хозяйственных здания;
- сарай / гараж;
- заборы и ворота;
- разбитая машина;
- фонари;
- деревья разных размеров;
- кусты;
- высокая и низкая трава;
- камни;
- мусор;
- ящики;
- дорожные знаки;
- лужи;
- грязь;
- открытая зона для большой волны.

## LevelManifest markers

Геометрия уровня не должна хранить всю игровую логику.

Отдельно описываем:

- player spawn;
- zombie spawn zones;
- loot points;
- light anchors;
- wind zones;
- audio zones;
- choke points;
- interactables;
- navigation modifiers.

## Критерий

По одному скриншоту понятно, что игрок находится в конкретном месте, а не среди случайно расставленных primitives.

---

# 7. Terrain / Grass / Materials

## Surface materials

- wet asphalt;
- dry asphalt;
- dirt;
- wet mud;
- grass;
- flattened grass;
- gravel;
- concrete;
- wood;
- rusty metal.

## Surface detail

- mud patches;
- tyre tracks;
- gravel;
- leaves;
- litter;
- blood decals;
- bullet marks;
- puddles;
- wet roughness variation.

## Grass system

По мотивам выводов Red Eclipse:

- cluster distribution, не uniform random;
- разделение поля на spatial cells;
- distance culling;
- плотность определяется quality profile;
- меньше травы у дороги и зданий;
- несколько visual variants;
- ветер меняет orientation/sway;
- local wind impulse от blast / shotgun позже;
- mobile budget строгий.

---

# 8. Lighting & Atmosphere

Тёмно ≠ чёрный экран.

- moon / ambient fill;
- холодный environment light;
- rim/key light героя;
- flashlight героя;
- локальные фонари;
- автомобильный свет;
- emissive windows/signage где уместно;
- fog;
- ground haze;
- rain;
- wet surfaces;
- lightning;
- controlled vignette;
- лёгкий grain только High profile.

Игрок всегда должен видеть героя, врагов, направление движения и препятствия.

---

# 9. Camera 2.0

## Third-person

Архитектурные параметры вынесены отдельно:

- distance;
- height;
- shoulder side offset;
- look height;
- FOV;
- smoothing.

Дальше:

- collision camera → world;
- automatic camera shortening near walls;
- right shoulder framing;
- FOV expansion on sprint;
- recoil camera;
- damage shake;
- center-screen raycast;
- aim target point;
- subtle mobile aim assist.

## Top-down

- Diablo-like diagonal angle;
- smooth follow;
- dynamic zoom;
- hero silhouette separation;
- crowd readability;
- LOD/culling tuned separately from third-person.

---

# 10. Combat Feel

## Weapon state

Каждое оружие проходит через состояния:

`idle → fire/charge → cooldown → reload → idle`

Позже допускаются `aim / switch / stagger`.

## Pistol

- hitscan;
- быстрый recoil;
- короткая muzzle light;
- casing;
- небольшой smoke;
- head / torso / limb multipliers.

## Shotgun

- multi-hitscan pellets;
- spread;
- мощный recoil;
- сильный impulse/stagger;
- большой muzzle FX;
- локальный wind impulse;
- тяжёлый flesh-hit recipe.

## Bow

- физический projectile;
- gravity;
- charge позже;
- arrow remains attached on hit;
- минимальный camera recoil;
- отдельный impact effect.

## CombatFeedback

Simulation выдаёт события, presentation решает что показать:

- blood;
- sparks;
- damage number optional;
- hit marker;
- kill feedback;
- camera shake;
- hit stop;
- decals;
- sounds.

---

# 11. Enemy AI

Начальный State Tree:

```text
stagger/dead?
  yes → соответствующее состояние
  no  → can attack?
          yes → attack
          no  → sees player?
                  yes → chase
                  no  → heard shot?
                          yes → investigate
                          no  → wander
```

После появления сложной локации:

- navmesh global path;
- local avoidance;
- limited LOS raycasts;
- spatial hash для соседей;
- разные параметры по archetype.

Нельзя запускать дорогой full world pathfinding каждый кадр для каждого заражённого.

---

# 12. Effects budgets

Каждый эффект имеет lifetime и budget.

## Mobile ориентиры

- dynamic lights: по quality profile;
- blood/bullet decals: max count;
- particle pools: bounded;
- grass cells: distance culled;
- rain: fixed pool;
- трупы: despawn / fade;
- projectiles: capped;
- damage numbers: capped/merged.

Red Eclipse показал правильный принцип: эффект — композиция, но система никогда не должна расти бесконечно.

---

# 13. Face System 2.0

Ключевая особенность Facefall.

- local crop;
- reposition / zoom;
- oval mask;
- brightness / contrast correction;
- face-only texture placement;
- skin blending;
- local persistence;
- replace photo;
- fallback avatar;
- позже local face detection и auto alignment eyes/nose.

Фото не отправляется на внешний backend.

---

# 14. HUD / UX

## Mobile

- compact HP;
- ammo справа снизу;
- FIRE крупная;
- joystick полупрозрачный;
- CAM маленькая;
- safe-area;
- UI не закрывает противников;
- landscape после portrait parity.

## Desktop

- компактный HUD;
- crosshair;
- weapon slots;
- reload warning;
- wave notification.

---

# 15. Performance targets

## Android

- цель: **30+ FPS**;
- отсутствие бесконечной загрузки;
- отсутствие frame-time spikes при спавне волны;
- ограниченный draw-call / light / particle budget;
- автоматический `mobile-low` или `mobile-high` profile.

## Desktop

- цель: **60 FPS**;
- `desktop-high` profile;
- больше shadows / grass / particles / decals / lights.

---

# 16. Production discipline

После каждого крупного этапа:

1. TypeScript typecheck;
2. Vite production build;
3. runtime smoke test;
4. mobile viewport;
5. TOP camera;
6. 3RD camera;
7. touch controls;
8. face upload;
9. commit в GitHub;
10. Vercel preview/production;
11. тест на реальном Android;
12. только после этого этап = `выполнено`.

---

# 17. Текущий прогресс

## Legacy visual build

Production: **0.5 ALPHA**.

Visual sprint 0.5:

- выполнено полностью: **2 / 15**;
- частично: **2 / 15**;
- оставшиеся visual tasks временно не расширяем, пока engine-next не достигнет parity.

## Engine Foundation 0.5A

Выполнено на текущем заходе:

- npm/Vite/TypeScript;
- engine lab;
- GameLoop;
- EventBus;
- Octree/Capsule;
- weapon definitions;
- enemy archetypes;
- quality profiles;
- FX recipes;
- dual camera rig;
- clustered distance-culled grass;
- CI.

Следующий жёсткий шаг: **добить зелёный build engine-next → InputManager → Damage/Weapon/Projectile runtime → effects pools → LevelLoader → AI/navigation.**

Production entrypoint пока **не переключать**.

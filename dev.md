# Facefall Survivor — Development Plan

Текущая production-контрольная точка: **0.5 ALPHA (legacy runtime)**  
Текущий активный этап: **0.5A — Engine Foundation / engine-next**  
Production: `https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

## Цель проекта

Facefall — мобильная и desktop браузерная action-survival игра:

- top-down / Diablo-like камера;
- third-person over-the-shoulder камера;
- реалистичное мрачное окружение;
- pistol / shotgun / bow;
- толпы заражённых;
- пользователь загружает фотографию, лицо становится лицом героя;
- стабильная работа на реальном Android;
- GitHub `main` — источник истины;
- Vercel — единственный production-хостинг.

---

# 1. Архитектурные референсы

Проведены три подробных аудита.

## `ivanoskov/shooter` — browser foundation

Берём идеи:

- npm / Vite / TypeScript;
- Three.js как package dependency;
- Capsule collider персонажа;
- static Octree для collision уровня;
- GLB level loading;
- отдельные Game / Input / Camera / Physics modules;
- quality presets;
- debug tooling.

Не переносим 1:1:

- FPS camera;
- desktop-only Pointer Lock;
- двойной physics update исходного проекта;
- dynamic Octree для толпы;
- конкретную mouse-sensitivity implementation.

## `Unvanquished/Unvanquished` — gameplay architecture

Берём идеи:

- simulation отдельно от presentation;
- DamageEvent → HitEvent → KillEvent;
- CombatFeedback отдельной системой;
- data-driven weapons;
- data-driven enemy archetypes;
- component-oriented entities;
- projectile abstraction;
- navmesh для AI;
- lightweight behavior/state tree;
- animation state transitions / blending.

Не переносим GPL game code напрямую.

## `redeclipse/base` — combat feel, FX, environment

Берём идеи:

- weapon states: idle / fire / cooldown / reload / switch;
- recoil profile: pitch / yaw / recovery / camera kick;
- spread и accuracy как отдельные параметры;
- hit zones: head / torso / limb;
- hitscan и physical projectile как разные модели выстрела;
- FX recipe: particles + light + sound + wind + decal + camera feedback;
- bounded decals/stains с TTL и fade;
- grass distance culling / taper / quality budget;
- global wind + local impulses от оружия/взрывов;
- level geometry отдельно от gameplay/environment markers.

Red Eclipse waypoint AI не переносим: для сложной локации Facefall целимся в navmesh.

## Лицензии

- `ivanoskov/shooter`: MIT.
- `Unvanquished` game logic: GPL — используем идеи, не копируем код.
- Red Eclipse source: zlib; media/assets имеют отдельные лицензии и проверяются отдельно.
- Приоритет Facefall: собственный код + собственные / CC0 / явно совместимые ассеты.

---

# 2. Главные технические правила

1. **Никаких runtime CDN для Three.js в новой архитектуре.** Three.js собирается Vite в наш bundle.
2. Legacy 0.5 остаётся production, пока engine-next не достигнет функционального parity.
3. Один fixed timestep game loop.
4. Static collision и AI navigation — разные системы.
5. Static geometry: Octree; navigation: navmesh; crowd neighbours: spatial hash/local avoidance.
6. Weapons и enemies — data-driven.
7. Simulation генерирует события и не рисует эффекты напрямую.
8. Все particles / decals / lights / projectiles имеют budget и lifetime.
9. Grass разделяется на spatial cells и cull-ится по расстоянию.
10. Mobile-low / mobile-high / desktop-high — отдельные quality profiles.
11. Production entrypoint не переключать на engine-next до зелёного CI + Android smoke-test.
12. Primitive models допустимы только в engine-lab/fallback, но не как final art.

---

# 3. Целевая структура

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
    Health.ts
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

Новая архитектура строится параллельно и пока не заменяет production.

## Выполнено

- [x] npm project foundation.
- [x] Three.js 0.160 как dependency.
- [x] TypeScript strict mode.
- [x] Vite production build, target ES2020.
- [x] отдельный `engine-lab.html`.
- [x] fixed timestep `GameLoop` с accumulator/max substeps.
- [x] typed `EventBus`.
- [x] `CollisionWorld`: static Octree + Capsule.
- [x] `InputManager` — единое состояние ввода.
- [x] `KeyboardMouseInput`.
- [x] `TouchInput` + joystick/actions foundation.
- [x] data-driven `pistol / shotgun / bow`.
- [x] recoil profiles.
- [x] head / torso / limb damage contracts.
- [x] hitscan/projectile distinction.
- [x] `WeaponSystem`: ammo / cooldown / reload / switch / shot events.
- [x] `Health` component.
- [x] `DamageSystem`: DamageEvent → HitEvent → KillEvent.
- [x] pistol/shotgun hitscan proof-of-concept в engine lab.
- [x] ballistic `ProjectileSystem` foundation для bow/arrow.
- [x] `CombatFeedback` отделён от simulation.
- [x] data-driven `Walker / Runner / Brute` archetypes.
- [x] `mobile-low / mobile-high / desktop-high` quality profiles.
- [x] composable FX recipes.
- [x] bounded `ParticlePool`.
- [x] bounded/fading `DecalPool`.
- [x] `WindField`: global wind + bounded local impulses.
- [x] `DualCameraRig` для TOP / 3RD.
- [x] clustered `GrassField` с spatial cells и distance culling.
- [x] CI workflow: typecheck + Vite build.

## Следующий блок

- [ ] подтвердить первый зелёный CI run; исправить build/type issues, если появятся;
- [ ] подключить ballistic ProjectileSystem к engine-lab и визуализировать arrow;
- [ ] реализовать `EffectSystem`, использующий FX recipes + pools + WindField;
- [ ] muzzle light / smoke / casing / blood hit уже через новый EffectSystem;
- [ ] LevelManifest;
- [ ] GLB AssetManager без внешних runtime CDN;
- [ ] LevelLoader + collision extraction;
- [ ] SpatialHash для заражённых;
- [ ] EnemySystem;
- [ ] EnemyBrain State Tree;
- [ ] navigation layer для Abandoned Outskirts;
- [ ] CharacterAnimator;
- [ ] InfectedAnimator;
- [ ] debug overlay `?debug=1`;
- [ ] engine-next Android smoke-test;
- [ ] parity с legacy 0.5;
- [ ] только затем переключить Vercel production на Vite bundle.

### Definition of Done 0.5A

- Three.js/addons загружаются из нашего bundled JS;
- никаких CDN proxy и loader timeout hacks;
- TOP и 3RD работают;
- desktop и touch input работают через один InputManager;
- static collision работает;
- pistol / shotgun / bow идут через единый combat pipeline;
- Walker / Runner / Brute идут через единый EnemySystem;
- FX ограничены budgets;
- CI зелёный;
- Android smoke-test пройден;
- legacy runtime можно удалить без потери функций.

---

# 5. Этап 0.5 — Visual Vertical Slice

После foundation снова главным становится качество картинки.

## Герой

- [x] humanoid GLB pipeline уже прототипирован в legacy 0.5 alpha;
- [x] idle / walk / run прототипированы;
- [~] face texture prototype;
- [~] procedural weapon attachment prototype;
- [ ] качественная humanoid модель и одежда;
- [ ] pistol GLB;
- [ ] shotgun GLB;
- [ ] bow + arrow GLB;
- [ ] aim/fire/reload animations;
- [ ] hit/death animations;
- [ ] Face System 2.0: crop/reposition/brightness/blending.

## Заражённые

- [ ] Walker GLB;
- [ ] Runner GLB;
- [ ] Brute GLB;
- [ ] walk/run;
- [ ] attack;
- [ ] stagger;
- [ ] минимум два варианта death;
- [ ] силуэты типов читаются на расстоянии.

---

# 6. Abandoned Outskirts — первый полноценный уровень

## Геометрия

- мокрая асфальтовая дорога;
- грунтовая боковая дорога;
- 2–3 дома/хозпостройки;
- сарай/гараж;
- заборы и ворота;
- разбитая машина;
- фонари;
- деревья разных размеров;
- кусты;
- высокая/низкая трава;
- камни;
- мусор;
- ящики;
- знаки;
- лужи;
- грязь;
- открытая зона для большой волны.

## LevelManifest markers

Отдельно от визуальной геометрии:

- player spawn;
- zombie spawn zones;
- loot points;
- light anchors;
- wind zones;
- audio zones;
- choke points;
- interactables;
- navigation modifiers.

Критерий: один скриншот должен выглядеть как конкретная игровая локация, а не набор случайных primitives.

---

# 7. Terrain / Grass / Materials

- wet/dry asphalt;
- dirt;
- mud;
- grass / flattened grass;
- gravel;
- concrete;
- wood;
- rusty metal;
- puddles;
- tyre tracks;
- leaves/litter;
- blood decals;
- bullet marks;
- wet roughness variation.

Grass:

- cluster distribution;
- spatial cells;
- distance culling;
- quality-dependent density;
- меньше травы у дороги/домов;
- visual variants;
- sway from WindField;
- local impulse от shotgun/explosion;
- строгий mobile budget.

---

# 8. Lighting & Atmosphere

Темнота должна создавать атмосферу, а не скрывать игру.

- moon/ambient fill;
- холодный environment light;
- rim/key hero light;
- flashlight;
- street lamps;
- vehicle lights;
- emissive accents;
- fog/ground haze;
- rain;
- wet surfaces;
- lightning;
- controlled vignette;
- grain только High profile.

---

# 9. Cameras 2.0

## Third person

- shoulder offset;
- camera collision;
- auto shortening near walls;
- больше пространства впереди героя;
- run FOV;
- recoil/shake;
- center-screen raycast;
- mobile aim assist.

## Top-down

- Diablo-like diagonal angle;
- smooth follow;
- dynamic zoom;
- читаемый силуэт героя;
- отдельные LOD/culling параметры;
- crowd readability.

---

# 10. Combat Feel

## Pistol

- hitscan;
- recoil;
- muzzle flash + short light;
- smoke;
- casing;
- hit-zone multipliers.

## Shotgun

- multi-hitscan pellets;
- spread;
- мощный recoil;
- stagger/knockback;
- heavy muzzle recipe;
- local wind impulse;
- heavy flesh impact.

## Bow

- ballistic arrow;
- gravity;
- charge позже;
- видимая arrow trajectory;
- arrow sticks into target/environment;
- отдельный impact recipe.

## Feedback

`simulation → events → CombatFeedback → EffectSystem`

EffectSystem может запускать:

- blood;
- sparks;
- muzzle light;
- smoke;
- casing;
- decal;
- sound;
- wind impulse;
- camera shake;
- hit stop;
- optional damage number.

---

# 11. Enemy AI

Первый State Tree:

```text
DEAD/STAGGER?
  yes → state response
  no → can attack?
         yes → ATTACK
         no → sees player?
                yes → CHASE
                no → heard shot?
                       yes → INVESTIGATE
                       no → WANDER
```

После сложной геометрии:

- navmesh global path;
- local avoidance;
- limited LOS checks;
- SpatialHash для neighbours;
- разная тактика Walker / Runner / Brute.

---

# 12. Face System 2.0

- local crop;
- reposition / zoom;
- oval mask;
- brightness/contrast;
- face-only texture placement;
- skin blending;
- local persistence;
- replace photo;
- fallback avatar;
- позже local face detection / auto eye-nose alignment.

Фото не отправляется на внешний backend.

---

# 13. Performance targets

## Android

- цель 30+ FPS;
- отсутствие loader hangs;
- отсутствие больших frame spikes при spawn waves;
- capped particles/decals/projectiles/lights;
- automatic mobile quality profile.

## Desktop

- цель 60 FPS;
- richer shadows/grass/particles/decals/lights.

---

# 14. Production discipline

После каждого milestone:

1. TypeScript typecheck;
2. Vite production build;
3. runtime smoke-test;
4. mobile viewport;
5. TOP;
6. 3RD;
7. touch input;
8. face upload;
9. GitHub main;
10. Vercel preview/production;
11. реальный Android test;
12. только затем этап получает `выполнено`.

---

# Текущий прогресс

**Production остаётся 0.5 ALPHA legacy. Не переключать.**

**0.5A engine-next:** архитектурный каркас создан, input и базовый combat pipeline уже реализованы. Следующий жёсткий блок: **green build → EffectSystem → arrow runtime → LevelLoader/AssetManager → EnemySystem/AI/navigation → Android smoke-test.**

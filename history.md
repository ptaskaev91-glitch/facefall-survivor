# Facefall Survivor — History

Последняя актуализация: **2026-08-10**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`

---

# 1. Назначение

`history.md` — восстановимая история продукта и разработки: исходная идея, запросы пользователя, решения, ошибки, архитектурные изменения, audits, commits/PR, deployment checkpoints и следующий шаг.

Это не dump tool-calls и не скрытые рассуждения. После каждого крупного этапа добавляется новый checkpoint, старые решения не переписываются задним числом.

---

# 2. 2026-08-10 — исходная идея

Пользователь предложил browser survival shooter против заражённых.

Ключевые требования:

- TOP gameplay в духе Diablo;
- полноценный third-person режим;
- pistol / shotgun / bow;
- загружаемая фотография становится лицом героя;
- mobile controls;
- игра должна развиться из prototype в качественную атмосферную 3D-игру.

Позже закреплены infected archetypes: Walker / Runner / Brute.

Создан repository `ptaskaev91-glitch/facefall-survivor`; `main` — source-of-truth.

---

# 3. GitHub Pages → Vercel

Первоначальная попытка GitHub Pages создавала 404/лишнюю инфраструктуру. Пользователь выбрал Vercel-only hosting.

Зафиксировано:

- GitHub = source/version history;
- Vercel = production;
- GitHub Pages не используется.

Primary production alias:

`https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

---

# 4. Ранние cinematic/browser prototypes

В 0.3 были сделаны gameplay/visual prototypes:

- face persistence;
- pistol/shotgun/bow;
- waves;
- rain/fog/night lighting;
- muzzle FX/casings;
- blood/decals;
- pickups;
- mobile controls/auto aim;
- procedural sound/environment.

Появились первые architecture bugs: initialization order и lighting compositing. Они были исправлены, но стало ясно, что большой monolithic runtime быстро становится хрупким.

---

# 5. Переход в Three.js и 3D

По запросу пользователя были добавлены:

- Three.js/WebGL;
- 3D terrain;
- TOP + third-person cameras;
- camera switching;
- grass/materials;
- trees/props;
- rain/fog/lights;
- mobile controls.

После merge на реальном Android возникли проблемы: сначала не нажимались кнопки, затем движок мог зависать на бесконечной загрузке.

Для стабилизации были введены independent UI bootstrap, timeout/error fallback и Vercel same-origin proxy для Three/GLTF assets.

Главный урок: runtime CDN + один большой JS-файл — плохая долговременная база.

---

# 6. Visual audit текущего prototype

После пользовательского скриншота зафиксированы проблемы:

- procedural mannequin вместо полноценного героя;
- face как визуальная накладка;
- слишком тёмная сцена;
- слабая читаемость материалов/травы;
- неудобная third-person camera;
- плохая читаемость weapon silhouettes;
- одинаковые infected silhouettes;
- пустой мир;
- web-like HUD.

Принято решение перестать бесконечно улучшать BoxGeometry/SphereGeometry и перейти к GLB characters/weapons/environment.

---

# 7. 0.5 ALPHA Character prototype

Был прототипирован GLB character pipeline:

- humanoid GLB;
- AnimationMixer;
- idle/walk/run;
- weapon visuals;
- face attachment;
- improved third-person camera;
- fallback procedural model.

Three.js Soldier использовался как pipeline proof и не является final Facefall asset.

Этот build остался стабильной production legacy контрольной точкой.

---

# 8. Три архитектурных аудита

## `ivanoskov/shooter`

Главная ценность — browser foundation:

- TypeScript/Vite/npm Three.js;
- GLB loading;
- Octree/Capsule;
- quality/debug architecture.

Не копировались его double-update physics, FPS camera и desktop-only input assumptions.

## `Unvanquished/Unvanquished`

Главная ценность — gameplay architecture:

- simulation vs presentation;
- data-driven weapons/entities;
- Damage/Hit/Kill pipeline;
- projectiles;
- navmesh;
- state/behavior AI;
- animation transitions.

GPL game code напрямую не переносится.

## `redeclipse/base`

Главная ценность — combat/FX/environment philosophy:

- weapon states/recoil/spread;
- hitscan vs projectile;
- head/torso/limb zones;
- particles/light/sound/decal/wind as one FX recipe;
- bounded stains/grass budgets;
- level semantic markers.

Итоговая архитектура Facefall:

> TypeScript/Vite browser foundation + event/component gameplay systems + data-driven combat + pooled FX + GLB/manifest levels + mobile-first budgets.

---

# 9. Documentation Freeze

По запросу пользователя были созданы и зафиксированы:

- `structure.md`;
- `history.md`;
- полный `dev.md` roadmap.

После подготовки пользователь разрешил продолжить coding.

---

# 10. PR #1 — lifecycle / camera / EffectSystem

Branch: `engine-next/0.5a-foundation`.

Добавлены:

- GameApp/GameState/Bootstrap;
- thin `src/main.ts`;
- pause/resume/dispose;
- clean TouchInput detach;
- TopDownCamera / ThirdPersonCamera / CameraDirector;
- LightPool;
- EffectSystem.

CI install/typecheck/Vite build прошёл успешно.

PR #1 squash-merged → checkpoint `0a599032`.

Production legacy не переключался.

---

# 11. Пользовательское правило reuse

Пользователь уточнил: там, где совместимый блок можно безопасно скопировать — копировать; где нельзя — писать с нуля.

Принята политика:

- permissive compatible isolated code may be reused with notices;
- GPL/incompatible code not copied;
- external media licenses checked independently;
- architecture ideas may be reimplemented cleanly.

Создан `THIRD_PARTY_NOTICES.md`.

---

# 12. PR #2 — physics / aim / level foundation

Branch: `engine-next/0.5a-core-physics`.

Direct MIT adaptations from `ivanoskov/shooter`:

- Capsule/Octree collision response → `PlayerCapsule`;
- GLTF loading/traverse pattern → AssetManager/LevelLoader.

Original Facefall implementations:

- SpatialHash;
- CameraCollision;
- pointer/touch aiming;
- LevelManifest;
- combat/FX integration.

Также добавлены:

- static world ray/segment queries;
- third-person camera push-in;
- hitscan world occlusion;
- EffectSystem connected to Shot/Hit events;
- Abandoned Outskirts manifest skeleton;
- media `ATTRIBUTION.md`.

CI green. PR #2 squash-merged → checkpoint `29008e7d`.

---

# 13. 2026-08-10 — большой 0.5A блок по запросу пользователя

Пользователь попросил:

> сделать сразу большой блок, в конце слить в `main` и обновить Vercel.

Создан branch `engine-next/0.5a-big-block` и PR **#3**.

## Ballistic bow

ProjectileSystem подключён к реальному combat runtime:

- bow ShotEvent создаёт ballistic projectile;
- velocity + gravity + lifetime;
- segment collision каждый fixed tick;
- collision проверяет enemy и static world;
- enemy hit идёт в общий DamageSystem;
- world hit завершает projectile и вызывает surface FX;
- создан pooled `ProjectileVisuals`, поэтому стрелы реально имеют отдельную visual representation.

## Concrete FX

Создан `RuntimeFx`:

- ParticlePool получил concrete runtime particles;
- DecalPool получил concrete bounded decals;
- появились smoke/casing/blood/debris/spark runtime variants;
- CameraImpulse даёт camera shake;
- LightPool остаётся bounded;
- добавлен `surface-hit` recipe.

Таким образом architecture Red-Eclipse-style recipes стала не только interfaces, а рабочим presentation pipeline.

## Level manifest in runtime

LevelLoader получил manifest-first API.

`GameApp` теперь загружает `Abandoned Outskirts/level.manifest.json` при старте engine-next.

Manifest уже управляет prototype runtime data:

- player spawn;
- enemy spawn placement;
- level lights.

Пока `level.glb` отсутствует, procedural lab geometry остаётся fallback.

## Validation / merge

PR #3 CI полностью green:

- dependencies install;
- strict TypeScript;
- Vite production build.

PR #3 squash-merged в `main`.

Checkpoint:

`bec7b5f8c0110876df2d54b60c7fbb839ee453ca`

---

# 14. Release tooling / combined artifact

После PR #3 подготовлен безопасный transition deployment pipeline.

В `main` добавлены:

- `scripts/copy-legacy.mjs`;
- `npm run build:deploy`;
- `vercel.json` с `buildCommand` и `outputDirectory=dist-next`;
- CI переключён на combined deploy build.

Смысл:

```text
Vite engine-next build
       +
stable legacy root files
       ↓
dist-next
```

Так можно собирать новую architecture, не заставляя `/` преждевременно переключаться на engine-next.

Для получения точного CI build создан PR **#4** `Release tooling: publish combined Vercel artifact`.

CI успешно выполнил:

- install;
- strict typecheck;
- combined Vercel build;
- upload `facefall-dist-next` artifact.

Artifact id: `9074430084`.

PR #4 squash-merged в `main`.

Release-tooling checkpoint:

`6d051dae8febbfd61bf2b3cb826bb595edbcbc31`

---

# 15. Vercel refresh after the big block

Connector limitation discovered: current Vercel deploy action accepts explicit `{name,target,files}`, but cannot consume the downloaded CI zip as a single deployment input.

Чтобы не рисковать рабочим public root незавершённым engine-next, production был обновлён безопасно:

- новый production deployment получил текущий stable 0.5 ALPHA index;
- stable legacy CSS/JS проксируются с immutable предыдущего working deployment;
- Three/GLTF/hero same-origin rewrites сохранены;
- primary aliases были назначены новому deployment.

Vercel response:

- deployment id: `dpl_2SmWVpkqFmuZL2BBrpQ7v2UbRcEb`;
- unique URL: `https://facefall-survivor-862tw5dsx-pavels-projects-0b29bb12.vercel.app`;
- primary alias: `https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`;
- initial status returned by create action: `INITIALIZING`.

Immediately after creation, Vercel connector's `get_deployment`/build-log calls again returned `404 not_found` for the new deployment ID. This same connector inconsistency occurred previously. Therefore history does **not** claim READY without browser/user verification.

Important: this refresh intentionally did **not** activate engine-next as `/`. That remains blocked by functional parity + Android smoke-test.

---

# 16. Current state after this pass

`main` now contains:

- strict TypeScript/Vite/npm Three.js engine-next;
- one fixed GameLoop;
- GameApp/GameState/Bootstrap;
- desktop/touch input foundation;
- TOP/3RD camera architecture + camera collision;
- Octree / PlayerCapsule / SpatialHash;
- Weapon/Health/Damage pipeline;
- real hitscan + ballistic projectile foundations;
- visible pooled arrow projectiles;
- concrete pooled runtime FX + camera shake;
- AssetManager / LevelLoader / LevelManifest;
- runtime manifest integration;
- combined release build and CI artifact pipeline;
- code/media licensing notices.

Production root remains the stable legacy 0.5 ALPHA until parity is complete.

---

# 17. 2026-08-10 — PR #5 / первый полноценный 0.5B gameplay loop

После команды пользователя «Продолжай» начат этап **0.5B Functional Parity**.

Branch: `engine-next/0.5b-gameplay-loop`.  
PR: **#5**.  
Squash merge checkpoint: `dcdee8b058726743ba2e518602e2b8cce458f0d1`.

Добавлено:

- новый `EnemySystem`;
- реальные runtime Walker / Runner / Brute spawn instances;
- движение заражённых к герою;
- melee attack range/cooldown/damage из data-driven archetypes;
- moving enemy SpatialHash update;
- player зарегистрирован в общем `DamageSystem`;
- Player Health = 100;
- новый `WaveDirector`;
- wave composition растёт по сложности;
- spawn идёт из `enemy-spawn` markers `LevelManifest`;
- max active infected зависит от quality profile;
- kills и score;
- `gameover` state;
- restart без reload страницы;
- reset weapons/projectiles/health/enemies между забегами;
- engine-lab HUD: HP / WAVE / KILLS / SCORE;
- engine-lab game-over overlay и кнопка restart;
- engine-lab label поднят до `ENGINE NEXT 0.5B`.

CI для PR #5 полностью green:

- dependencies install — success;
- strict TypeScript — success;
- combined Vercel bundle — success;
- artifact upload — success.

Это первая engine-next версия, где есть не только технический combat proof, а замкнутый gameplay loop:

```text
wave spawn
→ infected chase
→ infected melee damage
→ player shoots
→ damage/kill
→ score/kills
→ next wave
→ player death
→ game over
→ restart
```

Ограничение: enemy navigation пока прямолинейная и ещё не использует navmesh/obstacle avoidance, поэтому это functional parity foundation, а не финальный AI.

---

# 18. Next order

1. Обновить Vercel test build для engine-next 0.5B и проверить его в браузере/Android.
2. Перенести face upload/local persistence в engine-next.
3. Добавить полноценный menu/start flow вместо lab-only auto-start.
4. Довести third-person aim/crosshair/mobile aim assist.
5. Добавить rain/ambient atmosphere parity.
6. Начать navmesh spike + EnemyState/avoidance.
7. Декомпозировать GameApp дальше после стабилизации 0.5B.
8. Desktop browser smoke-test.
9. Real Android smoke-test.
10. Только после parity + smoke-test переключить production `/` на Vite engine-next.

---

# 19. Future history format

For each large pass:

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

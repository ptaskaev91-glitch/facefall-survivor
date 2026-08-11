# Facefall Survivor — History

Последняя актуализация: **2026-08-11**  
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

Также добавлены static world ray/segment queries, third-person camera push-in, hitscan world occlusion, EffectSystem integration, Abandoned Outskirts manifest skeleton и media attribution registry.

CI green. PR #2 squash-merged → checkpoint `29008e7d`.

---

# 13. PR #3 — большой 0.5A projectile / FX / level block

По просьбе пользователя сделать большой связанный блок добавлены:

- ballistic bow runtime;
- projectile gravity/lifetime/segment collision;
- pooled visible arrows;
- concrete RuntimeFx particles/decals/camera impulse;
- surface-hit recipe;
- manifest-first runtime loading;
- player spawn / enemy spawn / lights из manifest.

CI green. PR #3 squash-merged → `bec7b5f8c0110876df2d54b60c7fbb839ee453ca`.

---

# 14. PR #4 — release tooling

Добавлены:

- `scripts/copy-legacy.mjs`;
- `npm run build:deploy`;
- combined `dist-next`;
- CI artifact `facefall-dist-next`;
- Vercel output config для переходного периода.

PR #4 squash-merged → `6d051dae8febbfd61bf2b3cb826bb595edbcbc31`.

Production root намеренно остался legacy до functional parity + Android smoke-test.

---

# 15. Vercel refresh после 0.5A

Production refresh был сделан безопасно без преждевременного переключения `/` на engine-next.

Зафиксированный deployment request:

`dpl_2SmWVpkqFmuZL2BBrpQ7v2UbRcEb`

Vercel connector иногда возвращал `404 not_found` при последующем polling свежих deployment IDs, поэтому READY никогда не считался подтверждённым без фактической проверки.

---

# 16. PR #5 — первый полноценный 0.5B gameplay loop

Branch: `engine-next/0.5b-gameplay-loop`.  
PR: **#5**.  
Squash merge checkpoint: `dcdee8b058726743ba2e518602e2b8cce458f0d1`.

Добавлено:

- EnemySystem;
- Walker / Runner / Brute runtime;
- chase + melee attacks;
- moving SpatialHash update;
- player Health/Damage;
- WaveDirector;
- manifest spawn zones;
- quality-dependent enemy cap;
- kills / score;
- gameover/restart;
- HP/WAVE/KILLS/SCORE HUD.

CI полностью green.

Ограничение: navigation пока direct chase без navmesh.

---

# 17. Реальный Android feedback — movement и reticle

Пользователь протестировал engine-next на Android и сообщил две конкретные проблемы:

1. joystick movement был непонятен относительно экрана;
2. не хватало небольшого прицела.

В 0.5B.1 введён camera-relative `MovementFrame`: joystick/WASD теперь преобразуются относительно активной камеры. Добавлен компактный reticle и визуальная стрелка `MOVE` на joystick.

PR #6 squash-merged → checkpoint `276ef78c3e894890c9c75796f9420c8158a91536`.

Этот Android test подтвердил browser/mobile runtime, но выявил недостаток самой aim architecture.

---

# 18. PR #7 — focused dual-mode AimSystem

Пользователь показал скриншоты и уточнил, что прицел не двигается при свайпе и наведение в обоих режимах нужно исправить отдельно.

Добавлен `AimController`.

Ключевой принцип:

> **видимый reticle и фактическое направление ShotEvent используют одно и то же aim state.**

TOP:

- свободно перемещаемый screen-space reticle;
- touch swipe работает как relative trackpad;
- reticle → camera ray → world aim.

3RD:

- floating reticle в ограниченной зоне;
- вертикальное положение влияет на shot direction;
- выход из central deadzone создаёт soft turn demand для героя/камеры.

WeaponSystem для player shot получает direction из AimController.

PR #7 CI green. Squash merge checkpoint:

`967993a3c7d57c448e152526d81c9d7f3249789a`

---

# 19. PR #8 — menu + local face parity

После команды пользователя «Продолжай dev» development вернулся к 0.5B parity.

Добавлены:

- `menu` и `face_setup` states;
- `ProductShell`;
- engine-next перестал auto-start gameplay;
- pre-game TOP / 3RD selection;
- local face picker/preview;
- replace/remove;
- `FaceStore` через `localStorage`;
- loading/error feedback;
- `GameApp.start({ cameraMode, faceDataUrl })`;
- runtime input attaches после start;
- `FaceSystem` применяет фото к prototype hero;
- neutral fallback face.

`FaceSystem` временный: это parity face plane. Final Face System 2.0 должен интегрировать лицо в production head/UV.

Первый CI поймал strict TypeScript material mismatch. После исправления CI полностью green.

PR #8 squash-merged:

`56f90d50ac488f4227b28305d4b1da419927375a`

---

# 20. Vercel preview contract issue

После PR #8 CI-built `engine-next-preview` был проверен и содержал compiled `0.5B.3 MENU+FACE` bundle.

Попытка создать новый Vercel preview выявила отдельную проблему connector contract: видимая схема `deploy_to_vercel` не принимала параметры, а backend требовал `target`, `name`, `files`.

Это не build failure. Новый 0.5B.3 preview URL не был объявлен как созданный. Production не менялся.

---

# 21. PR #9 — manifest pickups + bounded rain

Development продолжен по `dev.md` несмотря на Vercel connector issue.

Branch: `engine-next/0.5b4-pickups-rain`.  
PR: **#9**.  
Squash merge checkpoint:

`0876eff1839e9c93a669dc328cf225e200ebf498`

Добавлено:

## Pickups

- новый `PickupSystem`;
- health/ammo как `LevelManifest kind=loot` markers;
- Abandoned Outskirts получил один health и два ammo markers;
- health использует общий `Health.heal()`;
- ammo пополняет reserve выбранного оружия через `WeaponSystem.addReserve()`;
- proximity collection;
- simple bounded visuals;
- hide + prototype 18-second respawn;
- reset между run-ами.

## Rain

Добавлен `RainField`:

- одна `Points` geometry вместо Mesh на каждую каплю;
- reusable typed arrays positions/speeds;
- quality-dependent density: примерно 420 / 760 / 1200 drops;
- rain volume recycle вокруг player anchor;
- mobile-first budget;
- корректный dispose.

## Aim consistency

Закрыта ещё одна integration gap из focused aim-pass: в TOP фактический ShotEvent уже шёл в visible reticle, но procedural герой мог визуально не следовать touch-reticle. Теперь TOP facing также берётся из `AimController` world direction.

Итоговый invariant:

```text
visible reticle
→ AimController
→ world aim
├→ hero facing
└→ WeaponSystem ShotEvent
```

## CI

PR #9 полностью green:

- dependencies install — success;
- strict TypeScript — success;
- combined Vercel build — success;
- deploy artifact upload — success.

После merge engine-lab build label обновлён на:

`FACEFALL // ENGINE NEXT 0.5B.4 PICKUPS+RAIN`

---

# 22. Текущая точка

Engine-next теперь имеет:

- modular TypeScript/Vite runtime;
- product menu/start flow;
- local face picker/persistence;
- TOP/3RD camera selection;
- camera-relative movement;
- shared reticle/facing/shot AimController contract;
- pistol/shotgun/bow pipeline;
- ballistic arrows;
- EnemySystem + Walker/Runner/Brute;
- WaveDirector;
- player damage/gameover/restart;
- score/kills;
- manifest-driven health/ammo pickups;
- bounded quality-scaled rain;
- pooled FX/projectiles;
- manifest-driven runtime markers.

Production `/` остаётся legacy 0.5 ALPHA до завершения parity и свежего Android smoke-test.

---

# 23. Следующий порядок

1. Закрепить reproducible `package-lock.json` и перевести CI на `npm ci`.
2. Добавить automated browser smoke: boot → menu → start → gameplay + fatal console checks.
3. Создать базовый AudioSystem и rain/wind ambient layer; затем lightning/thunder.
4. Добавить aim sensitivity/deadzone config и лёгкий mobile aim assist после device tuning.
5. Продолжить decomposition GameApp.
6. Начать navmesh spike и obstacle-aware enemy movement.
7. Решить Vercel preview deployment path через рабочий connector/Git integration/artifact route.
8. Провести latest desktop + Android smoke-test 0.5B.4.
9. Сравнить functional parity с legacy.
10. Только затем переключать production `/` на engine-next.

---

# 24. Future history format

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

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

Этот Android тест важен: engine-next доказал, что загружается и реально управляется на целевом мобильном устройстве, но выявил недостаток самой aim architecture.

---

# 18. PR #7 — focused dual-mode AimSystem

Пользователь показал скриншоты и уточнил:

> «Прицел не двигается при свайпе по экрану. Давай отдельно, фокусно займёмся наведением прицела, в обоих режимах. Это важно».

Было принято решение временно остановить остальные направления и исправить сам контракт наведения.

Добавлен `AimController`.

Ключевой принцип:

> **видимый reticle и фактическое направление ShotEvent должны использовать одно и то же aim state.**

TOP:

- свободно перемещаемый screen-space reticle;
- touch swipe работает как relative trackpad;
- reticle → camera ray → ground/world aim;
- герой ориентируется в эту точку.

3RD:

- floating reticle в ограниченной зоне;
- вертикальное положение влияет на shot direction;
- при выходе из central deadzone горизонтальная позиция создаёт soft turn demand для героя/камеры.

WeaponSystem для player shot теперь получает direction из AimController, а не из декоративного HUD/отдельного facing-only пути.

PR #7 CI green. Squash merge checkpoint:

`967993a3c7d57c448e152526d81c9d7f3249789a`

Vercel aim test preview был создан отдельно. Последнее ощущение aim на устройстве всё ещё требует пользовательской проверки.

---

# 19. PR #8 — menu + local face parity

После команды пользователя «Продолжай dev» development вернулся к 0.5B parity.

Выбран крупнейший незакрытый разрыв между engine-next и legacy: product start flow и face upload.

Добавлены:

- `menu` и `face_setup` состояния в GameState;
- `ProductShell`;
- engine-next перестал auto-start gameplay;
- pre-game TOP / 3RD selection;
- локальный face picker;
- preview выбранного фото;
- replace/remove;
- `FaceStore` через `localStorage`;
- clear loading/error feedback;
- `GameApp.start({ cameraMode, faceDataUrl })`;
- runtime input attaches только после старта gameplay;
- `FaceSystem` применяет фото к текущему prototype hero;
- neutral fallback face.

`FaceSystem` сейчас deliberately temporary: это parity face plane на procedural hero. Final Face System 2.0 должен интегрировать лицо в production head/UV.

Первый CI PR #8 поймал strict TypeScript material mismatch (`MeshBasicMaterial` vs inferred `MeshStandardMaterial`). Ошибка была исправлена, после чего повторный CI полностью прошёл:

- install — success;
- strict TypeScript — success;
- combined Vercel build — success;
- artifact upload — success.

PR #8 squash-merged в `main`.

Checkpoint:

`56f90d50ac488f4227b28305d4b1da419927375a`

---

# 20. Текущая точка

Engine-next теперь имеет:

- modular TypeScript/Vite runtime;
- camera-relative movement;
- TOP/3RD AimController;
- unified visible-reticle/shot direction;
- combat/enemy/wave/gameover loop;
- menu/start flow;
- local face persistence;
- pre-game camera selection;
- prototype face integration;
- pooled FX/projectiles;
- manifest-driven runtime markers.

Production `/` всё ещё legacy 0.5 ALPHA до завершения parity и свежего Android smoke-test.

---

# 21. Следующий порядок

1. Опубликовать отдельный Vercel preview текущего 0.5B.3.
2. Проверить на Android: menu → face select → preview → camera choice → start → persisted reload → replace/remove.
3. Повторно оценить aim 0.5B.2/0.5B.3 в TOP и 3RD.
4. Добавить health/ammo pickups.
5. Добавить rain + base ambient atmosphere.
6. Закрепить package lock / перейти CI на `npm ci`.
7. Добавить browser smoke automation.
8. Начать navmesh spike.
9. Провести latest desktop + Android smoke-test.
10. Только затем рассматривать переключение production `/` на engine-next.

---

# 22. Future history format

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

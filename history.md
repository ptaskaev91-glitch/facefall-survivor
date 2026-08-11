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

GitHub = source/version history. Vercel = production. GitHub Pages не используется.

Primary production alias:

`https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

---

# 4. Ранние cinematic/browser prototypes

В 0.3 были сделаны face persistence, pistol/shotgun/bow, waves, rain/fog/night lighting, muzzle FX/casings, blood/decals, pickups, mobile controls/auto aim и procedural sound/environment.

Появились initialization-order и lighting bugs; стало ясно, что monolithic runtime не подходит как долговременная база.

---

# 5. Переход в Three.js и 3D

Добавлены Three.js/WebGL, 3D terrain, TOP + third-person cameras, grass/materials, trees/props, rain/fog/lights и mobile controls.

После merge на Android были проблемы с bootstrap и бесконечной загрузкой. Для стабилизации введены independent UI bootstrap, timeout/error fallback и Vercel same-origin proxy для Three/GLTF assets.

Главный урок: runtime CDN + один большой JS-файл — плохая долговременная база.

---

# 6. Visual audit prototype

Зафиксированы procedural mannequin, слабая face integration, слишком тёмная сцена, слабые материалы, неудобная 3RD camera, плохая читаемость weapons, одинаковые infected silhouettes, пустой мир и web-like HUD.

Принято решение перейти к GLB characters/weapons/environment.

---

# 7. 0.5 ALPHA Character prototype

Прототипированы humanoid GLB, AnimationMixer, idle/walk/run, weapon visuals, face attachment, improved 3RD camera и procedural fallback.

Three.js Soldier использовался как pipeline proof, а legacy build остался production-контрольной точкой.

---

# 8. Три архитектурных аудита

`ivanoskov/shooter` дал browser foundation: TypeScript/Vite/npm Three.js, GLB loading, Octree/Capsule, quality/debug architecture.

`Unvanquished/Unvanquished` дал gameplay architecture: simulation vs presentation, data-driven weapons/entities, Damage/Hit/Kill, projectiles, navmesh, AI state/behavior, animation transitions. GPL code напрямую не переносится.

`redeclipse/base` дал combat/FX/environment philosophy: weapon states/recoil/spread, hitscan vs projectile, hit zones, particles/light/sound/decal/wind recipes, bounded budgets, level semantic markers.

Итоговая архитектура:

> TypeScript/Vite browser foundation + event/component gameplay systems + data-driven combat + pooled FX + GLB/manifest levels + mobile-first budgets.

---

# 9. Documentation Freeze

Созданы `structure.md`, `history.md`, полный `dev.md`. После подготовки пользователь разрешил coding.

---

# 10. PR #1 — lifecycle / camera / EffectSystem

Добавлены GameApp/GameState/Bootstrap, thin `src/main.ts`, pause/resume/dispose, TouchInput detach, TopDownCamera / ThirdPersonCamera / CameraDirector, LightPool, EffectSystem.

CI green. PR #1 squash-merged → `0a599032`.

---

# 11. Пользовательское правило reuse

Где совместимый блок можно безопасно скопировать — копировать; где нельзя — писать с нуля.

Permissive isolated code может reused с notices; GPL/incompatible code не копируется; media licenses проверяются отдельно.

Создан `THIRD_PARTY_NOTICES.md`.

---

# 12. PR #2 — physics / aim / level foundation

Direct MIT adaptations from `ivanoskov/shooter`: Capsule/Octree collision response → `PlayerCapsule`; GLTF loading/traverse pattern → AssetManager/LevelLoader.

Original Facefall: SpatialHash, CameraCollision, pointer/touch aiming, LevelManifest, combat/FX integration.

CI green. PR #2 squash-merged → `29008e7d`.

---

# 13. PR #3 — projectile / FX / level block

Добавлены ballistic bow, projectile gravity/lifetime/segment collision, pooled arrows, RuntimeFx particles/decals/camera impulse, surface-hit recipe, manifest-first runtime loading, player/enemy spawn и lights из manifest.

CI green. PR #3 squash-merged → `bec7b5f8c0110876df2d54b60c7fbb839ee453ca`.

---

# 14. PR #4 — release tooling

Добавлены `scripts/copy-legacy.mjs`, `npm run build:deploy`, combined `dist-next`, CI artifact `facefall-dist-next`, Vercel output config.

PR #4 squash-merged → `6d051dae8febbfd61bf2b3cb826bb595edbcbc31`.

Production root остался legacy до parity + Android smoke.

---

# 15. Vercel refresh после 0.5A

Production refresh сделан без переключения `/` на engine-next. Зафиксирован deployment request `dpl_2SmWVpkqFmuZL2BBrpQ7v2UbRcEb`.

Vercel connector иногда возвращал 404 при polling свежих deployment IDs, поэтому READY не считался подтверждённым без проверки.

---

# 16. PR #5 — первый полноценный 0.5B gameplay loop

Добавлены EnemySystem, Walker/Runner/Brute runtime, chase + melee, moving SpatialHash, player Health/Damage, WaveDirector, manifest spawn zones, enemy cap, kills/score, gameover/restart, HP/WAVE/KILLS/SCORE HUD.

CI green. PR #5 squash-merged → `dcdee8b058726743ba2e518602e2b8cce458f0d1`.

Navigation пока direct chase без navmesh.

---

# 17. Android feedback — movement и reticle

Пользователь сообщил, что joystick movement непонятен относительно экрана и нужен небольшой прицел.

В 0.5B.1 добавлены camera-relative MovementFrame и compact reticle. PR #6 squash-merged → `276ef78c3e894890c9c75796f9420c8158a91536`.

---

# 18. PR #7 — focused dual-mode AimSystem

По пользовательскому feedback наведение вынесено в `AimController`.

Invariant:

> visible reticle и actual ShotEvent используют одно aim state.

TOP: free reticle, relative touch trackpad, camera ray → world aim.

3RD: floating reticle, vertical shot contribution, soft edge turn.

PR #7 CI green. Squash merge → `967993a3c7d57c448e152526d81c9d7f3249789a`.

---

# 19. PR #8 — menu + local face parity

Добавлены menu/face_setup states, ProductShell, pre-game TOP/3RD, local face picker/preview, replace/remove, FaceStore/localStorage, loading/error feedback, `GameApp.start({ cameraMode, faceDataUrl })`, FaceSystem + neutral fallback.

Первый CI поймал material typing mismatch; после исправления CI green.

PR #8 squash-merged → `56f90d50ac488f4227b28305d4b1da419927375a`.

---

# 20. Vercel preview contract issue

CI-built engine-next-preview содержал 0.5B.3 bundle. Fresh preview deploy выявил schema/backend mismatch у connector: внешняя схема не принимала параметры, backend требовал `target/name/files`.

Это не build failure. Production не менялся.

---

# 21. PR #9 — manifest pickups + bounded rain

Добавлены PickupSystem, manifest health/ammo loot, proximity collection, timed respawn, `WeaponSystem.addReserve()`, bounded RainField на одной Points geometry, quality-dependent density и TOP facing через общий AimController.

PR #9 CI green. Squash merge → `0876eff1839e9c93a669dc328cf225e200ebf498`.

---

# 22. PR #10 — reproducible npm + Chromium smoke

Перед navmesh и дальнейшей parity-разработкой закрыт инфраструктурный риск воспроизводимости.

Добавлены:

- committed `package-lock.json`;
- CI installation через `npm ci`;
- Playwright Chromium;
- `scripts/smoke-engine.mjs`;
- реальный browser smoke: открыть engine-next → увидеть menu → нажать start → дождаться `state=playing` → переключить 3RD → fail при fatal `pageerror`;
- combined Vercel build/artifact остаются после browser smoke.

При bootstrap lockfile CI дважды выявил workflow-specific проблемы: сначала `setup-node` cache требовал lockfile до его генерации, затем synthetic PR merge commit мешал fast-forward push. Workflow был исправлен, lockfile создан в head branch, после чего одноразовый bootstrap-step удалён.

Финальный контрольный run **#63** прошёл полностью:

```text
npm ci
→ strict TypeScript
→ Playwright Chromium install
→ browser smoke
→ combined Vercel build
→ artifact upload
```

PR #10 squash-merged в `main`.

Checkpoint:

`018d78c1275f99aec22ef5e4a137ec912806b740`

Это первый checkpoint, где engine-next проверяется не только компилятором, но и реальным headless browser flow на каждом development PR.

---

# 23. Текущая точка

Engine-next имеет modular TypeScript/Vite runtime, product menu, local face flow, TOP/3RD, camera-relative movement, shared AimController, pistol/shotgun/bow, ballistic arrows, EnemySystem/WaveDirector, player damage/gameover/restart, pickups, bounded rain, pooled FX, manifest runtime и воспроизводимый `npm ci` + Chromium smoke CI.

Production `/` остаётся legacy 0.5 ALPHA до завершения parity и свежего Android smoke-test.

---

# 24. Следующий порядок

1. Base AudioSystem + rain/wind ambient layer; затем lightning/thunder.
2. Aim sensitivity/deadzone config + lightweight mobile aim assist.
3. GameApp decomposition после стабилизации parity wiring.
4. Navmesh spike / obstacle-aware enemy movement.
5. Рабочий путь fresh Vercel preview.
6. Latest real Android smoke-test.
7. Final parity comparison against legacy.
8. Только после этого production migration.

---

# 25. Future history format

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

# Супер Макар — Development Plan

Последняя актуализация: **2026-08-14**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main` after PR #30 merge  
Hosting: **Vercel only**  
Testing preview: `engine-next-preview` branch; permanent Vercel project must be reconnected separately if needed.

Текущий стабильный architecture checkpoint: **0.12.0 СУПЕР МАКАР — FAMILY SURVIVAL**.  
Текущий активный visual checkpoint: **0.12.0 FAMILY — увеличенные фото-головы, Супермама/Суперпапа, монеты, магазин, zombie audio**.

Этот файл отражает только фактическую реализацию. Prototype/fallback не считается final implementation.

---

# 1. Product goal

Супер Макар — mobile-first browser 3D family action-survival против заражённых.

Обязательная формула:

- TOP survivor/action-RPG camera;
- third-person over-the-shoulder camera;
- одна simulation для обеих камер;
- pistol / shotgun / bow;
- Walker / Runner / Brute;
- waves + рост сложности;
- фото пользователя становится лицом героя;
- Android — основная mobile test platform;
- desktop support;
- authored атмосферная 3D-локация;
- Vercel production.

Главный hook: **«Твоё лицо — твой герой в survival shooter.»**

---

# 2. Canonical technology

После аудитов `ivanoskov/shooter`, `Unvanquished`, `redeclipse/base` и внешнего аудита текущего Facefall:

> **TypeScript strict + Vite + npm Three.js + glTF/GLB + manifest-driven level + Octree/Capsule + SpatialHash/local avoidance + NavigationQuery/Recast target + data-driven combat + event-driven simulation/presentation split + bounded FX/audio + local-first FaceSystem + mobile-first controls + GitHub Actions + Vercel.**

Reuse policy:

- permissive isolated code можно адаптировать с attribution;
- GPL game code напрямую не копируем;
- native/C++ ideas реализуем заново под browser/TypeScript;
- media license проверяется отдельно;
- если адаптация сложнее собственной реализации — пишем с нуля.

Уже адаптированы с attribution из MIT `ivanoskov/shooter`:

- Capsule/Octree collision response pattern;
- GLTF loader/traverse preparation pattern.

---

# 3. Current implemented gameplay

## Product flow

- [x] menu / loading / playing / paused / game-over / restart;
- [x] local photo choose/save/remove;
- [x] settings persistence;
- [x] TOP/3RD selection and runtime switching;
- [x] Vite/TypeScript production runtime;
- [x] bundled Three.js, no active runtime CDN dependency.

## Mobile TOP

- [x] survivor-style full auto-aim;
- [x] hero automatically rotates toward target;
- [x] movement joystick appears under first free gameplay touch;
- [x] joystick disappears on release;
- [x] FIRE remains manual;
- [x] automated touch smoke for joystick lifecycle.

## Mobile 3RD

- [x] reticle is allowed to move in X/Y under mobile aim-assist;
- [x] no vertical manual aiming;
- [x] horizontal swipe/yaw remains manual camera control;
- [x] auto-aim steers the visible reticle toward infected and firing uses the same NDC point;
- [x] raised/pulled-back camera validated as usable on Android;
- [x] camera collision.

## Combat 0.8.4

- [x] data-driven pistol / shotgun / bow definitions;
- [x] recoil;
- [x] movement-dependent accuracy loss;
- [x] pistol small random deviation;
- [x] shotgun multi-pellet spread;
- [x] ballistic bow foundation;
- [x] visible pistol/shotgun tracer layer;
- [x] exact impact-point blood/marker feedback;
- [x] head / torso / limb hit-zone foundation;
- [x] stagger / knock impulse;
- [x] ammo / reload / switch weapon;
- [x] health / death / kills / score.

Damage for pistol/shotgun intentionally remains hitscan for responsiveness; physical-looking tracers are presentation. Bow is actual ballistic projectile.

## Enemies / waves

- [x] Walker / Runner / Brute data archetypes;
- [x] low-poly humanoid infected visuals instead of capsules;
- [x] procedural gait prototype;
- [x] EnemyBrain intents: wander / investigate / chase / attack / hold / stagger;
- [x] SpatialHash;
- [x] LocalAvoidance;
- [x] temporary obstacle-aware NavigationQuery;
- [x] wave progression / active budget / spawn zones;
- [x] health/ammo pickups.

## Environment / presentation

- [x] procedural fallback world;
- [x] manifest markers;
- [x] grass / fog / rain;
- [x] storm flash / lightning / thunder;
- [x] bounded ParticlePool / DecalPool / LightPool;
- [x] Web Audio foundation;
- [x] combat feedback event pipeline.

---

# 4. 0.8.5 — Repository hygiene gate

**Status: essentially complete in active hardening PR.**

- [x] README rewritten for current TypeScript/Vite/mobile architecture;
- [x] package version moved to 0.8.5 development generation;
- [x] stale Vercel Three.js/GLTFLoader CDN rewrites removed;
- [x] stale `hero.glb -> threejs.org Soldier.glb` rewrite removed;
- [x] retired root `game.js` removed;
- [x] retired `game-safe.js` removed;
- [x] retired `game-safe2.js` removed;
- [x] retired `game-v050.js` removed;
- [x] retired `styles-safe.css` removed;
- [x] retired legacy root `index.html` removed;
- [x] old `/legacy/` deploy-copy path removed;
- [x] production deploy now promotes one bundled engine-next build to `/`;
- [x] rollback relies on Git history / previous Vercel deployments instead of carrying dead runtime generations in source;
- [ ] choose Facefall repository source license intentionally and add `LICENSE` only after explicit product decision;
- [x] package-lock root metadata version is kept aligned with package.json at checkpoints; dependency graph remains locked and `npm ci` passes.

External audit correction retained: the old Soldier URL was stale configuration, **not active production hero dependency**.

---

# 5. 0.8.6 — Unit-test baseline

**Status: implemented and CI-gated.**

No extra test framework dependency was necessary; tests use TypeScript + Node's built-in `node:test`.

Covered:

- [x] Health damage/heal/death/reset boundaries;
- [x] DamageSystem hit/kill semantics and lethal clamping;
- [x] WeaponSystem ammo / cooldown / reload / switch restrictions;
- [x] EnemyBrain state decisions;
- [x] WaveDirector intermission / spawn / active-budget / stop behavior;
- [x] SpatialHash insert/update/remove/query/cell bookkeeping;
- [x] LocalAvoidance no-neighbour and separation behavior;
- [x] GameStateController canonical lifecycle + illegal transition rejection.

Important finding from the tests:

- [x] `WeaponSystem` had a hidden dependency on global `AimController`;
- [x] dependency removed and replaced by optional injected player-aim resolver/fallback direction;
- [x] combat gameplay layer is now independently unit-testable.

CI canonical gate:

```text
npm ci
→ strict TypeScript
→ unit tests
→ Playwright Chromium smoke
→ mobile touch/visual smoke
→ Vite production build
→ deployment-root assertion
```

Future tests after new systems appear:

- [x] Character locomotion state transitions (pure idle/walk/run resolver);
- [ ] Recast adapter query contract;
- [ ] progression/upgrade logic;
- [ ] long-run session invariants where practical.

---

# 6. 0.8.7 — GameApp decomposition gate

**Status: major first pass complete.**

Before hardening, `GameApp.ts` was a confirmed ~32 KB God Object owning renderer, scene, collision, player mesh/collider/face, HUD, level loading, combat, enemies, waves, FX and lifecycle.

Extracted:

## `WorldRuntime`

- [x] renderer ownership;
- [x] scene ownership;
- [x] camera + CameraDirector;
- [x] static collision world;
- [x] procedural fallback environment;
- [x] grass / rain / storm lifecycle;
- [x] level manifest loading + fallback;
- [x] manifest light ownership;
- [x] resize/render/dispose.

## `PlayerRuntime`

- [x] player root transform;
- [x] PlayerCapsule ownership;
- [x] movement/facing;
- [x] muzzle transform;
- [x] FaceSystem ownership;
- [x] spawn/reset;
- [x] player visual resource cleanup.

## `GameHud`

- [x] HP / wave / kills / score presentation;
- [x] debug status text presentation;
- [x] last-event text;
- [x] game-over summary/show-hide;
- [x] gameplay state is read-only input to presenter.

## `GameApp` now

Still intentionally owns orchestration/order plus:

- construction/order of Weapon/Damage/Projectile systems while `CombatRuntime` owns combat event/hitscan coordination;
- EnemySystem/WaveDirector/Pickup coordination;
- aim coordination;
- `RunSession` owns session score/kills;
- top-level lifecycle/state transitions.

This is a substantial reduction in responsibility and creates clean insertion points for GLB hero/animation and authored world work.

Remaining decomposition, **do incrementally only when useful**:

- [x] extracted `CombatRuntime` for shot/reload/hit/kill coordination and hitscan resolution;
- [x] extracted `RunSession` for kill/score/reset accounting;
- [x] architecture decision: keep `EnemySystem` as the current cohesive enemy boundary; do **not** add `EnemyRuntime` until authored AI/nav creates real ownership pressure;
- [x] architecture decision: keep current FX/audio ownership; do **not** add `PresentationRuntime` until presentation lifecycle materially grows;
- [x] no service locator / DI framework introduced.

Hard rule: do not turn `GameApp` back into the home of CharacterModel, AnimationMixer or authored-level implementation.

---

# 7. Visual regression / screenshot gate

**New CI capability implemented.**

Playwright now automatically captures mobile-sized checkpoints:

- [x] `mobile-top.png` after gameplay start;
- [x] `mobile-third.png` after camera switch;
- [x] `mobile-face-front.png` with a synthetic uploaded face for head-bone inspection;
- [x] `mobile-pistol-fire-third.png` after real held touch FIRE;
- [x] `mobile-pistol-reload-front.png` during real touch reload state;
- [x] `mobile-production-weapons-third.png` validates lazy shotgun/bow GLB presentation + hero reaction states;
- [x] `mobile-production-infected-third.png` validates Walker/Runner/Brute production presentation and bone hit proxies;
- [x] screenshots uploaded as `facefall-visual-checkpoints` artifact;
- [x] assistant can download and inspect screenshots before merge.

Latest hardening screenshots reviewed manually:

- [x] TOP scene renders correctly;
- [x] 3RD scene renders correctly;
- [x] controls/HUD remain present;
- [x] no obvious camera/layout regression from GameApp extraction;
- [~] long build badge crowds TOP/3RD buttons on narrow mobile viewport — move to HUD cleanup, not architecture PR.

This is a smoke/visual checkpoint, not pixel-perfect snapshot testing.

---

# 8. Highest-impact remaining gap — Visual Vertical Slice

**This becomes the main product-development direction after hardening merge.**

Do not add broad mechanics before the screenshot stops looking like an engine prototype.

## 8.1 Hero production pipeline

- [x] choose/license production-direction humanoid GLB — Quaternius Universal Base Characters, CC0;
- [x] inspect skeleton/bones/scale/materials — 65-bone humanoid with `Head` / `hand_r`;
- [x] clone skinned meshes correctly with `SkeletonUtils`;
- [x] `CharacterModel` wrapper lives behind `PlayerRuntime`;
- [x] curved uploaded-face surface attached to the real `Head` bone;
- [x] production weapon socket foundation on animated `hand_r`;
- [x] LOD/initial-download budget: weapon GLBs lazy-load on first selection; infected share one cached GLB; far infected disable decorative wounds/dynamic shadows; byte budgets are unit-tested.

## 8.2 Hero animation

- [x] AnimationMixer;
- [x] idle;
- [x] walk;
- [x] run;
- [~] pistol aim foundation + [x] fire/reload one-shot animation overrides bound to actual combat events;
- [x] shotgun aim/fire/reload via upper-body skeletal combat overlay with authored-clip preference if a future library provides one;
- [x] bow draw/release skeletal overlay synchronized with string/arrow presentation;
- [x] hit reaction with authored-clip preference and procedural skeletal fallback;
- [x] death reaction with authored-clip preference and persistent procedural skeletal fallback;
- [x] locomotion state resolver + crossfades;
- [x] animation state unit tests where state logic is pure.

## 8.3 Weapons art

- [~] production-direction pistol visual at realistic ~21 cm scale; final GLB remains optional if materially better;
- [x] shotgun GLB generated from the production-direction weapon geometry and lazy-loaded on first shotgun selection;
- [x] bow + arrow GLB generated from the production-direction geometry; nocked GLB arrow remains connected to draw/release state;
- [x] animated right-hand position socket foundation;
- [x] muzzle anchor from active production weapon rather than approximate player offset.

## 8.4 Production infected

- [x] Walker production GLB presentation + native-bind locomotion/attack/stagger/death;
- [x] Runner uses the shared production zombie GLB with a narrower silhouette, forward lean, faster gait and distinct reactions — no duplicate binary payload;
- [x] Brute uses the shared production zombie GLB with larger mass/width/depth, slower heavy gait and distinct reactions — no duplicate binary payload;
- [x] body-part hit proxies are attached to real head/torso/arm/leg bones; visual skin raycast is disabled for gameplay;
- [x] one cached zombie GLB source is reused/cloned for every archetype/spawn instead of network-loading per spawn.

Exit criterion: hero and infected read as actual characters in both TOP and 3RD screenshots.

---

# 9. Authored level — Abandoned Outskirts

Current:

- [x] gameplay manifest exists;
- [x] procedural fallback world;
- [x] collision/navigation abstraction works.

Target:

- [ ] `level.glb`;
- [ ] wet road + dirt road;
- [ ] 2–3 buildings / garage;
- [ ] fences / gates;
- [ ] wrecked vehicle;
- [ ] lamps / utility poles;
- [ ] trees / bushes / grass clusters;
- [ ] props / debris / crates;
- [ ] mud / puddles / wet asphalt;
- [ ] collision-ready geometry;
- [ ] choke point + flank + retreat route;
- [ ] visual landmark;
- [ ] spawn zones outside immediate view.

`WorldRuntime` is now the intended integration boundary for this work.

---

# 10. Final navigation / AI

Current temporary path:

- [x] NavigationQuery abstraction;
- [x] CollisionNavigationQuery;
- [x] LocalAvoidance;
- [x] SpatialHash;
- [x] EnemyBrain state model.

After authored `level.glb`:

- [ ] offline Recast/Detour navmesh bake;
- [ ] browser-compatible runtime Recast query adapter;
- [ ] final LOS query;
- [ ] verified weapon/noise perception wiring;
- [ ] target stickiness/hysteresis where useful;
- [ ] AI/path update LOD;
- [ ] navigation debug overlay.

Do not generate navmesh at runtime on every phone unless profiling proves it acceptable and valuable.

---

# 11. Face System 2.0

Current:

- [x] local photo selection;
- [x] local persistence;
- [x] photo mapped to actual low-poly head front, not floating card;
- [x] production path maps the uploaded photo to a curved shell attached to the real `Head` bone;
- [x] visual smoke validates file input → production head.

Target after production head exists:

- [ ] crop UI;
- [ ] zoom/pan;
- [ ] oval/face mask;
- [ ] brightness/contrast normalization;
- [ ] automatic aspect/crop fitting;
- [ ] production-head UV integration;
- [ ] fallback head presets;
- [HOLD] local landmarks until production head is stable.

---

# 12. HUD / UX

Current functional layer:

- [x] HP/wave/kills/score;
- [x] fixed-center 3RD crosshair;
- [x] dynamic TOP joystick;
- [x] FIRE / reload / weapon / camera buttons;
- [x] menu/settings;
- [x] GameHud extracted from gameplay orchestration.

Pending:

- [ ] survivor-style final visual hierarchy;
- [ ] shorten/hide build badge during normal gameplay;
- [ ] remove/reduce giant debug status line outside `?debug=1`;
- [ ] safe-area polish;
- [ ] pause/settings during run;
- [ ] loading progress;
- [ ] clearer weapon/ammo presentation;
- [ ] target lock feedback only if it improves clarity.

---

# 13. Performance / engine-quality gate

Once real assets begin landing:

## Metrics

- [ ] `?debug=1` metrics overlay;
- [ ] FPS / frame time;
- [ ] draw calls / triangles;
- [ ] texture count/memory approximation;
- [ ] active enemies;
- [ ] FX pool occupancy;
- [ ] SpatialHash/nav stats.

## Mobile profile

- [ ] 30+ FPS target on real Android with real assets;
- [ ] 15-minute session;
- [ ] high-wave stress;
- [ ] restart leak test;
- [ ] GC spike audit;
- [ ] dynamic light/shadow budget;
- [ ] DPR tuning.

## Asset optimization

- [ ] GLB cleanup;
- [ ] Meshopt evaluation;
- [ ] KTX2/Basis evaluation;
- [ ] LOD;
- [ ] remove unused animation tracks/materials;
- [ ] lazy-load noncritical assets;
- [ ] initial-download budget.

---

# 14. QA

Automated now:

- [x] strict TypeScript;
- [x] unit-test suite;
- [x] desktop Chromium gameplay smoke;
- [x] mobile/touch smoke;
- [x] visual TOP/3RD screenshot artifact;
- [x] no fatal pageerror gate;
- [x] production bundle/root assertion.

Still required on real devices as content changes:

- [ ] photo upload with multiple aspect ratios;
- [ ] repeated game-over/restart;
- [ ] camera switch long session;
- [ ] weapon/reload stress;
- [ ] high wave stress;
- [ ] 15+ minute run;
- [ ] landscape orientation;
- [ ] slow/failed asset loading;
- [ ] lower-performance Android if available.

---

# 15. Replay / progression — later

Only after visual quality and performance are convincing:

- [x] score/wave foundation;
- [ ] best-score persistence;
- [ ] lightweight between-wave upgrade choice;
- [ ] simple local progression;
- [HOLD] complex inventory/RPG.

---

# 16. 1.0 MVP definition

Required:

- [ ] authored Abandoned Outskirts GLB;
- [ ] production hero;
- [ ] hero animation state machine;
- [ ] production pistol/shotgun/bow assets;
- [ ] production Walker/Runner/Brute assets + animations;
- [ ] Face System fitted to production head;
- [x] TOP mobile gameplay;
- [x] 3RD mobile gameplay;
- [x] three weapon foundations;
- [x] waves / HP / score / pickups / restart;
- [ ] final Recast navigation;
- [x] combat feedback/audio foundation;
- [x] reproducible CI/browser/mobile smoke;
- [x] unit-test baseline;
- [x] architecture boundaries ready for GLB integration;
- [ ] Android 30+ FPS with real assets;
- [ ] final HUD;
- [ ] release QA/docs;
- [ ] intentional source-license decision.

Not MVP:

- multiplayer;
- dedicated server;
- MMO backend;
- native engine rewrite;
- full rigid-body destruction sandbox.

---

# 17. Official next development order

After the 0.9.1 pistol-animation merge:

1. **Shotgun production visual/socket + fire/reload animation**.
2. Bow production visual/socket + draw/release animation.
3. Replace Walker with the first production infected asset, then Runner/Brute.
4. Return to Face System crop/fitting polish after the core weapon silhouettes are production-ready.
6. Build first authored `Abandoned Outskirts level.glb` through `WorldRuntime`.
7. Bake/integrate final Recast navmesh.
8. Upgrade Face System for the production head.
9. Redesign HUD and move debug information behind debug mode.
10. Profile Android, optimize assets, then progression/special infected.

**Do not return to broad feature expansion before the visual vertical slice is credible.**

---

# 18. Documentation rule

After every major block:

- update completed/partial/pending status;
- distinguish prototype from final implementation;
- record CI and real-device evidence separately;
- update `history.md` at checkpoints;
- update `structure.md` whenever ownership/file boundaries change;
- inspect CI screenshots on important visual/architecture changes;
- never claim Vercel/device verification without actual evidence.


## 0.11.0 Abandoned Outskirts

- [x] authored `level.glb` loaded by `WorldRuntime`;
- [x] road / gate / garage / house / abandoned car / trees / puddles / warehouse composition;
- [x] collision built from authored structural meshes, decorative meshes excluded;
- [x] manifest remains source of spawn / loot / light markers;
- [x] procedural world retained only as load-failure fallback;
- [x] mobile authored-level screenshot gate.

Next: offline Recast navigation over the authored level, then realistic art replacement / Face System 2.0 / final HUD.

---

## 0.12.0 — «Супер Макар» family survival checkpoint (2026-08-14)

- Игра переименована в **«Супер Макар»**.
- Три независимых локальных фото: Супер Макар, Супермама, Суперпапа.
- Фото персонажа отображается на увеличенной голове спереди и сзади для быстрой идентификации в TOP/3RD.
- Супермама присоединяется после завершения 3-й волны (активна с wave 4), Суперпапа — после завершения 6-й (активен с wave 7).
- Союзники следуют за Макаром, автоматически выбирают заражённых и ведут огонь.
- Супермама получила отдельный процедурный силуэт/причёску; Суперпапа — отличимый масштаб корпуса. Новых внешних character assets для этого не добавлено.
- Сложность масштабируется по номеру волны и количеству активных героев.
- Добавлены zombie groan / pain / death WebAudio-эффекты.
- За убийства выпадают монеты; монеты подбираются игроком. Награда: walker 2, runner 3, brute 5.
- Магазин оружия: дробовик 20 монет, лук 30; до покупки оружие заблокировано.
- Добавлены `FamilyCompanionSystem`, `CoinSystem`, семейный HUD/menu и regression coverage.
- Семейный Playwright smoke загружает три разные тестовые фотографии, проверяет unlock/markers/shop и создаёт `mobile-super-makar-family.png`.
- Финальный релизный gate: TypeScript strict, unit tests, Playwright browser/visual smoke, deploy build и sole deployment-root assertion.
- Canonical source после merge: `main`. Продолжение разработки планируется отдельным этапом/перепиской.


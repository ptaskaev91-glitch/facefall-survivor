# Facefall Survivor — Development Plan

Последняя актуализация: **2026-08-12**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`  
Hosting: **Vercel only**  
Primary URL: `https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

Текущий production milestone: **0.8.2 MOBILE AUTO-AIM**.  
Текущий рабочий checkpoint: **0.8.4 COMBAT + HUMANOID INFECTED** (`main`).
Production deploy 0.8.4: **pending confirmation**.

Этот файл отражает только фактически реализованное состояние. Prototype/fallback не считается final implementation.

---

# 1. Product goal

Facefall Survivor — mobile-first browser 3D action-survival против заражённых.

Обязательная формула:

- TOP survivor/action-RPG камера;
- third-person over-the-shoulder камера;
- одна simulation для обеих камер;
- pistol / shotgun / bow;
- Walker / Runner / Brute;
- waves + рост сложности;
- фото пользователя становится лицом героя;
- Android — главная реальная mobile test platform;
- desktop support;
- атмосферная authored 3D-локация;
- Vercel production.

Главный hook:

> **Твоё лицо — твой герой в survival shooter.**

---

# 2. Technology decision

Итог после аудитов `ivanoskov/shooter`, `Unvanquished`, `redeclipse/base`:

> **TypeScript + Vite + npm Three.js + glTF/GLB + manifest-driven level + Octree/Capsule + SpatialHash/local avoidance + NavigationQuery/Recast target + data-driven combat + event-driven presentation + pooled FX/audio + local-first FaceSystem + mobile-first controls + GitHub Actions + Vercel.**

Reuse policy:

- permissive isolated code можно адаптировать с attribution;
- GPL game code напрямую не копируем;
- C++/native engine ideas переписываем под browser/TypeScript;
- media licenses проверяем отдельно;
- если адаптация сложнее чистой реализации — пишем с нуля.

Уже адаптированы с attribution из MIT `ivanoskov/shooter`:

- Capsule/Octree collision response pattern;
- GLTF loader/traverse preparation pattern.

---

# 3. Status legend

- `[x]` — implemented and present in source;
- `[?]` — implemented, needs more real-device validation;
- `[~]` — partial/prototype/fallback;
- `[ ]` — pending;
- `[HOLD]` — intentionally later.

---

# 4. Audit checkpoint — 2026-08-12

## What is already real

- [x] engine-next is production root on Vercel;
- [x] TypeScript/Vite/npm Three.js runtime;
- [x] package lock + `npm ci`;
- [x] automated Chromium gameplay smoke;
- [x] automated mobile touch smoke;
- [x] fixed-timestep GameLoop;
- [x] GameState lifecycle;
- [x] menu / loading / playing / game over / restart;
- [x] local photo choose/save/remove;
- [x] low-poly human player visual;
- [x] uploaded photo is material on actual head face, not floating plane;
- [x] TOP survivor-style full auto-aim;
- [x] TOP dynamic joystick appears under first gameplay touch;
- [x] TOP hero automatically turns toward selected infected;
- [x] 3RD fixed-center crosshair;
- [x] 3RD horizontal-only manual yaw;
- [x] 3RD horizontal auto-aim steering;
- [x] camera collision;
- [x] pistol / shotgun / ballistic bow foundations;
- [x] recoil / spread / stagger / knock impulse;
- [x] movement-dependent accuracy loss;
- [x] visible bullet/pellet tracer layer for pistol/shotgun;
- [x] exact hit-point impact feedback on infected;
- [x] primitive/per-mesh hit zones;
- [x] player HP / enemy melee damage / death;
- [x] Walker / Runner / Brute runtime archetypes;
- [x] low-poly humanoid infected visuals replace capsule markers in 0.8.4;
- [x] simple procedural infected gait;
- [x] EnemyBrain state boundary;
- [x] wander / investigate / chase / attack / stagger;
- [x] SpatialHash + LocalAvoidance;
- [x] obstacle-aware temporary navigation query;
- [x] waves / score / kills / pickups;
- [x] fog / grass / rain / storm flash / lightning / thunder;
- [x] pooled particles / decals / transient lights;
- [x] procedural Web Audio foundation;
- [x] real Android testing has reached playable 0.8.x builds.

## Largest remaining gaps

1. **Visual content is still prototype quality.** No production hero/infected/weapon GLBs and no authored environment GLB.
2. **No animation pipeline in active production runtime.** Player/enemies remain procedural visuals; infected gait is temporary.
3. **No final Recast navmesh.** Current obstacle-aware query is a temporary procedural-map solution.
4. **Face fitting is functional but primitive.** Photo is mapped to a box-head face; crop/alignment/blending are absent.
5. **`GameApp.ts` is a confirmed God Object (~32 KB source).** It owns lifecycle, rendering, world, input, combat event wiring, player update, enemy/wave integration, HUD/status, level manifest, camera coordination and FX orchestration. Decomposition is now a prerequisite for major GLB/animation integration.
6. **HUD is developer-oriented.** Debug status is still prominent and final survivor-style UX is absent.
7. **No focused unit test suite** for Weapon/Damage/AI/Wave pure simulation.
8. **Performance is not measured systematically.** No Metrics overlay, draw-call/texture/GC profile or long-run stress baseline.
9. **Repository hygiene is stale:** README says 0.4, package version says `0.5.0-alpha.2`, no project `LICENSE`, and several legacy files/config rewrites remain.
10. **Legacy compatibility remains** under `/legacy/`; additionally `game.js`, `game-safe.js`, `game-safe2.js` are not part of the current deploy rollback path and are candidates for removal after a quick reference check.

---

# 4A. External repository audit reconciliation — 2026-08-12

The external audit was checked against current `main`, not accepted blindly.

## Confirmed and adopted

- [x] `GameApp.ts` size/ownership problem confirmed (~31,998 bytes in current audited tree).
- [x] no unit-test suite found; current automated coverage is browser smoke/E2E oriented.
- [x] README is stale and describes 0.4 instead of current 0.8.x architecture.
- [x] package version is stale (`0.5.0-alpha.2`).
- [x] no project `LICENSE` exists in the repository.
- [x] four old monolithic runtime files exist in repository root: `game.js`, `game-safe.js`, `game-safe2.js`, `game-v050.js`.
- [x] current rollback deploy only intentionally copies `game-v050.js` together with legacy `index.html`/CSS; the other three old runtimes are not needed by `scripts/copy-legacy.mjs`.
- [x] `vercel.json` still contains old CDN/Three examples rewrites that belong to the pre-bundled/legacy generation and should not remain in the final Vite production configuration.
- [x] `ATTRIBUTION.md` currently says no production-quality external assets are registered.

## Correction to external audit

The claim that current production hero is `threejs.org/examples/models/gltf/Soldier.glb` is **not accurate for active engine-next**. The URL still exists as a stale `vercel.json` rewrite from the legacy/prototype pipeline, but current engine-next player is procedural/low-poly and does not load `/assets/models/hero.glb`.

Action is still required, but it is classified as **stale deploy configuration / asset-attribution hygiene**, not as an active production hero availability dependency.

## Priority decision

Architecture hardening moves **before heavy visual asset integration**:

1. repository hygiene pass;
2. focused unit-test baseline;
3. `GameApp` decomposition;
4. then production GLB hero/animation/infected/level integration.

Reason: adding AnimationMixer, CharacterModel, real weapons and authored world-loading directly into the current God Object would make the next refactor materially riskier.

Linting is useful but **not a blocking P0**. Strict TypeScript + browser CI already provide meaningful correctness gates. Add ESLint only after tests/decomposition unless an immediate style/bug rule is specifically needed.

---

# 5. D0 — Documentation / architecture

**COMPLETE, ongoing maintenance required**

- [x] three external architecture audits;
- [x] target stack;
- [x] `structure.md`;
- [x] `history.md`;
- [x] licensing policy;
- [x] reuse policy;
- [x] roadmap;
- [x] 2026-08-12 implementation audit;
- [x] reconcile external codebase audit into roadmap;
- [ ] refresh README/build number in hygiene pass;
- [ ] refresh stale aiming/camera descriptions in `structure.md`;
- [ ] record 0.8.4 checkpoint in `history.md` at next documentation sync.

---

# 6. 0.5A — Engine Foundation

**COMPLETE ENOUGH — do not expand foundation without gameplay need**

## Build / CI

- [x] npm;
- [x] Three.js package dependency;
- [x] strict TypeScript;
- [x] Vite;
- [x] package-lock;
- [x] `npm ci` CI;
- [x] Playwright Chromium smoke;
- [x] mobile touch smoke;
- [x] production deploy artifact;
- [x] deployment-root assertion;
- [ ] focused unit tests;
- [HOLD] ESLint/configured lint gate until architecture/test baseline is in place.

## Core

- [x] one fixed-timestep GameLoop;
- [x] typed EventBus;
- [x] GameStateController;
- [x] GameApp lifecycle;
- [x] resilient Bootstrap;
- [x] cleanup/dispose foundation;
- [ ] decompose GameApp before production GLB/animation integration.

## Physics / spatial

- [x] Octree CollisionWorld;
- [x] PlayerCapsule;
- [x] raycast / segmentCast;
- [x] SpatialHash;
- [x] LocalAvoidance;
- [~] wall sliding;
- [ ] explicit slope/step policy only if authored level needs it.

---

# 6A. 0.8.5 — Repository hygiene gate

**NEW — small, high-confidence cleanup before architectural refactor**

- [ ] update README to current 0.8.x TypeScript/Vite/mobile architecture;
- [ ] update package version to current development generation;
- [ ] decide project source license intentionally and add `LICENSE` (do not guess a license automatically);
- [ ] remove `game.js`, `game-safe.js`, `game-safe2.js` after confirming no documentation/tooling references depend on them;
- [ ] keep `game-v050.js` only while `/legacy/` rollback is intentionally supported;
- [ ] remove stale `/vendor/three.js` and `/vendor/GLTFLoader.js` Vercel rewrites from final engine-next deploy config;
- [ ] remove stale `/assets/models/hero.glb -> threejs.org Soldier.glb` rewrite, or explicitly document it as prototype-only until removed;
- [ ] ensure every externally shipped model/media asset, including temporary prototype assets if still reachable in production, is represented in attribution/notices;
- [ ] refresh `structure.md` and `history.md` for current 0.8.4 state.

Exit criteria:

- active production path has no unnecessary external model/CDN dependency;
- root contains only intentionally retained runtime generations;
- README/version/legal metadata no longer contradict the code.

---

# 6B. 0.8.6 — Unit-test baseline

**NEW — before GameApp refactor**

Use Vitest or an equally lightweight Vite-native runner.

First targets:

- [ ] `Health` heal/damage/death boundaries;
- [ ] `DamageSystem` emits hit/kill exactly once and preserves hit metadata;
- [ ] `WeaponSystem` ammo/cooldown/reload/switch state transitions;
- [ ] pistol/shotgun weapon definitions and spread invariants;
- [ ] `EnemyBrain` state decisions: wander/investigate/chase/attack/stagger;
- [ ] `WaveDirector` progression/spawn budget;
- [ ] `SpatialHash` insert/update/remove/query;
- [ ] `LocalAvoidance` basic separation invariants;
- [ ] `GameStateController` legal transitions.

CI target:

```text
npm ci
→ typecheck
→ unit tests
→ desktop Chromium smoke
→ mobile touch smoke
→ production build
```

Do not try to unit-test Three.js rendering pixels in this stage.

---

# 6C. 0.8.7 — GameApp decomposition gate

**NEW P0 — complete before heavy production asset/animation integration**

Target: `GameApp` becomes a thin composition root/orchestrator, not owner of gameplay implementation.

Extract in small, behavior-preserving PRs:

- [ ] `RunSession` — score/kills/reset/game-over/wave session state;
- [ ] `PlayerRuntime` / `PlayerController` — movement, facing, muzzle transform, player health;
- [ ] `CombatRuntime` — shot resolution, hitscan/pellet loop, damage/hit feedback wiring;
- [ ] `EnemyRuntime` — enemy update/wave spawn/perception wiring;
- [ ] `WorldRuntime` — level manifest, lights, procedural fallback, collision/world lifecycle;
- [ ] `PresentationRuntime` — FX/tracers/projectiles/rain/storm presentation updates;
- [ ] `HudPresenter` — HUD/status/debug text updates;
- [ ] explicit lifecycle/dispose ownership for each subsystem;
- [ ] reduce `GameApp` to composition + state transitions + fixed-update ordering.

Rules:

- preserve fixed timestep and EventBus contracts;
- no visual redesign in same commits as extraction;
- unit tests added in 0.8.6 must stay green through every extraction;
- browser smoke remains mandatory;
- do not introduce a DI framework/service locator.

Exit target:

- `GameApp` is substantially smaller and its fields primarily reference orchestrators, not low-level systems;
- adding CharacterModel/AnimationMixer does not require editing unrelated combat/world/HUD code.

---

# 7. 0.5B — Functional Parity / Product Flow

**REACHED AND SUPERSEDED BY 0.8.x**

- [x] start menu;
- [x] photo choose/preview/remove;
- [x] local face persistence;
- [x] camera selection;
- [x] settings persistence;
- [x] start/loading/error feedback;
- [x] game over;
- [x] restart without reload;
- [x] pistol;
- [x] shotgun;
- [x] bow projectile;
- [x] reload;
- [x] switch weapon;
- [x] player health/damage;
- [x] three enemy archetypes;
- [x] WaveDirector;
- [x] score/kills;
- [x] health/ammo pickups;
- [x] manifest-driven spawn/loot/light metadata;
- [x] atmosphere foundation;
- [x] Android boot/play validation.

---

# 8. Production migration

**COMPLETE FOR TEST RELEASE**

- [x] engine-next is compiled production root `/`;
- [x] Three.js bundled by Vite;
- [x] previous legacy runtime retained under `/legacy/`;
- [x] primary Vercel deployment completed for tested 0.8.x generation;
- [x] real Android test completed on production URL;
- [?] deploy/confirm current 0.8.4 main checkpoint;
- [ ] remove `/legacy/` compatibility after visual/content build proves stable.

---

# 9. Mobile controls — current canonical model

This replaces all older floating-reticle descriptions.

## TOP

- [x] no manual aiming gesture;
- [x] invisible/internal aim point driven by auto-target selection;
- [x] full survivor-style auto-aim on mobile;
- [x] hero automatically turns toward selected target;
- [x] very faint laser can remain only as direction feedback;
- [x] movement joystick appears wherever first free gameplay touch starts;
- [x] joystick disappears on release;
- [x] FIRE remains manual;
- [x] dedicated mobile smoke checks floating joystick lifecycle.

## 3RD

- [x] crosshair permanently fixed at exact screen center;
- [x] no vertical manual aiming;
- [x] manual swipe rotates yaw only;
- [x] auto-aim rotates yaw toward target in central sector;
- [x] 0.8.4 strengthens fixed-center target steering;
- [x] FIRE remains manual;
- [x] camera collision retained;
- [x] camera height/distance framing raised after Android testing;
- [?] verify 0.8.4 auto-aim + combat readability on real Android.

Future mobile tuning:

- [ ] target stickiness / hysteresis to reduce rapid target switching;
- [ ] priority weighting by distance + threat + screen position;
- [ ] optional auto-fire mode only if later deliberately chosen as product mechanic;
- [ ] contextual button layout/HUD redesign.

---

# 10. 0.6 — Visual Vertical Slice

**HIGHEST VISUAL IMPACT, BUT HEAVY INTEGRATION STARTS AFTER 0.8.5–0.8.7 HARDENING**

Do not add lots of new mechanics before this stage becomes visually credible.

Asset sourcing/concept work may proceed in parallel with architecture hardening. Runtime integration of production hero/animation/world should begin after the GameApp boundary is safer.

## Hero

Current:

- [x] functional low-poly procedural human;
- [x] torso/legs/arms/head/weapon silhouette;
- [x] photo mapped onto actual head front material.

Target:

- [ ] production-direction humanoid GLB;
- [ ] skeleton;
- [ ] outfit;
- [ ] face-compatible UV/head;
- [ ] weapon sockets;
- [ ] LOD.

## Hero animation

- [ ] idle;
- [ ] walk;
- [ ] run;
- [ ] pistol aim/fire/reload;
- [ ] shotgun aim/fire/reload;
- [ ] bow draw/release;
- [ ] hit;
- [ ] death;
- [ ] AnimationMixer state machine and crossfades.

## Weapons

- [ ] pistol GLB;
- [ ] shotgun GLB;
- [ ] bow/arrow GLB;
- [ ] correct hand attachment.

## Infected

Current:

- [x] Walker/Runner/Brute gameplay archetypes;
- [x] 0.8.4 low-poly humanoid infected with readable head/torso/limbs;
- [x] Walker/Runner/Brute have distinct procedural silhouettes;
- [x] simple procedural gait;
- [x] per-mesh hit-zone metadata foundation.

Target:

- [ ] Walker GLB;
- [ ] Runner GLB;
- [ ] Brute GLB;
- [ ] final visually distinct silhouettes;
- [ ] locomotion/attack/stagger/death animations.

## Abandoned Outskirts

Current:

- [x] manifest exists;
- [x] procedural test world exists;
- [x] collision/navigation prototype works on current world.

Target:

- [ ] authored `level.glb`;
- [ ] road + dirt road;
- [ ] 2–3 buildings / garage;
- [ ] fences / gates;
- [ ] wrecked vehicle;
- [ ] lamps / utility poles;
- [ ] trees / bushes / grass clusters;
- [ ] props / debris / crates;
- [ ] mud / puddles / wet asphalt;
- [ ] authored collision geometry;
- [ ] gameplay spawn/choke/flank composition.

**Exit:** a screenshot must look like an actual mobile survivor/shooter, not an engine lab.

---

# 11. 0.7 — Navigation / Enemy AI

**PRACTICAL PROTOTYPE COMPLETE; FINAL AUTHORED-MAP NAVIGATION PENDING**

Completed:

- [x] SpatialHash;
- [x] LocalAvoidance;
- [x] EnemyBrain;
- [x] State Tree intent model;
- [x] NavigationQuery abstraction;
- [x] direct fallback;
- [x] CollisionNavigationQuery;
- [x] wander;
- [x] investigate;
- [x] chase;
- [x] attack/hold;
- [x] stagger;
- [x] last-known target / alert timer;
- [x] `hearNoise()` API.

Partial:

- [~] sight = range + current LOS plumbing rather than mature perception;
- [~] death = hide/remove rather than animation/corpse lifecycle;
- [~] sound perception API exists but weapon-shot wiring is not verified as active.

Final target after `level.glb`:

- [ ] bake offline Recast/Detour navmesh;
- [ ] runtime Recast NavigationQuery adapter;
- [ ] final static-world LOS query;
- [ ] verified shot/noise propagation;
- [ ] AI update LOD / path-query throttling;
- [ ] navigation debug overlay.

Do not add Recast WASM before authored map geometry exists unless required by a deliberate spike.

---

# 12. 0.75 — Waves / encounters

- [x] spawn zones;
- [x] wave progression;
- [x] active-enemy budget;
- [x] basic composition rules;
- [x] inter-wave timing foundation;
- [x] pickups;
- [~] difficulty curve;
- [ ] richer encounter events;
- [ ] special infected after core visual quality improves.

---

# 13. 0.8 — Combat Feel / Audio / Mobile Aim

**FUNCTIONAL COMBAT RELEASE; 0.8.4 ADDS READABILITY PASS**

## Combat

- [x] data-driven weapon definitions;
- [x] recoil profiles;
- [x] movement-dependent spread;
- [x] camera recoil;
- [x] pistol/shotgun differentiation;
- [x] ballistic bow foundation;
- [x] head/torso/limb hit zones foundation;
- [x] damage multipliers;
- [x] stagger resistance;
- [x] knock impulse;
- [x] particles/decals/transient lights;
- [x] reload gameplay event;
- [x] 0.8.4 pistol small natural deviation;
- [x] 0.8.4 shotgun independent pellet spread;
- [x] 0.8.4 visible physical tracer layer for pistol/shotgun;
- [x] 0.8.4 exact impact-point wound/flash feedback per successful hit;
- [x] damage remains hitscan for pistol/shotgun responsiveness; tracer is presentation, not delayed simulation;
- [ ] bow hold/draw/release state;
- [ ] reload/switch interrupt polish;
- [ ] animation reactions after real GLBs;
- [ ] controlled hit-stop only after profiling.

## Audio / atmosphere

- [x] procedural weapon sounds;
- [x] hit/kill cues;
- [x] reload cues;
- [x] footsteps;
- [~] infected vocal/attack layer;
- [x] rain;
- [x] wind;
- [x] thunder;
- [x] storm flash;
- [ ] authored audio asset pass later if needed.

## Mobile aim

- [x] 0.8 soft assist prototype completed historically;
- [x] replaced in 0.8.2 with survivor-style TOP full auto-aim;
- [x] replaced in 0.8.2 with fixed-center horizontal 3RD auto-aim;
- [x] 0.8.4 increases 3RD horizontal auto-aim pull;
- [x] no auto-fire;
- [?] 0.8.4 real-device combat readability confirmation.

---

# 14. 0.82 — Environment Reactivity

Do after authored environment foundation:

- [ ] visible vegetation WindField integration;
- [ ] shotgun/explosion local wind impulse;
- [ ] better decal orientation;
- [ ] wet-surface response;
- [ ] optional destructible light;
- [ ] optional explosive barrel.

No full rigid-body sandbox.

---

# 15. 0.85 — Face System 2.0

Current:

- [x] photo choose/remove;
- [x] local persistence;
- [x] photo no longer floats as a card;
- [x] photo is mapped to actual low-poly head front.

Pending:

- [ ] crop UI;
- [ ] zoom/pan;
- [ ] oval/face mask;
- [ ] brightness/contrast normalization;
- [ ] automatic aspect/crop fitting;
- [ ] production-head UV integration;
- [ ] fallback head variants;
- [HOLD] local face landmarks until production head is stable.

---

# 16. 0.87 — HUD / UX

Current:

- [x] HP/wave/kills/score;
- [x] fixed-center 3RD crosshair;
- [x] dynamic TOP joystick;
- [x] FIRE / reload / weapon / camera buttons;
- [x] menu/settings;
- [~] functional mobile HUD.

Pending:

- [ ] survivor-style final visual hierarchy;
- [ ] reduce top build badge in normal play;
- [ ] remove/reduce large debug status line;
- [ ] safe-area polish across Android devices;
- [ ] pause/settings during run;
- [ ] loading progress;
- [ ] clearer ammo/weapon representation;
- [ ] target-lock feedback only if it improves clarity without clutter.

---

# 17. 0.9 — Performance / Architecture Hardening

**ARCHITECTURE PART MOVED EARLIER TO 0.8.5–0.8.7; 0.9 REMAINS PERFORMANCE/ASSET HARDENING**

Architecture carry-over:

- [ ] verify no new God Object forms after decomposition;
- [ ] evaluate linting after refactor; add ESLint only for rules that provide real signal;
- [ ] continue unit tests for newly extracted pure systems.

## Metrics

- [ ] FPS/frame-time overlay under `?debug=1`;
- [ ] draw calls;
- [ ] triangles;
- [ ] texture count/memory approximation;
- [ ] active enemies;
- [ ] FX pool occupancy;
- [ ] SpatialHash/nav stats.

## Mobile profiling

- [ ] stable 30+ FPS target with real assets;
- [ ] 15-minute session;
- [ ] high-wave stress;
- [ ] restart leak test;
- [ ] GC spike audit;
- [ ] dynamic-light/shadow budget;
- [ ] DPR quality tuning.

## Asset optimization after real assets land

- [ ] GLB cleanup;
- [ ] KTX2/Basis evaluation;
- [ ] Meshopt evaluation;
- [ ] LOD;
- [ ] remove unused animation tracks/materials;
- [ ] lazy-load noncritical assets;
- [ ] initial-download budget.

---

# 18. 0.92 — QA

Automated:

- [x] desktop Chromium menu/run/camera smoke;
- [x] mobile touch/dynamic joystick smoke;
- [x] no fatal pageerror gate;
- [x] production bundle/root assertion.

Real-device already validated:

- [x] production build opens on Android;
- [x] TOP gameplay playable;
- [x] 3RD gameplay playable;
- [x] mobile auto-aim tested;
- [x] dynamic joystick tested;
- [x] camera switching tested;
- [x] 0.8.3 higher 3RD camera framing accepted by user.

Still required:

- [ ] 0.8.4 tracer/pellet/hit readability on Android;
- [ ] 0.8.4 humanoid infected readability/performance;
- [ ] photo upload with several aspect ratios;
- [ ] repeated game over/restart;
- [ ] repeated camera switching long session;
- [ ] weapon switch/reload stress;
- [ ] high wave enemy stress;
- [ ] 15+ minute session;
- [ ] landscape orientation;
- [ ] slow/failed asset loading;
- [ ] lower-performance Android device if available.

---

# 19. 0.95 — Replay loop

Only after visual/content quality and performance are convincing.

- [x] score foundation;
- [x] waves/run stats;
- [ ] best-score persistence;
- [ ] lightweight between-wave upgrade choice;
- [ ] simple local progression.

Do not build complex inventory/RPG yet.

---

# 20. 1.0 MVP definition

Required:

- [ ] authored Abandoned Outskirts GLB;
- [ ] production hero asset;
- [ ] production infected assets;
- [ ] production weapon assets;
- [ ] animation state machine;
- [ ] Face System fitted to production head;
- [x] two camera gameplay modes;
- [x] survivor-style TOP mobile control;
- [x] fixed-center 3RD mobile control;
- [x] three weapon foundations;
- [x] three infected archetype foundations;
- [ ] final Recast navmesh;
- [x] waves;
- [x] combat feedback/audio foundation;
- [x] mobile menu/settings;
- [x] game over/restart;
- [x] quality profile foundation;
- [x] reproducible CI/browser smoke;
- [ ] focused unit-test baseline;
- [ ] Android 30+ FPS with real assets;
- [ ] final HUD;
- [ ] release QA/docs;
- [ ] intentional project license decision + repository legal metadata.

Not MVP:

- multiplayer;
- dedicated server;
- MMO backend;
- native engine rewrite;
- full destruction sandbox.

---

# 21. Technical debt priority after internal + external audits

## P0 — before heavy visual/runtime integration

1. [ ] finish 0.8.4 production deploy/Android confirmation;
2. [ ] repository hygiene gate 0.8.5;
3. [ ] unit-test baseline 0.8.6;
4. [ ] decompose `GameApp` 0.8.7;
5. [ ] keep gameplay behavior unchanged while hardening boundaries.

## P1 — visual/product quality

1. [ ] production hero + animation;
2. [ ] production weapon GLBs + sockets;
3. [ ] infected GLBs + animation;
4. [ ] authored level GLB;
5. [ ] FaceSystem 2.0 fitting/crop;
6. [ ] HUD cleanup.

## P2 — final engine/content integration

1. [ ] Recast navmesh for authored map;
2. [ ] performance metrics/profiling;
3. [ ] KTX2/Meshopt/LOD pipeline;
4. [ ] richer audio/environment polish;
5. [ ] remove remaining legacy runtime after rollback window ends.

## Repository hygiene debt

- [ ] README build information is stale (`0.4`);
- [ ] package version is stale (`0.5.0-alpha.2`);
- [ ] no project `LICENSE`;
- [ ] `game.js`, `game-safe.js`, `game-safe2.js` are legacy root files not used by current rollback copy script;
- [ ] `game-v050.js` retained intentionally only for `/legacy/`;
- [ ] stale Vercel CDN/Three example rewrites remain;
- [ ] prototype asset reachability/attribution must be explicit;
- [ ] `structure.md` needs current 0.8.x control/architecture refresh;
- [ ] `history.md` must record 0.8.4 checkpoint.

---

# 22. Official next development order

Current order after external audit reconciliation:

1. **0.8.4 release confirmation:** deploy/verify current `main` on Android.
2. **0.8.5 Repo hygiene:** README/version, deliberate LICENSE decision, remove dead legacy files, remove stale Vercel rewrites/third-party prototype route.
3. **0.8.6 Unit tests:** establish Vitest baseline around Health/Damage/Weapon/EnemyBrain/Wave/SpatialHash/GameState.
4. **0.8.7 GameApp decomposition:** extract session/player/combat/enemy/world/presentation/HUD orchestration in behavior-preserving PRs.
5. **Visual Vertical Slice / Character:** production licensed humanoid GLB + AnimationMixer.
6. Attach production weapons and prove idle/walk/run/aim/fire/reload transitions.
7. Replace temporary low-poly infected with production Walker/Runner/Brute GLBs and animations.
8. Build authored `Abandoned Outskirts level.glb`.
9. Add offline Recast navmesh for authored geometry.
10. Upgrade FaceSystem for production head UV/crop/alignment.
11. Redesign mobile HUD.
12. Profile Android with real assets and enforce 30+ FPS budgets.
13. Only then add progression/special infected/environment interactions.

**Asset discovery/model preparation can happen in parallel with 0.8.5–0.8.7, but heavy runtime integration waits until the architecture boundary is safer.**

**Do not return to broad feature expansion before the game visually stops looking like an engine prototype.**

---

# 23. Documentation rule

After every major development session:

- update actual completed statuses;
- distinguish prototype from final implementation;
- record CI/device status;
- update `history.md` at major checkpoints;
- update `structure.md` whenever architecture/control boundaries change;
- never mark Vercel/device verification complete without actual evidence.

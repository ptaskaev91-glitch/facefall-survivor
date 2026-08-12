# Facefall Survivor — Development Plan

Последняя актуализация: **2026-08-12**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`  
Hosting: **Vercel only**  
Primary URL: `https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

Текущий production milestone: **0.8.2 MOBILE AUTO-AIM**.  
Текущий рабочий checkpoint: **0.8.3 CAMERA + AUDIT**.

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
- [x] primitive hit zones;
- [x] player HP / enemy melee damage / death;
- [x] Walker / Runner / Brute runtime archetypes;
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
2. **No animation pipeline in active production runtime.** Player/enemies remain mostly procedural/static shapes.
3. **No final Recast navmesh.** Current obstacle-aware query is a temporary procedural-map solution.
4. **Face fitting is functional but primitive.** Photo is mapped to a box-head face; crop/alignment/blending are absent.
5. **`GameApp.ts` is too large (~32 KB source) and owns too much integration wiring.** Must be decomposed before adding much more gameplay.
6. **HUD is developer-oriented.** Debug status is still prominent and final survivor-style UX is absent.
7. **No focused unit test suite** for Weapon/Damage/AI/Wave pure simulation.
8. **Performance is not measured systematically.** No Metrics overlay, draw-call/texture/GC profile or long-run stress baseline.
9. **Documentation metadata is stale outside this file.** README still says 0.4; package version still says `0.5.0-alpha.2`; parts of `structure.md` still describe the older floating-reticle model.
10. **Legacy compatibility remains** under `/legacy/` and should be removed only after the new build is clearly stable.

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
- [ ] refresh README/build number before 0.9 release;
- [ ] refresh stale aiming/camera descriptions in `structure.md`.

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
- [ ] focused unit tests.

## Core

- [x] one fixed-timestep GameLoop;
- [x] typed EventBus;
- [x] GameStateController;
- [x] GameApp lifecycle;
- [x] resilient Bootstrap;
- [x] cleanup/dispose foundation;
- [ ] decompose GameApp before major new gameplay systems.

## Physics / spatial

- [x] Octree CollisionWorld;
- [x] PlayerCapsule;
- [x] raycast / segmentCast;
- [x] SpatialHash;
- [x] LocalAvoidance;
- [~] wall sliding;
- [ ] explicit slope/step policy only if authored level needs it.

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
- [x] primary Vercel deployment completed;
- [x] real Android test completed on production URL;
- [ ] remove legacy compatibility after visual/content build proves stable.

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
- [x] FIRE remains manual;
- [x] camera collision retained;
- [x] 0.8.2 camera raised/pulled back relative to early prototype;
- [x] 0.8.3 raises camera slightly again: height `3.55 → 4.05`, distance `6.8 → 7.0`, lookAhead `3.8 → 4.1`;
- [?] verify final 0.8.3 framing on real Android.

Future mobile tuning:

- [ ] target stickiness / hysteresis to reduce rapid target switching;
- [ ] priority weighting by distance + threat + screen position;
- [ ] optional auto-fire mode only if later deliberately chosen as product mechanic;
- [ ] contextual button layout/HUD redesign.

---

# 10. 0.6 — Visual Vertical Slice

**NOW THE HIGHEST-IMPACT DEVELOPMENT GAP**

Do not add lots of new mechanics before this stage becomes visually credible.

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

- [x] functional procedural Walker/Runner/Brute archetypes.

Target:

- [ ] Walker GLB;
- [ ] Runner GLB;
- [ ] Brute GLB;
- [ ] visually distinct silhouettes;
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

**COMPLETE AS FUNCTIONAL COMBAT TEST RELEASE**

## Combat

- [x] data-driven weapon definitions;
- [x] recoil profiles;
- [x] movement-dependent spread;
- [x] camera recoil;
- [x] pistol/shotgun differentiation;
- [x] ballistic bow foundation;
- [x] primitive head/torso/limb hit zones;
- [x] damage multipliers;
- [x] stagger resistance;
- [x] knock impulse;
- [x] particles/decals/transient lights;
- [x] reload gameplay event;
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
- [x] no auto-fire;
- [?] 0.8.3 camera framing final device confirmation.

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

**NEXT ENGINE-QUALITY GATE AFTER VISUAL SLICE STARTS**

## Architecture

- [ ] split `GameApp` into smaller orchestration modules;
- [ ] move player/session combat wiring out of GameApp;
- [ ] isolate world/session creation and disposal;
- [ ] add focused unit tests for Damage/Weapon/Wave/AI logic.

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
- [x] camera switching tested.

Still required:

- [?] 0.8.3 higher 3RD camera confirmation;
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
- [ ] Android 30+ FPS with real assets;
- [ ] final HUD;
- [ ] release QA/docs.

Not MVP:

- multiplayer;
- dedicated server;
- MMO backend;
- native engine rewrite;
- full destruction sandbox.

---

# 21. Technical debt priority after audit

## P0 — do before large feature expansion

1. [ ] finish 0.8.3 camera Android confirmation;
2. [ ] keep gameplay stable while starting visual vertical slice;
3. [ ] decompose `GameApp` before it grows substantially more;
4. [ ] add first focused unit tests.

## P1 — visual/product quality

1. [ ] authored level GLB;
2. [ ] production hero + animation;
3. [ ] infected GLBs + animation;
4. [ ] weapon GLBs;
5. [ ] FaceSystem 2.0 fitting/crop;
6. [ ] HUD cleanup.

## P2 — final engine/content integration

1. [ ] Recast navmesh for authored map;
2. [ ] performance metrics/profiling;
3. [ ] KTX2/Meshopt/LOD pipeline;
4. [ ] richer audio/environment polish;
5. [ ] remove legacy runtime.

## Documentation debt

- [ ] README build information is stale (`0.4`);
- [ ] package version is stale (`0.5.0-alpha.2`);
- [ ] `structure.md` has older floating-reticle/vertical-aim text and must be refreshed at next documentation checkpoint;
- [ ] history must record 0.8.2/0.8.3 checkpoints.

---

# 22. Official next development order

After 0.8.3 camera confirmation:

1. **Visual Vertical Slice / Character:** introduce a real licensed humanoid GLB and AnimationMixer pipeline.
2. Attach a real pistol and prove idle/walk/run/aim/fire animation transitions.
3. Replace procedural infected visuals with first real Walker, then Runner/Brute.
4. Build first authored `Abandoned Outskirts level.glb` with collision-ready layout.
5. Add final offline Recast navmesh for that geometry.
6. Upgrade FaceSystem to fit production head UV/crop.
7. Redesign mobile HUD around the now-approved TOP/3RD controls.
8. Decompose GameApp and add focused unit tests during this migration, before adding major new mechanics.
9. Profile Android with real assets and enforce 30+ FPS budgets.
10. Only then add progression/special infected/environment interactions.

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

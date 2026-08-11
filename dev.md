# Facefall Survivor — Development Plan

Последняя актуализация: **2026-08-12**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`  
Hosting: **Vercel only**  
Primary alias: `https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

Текущий milestone: **0.8 COMBAT+AI — primary test release candidate**.  
После merge 0.8 основной Vercel `/` должен показывать engine-next. Предыдущая 0.5 ALPHA сохраняется под `/legacy/` для сравнения/отката.

Связанные документы:

- `structure.md` — текущая/целевая архитектура;
- `history.md` — хронология решений и checkpoint;
- `THIRD_PARTY_NOTICES.md` — прямые code-reuse notices;
- `public/assets/ATTRIBUTION.md` — media licensing.

---

# 1. Product goal

Facefall Survivor — mobile-first browser 3D action-survival против заражённых.

Обязательная формула:

- TOP / Diablo-like камера;
- third-person over-the-shoulder камера;
- одна simulation для обеих камер;
- pistol / shotgun / bow;
- Walker / Runner / Brute;
- waves + рост сложности;
- фото пользователя становится лицом героя;
- desktop + touch;
- Android — обязательная реальная тестовая платформа;
- dark atmospheric environment;
- Vercel production.

Главный product hook:

> **Твоё лицо — твой герой в survival shooter.**

---

# 2. Technology decision after three audits

Референсы:

1. `ivanoskov/shooter` → browser/Three.js foundation;
2. `Unvanquished/Unvanquished` → gameplay/system architecture;
3. `redeclipse/base` → combat feel / weapons / FX / environment.

Итог:

> **TypeScript + Vite + npm Three.js + GLB/manifest levels + Octree/Capsule + NavigationQuery/Recast target + SpatialHash/local avoidance + data-driven combat + event-driven presentation + pooled FX/audio + mobile-first budgets.**

Reuse policy:

- permissive isolated code можно адаптировать с attribution;
- GPL game code напрямую не копируем;
- native C++ идеи переписываются под TypeScript/browser;
- media licenses проверяются отдельно;
- если чужой блок сложнее адаптировать, чем написать чисто — пишем с нуля.

Уже адаптировано из MIT `ivanoskov/shooter`:

- Capsule/Octree collision response pattern;
- GLTF loader/traverse preparation pattern.

Остальные ключевые systems Facefall реализованы специально под проект.

---

# 3. Architecture rules

1. `src/main.ts` остаётся thin bootstrap.
2. Один fixed-timestep gameplay loop.
3. Input adapters → один `InputManager`.
4. Visible reticle = gameplay state = источник направления player shot.
5. Simulation emits events; presentation handles sound/FX/UI.
6. Static collision ≠ navigation ≠ crowd lookup.
7. Static world → Octree; crowd → SpatialHash; final AI paths → navmesh.
8. Weapons/enemies/FX data-driven.
9. Dynamic visual systems имеют pool/capacity/TTL.
10. TOP и 3RD используют одного Player/World.
11. Level visual geometry, manifest semantics и navmesh разделены.
12. Face processing local-first.
13. Every gameplay PR → `npm ci + typecheck + Chromium smoke + production build`.
14. Major checkpoint → update `dev.md`, `structure.md`, `history.md`.
15. Android feedback приоритетнее desktop-only polish.

---

# 4. Status legend

- `[x]` implemented;
- `[~]` partial/foundation;
- `[?]` implemented, needs device confirmation;
- `[ ]` pending;
- `[HOLD]` intentionally later.

---

# 5. D0 — Documentation / architecture

**COMPLETE**

- [x] three audits completed;
- [x] target stack selected;
- [x] `structure.md`;
- [x] `history.md`;
- [x] licensing strategy;
- [x] full roadmap;
- [x] reuse policy.

---

# 6. 0.5A — Engine Foundation

**COMPLETE ENOUGH FOR PRODUCT DEVELOPMENT**

## Build / CI

- [x] npm project;
- [x] Three.js package dependency;
- [x] TypeScript strict;
- [x] Vite;
- [x] package lock;
- [x] `npm ci` in CI;
- [x] Playwright Chromium smoke;
- [x] Vite production artifact;
- [x] Vercel `dist-next` output;
- [x] deployment-root assertion from 0.8;
- [ ] focused unit tests for pure simulation systems.

## Core

- [x] `GameLoop` fixed timestep;
- [x] typed `EventBus`;
- [x] `GameStateController`;
- [x] `GameApp`;
- [x] resilient Bootstrap;
- [x] menu/loading/playing/paused/gameover/error lifecycle;
- [x] cleanup/dispose foundation;
- [~] `GameApp` still needs decomposition.

## Input / aiming / cameras

- [x] keyboard/mouse;
- [x] touch controls;
- [x] camera-relative joystick movement;
- [x] TOP movable reticle;
- [x] 3RD floating reticle + soft-edge turning;
- [x] visible reticle and WeaponSystem share one AimController state;
- [x] sensitivity setting;
- [x] 3RD deadzone setting;
- [x] soft mobile Aim Assist setting;
- [x] TopDownCamera;
- [x] ThirdPersonCamera;
- [x] CameraCollision;
- [?] 0.8 aim/recoil/assist feel requires latest Android test.

## Physics / spatial

- [x] static Octree CollisionWorld;
- [x] PlayerCapsule;
- [x] raycast / segmentCast;
- [x] SpatialHash;
- [x] LocalAvoidance;
- [~] wall sliding;
- [ ] explicit slopes/steps policy;
- [ ] richer dynamic colliders if gameplay needs them.

---

# 7. 0.5B — Legacy Functional Parity

**FUNCTIONALLY REACHED FOR PRIMARY TESTING; final Android comparison still required.**

## Product flow

- [x] start menu;
- [x] face choose/preview/remove;
- [x] local face persistence;
- [x] camera selection before run;
- [x] aim/audio settings;
- [x] start/loading/error feedback;
- [x] game over;
- [x] restart without page reload.

## Gameplay

- [x] pistol basic runtime;
- [x] shotgun basic runtime;
- [x] bow ballistic runtime;
- [x] reload;
- [x] weapon switch;
- [x] player HP/damage/death;
- [x] Walker/Runner/Brute spawn/runtime;
- [x] WaveDirector;
- [x] kills/score;
- [x] health/ammo pickups;
- [x] manifest-driven spawn/loot/light semantics;

## Atmosphere

- [x] fog;
- [x] lighting foundation;
- [x] grass foundation;
- [x] rain;
- [x] rain/wind audio;
- [x] lightning/thunder foundation;
- [x] pooled combat FX;

## Validation

- [x] automated Chromium menu → run → 3RD smoke;
- [x] no fatal pageerror in smoke;
- [x] locked reproducible build;
- [x] Android earlier engine-next versions booted and were playable;
- [?] latest 0.8 primary deployment Android test required.

---

# 8. Production migration for 0.8 testing

User explicitly requested primary deployment of 0.8 for testing.

Release layout:

- [x] Vite engine-next compiled by build pipeline;
- [x] `dist-next/index.html` promoted to compiled engine-next;
- [x] legacy source copied under `/legacy/`;
- [x] CI asserts `ENGINE NEXT 0.8` is deployment root;
- [ ] merge PR #14 into `main` after final green CI;
- [ ] deploy `main` to primary Vercel;
- [ ] verify primary Vercel root shows `ENGINE NEXT 0.8`;
- [ ] real Android smoke-test;
- [ ] remove legacy compatibility/proxy debt later, not before device validation.

---

# 9. 0.6 — Visual Vertical Slice

**NOT COMPLETE. This remains the largest visual gap.**

After 0.8 gameplay/device feedback:

## Hero

- [ ] production-direction humanoid GLB;
- [ ] clean skeleton;
- [ ] outfit;
- [ ] proper face-compatible head;
- [ ] weapon sockets;
- [ ] LOD.

## Hero animations

- [ ] idle;
- [ ] walk;
- [ ] run;
- [ ] pistol/shotgun/bow aim;
- [ ] fire;
- [ ] reload;
- [ ] hit;
- [ ] death;
- [ ] AnimationMixer state transitions/crossfades.

## Weapons

- [ ] real pistol GLB;
- [ ] real shotgun GLB;
- [ ] real bow/arrow GLB;
- [ ] hand attachment.

## Infected

- [ ] Walker GLB;
- [ ] Runner GLB;
- [ ] Brute GLB;
- [ ] distinct silhouettes;
- [ ] attack/stagger/death animations.

## Abandoned Outskirts

- [ ] actual `level.glb`;
- [ ] road/dirt road;
- [ ] buildings/garage;
- [ ] fences/gates;
- [ ] wrecked vehicle;
- [ ] lamps/poles;
- [ ] trees/bushes/grass;
- [ ] props/debris;
- [ ] mud/puddles/wet asphalt;
- [ ] authored collision geometry.

Definition: screenshot must look like a real game, not engine lab.

---

# 10. 0.7 — Navigation / Enemy AI

**PRACTICAL GAMEPLAY LAYER REACHED; final Recast navmesh waits for authored level.**

## Completed

- [x] SpatialHash;
- [x] LocalAvoidance;
- [x] EnemyBrain separation;
- [x] lightweight explicit State Tree;
- [x] `NavigationQuery` seam;
- [x] direct fallback;
- [x] obstacle-aware `CollisionNavigationQuery` for current procedural map;
- [x] wander;
- [x] investigate;
- [x] chase;
- [x] attack/hold;
- [x] stagger;
- [x] last-known target/alert timers;
- [x] `hearNoise()` API;
- [~] sight perception by range;
- [~] basic death state = kill/hide/remove from crowd.

## Final authored-map navigation

Architecture decision:

> **Offline Recast/Detour navmesh generation + lightweight runtime NavigationQuery adapter.**

Leading browser integration: `recast-navigation`/compatible Recast wrapper, subject to implementation spike when authored `level.glb` exists.

Pending:

- [ ] authored navmesh geometry;
- [ ] bake/export navmesh;
- [ ] Recast runtime adapter;
- [ ] actual static-world line-of-sight callback;
- [ ] wire weapon shots into `hearNoise()`;
- [ ] AI update LOD/path-query throttling;
- [ ] navigation debug overlay.

Important: current `CollisionNavigationQuery` is intentionally temporary and does not pretend to be full navmesh pathfinding.

---

# 11. 0.75 — Wave / encounter loop

- [x] manifest spawn zones;
- [x] composition rules;
- [x] wave progression;
- [x] max-active budget by quality;
- [x] inter-wave timing foundation;
- [x] pickups;
- [~] difficulty curve;
- [ ] richer encounter events;
- [ ] special infected after core content quality improves.

---

# 12. 0.8 — Combat Feel + Audio

**RELEASE CANDIDATE IMPLEMENTED IN PR #14.**

## Weapons

- [x] data-driven recoil profiles;
- [x] recoil moves visible reticle;
- [x] camera recoil impulse;
- [x] movement-dependent spread;
- [x] pistol/shotgun feel differentiated by recoil/spread;
- [x] bow remains ballistic;
- [x] reload gameplay event;
- [x] procedural reload sound;
- [ ] bow hold/draw/release timing state;
- [ ] reload/switch interrupt policy polish.

## Hits / reactions

- [x] primitive head/torso/limb hit zones;
- [x] zone multipliers;
- [x] critical feedback;
- [x] stagger duration based on hit severity;
- [x] archetype stagger resistance;
- [x] knock impulse;
- [x] blood/impact particles/decals;
- [ ] animation-based hit reactions after real GLBs;
- [ ] death animation variants after real GLBs;
- [ ] controlled hit-stop after device profiling.

## Audio / ambience

- [x] pistol/shotgun/bow procedural shot sounds;
- [x] hit/kill cues;
- [x] reload cues;
- [x] footsteps;
- [~] infected attack/vocal cues;
- [x] rain;
- [x] wind;
- [x] thunder;
- [x] storm visual flash;
- [ ] richer authored audio assets later if quality requires them.

## Mobile aim

- [x] persisted sensitivity;
- [x] persisted deadzone;
- [x] persisted Aim Assist strength;
- [x] Aim Assist is soft correction only;
- [x] no auto-fire;
- [x] recoil and assist operate on same reticle state as weapon direction;
- [?] tune after primary Android test.

### 0.8 exit criteria

- [x] strict TypeScript;
- [x] Chromium gameplay smoke;
- [x] Vite deploy build;
- [x] primary-root deployment assertion;
- [ ] merge PR #14;
- [ ] primary Vercel deploy;
- [ ] Android feedback/hotfix if necessary.

---

# 13. 0.82 — Environment Reactivity

Next after 0.8 feedback / visual assets begin:

- [ ] connect WindField visibly to vegetation;
- [ ] local wind impulse from shotgun/explosion;
- [ ] improve environment decals/orientation;
- [ ] wet-surface response polish;
- [ ] destructible light prototype only if mobile budget allows;
- [ ] explosive barrel only if it adds gameplay value.

No full physics sandbox.

---

# 14. 0.85 — Face System 2.0

- [ ] dedicated crop UI;
- [ ] zoom/pan;
- [ ] oval mask;
- [ ] brightness/contrast normalization;
- [x] local persistence foundation;
- [x] replace/remove;
- [ ] proper production-head integration;
- [ ] fallback heads;
- [HOLD] automatic face landmarks until base system is stable.

---

# 15. 0.87 — HUD / UX

- [~] mobile HUD exists;
- [x] crosshair/reticle;
- [x] camera buttons;
- [x] FIRE/reload/weapon/camera touch buttons;
- [x] aim/audio settings;
- [ ] final visual HUD design;
- [ ] safe-area/device polish;
- [ ] pause/settings access during run;
- [ ] richer loading progress;
- [ ] remove/reduce debug status for normal play.

---

# 16. 0.9 — Performance

Targets:

- Android: stable **30+ FPS** combat scenario;
- desktop: **60 FPS** target.

Pending:

- [ ] debug Metrics overlay;
- [ ] draw-call/material audit;
- [ ] texture memory audit;
- [ ] GLB optimization;
- [ ] KTX2/Basis;
- [ ] Meshopt evaluation;
- [ ] character/environment LOD;
- [ ] enemy update LOD;
- [ ] restart leak audit;
- [ ] long-session GC/frame spikes;
- [ ] bundle/download budget after real assets land.

---

# 17. 0.92 — QA

- [x] Chromium automated smoke;
- [ ] latest Android 0.8 smoke;
- [ ] TOP aim test;
- [ ] 3RD aim test;
- [ ] aim assist/recoil test;
- [ ] photo upload/persistence;
- [ ] camera switch repeatedly;
- [ ] weapon switch/reload;
- [ ] game over/restart repeatedly;
- [ ] obstacles/crowd behaviour;
- [ ] 15+ minute run;
- [ ] high-wave stress;
- [ ] landscape/portrait checks;
- [ ] slow/failed asset load.

---

# 18. 0.95 — Replay loop

- [x] score foundation;
- [x] waves/run stats;
- [ ] best score persistence;
- [ ] lightweight upgrade choices;
- [ ] simple local progression.

Do not build complex inventory/RPG before core combat/content quality is validated.

---

# 19. 1.0 MVP

Required:

- [ ] authored Abandoned Outskirts level;
- [ ] production hero + infected + weapon assets;
- [ ] final Face integration;
- [x] two camera systems foundation;
- [x] three weapon gameplay foundations;
- [x] three infected archetype foundations;
- [ ] final Recast navmesh;
- [x] waves;
- [x] combat feedback/audio foundation;
- [x] mobile controls/settings foundation;
- [x] game over/restart;
- [x] quality profiles foundation;
- [x] locked CI/browser smoke;
- [ ] Android performance target;
- [ ] final release QA/docs.

Not MVP:

- multiplayer;
- dedicated server;
- MMO backend;
- native engine rewrite;
- full destruction sandbox.

---

# 20. Current technical debt after 0.8

High priority:

- [ ] `GameApp` owns too much integration wiring;
- [ ] actual authored `level.glb` absent;
- [ ] production character/weapon/infected GLBs absent;
- [ ] Recast navmesh not integrated because authored map does not exist yet;
- [ ] actual LOS callback/noise wiring incomplete;
- [ ] current FaceSystem is temporary face plane;
- [ ] debug HUD still prominent;
- [?] primary 0.8 Android test pending.

Temporary compatibility debt:

- [ ] old runtime retained under `/legacy/`;
- [ ] legacy CDN rewrite compatibility remains while `/legacy/` is kept;
- [ ] remove compatibility only after engine-next proves stable on device.

Closed debt:

- [x] runtime Three.js CDN dependency removed from engine-next;
- [x] package lock/npm ci;
- [x] browser smoke;
- [x] camera-relative mobile movement;
- [x] visible reticle/shot synchronization;
- [x] mobile aim settings;
- [x] AudioSystem;
- [x] LocalAvoidance;
- [x] EnemyBrain state boundary;
- [x] NavigationQuery seam;
- [x] obstacle-aware current-map navigation;
- [x] combat recoil/spread/stagger foundation;
- [x] primary deployment layout prepared.

---

# 21. Official next step after 0.8 deployment

1. User tests primary Vercel 0.8 on real Android.
2. Fix only concrete mobile/control/combat regressions first.
3. Then start **visual vertical slice**: authored level + real character/weapon/infected GLBs.
4. Once authored level geometry exists, bake and integrate final Recast navmesh.
5. Fit Face System 2.0 to production head.
6. Performance/profile the real-content build.
7. Remove `/legacy/` only after new production proves stable.

---

# 22. Documentation rule

After every major development session:

- mark actual completed items;
- distinguish prototype/fallback from final implementation;
- record CI/device status;
- add checkpoint to `history.md`;
- update `structure.md` when subsystem boundaries/files change;
- never mark Vercel/device verification complete without actually checking it.

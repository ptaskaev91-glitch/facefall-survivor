# Facefall Survivor — Development Plan

Последняя актуализация: **2026-08-10**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`  
Hosting: **Vercel only**  
Production alias: `https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

Production game: **legacy 0.5 ALPHA remains active by design**.  
Engine-next: **0.5B Functional Parity — gameplay loop started and working in code**.  
Latest engine-next checkpoint: **PR #5 → `dcdee8b058726743ba2e518602e2b8cce458f0d1`**.  
Release-tooling checkpoint: **PR #4 → `6d051dae`**.  
Latest known production deployment request: **`dpl_2SmWVpkqFmuZL2BBrpQ7v2UbRcEb`**; Vercel connector polling for fresh deployment IDs remains unreliable, therefore READY is never assumed without verification.

Related source-of-truth files:

- `structure.md` — current/target architecture;
- `history.md` — project decisions/checkpoints;
- `THIRD_PARTY_NOTICES.md` — direct source-code reuse notices;
- `public/assets/ATTRIBUTION.md` — media licensing registry.

---

# 1. Product goal

Facefall Survivor is a mobile-first browser 3D action-survival game against infected.

Must-have product formula:

- TOP / Diablo-like camera;
- third-person over-the-shoulder camera;
- one simulation shared by both cameras;
- pistol / shotgun / bow;
- Walker / Runner / Brute;
- waves and difficulty growth;
- uploaded user photo becomes the hero face;
- dark realistic authored environment;
- desktop + touch controls;
- Android is a mandatory real-device platform;
- local-first face processing;
- Vercel production.

---

# 2. Final technology after the three audits

References:

1. `ivanoskov/shooter` → browser/Three.js foundation;
2. `Unvanquished/Unvanquished` → gameplay/system architecture;
3. `redeclipse/base` → weapons, FX and environment feel.

Final direction:

> **TypeScript + Vite + npm Three.js + GLB levels + static Octree/Capsule collision + navmesh AI + SpatialHash/local avoidance + data-driven combat + event-based simulation + pooled FX + mobile-first budgets.**

Reuse policy:

- isolated permissive code may be copied/adapted with source revision and license notice;
- GPL/incompatible game code is not copied;
- native C++ systems are reimplemented for TypeScript/Three.js;
- external media licensing is checked separately;
- if adapting foreign code costs more than a clean Facefall implementation, write it from zero.

Direct MIT adaptations already recorded:

- Capsule/Octree collision-response pattern → `PlayerCapsule.ts`;
- GLTF loading/traverse preparation → `AssetManager.ts` / `LevelLoader.ts`.

Facefall-specific systems such as SpatialHash, CameraCollision, touch/pointer aim, LevelManifest, EnemySystem, WaveDirector and current combat/FX orchestration are original project implementations.

---

# 3. Architecture rules

1. `src/main.ts` stays a thin bootstrap.
2. There is one fixed-timestep simulation loop.
3. Input adapters feed one normalized InputManager.
4. Simulation emits events; it does not directly create DOM/audio/particles.
5. Collision and navigation are separate systems.
6. Static world → Octree; crowd neighbours → SpatialHash.
7. Weapons and enemy archetypes are data-driven.
8. Runtime visual effects have pools/budgets/TTL.
9. Both cameras control presentation of the same Player/World simulation.
10. Level geometry and gameplay markers are separate: GLB + manifest + navmesh.
11. Mobile performance is designed from the beginning.
12. Production root does not switch to engine-next until functional parity and Android smoke-test.
13. Direct reused code gets attribution/license notice.
14. Major checkpoints update `dev.md`, `structure.md`, `history.md`.

---

# 4. Status legend

- `[x]` complete/implemented;
- `[~]` foundation or partial implementation;
- `[?]` implemented but requires browser/device verification;
- `[ ]` not started;
- `[HOLD]` intentionally postponed.

---

# 5. D0 — Documentation / architecture freeze

**COMPLETE.**

- [x] three repository audits combined;
- [x] target stack and architecture chosen;
- [x] `structure.md`;
- [x] `history.md`;
- [x] roadmap to 1.0;
- [x] licensing strategy;
- [x] CI/testing strategy;
- [x] development resumed.

---

# 6. 0.5A — Engine Foundation

**STATUS: architecture foundation largely complete; remaining work is reproducibility/debug/verification and decomposition.**

## Build / release

- [x] npm project;
- [x] Three.js package dependency;
- [x] strict TypeScript;
- [x] Vite ES2020 build;
- [x] `engine-lab.html`;
- [x] GitHub Actions typecheck/build;
- [x] repeated green CI;
- [x] combined deploy command: Vite engine-next + stable legacy root in `dist-next`;
- [x] CI artifact upload;
- [x] Vercel repository config knows `build:deploy` / `dist-next`;
- [ ] commit `package-lock.json`;
- [ ] then change installation from `npm install` to `npm ci`;
- [ ] add unit-test runner.

## Lifecycle / core

- [x] fixed `GameLoop`;
- [x] typed `EventBus`;
- [x] `GameApp`;
- [x] `GameStateController`;
- [x] resilient Bootstrap;
- [x] pause/resume/background handling;
- [x] cleanup/dispose foundation;
- [x] `gameover` state added;
- [~] loading/error states;
- [ ] final MENU / FACE_SETUP product states.

## Input / cameras

- [x] InputManager;
- [x] keyboard/mouse adapter;
- [x] detachable touch adapter;
- [x] joystick foundation;
- [x] TOP pointer/touch ground aim;
- [~] third-person mouse/touch look;
- [x] TopDownCamera;
- [x] ThirdPersonCamera;
- [x] CameraDirector;
- [x] old DualCameraRig shim removed;
- [x] third-person camera collision / auto push-in;
- [ ] pitch/crosshair aiming;
- [ ] mobile aim assist;
- [ ] sensitivity/deadzone settings;
- [ ] camera-relative movement;
- [ ] camera transition tuning.

## Physics / spatial

- [x] static Octree;
- [x] PlayerCapsule;
- [x] world raycast;
- [x] world segment cast;
- [x] SpatialHash;
- [x] moving enemies now update SpatialHash cells;
- [~] wall sliding;
- [ ] slopes/steps policy;
- [ ] dynamic colliders;
- [ ] local crowd avoidance.

## Combat

- [x] data-driven pistol/shotgun/bow;
- [x] WeaponSystem ammo/cooldown/reload/switch foundation;
- [x] WeaponSystem reset between runs;
- [x] Health / DamageSystem;
- [x] player Health registered in the same DamageSystem;
- [x] Hit/Kill events;
- [x] pistol hitscan;
- [x] shotgun multi-hitscan;
- [x] static-world occlusion for hitscan;
- [x] ballistic ProjectileSystem;
- [x] bow shot creates a ballistic projectile;
- [x] projectile segment collision against world/enemy;
- [x] projectile damage enters DamageSystem;
- [x] pooled visible arrow meshes;
- [x] projectile reset between runs;
- [~] primitive head/torso/limb hit-zone proof;
- [ ] bow draw/release state;
- [ ] movement-dependent spread;
- [ ] recoil state/application;
- [ ] reload/switch interruption rules.

## FX / presentation

- [x] effect recipes;
- [x] ParticlePool;
- [x] DecalPool;
- [x] LightPool;
- [x] WindField;
- [x] EffectSystem;
- [x] Shot/Hit integration;
- [x] concrete pooled runtime particle adapter;
- [x] concrete bounded decal adapter;
- [x] transient muzzle lights;
- [x] camera impulse/shake implementation;
- [x] smoke/casing/blood/debris/spark runtime effects;
- [x] world surface-hit recipe;
- [ ] improve decal surface orientation;
- [ ] controlled hit-stop integration into the loop;
- [ ] sound adapter;
- [ ] final quality-profile FX tuning.

## World / assets

- [x] AssetManager;
- [x] GLB preparation/cache/disposal foundation;
- [x] typed LevelManifest parser;
- [x] LevelLoader;
- [x] Abandoned Outskirts manifest skeleton;
- [x] manifest-first runtime loading;
- [x] player spawn comes from manifest;
- [x] wave spawn zones come from enemy-spawn markers;
- [x] prototype level lights come from manifest;
- [x] fallback procedural geometry remains if authored GLB is not yet present;
- [ ] actual `level.glb`;
- [ ] replace fallback lab geometry with authored location;
- [ ] navmesh data;
- [ ] loading progress UI.

## 0.5A exit criteria

- [ ] lockfile/reproducible install;
- [x] CI green;
- [x] combined Vercel artifact builds in CI;
- [?] engine-next browser boot must still be manually checked;
- [x] one fixed loop;
- [x] unified combat foundation for all three weapons;
- [x] real ballistic arrow pipeline;
- [x] real pooled runtime FX foundation;
- [x] level manifest participates in runtime;
- [ ] desktop smoke-test;
- [ ] Android smoke-test.

---

# 7. 0.5B — Legacy Functional Parity

**ACTIVE MILESTONE. PR #5 established the first complete engine-next run loop.**

The goal is not visual polish yet; engine-next must reproduce all important capabilities of the working 0.5 legacy build.

## Lifecycle / UI

- [ ] menu shell;
- [ ] face picker;
- [ ] pre-game camera selection;
- [ ] clear loading/error progress;
- [~] start currently auto-starts engine-lab after bootstrap;
- [x] pause state foundation;
- [x] restart from game-over without page reload;
- [x] game-over state + overlay;
- [x] engine-lab run HUD for HP/WAVE/KILLS/SCORE.

## Player / controls

- [~] desktop movement;
- [~] touch movement;
- [~] TOP aim;
- [~] 3RD look;
- [ ] mobile aim assist;
- [ ] final fire/reload/swap/camera touch UX.

## Gameplay

- [~] pistol;
- [~] shotgun;
- [~] bow;
- [x] EnemySystem runtime;
- [x] Walker / Runner / Brute runtime spawning;
- [x] infected direct chase movement;
- [x] infected melee attacks with archetype range/damage/cooldown;
- [x] player HP / damage / death;
- [x] WaveDirector;
- [x] wave spawn runtime from manifest zones;
- [x] wave composition scaling;
- [x] quality-dependent max-active enemy budget;
- [x] kills / score;
- [x] restart resets HP/weapons/projectiles/enemies/wave/run stats;
- [ ] health/ammo pickups;
- [~] difficulty scaling foundation from wave composition;
- [ ] navmesh/obstacle-aware movement — belongs to 0.7, direct chase is parity foundation only.

## Face parity

- [ ] migrate local face picker/storage;
- [ ] face texture integration into engine-next hero pipeline;
- [ ] fallback face;
- [ ] replace/remove image.

## Atmosphere parity

- [x] fog foundation;
- [x] lighting foundation;
- [x] grass foundation;
- [x] runtime combat FX foundation;
- [ ] rain;
- [ ] lightning/thunder;
- [ ] environment ambience.

## Validation

- [ ] dedicated Vercel engine-next 0.5B test link;
- [ ] desktop browser smoke;
- [ ] Android browser smoke;
- [ ] no infinite loader;
- [ ] compare parity checklist against legacy.

---

# 8. 0.5C — Production Migration

Only after 0.5B + Android smoke:

- [ ] Vite entrypoint becomes `/`;
- [ ] remove legacy game-v050 runtime from production path;
- [ ] remove legacy Three/GLTF external runtime proxies;
- [ ] simplify Vercel config;
- [ ] engine-lab becomes debug-only or removed;
- [ ] README updated;
- [ ] production deploy;
- [ ] Android verification;
- [ ] tag/version checkpoint.

Current release setup intentionally supports a transition period: repository CI can build legacy root and engine-next together, while the public root remains legacy until migration criteria are met.

---

# 9. 0.6 — Visual Vertical Slice

After production architecture is stable:

- [ ] production-direction hero GLB;
- [ ] real pistol/shotgun/bow/arrow assets;
- [ ] full hero animation set and crossfades;
- [ ] Walker / Runner / Brute GLBs and animations;
- [ ] authored `Abandoned Outskirts/level.glb`;
- [ ] road/buildings/garage/fences/car/lamps/poles/vegetation/debris;
- [ ] wet asphalt, dirt, mud, puddles;
- [ ] moon/fill/rim/flashlight/street lights;
- [ ] readable cinematic darkness;
- [ ] initial navmesh.

Definition: a still screenshot must look like a game rather than a procedural engine lab.

---

# 10. 0.7 — Navigation / enemies

- [ ] choose browser Recast/Detour integration;
- [ ] navmesh bake/load/query;
- [ ] LocalAvoidance;
- [x] SpatialHash foundation;
- [x] EnemySystem runtime foundation;
- [ ] EnemyBrain separation;
- [ ] lightweight State Tree;
- [ ] sight/sound perception;
- [~] chase/attack foundation exists without navmesh;
- [ ] wander/investigate/stagger/death behavior states;
- [ ] AI update LOD;
- [ ] navigation debug view.

---

# 11. 0.75–0.95 — Gameplay depth / polish

## 0.75 Wave Director

- [x] manifest spawn zones;
- [x] initial composition rules;
- [x] active-enemy budget;
- [~] difficulty curve foundation;
- [~] inter-wave downtime foundation;
- [ ] pickups/mini-events.

## 0.8 Combat feel + audio

- recoil/spread tuning;
- head/torso/limb reactions;
- stagger/death variants;
- weapon/reload/impact sounds;
- footsteps;
- infected vocals;
- rain/wind/thunder/ambient.

## 0.82 Environment reactivity

- grass reacts to WindField;
- weapon/explosion impulses;
- environment decals;
- destructible-light/explosive-barrel prototypes only if mobile budget allows.

## 0.85 Face System 2.0

- crop/zoom/pan;
- mask and brightness/contrast;
- local persistence;
- proper head integration;
- fallback/replace/remove;
- local landmarks later `[HOLD]`.

## 0.87 HUD/UX

- compact mobile HUD;
- safe areas;
- crosshair;
- settings/quality/sensitivity/audio;
- loading progress and clear errors.

## 0.9 Performance

- draw calls / materials / textures / shadow audit;
- GLB optimization;
- KTX2/Meshopt evaluation;
- LOD;
- path-query throttling;
- allocation and restart/leak audit;
- target 30+ FPS Android / 60 FPS desktop.

## 0.92 QA

- Android real browser;
- desktop Chromium;
- portrait/landscape;
- slow network / failed asset;
- repeated restart/camera switch;
- 15+ minute session;
- high-wave stress.

## 0.95 Replay loop

- [x] run score foundation;
- [x] wave progression/run stats foundation;
- [ ] best score;
- [ ] lightweight upgrade choices;
- [ ] local persistence.

---

# 12. 1.0 MVP

Required:

- production Vite architecture;
- authored level;
- two cameras;
- face integration;
- 3 weapons;
- 3 infected archetypes;
- navmesh/pathfinding;
- waves;
- combat feedback + audio;
- mobile controls/settings;
- stable restart/game-over;
- quality profiles;
- CI/tests/licensing;
- Android performance target;
- production deploy and final docs.

Not MVP: multiplayer, dedicated server, MMO backend, native-engine rewrite, full destruction sandbox.

---

# 13. Current technical debt

- [ ] no committed package lock yet;
- [ ] CI still installs with `npm install`;
- [ ] GameApp still owns too much integration wiring;
- [ ] EnemySystem direct-chases through conceptual obstacles until navmesh/local avoidance is added;
- [ ] fallback procedural world remains until `level.glb`;
- [ ] Soldier GLB is only a pipeline proof;
- [ ] legacy production still depends on same-origin CDN proxies;
- [ ] navmesh integration not selected;
- [ ] automated browser smoke test absent;
- [ ] engine-next not yet manually verified on Android;
- [ ] Vercel deployment polling connector is unreliable for some fresh deployment IDs.

Closed debt in recent checkpoints:

- [x] DualCameraRig shim removed;
- [x] PlayerCapsule/SpatialHash/camera collision added;
- [x] EffectSystem wired to combat;
- [x] concrete particles/decals/camera shake added;
- [x] ballistic bow connected to collision/damage and visible arrow pool;
- [x] AssetManager/LevelLoader/LevelManifest exist;
- [x] manifest drives runtime spawn markers/lights;
- [x] combined deployment artifact generated by CI;
- [x] code/media attribution registries created;
- [x] EnemySystem/WaveDirector/player damage/game-over/restart foundation added.

---

# 14. Official next block

1. Publish and verify a dedicated **engine-next 0.5B Vercel test URL**.
2. Move face upload/local storage/fallback face into engine-next.
3. Add actual menu/start/pre-game camera flow instead of lab auto-start.
4. Complete 3RD crosshair/pitch and mobile aim assist.
5. Add rain + ambient atmosphere parity.
6. Obtain and commit reproducible `package-lock.json`, then CI → `npm ci`.
7. Add browser smoke automation.
8. Begin navmesh spike / obstacle-aware enemy movement.
9. Desktop + real Android smoke-test.
10. Only after parity + smoke-test activate engine-next at production `/`.

---

# 15. Documentation rule

After each large development pass:

- update task statuses;
- record technical debt;
- update current commit/PR/deployment checkpoint;
- update `history.md`;
- update `structure.md` if architecture changed;
- do not call a milestone finished until its required runtime/device verification passes.

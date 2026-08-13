# Facefall Survivor — Structure

Последняя актуализация: **2026-08-13**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `visual/0.9.1-pistol-animation` until PR #21 merge, then `main`  
Architecture checkpoint: **0.9.1 PISTOL COMBAT ANIMATION**

---

# 1. Назначение

`structure.md` — источник истины по текущей и целевой архитектуре Facefall Survivor.

Он фиксирует:

1. фактические файлы и ownership систем;
2. временные prototype boundaries;
3. взаимодействие simulation / world / presentation;
4. целевую структуру для GLB/animation/authored-level этапа.

---

# 2. Technology formula

> **TypeScript strict + Vite + npm Three.js + glTF/GLB + manifest-driven levels + Octree/Capsule + SpatialHash/local avoidance + NavigationQuery/Recast target + data-driven combat + event-driven presentation + pooled FX/audio + local-first FaceSystem + mobile-first controls + unit/browser/visual CI + Vercel.**

GitHub `main` — canonical source. Vercel — единственный production hosting target.

---

# 3. Current source tree

```text
facefall-survivor/
├── .github/
│   └── workflows/
│       └── engine-next-ci.yml
│
├── public/
│   └── assets/
│       ├── ATTRIBUTION.md
│       ├── characters/
│       │   └── quaternius-universal-base-male/
│       ├── animations/
│       │   └── quaternius-universal-animation-library/
│       └── levels/
│           └── abandoned-outskirts/
│               └── level.manifest.json
│
├── scripts/
│   └── promote-engine-next.mjs
│
├── tests/
│   ├── smoke/
│   │   ├── engine-next.spec.ts
│   │   ├── mobile-controls.spec.ts
│   │   └── visual-regression.spec.ts
│   └── unit/
│       ├── animation-library.test.ts
│       ├── health-damage.test.ts
│       ├── weapon-system.test.ts
│       ├── enemy-brain.test.ts
│       ├── wave-director.test.ts
│       └── spatial-state-avoidance.test.ts
│
├── src/
│   ├── main.ts
│   │
│   ├── app/
│   │   ├── Bootstrap.ts
│   │   ├── GameApp.ts
│   │   ├── GameHud.ts
│   │   ├── GameState.ts
│   │   └── ProductShell.ts
│   │
│   ├── aim/
│   │   ├── AimController.ts
│   │   └── AimAssist.ts
│   │
│   ├── camera/
│   │   ├── CameraCollision.ts
│   │   ├── CameraDirector.ts
│   │   ├── TopDownCamera.ts
│   │   └── ThirdPersonCamera.ts
│   │
│   ├── characters/
│   │   ├── CharacterLocomotion.ts
│   │   ├── CharacterModel.ts
│   │   ├── WeaponSocketVisual.ts
│   │   └── FaceSystem.ts
│   │
│   ├── combat/
│   │   ├── types.ts
│   │   ├── weapons.ts
│   │   ├── Health.ts
│   │   ├── DamageSystem.ts
│   │   ├── WeaponSystem.ts
│   │   ├── ProjectileSystem.ts
│   │   ├── ProjectileVisuals.ts
│   │   └── CombatFeedback.ts
│   │
│   ├── core/
│   │   ├── EventBus.ts
│   │   └── GameLoop.ts
│   │
│   ├── effects/
│   │   ├── recipes.ts
│   │   ├── EffectSystem.ts
│   │   ├── RuntimeFx.ts
│   │   ├── ParticlePool.ts
│   │   ├── DecalPool.ts
│   │   ├── LightPool.ts
│   │   └── WindField.ts
│   │
│   ├── enemies/
│   │   ├── archetypes.ts
│   │   ├── EnemyBrain.ts
│   │   └── EnemySystem.ts
│   │
│   ├── graphics/
│   │   └── quality.ts
│   │
│   ├── input/
│   │   ├── InputManager.ts
│   │   ├── KeyboardMouseInput.ts
│   │   ├── TouchInput.ts
│   │   └── MovementFrame.ts
│   │
│   ├── navigation/
│   │   ├── NavigationQuery.ts
│   │   ├── CollisionNavigationQuery.ts
│   │   └── LocalAvoidance.ts
│   │
│   ├── persistence/
│   │   ├── FaceStore.ts
│   │   └── SettingsStore.ts
│   │
│   ├── physics/
│   │   ├── CollisionWorld.ts
│   │   ├── PlayerCapsule.ts
│   │   └── SpatialHash.ts
│   │
│   ├── pickups/
│   │   └── PickupSystem.ts
│   │
│   ├── player/
│   │   └── PlayerRuntime.ts
│   │
│   ├── presentation/
│   │   └── audio/
│   │       └── AudioSystem.ts
│   │
│   ├── rendering/
│   │   ├── RainField.ts
│   │   └── StormSystem.ts
│   │
│   ├── waves/
│   │   └── WaveDirector.ts
│   │
│   └── world/
│       ├── AssetManager.ts
│       ├── LevelLoader.ts
│       ├── LevelManifest.ts
│       ├── GrassField.ts
│       └── WorldRuntime.ts
│
├── engine-lab.html
├── package.json
├── package-lock.json
├── playwright.config.ts
├── tsconfig.json
├── tsconfig.tests.json
├── vite.config.ts
├── vercel.json
├── THIRD_PARTY_NOTICES.md
├── README.md
├── dev.md
├── structure.md
└── history.md
```

Retired from active source in the hardening checkpoint:

- `game.js`;
- `game-safe.js`;
- `game-safe2.js`;
- `game-v050.js`;
- `styles-safe.css`;
- old source `index.html`;
- `scripts/copy-legacy.mjs`;
- `/legacy/` deployment bundle;
- old Three/GLTFLoader CDN rewrites;
- old Three examples Soldier rewrite.

Rollback remains available through Git history and previous immutable Vercel deployments rather than dead code shipped with every build.

---

# 4. Deployment structure

`npm run build:deploy`:

```text
Vite build from engine-lab.html
        ↓
dist-next/
├── engine-lab.html
├── index.html          # same compiled document promoted to primary /
├── assets/
│   ├── game chunks
│   ├── bundled Three.js chunk
│   └── public assets / level manifest
└── ...
```

`vercel.json` now only declares build command and output directory. The active engine-next production path does not require runtime Three.js CDN imports or an externally hosted prototype hero.

---

# 5. Top-level runtime ownership after 0.8.7

```text
Bootstrap
 ├── ProductShell
 ├── AudioSystem
 └── GameApp                 ← gameplay orchestration / ordering
      ├── WorldRuntime       ← scene/render/world/collision/environment
      ├── PlayerRuntime      ← player transform/collider + CharacterModel/face/weapon visual boundary
      ├── GameHud            ← DOM HUD/status presentation
      ├── WeaponSystem
      ├── DamageSystem
      ├── ProjectileSystem
      ├── EnemySystem
      ├── WaveDirector
      ├── PickupSystem
      ├── EffectSystem
      └── Input / Aim
```

This replaces the old design where `GameApp` directly constructed and owned almost every low-level subsystem.

---

# 6. `WorldRuntime`

Owns:

- `THREE.Scene`;
- `WebGLRenderer`;
- perspective camera;
- CameraDirector + CameraCollision;
- `CollisionWorld`;
- procedural fallback static geometry;
- `GrassField`;
- `RainField`;
- `StormSystem`;
- `AssetManager` / `LevelLoader`;
- manifest load/fallback;
- manifest-created lights;
- render/resize/environment disposal.

Future production `level.glb` and authored environment integration belongs **here**, not in `GameApp`.

---

# 7. `PlayerRuntime`

Owns:

- player root transform;
- `PlayerCapsule`;
- movement integration;
- facing vector;
- spawn/reset;
- `CharacterModel` rig / `SkeletonUtils` / `AnimationMixer` lifecycle;
- production hero scale/orientation normalization;
- uploaded-face routing to fallback `FaceSystem` and production `Head` shell;
- production pistol socket and muzzle world transform;
- combat-event → hero one-shot animation bridge for pistol fire/reload;
- active-weapon visibility/muzzle guard so pistol visuals cannot leak into shotgun/bow gameplay;
- automatic procedural visual fallback when production assets fail.

Production hero/animation/weapon visual work now lives **behind PlayerRuntime**.

`GameApp` should only ask the player runtime to move/reset/return transform information.

---

# 8. `GameHud`

DOM-only presenter.

Receives a `HudSnapshot`; does not mutate simulation.

Owns:

- HP / wave / kills / score text;
- debug status line;
- last gameplay event text;
- game-over summary/show-hide.

Future HUD visual redesign belongs here / presentation UI modules rather than in combat code.

---

# 9. GameApp responsibility after first decomposition pass

`GameApp` is still intentionally the composition/orchestration boundary for:

- lifecycle transitions;
- fixed-update order;
- combat event wiring;
- Weapon/Damage/Projectile systems;
- Enemy/Wave/Pickup coordination;
- aim coordination;
- score/kills session state.

Potential future extraction if complexity grows:

```text
GameApp
 ├── CombatRuntime
 ├── RunSession
 ├── EnemyRuntime
 └── PresentationRuntime
```

Do this incrementally and only when it reduces real coupling. Do not add a DI framework/service locator.

---

# 10. Fixed simulation/render flow

```text
GameLoop fixed step (60 Hz)
 ↓
Input snapshot
 ↓
Aim update
 ↓
PlayerRuntime.move
 ↓
Weapon / projectile simulation
 ↓
Enemy brain / navigation / avoidance
 ↓
Damage / waves / pickups
 ↓
EventBus
 ↓
FX / storm simulation

per-frame render
 ↓
WorldRuntime camera update
 ↓
Camera recoil
 ↓
Projectile visuals
 ↓
Grass/rain frame update
 ↓
WorldRuntime.render
```

Invariant: one gameplay/physics loop only.

---

# 11. Mobile controls — canonical model

## TOP

```text
Touch anywhere on free gameplay surface
 ↓
dynamic movement joystick under finger
 ↓
InputManager / MovementFrame

Enemy targets
 ↓
AimAssist / internal AimController
 ↓
auto-target direction
 ↓
hero facing
 ↓
WeaponSystem fire direction
```

No manual mobile aim gesture in TOP. FIRE remains manual.

## 3RD

```text
crosshair fixed at screen center
manual touch drag → yaw only
mobile auto-aim → horizontal correction
no manual vertical aim
```

Camera is raised over the shoulder and uses collision resolution.

---

# 12. Combat boundary

```text
Input/FIRE
 ↓
WeaponSystem
 ↓
ShotEvent
 ├── pistol/shotgun hitscan simulation
 │    ├── movement-dependent spread
 │    ├── world occlusion check
 │    ├── body hit zone
 │    └── DamageSystem
 │
 └── bow ProjectileSystem
      └── segment collision → DamageSystem

DamageSystem
 ├── HitEvent
 └── KillEvent
      ↓
Enemy stagger / score / game-over
      ↓
EffectSystem / AudioSystem / HUD
```

Pistol/shotgun tracer meshes are presentation; damage is immediate hitscan. This is deliberate for mobile responsiveness.

`WeaponSystem` no longer imports the global `AimController`; player aim may be provided by orchestration, otherwise weapon firing uses supplied facing/direction. This keeps the gameplay module independently testable.

---

# 13. Enemy / navigation boundary

```text
EnemyBrain
 ↓ intent
NavigationQuery
 ↓ desired path/waypoint
LocalAvoidance
 ↓ crowd-separated velocity
EnemySystem
 ↓ transform + attack callback
```

Current NavigationQuery implementation is collision-aware procedural fallback.

Target after authored level exists:

```text
level.glb
 + offline Recast navmesh
        ↓
RecastNavigationQuery
        ↓
LocalAvoidance / SpatialHash
```

Collision and navmesh remain separate systems.

---

# 14. Testing architecture

CI now contains three layers before production artifact generation:

## Unit

Node built-in test runner over compiled TypeScript:

- Health / DamageSystem;
- WeaponSystem;
- EnemyBrain;
- WaveDirector;
- SpatialHash;
- LocalAvoidance;
- GameStateController.

## Browser behavior

Playwright Chromium:

- menu boot;
- run start;
- camera switching;
- mobile dynamic joystick;
- no fatal page errors.

## Visual checkpoints

Playwright mobile viewport produces:

- `mobile-top.png`;
- `mobile-third.png`.

CI uploads `facefall-visual-checkpoints`; these images are intended for actual human/assistant inspection after risky refactors or visual work.

---

# 15. Current prototype vs target content

## Prototype today

- procedural player body + photo head material;
- procedural low-poly humanoid infected;
- procedural fallback environment;
- procedural gait;
- approximate muzzle transform;
- procedural audio.

## Target vertical slice

```text
PlayerRuntime
 └── CharacterModel
      ├── hero.glb
      ├── AnimationMixer
      ├── weapon sockets
      └── production FaceSystem integration

EnemySystem
 └── pooled infected character instances
      ├── walker.glb
      ├── runner.glb
      └── brute.glb

WorldRuntime
 └── Abandoned Outskirts
      ├── level.glb
      ├── level.manifest.json
      └── navmesh data
```

---

# 16. Asset rules

Every externally shipped model/texture/audio/animation requires provenance and license registration in `public/assets/ATTRIBUTION.md` or `THIRD_PARTY_NOTICES.md` where appropriate.

No production media should depend on an uncontrolled external URL at runtime.

Preferred production pipeline:

```text
source / Blender
 ↓
GLB export
 ↓
cleanup / naming / animation review
 ↓
glTF optimization
 ↓
Meshopt / KTX2 when profiling justifies
 ↓
asset budget check
 ↓
public/assets
```

---

# 17. Target architecture additions

As the visual slice lands, expected additions include:

```text
src/
├── characters/
│   ├── CharacterModel.ts
│   ├── CharacterAnimator.ts
│   └── FaceSystem.ts
├── world/
│   ├── WorldRuntime.ts
│   ├── AssetManager.ts
│   ├── LevelLoader.ts
│   └── MaterialLibrary.ts
├── navigation/
│   ├── NavigationQuery.ts
│   └── RecastNavigationQuery.ts
├── debug/
│   └── Metrics.ts
└── app/
    ├── GameApp.ts
    ├── GameHud.ts
    └── optional RunSession/CombatRuntime when justified
```

---

# 18. Structural rules

1. `main.ts` remains bootstrap-only.
2. `GameApp` remains orchestration, not a new monolith.
3. Rendering/world creation belongs to `WorldRuntime`.
4. Character GLB/animation belongs behind `PlayerRuntime` / character modules.
5. HUD does not own gameplay rules.
6. Simulation never directly creates DOM UI.
7. Physics collision and navigation are separate.
8. Weapons/enemy archetypes stay data-driven.
9. Effects stay pooled/bounded.
10. No external asset is shipped without license/provenance record.
11. Significant ownership/file changes update `structure.md`.
12. Risky visual/refactor PRs should produce inspectable CI screenshots.


---

## 0.10.0 Production Core additions

- `src/app/CombatRuntime.ts` — combat event/hitscan coordination boundary.
- `src/app/RunSession.ts` — run score/kills state.
- `src/assets/AssetBudget.ts` — byte and infected LOD budgets.
- `src/characters/HeroCombatPose.ts` — skeletal overlays for shotgun/bow/hit/death states missing from the compact authored library.
- `public/assets/weapons/shotgun.glb` — lazy production shotgun asset.
- `public/assets/weapons/bow-arrow.glb` — lazy production bow + arrow asset.
- `src/enemies/RiggedWalkerVisual.ts` now provides the shared production infected rig for Walker/Runner/Brute, action reactions, bone hit proxies and distance LOD.
- `tests/smoke/production-weapons.spec.ts` — lazy weapon assets + hero reactions gate.
- `tests/smoke/production-infected.spec.ts` — three-archetype rig/hit-zone/reuse visual gate.
- `tests/unit/asset-budget.test.ts`, `weapon-assets.test.ts`, `run-session.test.ts` — production-core unit contracts.

`EnemyRuntime` and `PresentationRuntime` remain intentionally uncreated: current `EnemySystem` and presentation boundaries are cohesive, so additional wrappers would add indirection without reducing responsibility.

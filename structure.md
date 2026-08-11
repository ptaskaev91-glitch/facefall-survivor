# Facefall Survivor — Structure

Последняя актуализация: **2026-08-11**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`  
Production root: **legacy 0.5 ALPHA on Vercel**  
Latest engine-next checkpoint: **PR #10 / `018d78c1275f99aec22ef5e4a137ec912806b740`**  
Gameplay/atmosphere checkpoint: **PR #9 / `0876eff1839e9c93a669dc328cf225e200ebf498`**

---

# 1. Назначение

`structure.md` фиксирует текущую и целевую архитектуру Facefall Survivor: фактические файлы, границы систем, временные legacy-части и структуру, к которой проект должен прийти.

---

# 2. Итоговая технологическая формула

> **TypeScript + Vite + npm Three.js + GLB/manifest levels + static Octree/Capsule collision + SpatialHash + navmesh AI + data-driven combat + event-driven presentation + pooled/batched FX + local-first face system + mobile-first controls/performance + locked CI/browser smoke.**

GitHub `main` остаётся source-of-truth. Vercel — единственный hosting target.

---

# 3. Текущая структура repository

```text
facefall-survivor/
├── .github/
│   └── workflows/
│       └── engine-next-ci.yml
│
├── public/
│   └── assets/
│       ├── ATTRIBUTION.md
│       └── levels/
│           └── abandoned-outskirts/
│               └── level.manifest.json
│
├── scripts/
│   ├── copy-legacy.mjs
│   └── smoke-engine.mjs
│
├── src/
│   ├── main.ts
│   ├── app/
│   │   ├── Bootstrap.ts
│   │   ├── GameApp.ts
│   │   ├── GameState.ts
│   │   └── ProductShell.ts
│   ├── aim/
│   │   └── AimController.ts
│   ├── characters/
│   │   └── FaceSystem.ts
│   ├── persistence/
│   │   └── FaceStore.ts
│   ├── core/
│   │   ├── EventBus.ts
│   │   └── GameLoop.ts
│   ├── input/
│   │   ├── InputManager.ts
│   │   ├── KeyboardMouseInput.ts
│   │   ├── TouchInput.ts
│   │   └── MovementFrame.ts
│   ├── physics/
│   │   ├── CollisionWorld.ts
│   │   ├── PlayerCapsule.ts
│   │   └── SpatialHash.ts
│   ├── camera/
│   │   ├── CameraCollision.ts
│   │   ├── CameraDirector.ts
│   │   ├── TopDownCamera.ts
│   │   └── ThirdPersonCamera.ts
│   ├── combat/
│   │   ├── types.ts
│   │   ├── weapons.ts
│   │   ├── Health.ts
│   │   ├── DamageSystem.ts
│   │   ├── WeaponSystem.ts
│   │   ├── ProjectileSystem.ts
│   │   ├── ProjectileVisuals.ts
│   │   └── CombatFeedback.ts
│   ├── enemies/
│   │   ├── archetypes.ts
│   │   └── EnemySystem.ts
│   ├── waves/
│   │   └── WaveDirector.ts
│   ├── pickups/
│   │   └── PickupSystem.ts
│   ├── effects/
│   │   ├── recipes.ts
│   │   ├── EffectSystem.ts
│   │   ├── RuntimeFx.ts
│   │   ├── ParticlePool.ts
│   │   ├── DecalPool.ts
│   │   ├── LightPool.ts
│   │   └── WindField.ts
│   ├── rendering/
│   │   └── RainField.ts
│   ├── graphics/
│   │   └── quality.ts
│   └── world/
│       ├── AssetManager.ts
│       ├── LevelLoader.ts
│       ├── LevelManifest.ts
│       └── GrassField.ts
│
├── index.html                  # stable legacy production root
├── game-v050.js                # stable legacy runtime
├── styles-safe.css             # stable legacy UI
├── engine-lab.html             # current engine-next product/test entrypoint
├── package.json
├── package-lock.json            # canonical npm dependency lock
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── THIRD_PARTY_NOTICES.md
├── README.md
├── dev.md
├── structure.md
└── history.md
```

Generated CI/build output is not source-of-truth:

```text
dist-next/
├── index.html
├── game-v050.js
├── styles-safe.css
├── engine-lab.html
└── assets/...
```

---

# 4. Product lifecycle

```text
BOOT
  ↓
MENU
  ├── face select / remove / persisted preview
  ├── TOP / 3RD pre-game camera selection
  ↓
LOADING
  ↓
PLAYING ↔ PAUSED
  ↓
GAMEOVER
  ↓
RESTART → PLAYING

ERROR → MENU
```

`ProductShell` owns browser UI/file-input state. `GameApp` receives normalized start options and does not own raw file-selection logic.

---

# 5. Face architecture

```text
ProductShell → FaceStore(localStorage) → preview → GameApp.start({faceDataUrl}) → FaceSystem
```

Current `FaceSystem` is functional parity only. Final production integration must fit the face to the real character head/UV instead of keeping the temporary plane.

---

# 6. Aim / input / camera

```text
KeyboardMouseInput ─┐
                    ├→ InputManager → MovementFrame → simulation
TouchInput ─────────┘
                         ↓
                    AimController
                 reticle = fire direction
                         ↓
                   WeaponSystem
```

`MovementFrame` maps movement relative to the active camera. The visible reticle, player facing and actual player shot direction use one AimController state.

```text
CameraDirector
├── TopDownCamera
└── ThirdPersonCamera
      └── CameraCollision → CollisionWorld
```

---

# 7. Core runtime

```text
src/main.ts → Bootstrap → ProductShell + GameApp

GameLoop fixed tick
  ↓
Input
  ↓
Player / weapons / enemies / waves / pickups
  ↓
Physics / projectiles / SpatialHash
  ↓
Events
  ↓
FX / HUD / atmosphere / camera / render
```

A second gameplay/physics loop is forbidden.

---

# 8. Physics / navigation

Current:

```text
Static world → CollisionWorld/Octree ← PlayerCapsule
EnemySystem → moving actors → SpatialHash
```

Target:

```text
EnemyBrain → NavMeshQuery → path corridor → LocalAvoidance + SpatialHash → desired velocity
```

Collision, crowd lookup and navigation stay separate.

---

# 9. Combat / enemy / wave / pickup

```text
AimController/Input.fire → WeaponSystem → ShotEvent
  ├── pistol → hitscan
  ├── shotgun → multi-hitscan
  └── bow → ProjectileSystem
                     ↓
                DamageSystem → Hit/Kill
```

Player receives infected melee through the same DamageSystem/Health pipeline.

```text
LevelManifest enemy-spawn → WaveDirector → EnemySystem.spawn(Walker/Runner/Brute)
LevelManifest loot → PickupSystem → Health.heal / WeaponSystem.addReserve
```

---

# 10. Presentation / atmosphere

```text
Shot/Hit → EffectSystem recipes
          ├── particles
          ├── decals
          ├── transient lights
          ├── wind
          └── camera impulse

RainField → quality budget → one recycled Points geometry around player
```

Audio remains the next presentation adapter and must not move into simulation logic.

---

# 11. Level architecture

```text
public/assets/levels/abandoned-outskirts/
├── level.glb
├── level.manifest.json
├── navmesh data
└── preview.webp
```

- GLB → visual/collision geometry;
- manifest → player/enemy spawns, lights, loot, wind/audio zones, interactions;
- navmesh → infected traversal.

Manifest already drives gameplay data. Procedural geometry remains fallback until authored `level.glb` exists.

---

# 12. Build / QA architecture

Canonical dependency path:

```text
package.json + package-lock.json
          ↓
        npm ci
          ↓
   strict TypeScript
          ↓
Playwright Chromium smoke
 boot → menu → start → playing → 3RD
 no fatal pageerror
          ↓
 npm run build:deploy
          ↓
 facefall-dist-next artifact
```

This is now a merge gate for subsequent development PRs. PR #10 run #63 passed the complete path.

Transition policy:

- production `/` remains stable legacy;
- engine-next is tested separately;
- production root switches only after functional parity + latest Android smoke-test.

---

# 13. Target structure

```text
src/
├── app/                 bootstrap/product lifecycle
├── aim/                 reticle + world aim resolution
├── core/                GameLoop/EventBus/lifecycle helpers
├── config/              game/performance/controls
├── input/               normalized desktop/touch actions
├── physics/             collision + dynamic spatial helpers
├── navigation/          navmesh/query/avoidance/worker
├── simulation/
│   ├── entities/
│   ├── player/
│   ├── combat/
│   ├── enemies/
│   ├── waves/
│   └── pickups/
├── characters/          GLB characters/animation/FaceSystem
├── camera/              director/TOP/3RD/collision
├── world/               assets/levels/materials/vegetation
├── rendering/           renderer/lighting/atmosphere/quality
├── presentation/
│   ├── combat/
│   ├── effects/
│   ├── audio/
│   └── ui/
├── persistence/         FaceStore/settings/save
└── debug/
```

`GameApp` remains larger than the target architecture permits. Decomposition resumes after parity-critical wiring stabilizes.

---

# 14. Temporary / legacy pieces

- `game-v050.js` and legacy root;
- same-origin Three/GLTF runtime proxies used by legacy;
- procedural hero/environment;
- temporary FaceSystem plane;
- direct-chase enemy movement;
- primitive pickup visuals;
- engine-lab debug status HUD.

---

# 15. Change rules

1. Do not grow `main.ts` or `GameApp` into permanent monoliths.
2. ProductShell owns browser UI/file APIs; simulation must not.
3. Visible reticle, player facing and actual shot direction share one AimController state.
4. Simulation does not create DOM/audio/particles directly.
5. Collision, crowd lookup and navigation remain separate.
6. Weapons/enemies/FX remain data-driven.
7. Level gameplay objects are driven by manifest semantics.
8. Repeating visual systems must be bounded by pools/batches/budgets.
9. External code/assets require license tracking.
10. `package-lock.json` is canonical; CI uses `npm ci`.
11. Every development PR must pass strict typecheck + Chromium smoke + build.
12. Generated `dist-next` is build output, never canonical source.
13. Production switch requires parity + real Android validation.
14. Update `structure.md`, `dev.md`, `history.md` at large checkpoints.

# Facefall Survivor — Structure

Последняя актуализация: **2026-08-11**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`  
Production root: **legacy 0.5 ALPHA on Vercel**  
Latest engine-next checkpoint: **PR #9 / `0876eff1839e9c93a669dc328cf225e200ebf498`**  
Focused aim checkpoint: **PR #7 / `967993a3c7d57c448e152526d81c9d7f3249789a`**

---

# 1. Назначение

`structure.md` фиксирует текущую и целевую архитектуру Facefall Survivor: фактические файлы, границы систем, временные legacy-части и структуру, к которой проект должен прийти.

---

# 2. Итоговая технологическая формула

> **TypeScript + Vite + npm Three.js + GLB/manifest levels + static Octree/Capsule collision + SpatialHash + navmesh AI + data-driven combat + event-driven presentation + pooled/batched FX + local-first face system + mobile-first controls/performance.**

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
│   └── copy-legacy.mjs
│
├── src/
│   ├── main.ts
│   │
│   ├── app/
│   │   ├── Bootstrap.ts
│   │   ├── GameApp.ts
│   │   ├── GameState.ts
│   │   └── ProductShell.ts
│   │
│   ├── aim/
│   │   └── AimController.ts
│   │
│   ├── characters/
│   │   └── FaceSystem.ts
│   │
│   ├── persistence/
│   │   └── FaceStore.ts
│   │
│   ├── core/
│   │   ├── EventBus.ts
│   │   └── GameLoop.ts
│   │
│   ├── input/
│   │   ├── InputManager.ts
│   │   ├── KeyboardMouseInput.ts
│   │   ├── TouchInput.ts
│   │   └── MovementFrame.ts
│   │
│   ├── physics/
│   │   ├── CollisionWorld.ts
│   │   ├── PlayerCapsule.ts
│   │   └── SpatialHash.ts
│   │
│   ├── camera/
│   │   ├── CameraCollision.ts
│   │   ├── CameraDirector.ts
│   │   ├── TopDownCamera.ts
│   │   └── ThirdPersonCamera.ts
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
│   ├── enemies/
│   │   ├── archetypes.ts
│   │   └── EnemySystem.ts
│   │
│   ├── waves/
│   │   └── WaveDirector.ts
│   │
│   ├── pickups/
│   │   └── PickupSystem.ts
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
│   ├── rendering/
│   │   └── RainField.ts
│   │
│   ├── graphics/
│   │   └── quality.ts
│   │
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
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── THIRD_PARTY_NOTICES.md
├── README.md
├── dev.md
├── structure.md
└── history.md
```

Generated CI/build output, not source-of-truth:

```text
dist-next/
├── index.html                  # copied legacy production root
├── game-v050.js
├── styles-safe.css
├── engine-lab.html             # compiled Vite engine-next
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
ProductShell
  ↓ file selection
FaceStore
  ↓ localStorage dataURL
ProductShell preview
  ↓ start({ faceDataUrl })
GameApp
  ↓
FaceSystem
  ↓
prototype hero face mesh/texture
```

Current `FaceSystem` is a functional-parity implementation. Final production integration must fit the face to the real character head/UV instead of keeping the temporary plane.

Privacy rule remains local-first: the face image is not required to leave the browser.

---

# 6. Aim architecture

The reticle is gameplay state, not decoration.

```text
Mouse / touch swipe
  ↓
Input adapters
  ↓
AimController screen-space NDC
  ├── visible reticle
  ├── TOP → camera ray → world aim
  │          └── hero facing follows same world direction
  └── 3RD → camera ray + floating-reticle soft edge
                   ↓
             CameraDirector turn demand
                   ↓
            world-space aim direction
                   ↓
              WeaponSystem
                   ↓
                ShotEvent
```

Invariant:

> **Visible reticle, procedural hero facing and actual player ShotEvent all derive from the same AimController state.**

---

# 7. Input / movement / camera

```text
KeyboardMouseInput ─┐
                    ├→ InputManager → MovementFrame → simulation
TouchInput ─────────┘
```

`MovementFrame` maps joystick/WASD relative to the active camera, so screen-up means forward in both TOP and 3RD.

```text
CameraDirector
├── TopDownCamera
└── ThirdPersonCamera
      └── CameraCollision → CollisionWorld
```

Both cameras use one player/world simulation.

---

# 8. Core runtime

```text
src/main.ts
  ↓
Bootstrap
  ├── binds AimController reticle
  ├── creates GameApp
  └── creates ProductShell

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

There must never be a second independent gameplay/physics loop.

---

# 9. Physics / spatial / navigation

Current:

```text
Static world → CollisionWorld / Octree
                         ↑
                   PlayerCapsule

EnemySystem → moving actors → SpatialHash
```

Raycast/segmentCast are reused for camera collision, hitscan occlusion and ballistic projectile collision.

Current infected movement is direct chase. Target:

```text
EnemyBrain
  ↓
NavMeshQuery
  ↓
Path corridor
  ↓
LocalAvoidance + SpatialHash
  ↓
Desired velocity
```

Collision and navigation remain separate.

---

# 10. Combat / enemies / waves

```text
AimController/Input.fire
  ↓
WeaponSystem
  ↓
ShotEvent
  ├── pistol → hitscan
  ├── shotgun → multi-hitscan
  └── bow → ProjectileSystem → ballistic segment collision
                                   ↓
                              DamageSystem
                               ↓       ↓
                             Hit      Kill
```

Player receives infected melee through the same DamageSystem/Health pipeline.

```text
LevelManifest enemy-spawn markers
  ↓
WaveDirector
  ↓
EnemySystem.spawn(Walker / Runner / Brute)
```

WaveDirector owns wave composition/timing; final navmesh will not change that contract.

---

# 11. Pickup architecture

Pickups are semantic level objects, not coordinates hardcoded inside `PickupSystem`.

```text
LevelManifest kind=loot
  ↓
PickupSystem.configure()
  ├── health → Health.heal()
  └── ammo → WeaponSystem.addReserve()
       ↓
proximity collection
       ↓
hide / timed respawn / reset with run
```

Current Abandoned Outskirts manifest contains health and ammo loot markers. The system supports bounded simple visuals and an 18-second respawn prototype.

---

# 12. Presentation / atmosphere

Combat presentation:

```text
Shot / Hit event
  ↓
EffectSystem + recipe
  ├── particles
  ├── decals
  ├── transient lights
  ├── wind
  └── camera impulse
```

Atmosphere currently adds:

```text
RainField
  ↓ quality profile
single Points geometry
  ↓
420 / 760 / 1200 approximate drops by profile
  ↓
recycled around player anchor
```

Rain intentionally avoids one Mesh per drop. Audio will become a separate presentation adapter later.

---

# 13. Level architecture

Target:

```text
public/assets/levels/abandoned-outskirts/
├── level.glb
├── level.manifest.json
├── navmesh data
└── preview.webp
```

- GLB → visual/collision geometry;
- manifest → player/enemy spawns, lights, loot, wind/audio zones, choke points, interactions;
- navmesh → infected traversal.

Manifest already drives player spawn, enemy spawn zones, prototype lights and loot. Procedural geometry remains fallback until authored `level.glb` exists.

---

# 14. Release architecture

```text
npm run build:deploy
  ├── Vite engine-next → dist-next
  └── copy stable legacy root → dist-next

CI
  ↓ install
  ↓ strict TypeScript
  ↓ combined Vercel build
  ↓ artifact upload
```

Transition policy:

- production `/` remains stable legacy;
- engine-next is tested separately;
- production root switches only after 0.5B parity + latest Android smoke-test.

The current Vercel connector has an inconsistent preview-deploy contract, so a new preview is not considered published unless the deployment call actually succeeds.

---

# 15. Target structure

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

# 16. Temporary / legacy pieces

Temporary:

- `game-v050.js` and legacy root;
- same-origin Three/GLTF runtime proxies used by legacy;
- procedural hero/environment;
- temporary FaceSystem plane;
- direct-chase enemy movement;
- primitive pickup visuals;
- engine-lab debug status HUD.

They are removed/replaced only after functional parity and device verification.

---

# 17. Change rules

1. Do not grow `main.ts` or `GameApp` into permanent monoliths.
2. ProductShell owns browser UI/file APIs; simulation must not.
3. Visible reticle, player facing and actual shot direction share one AimController state.
4. Simulation does not create DOM/audio/particles directly.
5. Collision, crowd lookup and navigation remain separate.
6. Weapons/enemies/FX remain data-driven.
7. Level gameplay objects are driven by manifest semantics.
8. Repeating visual systems must be bounded by pools/batches/budgets.
9. External code/assets require license tracking.
10. Generated `dist-next` is build output, never canonical source.
11. Production switch requires parity + real Android validation.
12. Update `structure.md`, `dev.md`, `history.md` at large checkpoints.

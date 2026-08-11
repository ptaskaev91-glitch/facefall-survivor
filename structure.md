# Facefall Survivor — Structure

Последняя актуализация: **2026-08-12**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`  
Текущий milestone: **0.8 COMBAT+AI — primary test release candidate**

---

# 1. Назначение

`structure.md` — источник истины по текущей и целевой архитектуре Facefall Survivor.

После крупных checkpoint файл должен отвечать:

1. что реально существует сейчас;
2. какие части временные;
3. как системы взаимодействуют;
4. к какой структуре идём дальше.

---

# 2. Итоговая технологическая формула

> **TypeScript + Vite + npm Three.js + glTF/GLB + manifest-driven levels + Octree/Capsule physics + SpatialHash/local avoidance + NavigationQuery/Recast target + data-driven combat + event-driven presentation + bounded FX/audio + local-first FaceSystem + mobile-first controls/performance + locked CI/browser smoke + Vercel.**

GitHub `main` — canonical source. Vercel — единственный hosting target.

---

# 3. Текущая source structure

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
├── tests/
│   └── smoke/
│       └── engine-next.spec.ts
│
├── src/
│   ├── main.ts
│   ├── app/
│   │   ├── Bootstrap.ts
│   │   ├── GameApp.ts
│   │   ├── GameState.ts
│   │   └── ProductShell.ts
│   ├── aim/
│   │   ├── AimController.ts
│   │   └── AimAssist.ts
│   ├── camera/
│   │   ├── CameraCollision.ts
│   │   ├── CameraDirector.ts
│   │   ├── TopDownCamera.ts
│   │   └── ThirdPersonCamera.ts
│   ├── characters/
│   │   └── FaceSystem.ts
│   ├── combat/
│   │   ├── types.ts
│   │   ├── weapons.ts
│   │   ├── Health.ts
│   │   ├── DamageSystem.ts
│   │   ├── WeaponSystem.ts
│   │   ├── ProjectileSystem.ts
│   │   ├── ProjectileVisuals.ts
│   │   └── CombatFeedback.ts
│   ├── core/
│   │   ├── EventBus.ts
│   │   └── GameLoop.ts
│   ├── effects/
│   │   ├── recipes.ts
│   │   ├── EffectSystem.ts
│   │   ├── RuntimeFx.ts
│   │   ├── ParticlePool.ts
│   │   ├── DecalPool.ts
│   │   ├── LightPool.ts
│   │   └── WindField.ts
│   ├── enemies/
│   │   ├── archetypes.ts
│   │   ├── EnemyBrain.ts
│   │   └── EnemySystem.ts
│   ├── graphics/
│   │   └── quality.ts
│   ├── input/
│   │   ├── InputManager.ts
│   │   ├── KeyboardMouseInput.ts
│   │   ├── TouchInput.ts
│   │   └── MovementFrame.ts
│   ├── navigation/
│   │   ├── NavigationQuery.ts
│   │   ├── CollisionNavigationQuery.ts
│   │   └── LocalAvoidance.ts
│   ├── persistence/
│   │   ├── FaceStore.ts
│   │   └── SettingsStore.ts
│   ├── physics/
│   │   ├── CollisionWorld.ts
│   │   ├── PlayerCapsule.ts
│   │   └── SpatialHash.ts
│   ├── pickups/
│   │   └── PickupSystem.ts
│   ├── presentation/
│   │   └── audio/
│   │       └── AudioSystem.ts
│   ├── rendering/
│   │   ├── RainField.ts
│   │   └── StormSystem.ts
│   ├── waves/
│   │   └── WaveDirector.ts
│   └── world/
│       ├── AssetManager.ts
│       ├── LevelLoader.ts
│       ├── LevelManifest.ts
│       └── GrassField.ts
│
├── index.html                  # legacy source checkpoint, no longer deployment root in 0.8 test release
├── game-v050.js
├── styles-safe.css
├── engine-lab.html             # Vite engine-next source entry
├── package.json
├── package-lock.json
├── playwright.config.ts
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── THIRD_PARTY_NOTICES.md
├── README.md
├── dev.md
├── structure.md
└── history.md
```

---

# 4. Deployment structure from 0.8

`npm run build:deploy` produces:

```text
dist-next/
├── index.html                  # compiled engine-next 0.8; PRIMARY /
├── engine-lab.html             # same engine-next build for debug/direct access
├── assets/                     # Vite bundled Three.js/game chunks
├── legacy/
│   ├── index.html              # previous 0.5 ALPHA checkpoint
│   ├── game-v050.js
│   └── styles-safe.css
└── assets/levels/...           # copied public assets
```

From 0.8 test release:

- `/` → engine-next;
- `/engine-lab.html` → engine-next debug/test entry;
- `/legacy/` → preserved old runtime for comparison/rollback testing.

Three.js for engine-next is bundled by Vite. Legacy proxy rewrites may temporarily remain only to keep `/legacy/` functional and must be removed after final migration cleanup.

---

# 5. Runtime lifecycle

```text
BOOT
 ↓
MENU
 ├─ face select/preview/remove
 ├─ TOP / 3RD selection
 ├─ aim sensitivity
 ├─ deadzone
 ├─ aim assist
 └─ audio volume
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

`ProductShell` owns browser form/file/localStorage UI. `GameApp` receives normalized options.

---

# 6. Fixed runtime flow

```text
src/main.ts
 ↓
Bootstrap
 ├─ GameApp
 ├─ ProductShell
 └─ AudioSystem

GameLoop fixed 60 Hz simulation
 ↓
Input snapshot
 ↓
Aim / player movement
 ↓
Weapons / projectiles
 ↓
Enemy brain / navigation / avoidance
 ↓
Damage / waves / pickups
 ↓
Gameplay events
 ↓
FX / audio / storm / HUD
 ↓
Camera
 ↓
Render
```

Rule: there is only one gameplay/physics loop.

---

# 7. Input / movement / aiming

```text
KeyboardMouseInput ─┐
                    ├→ InputManager
TouchInput ─────────┘
        ↓
MovementFrame        AimController
camera-relative      visible reticle state
movement             ↓
                     AimAssist (mobile soft correction)
                     ↓
                     world-space aim direction
                     ↓
                     WeaponSystem
```

Critical invariant:

> **Visible reticle and actual shot direction use the same AimController state.**

0.8 adds:

- persisted sensitivity;
- persisted 3RD deadzone;
- persisted soft Aim Assist;
- recoil nudges the same reticle state, so visual recoil and weapon direction cannot diverge.

Aim Assist never fires automatically and never hard-snaps to an enemy.

---

# 8. Camera architecture

```text
CameraDirector
├── TopDownCamera
└── ThirdPersonCamera
      └── CameraCollision → CollisionWorld
```

Both modes use one Player/Simulation.

TOP:

- free screen reticle;
- hero facing follows resolved world aim;
- camera-relative movement.

3RD:

- floating reticle;
- soft-edge turn demand;
- shoulder camera;
- wall push-in;
- vertical aiming.

---

# 9. Physics / navigation / crowd

Physics:

```text
Static level → CollisionWorld / Octree
Player       → Capsule
Projectiles  → segment/ray queries
Camera       → collision ray query
```

Crowd:

```text
Enemy positions → SpatialHash → LocalAvoidance
```

Navigation in 0.8 test build:

```text
EnemyBrain
 ↓ desired target
NavigationQuery
 ↓
CollisionNavigationQuery
 ├─ direct path when clear
 └─ short left/right obstacle detour when blocked
 ↓
LocalAvoidance
 ↓
Enemy movement
```

Final authored-map target remains:

```text
Offline Recast/Detour navmesh
 ↓
runtime Recast NavigationQuery adapter
 ↓
LocalAvoidance + SpatialHash
```

`CollisionNavigationQuery` is a practical browser-safe fallback for the current procedural test level, not the final pathfinding solution.

---

# 10. Enemy architecture 0.8

Archetypes:

- Walker;
- Runner;
- Brute.

Current lightweight State Tree:

```text
STAGGER
  ↑ hit
WANDER
  ↓ hears/retains alert
INVESTIGATE
  ↓ sees player
CHASE
  ↓ range
ATTACK / HOLD
  ↓ target lost
INVESTIGATE
  ↓ alert expires
WANDER
```

Current perception:

- distance-based sight range;
- optional line-of-sight hook exists;
- last-known player position;
- alert timer;
- `hearNoise()` API exists.

Still pending:

- wiring actual Octree LOS callback;
- wiring weapon noise into `hearNoise()`;
- AI update LOD;
- final navmesh.

Stagger is archetype-dependent: Brute resists it more strongly.

---

# 11. Combat architecture 0.8

```text
AimController/Input.fire
 ↓
WeaponSystem
 ↓
ShotEvent
 ├─ pistol → hitscan
 ├─ shotgun → multi-hitscan
 └─ bow → ballistic ProjectileSystem
                   ↓
             DamageSystem
              ↓       ↓
             Hit     Kill
              ↓
     Enemy stagger / FX / audio
```

Data-driven `WeaponDefinition` controls:

- ammo;
- damage;
- pellets;
- base spread;
- fire interval;
- reload time;
- projectile physics;
- impulse;
- hit-zone multipliers;
- recoil profile;
- FX recipe IDs.

0.8 adds:

- movement-dependent spread;
- visible/camera recoil;
- recoil by weapon profile;
- reload event/audio;
- head/torso/limb damage multipliers;
- stagger/knock response.

Bow remains a physical ballistic projectile rather than hitscan.

---

# 12. Presentation / atmosphere

Simulation emits events. Presentation listens.

```text
Shot / Reload / Hit / Kill / EnemyAttack / Footstep / Thunder
 ↓
Presentation
 ├─ EffectSystem
 │   ├─ particles
 │   ├─ decals
 │   ├─ lights
 │   └─ camera impulse
 ├─ AudioSystem
 │   ├─ weapon transients
 │   ├─ reload
 │   ├─ impacts
 │   ├─ infected attack cues
 │   ├─ footsteps
 │   ├─ rain/wind
 │   └─ thunder
 ├─ RainField
 └─ StormSystem
```

All repeating visual systems are bounded/pool-based. Storm reuses one transient light.

---

# 13. World / levels

Current level is still procedural test geometry plus a real `LevelManifest`.

Target `Abandoned Outskirts`:

```text
public/assets/levels/abandoned-outskirts/
├── level.glb
├── level.manifest.json
├── navmesh data
└── preview.webp
```

Responsibilities:

- `level.glb` → visual/collision geometry;
- manifest → player/enemy spawns, lights, loot, audio/wind/event markers;
- navmesh → AI traversal.

Manifest already drives player spawn, waves, lights and pickups.

---

# 14. Face architecture

```text
ProductShell
 ↓ image file
FaceStore(localStorage)
 ↓
GameApp.start(faceDataUrl)
 ↓
FaceSystem
```

Current 0.8 implementation is parity-level and uses a temporary face plane on the prototype hero.

Target Face System 2.0:

- crop/zoom/pan;
- mask;
- normalization;
- real production-head integration;
- local-first privacy.

---

# 15. CI / release

Every gameplay PR must pass:

```text
npm ci
 ↓
strict TypeScript
 ↓
Playwright Chromium smoke
 ↓
Vite production build
 ↓
deployment-root assertion
 ↓
artifact upload
```

0.8 deployment-root assertion verifies:

- `dist-next/index.html` contains ENGINE NEXT 0.8;
- `/legacy/` checkpoint files exist.

---

# 16. Reuse / licensing

Direct permissive adaptations already tracked in `THIRD_PARTY_NOTICES.md`:

- Capsule/Octree collision-response approach from `ivanoskov/shooter`;
- GLTF loading/traverse preparation from `ivanoskov/shooter`.

Rules:

- permissive isolated code may be adapted with attribution;
- GPL Unvanquished game code is not copied;
- native C++ reference systems are reimplemented for browser/TypeScript;
- external media has independent license review;
- final assets must be listed in `public/assets/ATTRIBUTION.md`.

---

# 17. Target structure after visual/content migration

```text
src/
├── app/
├── core/
├── config/
├── input/
├── aim/
├── camera/
├── physics/
├── navigation/
├── simulation/
│   ├── player/
│   ├── combat/
│   ├── enemies/
│   ├── waves/
│   └── pickups/
├── characters/
├── world/
├── rendering/
├── presentation/
│   ├── combat/
│   ├── effects/
│   ├── audio/
│   └── ui/
├── persistence/
└── debug/
```

`GameApp` remains too large and should be decomposed after production-critical systems stop changing rapidly.

---

# 18. Temporary pieces

Still temporary after 0.8:

- procedural hero;
- procedural infected meshes;
- procedural test world;
- temporary face plane;
- collision-detour navigation fallback;
- debug status HUD;
- legacy runtime retained under `/legacy/`;
- legacy CDN rewrite compatibility.

These are not blockers for 0.8 gameplay testing, but they are not final 1.0 architecture/content.

---

# 19. Next structural transition

After 0.8 device feedback:

1. fix mobile controls/aim/combat regressions found on real Android;
2. create authored `Abandoned Outskirts` GLB;
3. bake/load Recast navmesh and implement Recast `NavigationQuery` adapter;
4. replace procedural characters/weapons;
5. move toward Face System 2.0;
6. decompose `GameApp`;
7. remove `/legacy/` and proxy debt only after new production runtime proves stable.

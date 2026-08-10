# Facefall Survivor — Structure

Последняя актуализация: **2026-08-10**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`  
Production: **legacy 0.5 ALPHA on Vercel**  
Engine-next checkpoint: **PR #1 merged, `0a599032`**

---

# 1. Назначение файла

`structure.md` — источник истины по текущей и целевой структуре Facefall Survivor.

Файл отвечает на вопросы:

1. Что реально существует сейчас.
2. Что является legacy/temporary.
3. К какой архитектуре мы идём.
4. Как разделены responsibility между systems.

После крупной архитектурной контрольной точки файл обновляется вместе с `dev.md` и `history.md`.

---

# 2. Продуктовая архитектура

Facefall — browser/mobile-first 3D action-survival:

- TOP / Diablo-like camera;
- third-person over-the-shoulder camera;
- pistol / shotgun / bow;
- Walker / Runner / Brute;
- waves;
- пользовательское лицо на герое;
- authored GLB environment;
- touch + desktop input;
- Android как обязательная тестовая платформа;
- GitHub `main` → Vercel.

---

# 3. Итог трёх аудитов

Использованные architectural references:

- `ivanoskov/shooter` → browser/Three.js foundation;
- `Unvanquished/Unvanquished` → gameplay/system separation;
- `redeclipse/base` → weapons/FX/environment principles.

Итог:

> **Vite + TypeScript + npm Three.js + static Octree/Capsule + navmesh AI + data-driven combat + event-based simulation + pooled presentation + GLB/manifest levels.**

Не форкаем ни один reference repository.

---

# 4. Текущая файловая структура

```text
facefall-survivor/
├── .github/
│   └── workflows/
│       └── engine-next-ci.yml
│
├── src/
│   ├── main.ts                     # thin bootstrap entrypoint
│   │
│   ├── app/
│   │   ├── Bootstrap.ts
│   │   ├── GameApp.ts
│   │   └── GameState.ts
│   │
│   ├── core/
│   │   ├── EventBus.ts
│   │   └── GameLoop.ts
│   │
│   ├── input/
│   │   ├── InputManager.ts
│   │   ├── KeyboardMouseInput.ts
│   │   └── TouchInput.ts
│   │
│   ├── physics/
│   │   └── CollisionWorld.ts
│   │
│   ├── camera/
│   │   ├── CameraDirector.ts
│   │   ├── TopDownCamera.ts
│   │   ├── ThirdPersonCamera.ts
│   │   └── DualCameraRig.ts        # temporary compatibility shim
│   │
│   ├── combat/
│   │   ├── types.ts
│   │   ├── weapons.ts
│   │   ├── Health.ts
│   │   ├── WeaponSystem.ts
│   │   ├── DamageSystem.ts
│   │   ├── ProjectileSystem.ts
│   │   └── CombatFeedback.ts
│   │
│   ├── enemies/
│   │   └── archetypes.ts
│   │
│   ├── effects/
│   │   ├── recipes.ts
│   │   ├── EffectSystem.ts
│   │   ├── ParticlePool.ts
│   │   ├── DecalPool.ts
│   │   ├── LightPool.ts
│   │   └── WindField.ts
│   │
│   ├── graphics/
│   │   └── quality.ts
│   │
│   └── world/
│       └── GrassField.ts
│
├── index.html                     # legacy production entrypoint
├── styles-safe.css                # legacy production UI/CSS
├── game-v050.js                   # legacy monolithic runtime
├── engine-lab.html                # isolated engine-next page
├── vercel.json                    # legacy proxy/config
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── dev.md
├── structure.md
└── history.md
```

---

# 5. Что является legacy

Временно сохраняются:

- `index.html` как текущий production entrypoint;
- `game-v050.js`;
- `styles-safe.css`;
- Vercel rewrites для Three.js/GLTF/hero model;
- тестовый Soldier GLB pipeline;
- procedural hero/enemy/weapon geometry;
- `DualCameraRig.ts` compatibility shim.

Legacy удаляется только после:

- functional parity engine-next;
- зелёного CI;
- desktop smoke-test;
- Android smoke-test;
- TOP + 3RD;
- touch input;
- face upload;
- pistol/shotgun/bow;
- enemies/waves;
- отсутствие infinite loader.

---

# 6. Текущие системные границы

## Bootstrap

`src/main.ts`:

```text
bootstrapEngineNext()
```

В нём не должно появляться gameplay logic.

## GameApp

Сейчас `GameApp` — lifecycle/integration container engine-lab.

Он отвечает за:

- renderer/scene bootstrap;
- system wiring;
- start/pause/resume/dispose;
- visibility handling;
- temporary lab world integration.

Он **не должен** постепенно превратиться в новый monolith. По мере развития responsibilities выносятся в отдельные systems.

## GameState

Текущий state foundation:

```text
boot → loading → playing ↔ paused
                  ↓
                 error
                  ↓
               disposed
```

На functional parity расширяется до product-level MENU/FACE_SETUP/GAME_OVER.

## GameLoop

Единственный fixed loop:

```text
input snapshot
 ↓
fixed simulation
 ↓
presentation/animation
 ↓
camera
 ↓
render
```

Второй physics/update loop запрещён.

## EventBus

Typed communication между gameplay и presentation systems.

---

# 7. Input architecture

```text
KeyboardMouseInput ─┐
                    ├→ InputManager → normalized action state → simulation
TouchInput ─────────┘
```

Touch UI не реализует свои правила боя.

`TouchInput.detach()` обязан полностью снимать listeners и reset-ить input state.

Целевые actions:

- move;
- aim/look;
- fire;
- reload;
- switch weapon;
- camera toggle;
- sprint;
- interact позже.

---

# 8. Camera architecture

После PR #1 камеры разделены:

```text
CameraDirector
├── TopDownCamera
└── ThirdPersonCamera
```

Текущий `DualCameraRig.ts` — только compatibility shim.

## TopDownCamera target

- Diablo-like angle;
- smooth follow;
- zoom;
- pointer/touch aim;
- camera-relative movement;
- crowd readability.

## ThirdPersonCamera target

- over-the-shoulder;
- side offset;
- camera collision;
- crosshair target ray;
- weapon/upper-body aim;
- FOV dynamics;
- recoil/shake;
- mobile aim assist.

Обе камеры управляют отображением одной simulation.

---

# 9. Physics architecture

```text
Static level geometry
       ↓
CollisionWorld / Octree
       ↑
Player Capsule
```

Целевое расширение:

```text
physics/
├── CollisionWorld.ts
├── PlayerCapsule.ts
├── DynamicColliders.ts
└── SpatialHash.ts
```

Правила:

- Octree = static collision;
- SpatialHash = nearby dynamic entities/crowd;
- navigation ≠ collision;
- general rigid-body engine не добавляем без реальной необходимости.

---

# 10. Combat architecture

```text
Input
 ↓
WeaponSystem
 ↓
ShotEvent
 ├── pistol → hitscan
 ├── shotgun → multi-hitscan
 └── bow → ProjectileSystem
                  ↓
             collision
                  ↓
DamageSystem / Health
 ├── HitEvent
 └── KillEvent
```

Data-driven `WeaponDefinition` содержит:

- magazine/reserve;
- fire interval;
- reload;
- damage;
- head/limb multipliers;
- spread;
- recoil;
- impulse;
- hitscan/projectile model;
- projectile speed/gravity;
- FX recipe references later.

---

# 11. Presentation / FX architecture

После PR #1 существует:

```text
EffectSystem
├── recipes
├── ParticlePool
├── DecalPool
├── LightPool
└── WindField
```

`EffectSystem` — orchestrator, а не simulation.

Пример target flow:

```text
HitEvent
 ↓
CombatFeedback
 ↓
EffectSystem.play("flesh-hit")
 ├── particles
 ├── decal
 ├── transient light
 ├── sound adapter
 ├── wind impulse
 ├── camera shake
 └── hit-stop adapter
```

Все runtime effects имеют budget/TTL/pool.

---

# 12. Enemy / navigation target

Минимум:

- Walker;
- Runner;
- Brute.

Decision model:

```text
wander
 ↓
investigate
 ↓
chase
 ↓
attack
 ↓
stagger/recover
 ↓
dead
```

Navigation:

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

Целевая файловая структура:

```text
navigation/
├── NavMesh.ts
├── NavMeshQuery.ts
├── LocalAvoidance.ts
└── NavigationWorker.ts
```

---

# 13. Level architecture

Первая authored location: **Abandoned Outskirts**.

Не строить финальный уровень сотнями `BoxGeometry` внутри TypeScript.

```text
public/assets/levels/abandoned-outskirts/
├── level.glb
├── level.manifest.json
├── navmesh.bin
└── preview.webp
```

Разделение:

- `level.glb` → visuals/collision geometry;
- `level.manifest.json` → gameplay/environment markers;
- `navmesh` → AI traversal.

Manifest содержит:

- player spawn;
- zombie spawn zones;
- loot points;
- lights;
- wind/audio zones;
- choke points;
- interactables;
- scripted anchors;
- navigation modifiers.

---

# 14. Asset pipeline target

```text
source / Blender
 ↓
scale/naming/skeleton/material cleanup
 ↓
GLB export
 ↓
optimization
 ↓
KTX2/Basis where useful
 ↓
Meshopt where useful
 ↓
asset budget check
 ↓
public/assets
```

External assets требуют записи в:

`public/assets/ATTRIBUTION.md`

---

# 15. Mobile performance architecture

Quality profiles:

- `mobile-low`;
- `mobile-high`;
- `desktop-high`.

Quality Manager target controls:

- DPR;
- shadow maps;
- shadow-casting lights;
- grass budget/distance;
- rain;
- particle/decal/light pools;
- fog;
- texture quality;
- infected LOD/update frequency.

Primary target: **30+ FPS Android**.

Desktop target: **60 FPS**.

---

# 16. Целевая структура проекта

```text
facefall-survivor/
├── public/
│   └── assets/
│       ├── characters/
│       │   ├── hero/
│       │   └── infected/{walker,runner,brute}/
│       ├── weapons/{pistol,shotgun,bow}/
│       ├── levels/abandoned-outskirts/
│       ├── environment/
│       ├── textures/
│       ├── audio/
│       ├── ui/
│       └── ATTRIBUTION.md
│
├── src/
│   ├── main.ts
│   ├── app/
│   │   ├── Bootstrap.ts
│   │   ├── GameApp.ts
│   │   └── GameState.ts
│   ├── core/
│   │   ├── GameLoop.ts
│   │   ├── EventBus.ts
│   │   ├── Disposable.ts
│   │   └── ids.ts
│   ├── config/
│   │   ├── game.ts
│   │   ├── performance.ts
│   │   └── controls.ts
│   ├── input/
│   │   ├── InputManager.ts
│   │   ├── actions.ts
│   │   ├── KeyboardMouseInput.ts
│   │   └── TouchInput.ts
│   ├── physics/
│   │   ├── CollisionWorld.ts
│   │   ├── PlayerCapsule.ts
│   │   ├── DynamicColliders.ts
│   │   └── SpatialHash.ts
│   ├── navigation/
│   │   ├── NavMesh.ts
│   │   ├── NavMeshQuery.ts
│   │   ├── LocalAvoidance.ts
│   │   └── NavigationWorker.ts
│   ├── simulation/
│   │   ├── entities/
│   │   ├── player/
│   │   ├── combat/
│   │   ├── enemies/
│   │   ├── waves/
│   │   └── pickups/
│   ├── characters/
│   │   ├── PlayerCharacter.ts
│   │   ├── CharacterAnimator.ts
│   │   ├── InfectedAnimator.ts
│   │   └── FaceSystem.ts
│   ├── camera/
│   │   ├── CameraDirector.ts
│   │   ├── TopDownCamera.ts
│   │   ├── ThirdPersonCamera.ts
│   │   └── CameraCollision.ts
│   ├── world/
│   │   ├── World.ts
│   │   ├── AssetManager.ts
│   │   ├── LevelLoader.ts
│   │   ├── LevelManifest.ts
│   │   ├── MaterialLibrary.ts
│   │   ├── GrassField.ts
│   │   └── InteractableRegistry.ts
│   ├── rendering/
│   │   ├── Renderer.ts
│   │   ├── Lighting.ts
│   │   ├── Atmosphere.ts
│   │   ├── QualityManager.ts
│   │   └── VisibilityManager.ts
│   ├── presentation/
│   │   ├── combat/CombatFeedback.ts
│   │   ├── effects/
│   │   │   ├── EffectSystem.ts
│   │   │   ├── recipes.ts
│   │   │   ├── ParticlePool.ts
│   │   │   ├── DecalPool.ts
│   │   │   ├── LightPool.ts
│   │   │   └── WindField.ts
│   │   ├── audio/
│   │   └── ui/
│   ├── persistence/
│   └── debug/
├── tests/
├── scripts/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── README.md
├── dev.md
├── structure.md
└── history.md
```

---

# 17. Legacy → engine-next migration

```text
legacy production
index.html + game-v050.js + styles-safe.css
            │
            │ engine-next builds in parallel
            ↓
Vite/TypeScript functional parity
            │
            ├── desktop smoke
            ├── Android smoke
            └── CI green
            ↓
Vite production migration
            │
            ├── remove runtime Three proxy
            ├── remove legacy entrypoint
            └── keep Git history as rollback source
```

---

# 18. Следующие структурные изменения

В ближайшем порядке:

1. убрать compatibility `DualCameraRig` после прямого перехода GameApp на CameraDirector;
2. добавить `PlayerCapsule`;
3. добавить `SpatialHash`;
4. добавить camera/world collision abstraction;
5. интегрировать EffectSystem;
6. добавить AssetManager;
7. добавить LevelLoader/LevelManifest;
8. затем строить functional parity.

---

# 19. Правила изменения структуры

1. Не создавать новый subsystem без понятной responsibility.
2. `src/main.ts` не расширять gameplay logic.
3. `GameApp` — integration/lifecycle container, не новый monolith.
4. Simulation не импортирует presentation для запуска эффектов напрямую.
5. Weapon/enemy balance остаётся data-driven.
6. Collision и navigation остаются раздельными.
7. Assets без понятной лицензии не входят в production repository.
8. Temporary compatibility files удаляются отдельным cleanup step.
9. После крупной структурной контрольной точки обновляются `structure.md`, `dev.md`, `history.md`.

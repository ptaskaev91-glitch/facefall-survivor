# Facefall Survivor — Structure

Последняя актуализация: **2026-08-10**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`  
Production: **legacy 0.5 ALPHA on Vercel**  
Engine-next checkpoint: **PR #2 merged, `29008e7d`**

---

# 1. Назначение файла

`structure.md` — источник истины по текущей и целевой структуре Facefall Survivor.

Файл отвечает на четыре вопроса:

1. Что реально существует сейчас.
2. Что является legacy/temporary.
3. К какой архитектуре идём.
4. Как разделены responsibility между systems.

После крупного architecture checkpoint файл обновляется вместе с `dev.md` и `history.md`.

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

# 3. Итог трёх аудитов и reuse policy

Architectural references:

- `ivanoskov/shooter` → browser/Three.js foundation;
- `Unvanquished/Unvanquished` → gameplay/system separation;
- `redeclipse/base` → weapons/FX/environment principles.

Итоговая технология:

> **Vite + TypeScript + npm Three.js + static Octree/Capsule + navmesh AI + data-driven combat + event-based simulation + pooled presentation + GLB/manifest levels.**

Политика переиспользования:

- изолированный код из permissive-compatible source можно адаптировать напрямую;
- источник и лицензия фиксируются в `THIRD_PARTY_NOTICES.md`;
- GPL/несовместимый код не копируется;
- engine-specific native C++ решения переписываются под Facefall;
- внешние media assets отдельно фиксируются в `public/assets/ATTRIBUTION.md`.

На текущем checkpoint прямо адаптированы из MIT `ivanoskov/shooter`:

- capsule/Octree collision-response pattern → `PlayerCapsule.ts`;
- GLTF load/traverse preparation pattern → `AssetManager.ts` / `LevelLoader.ts`.

Остальные новые системы текущего checkpoint написаны под Facefall с нуля.

---

# 4. Текущая файловая структура

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
├── src/
│   ├── main.ts
│   ├── app/
│   │   ├── Bootstrap.ts
│   │   ├── GameApp.ts
│   │   └── GameState.ts
│   ├── core/
│   │   ├── EventBus.ts
│   │   └── GameLoop.ts
│   ├── input/
│   │   ├── InputManager.ts
│   │   ├── KeyboardMouseInput.ts
│   │   └── TouchInput.ts
│   ├── physics/
│   │   ├── CollisionWorld.ts
│   │   ├── PlayerCapsule.ts
│   │   └── SpatialHash.ts
│   ├── camera/
│   │   ├── CameraDirector.ts
│   │   ├── CameraCollision.ts
│   │   ├── TopDownCamera.ts
│   │   └── ThirdPersonCamera.ts
│   ├── combat/
│   │   ├── types.ts
│   │   ├── weapons.ts
│   │   ├── Health.ts
│   │   ├── WeaponSystem.ts
│   │   ├── DamageSystem.ts
│   │   ├── ProjectileSystem.ts
│   │   └── CombatFeedback.ts
│   ├── enemies/
│   │   └── archetypes.ts
│   ├── effects/
│   │   ├── recipes.ts
│   │   ├── EffectSystem.ts
│   │   ├── ParticlePool.ts
│   │   ├── DecalPool.ts
│   │   ├── LightPool.ts
│   │   └── WindField.ts
│   ├── graphics/
│   │   └── quality.ts
│   └── world/
│       ├── AssetManager.ts
│       ├── LevelLoader.ts
│       ├── LevelManifest.ts
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
├── THIRD_PARTY_NOTICES.md
├── README.md
├── dev.md
├── structure.md
└── history.md
```

---

# 5. Что является legacy

Пока сохраняются:

- `index.html` как текущий production entrypoint;
- `game-v050.js`;
- `styles-safe.css`;
- Vercel rewrites для legacy Three.js/GLTF/hero model;
- тестовый Soldier GLB pipeline;
- procedural hero/enemy/weapon geometry.

`DualCameraRig.ts` больше не является legacy debt — compatibility shim удалён после перехода `GameApp` на прямой `CameraDirector`.

Legacy production удаляется только после functional parity + desktop smoke + Android smoke.

---

# 6. Core lifecycle

```text
src/main.ts
  ↓
Bootstrap
  ↓
GameApp
  ↓
GameState + GameLoop + systems
```

`src/main.ts` остаётся thin bootstrap.

`GameApp` — integration/lifecycle container, но не должен становиться новым monolith.

Единственный fixed loop:

```text
input snapshot
 ↓
fixed simulation
 ↓
presentation
 ↓
camera
 ↓
render
```

---

# 7. Input / aim architecture

```text
KeyboardMouseInput ─┐
                    ├→ InputManager → normalized movement/aim/actions
TouchInput ─────────┘
```

Сейчас InputManager поддерживает:

- normalized movement;
- held/pressed actions;
- aim delta;
- pointer/touch NDC point.

TOP:

- cursor/touch point проецируется raycast-ом на ground plane;
- hero facing следует aim point.

3RD:

- mouse/touch look delta вращает facing;
- дальнейший pitch/crosshair/aim-assist остаётся отдельным этапом.

---

# 8. Camera architecture

```text
CameraDirector
├── TopDownCamera
└── ThirdPersonCamera
     └── CameraCollision
```

`CameraCollision` делает static-world ray query и автоматически приближает third-person camera перед стеной.

Обе камеры используют одну Player/World simulation.

---

# 9. Physics architecture

```text
Static level geometry
       ↓
CollisionWorld / Octree
       ├── Capsule resolution
       ├── raycast
       └── segmentCast

PlayerCapsule
       ↓
CollisionWorld

Dynamic nearby entities
       ↓
SpatialHash
```

`PlayerCapsule` использует адаптированный MIT collision-response pattern из `ivanoskov/shooter`, но не владеет camera и рассчитан на Facefall fixed loop.

Правила:

- Octree = static collision;
- SpatialHash = nearby dynamic entities/crowd;
- navigation ≠ collision;
- general rigid-body engine пока не нужен.

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
DamageSystem / Health
 ├── HitEvent
 └── KillEvent
```

Hitscan теперь проверяет static-world occlusion через `CollisionWorld.raycast`, чтобы bullets не проходили через wall до enemy hit.

Следующий combat foundation step — связать ballistic projectiles с world/enemy collision и завершить bow draw/release.

---

# 11. Presentation / FX architecture

```text
ShotEvent / HitEvent
        ↓
EffectSystem
├── recipes
├── ParticlePool
├── DecalPool
├── LightPool
└── WindField
```

На текущем checkpoint `EffectSystem` уже подключён к реальным Shot/Hit events.

Работает orchestration и transient light/wind layer. Concrete particle/decal adapters ещё предстоит подключить.

Все runtime effects должны иметь budget/TTL/pool.

---

# 12. Enemy / navigation target

Минимум:

- Walker;
- Runner;
- Brute.

Enemy instances уже могут регистрироваться в `SpatialHash`; это foundation для LocalAvoidance и neighbour queries.

Целевая navigation chain:

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

Navmesh integration ещё не выбрана и не реализована.

---

# 13. Level / asset architecture

Теперь существуют:

```text
AssetManager
  ↓ cached GLB load
LevelLoader
  ├── GLB
  ├── typed LevelManifest
  └── optional CollisionWorld rebuild
```

Первый manifest skeleton:

```text
public/assets/levels/abandoned-outskirts/level.manifest.json
```

Целевая authored location:

```text
public/assets/levels/abandoned-outskirts/
├── level.glb
├── level.manifest.json
├── navmesh.bin
└── preview.webp
```

Разделение:

- `level.glb` → visuals/collision geometry;
- `level.manifest.json` → player/enemy spawns, loot, lights, wind/audio zones, choke points, interactables, event anchors;
- `navmesh` → AI traversal.

---

# 14. Asset licensing

Code reuse notices:

`THIRD_PARTY_NOTICES.md`

Media assets:

`public/assets/ATTRIBUTION.md`

Каждый внешний production asset обязан иметь source, author, license, attribution requirement и modification note.

---

# 15. Mobile performance architecture

Quality profiles:

- `mobile-low`;
- `mobile-high`;
- `desktop-high`.

Primary target: **30+ FPS Android**. Desktop target: **60 FPS**.

Основные budgets: DPR, shadows, lights, grass, rain, particles, decals, visible enemies/update frequency.

---

# 16. Целевая структура

Target остаётся модульной:

```text
src/
├── app/
├── core/
├── config/
├── input/
├── physics/
├── navigation/
├── simulation/
│   ├── entities/
│   ├── player/
│   ├── combat/
│   ├── enemies/
│   ├── waves/
│   └── pickups/
├── characters/
├── camera/
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

Не создаём новые directories ради структуры самой по себе — они появляются по мере реального разделения responsibilities.

---

# 17. Legacy → engine-next migration

```text
legacy production
index.html + game-v050.js + styles-safe.css
            │
            │ engine-next развивается параллельно
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
            └── Git history остаётся rollback source
```

---

# 18. Следующие структурные изменения

Ближайший порядок:

1. ballistic ProjectileSystem → real world/enemy collision;
2. concrete particle/decal adapters;
3. `LevelLoader` подключить в runtime вместо lab `BoxGeometry` world;
4. начать extracting simulation/player/world responsibilities из `GameApp`;
5. functional parity systems;
6. navmesh spike после появления authored collision level.

---

# 19. Правила изменения структуры

1. Не создавать subsystem без понятной responsibility.
2. `src/main.ts` не расширять gameplay logic.
3. `GameApp` — integration/lifecycle container, не новый monolith.
4. Simulation не запускает presentation напрямую, кроме event boundary.
5. Weapon/enemy balance data-driven.
6. Collision и navigation раздельны.
7. Прямой reused code получает license notice.
8. Assets без понятной лицензии не входят в production repository.
9. Temporary compatibility files удаляются после миграции callers.
10. После крупного checkpoint обновляются `structure.md`, `dev.md`, `history.md`.

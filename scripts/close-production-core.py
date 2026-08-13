from pathlib import Path

# dev.md: close only the unchecked items from architecture + visual vertical slice milestone.
p = Path('dev.md'); s = p.read_text()
s = s.replace("Source of truth: `visual/0.9.1-pistol-animation` until PR #21 merge, then `main`", "Source of truth: `milestone/0.10.0-production-core` until PR #27 merge, then `main`")
s = s.replace("Текущий стабильный architecture checkpoint: **0.8.5–0.8.7 HARDENING**.  \nТекущий активный visual checkpoint: **0.9.1 PISTOL COMBAT ANIMATION — real FIRE/R events + one-shot overrides + mobile visual gate**.", "Текущий стабильный architecture checkpoint: **0.10.0 PRODUCTION CORE — CombatRuntime + RunSession**.  \nТекущий активный visual checkpoint: **0.10.0 PRODUCTION CORE — hero combat poses + weapon GLBs + Walker/Runner/Brute production infected**.")
s = s.replace("- [x] fixed-center crosshair;\n- [x] no vertical manual aiming;\n- [x] horizontal swipe/yaw only;\n- [x] horizontal auto-aim steering toward infected;", "- [x] reticle is allowed to move in X/Y under mobile aim-assist;\n- [x] no vertical manual aiming;\n- [x] horizontal swipe/yaw remains manual camera control;\n- [x] auto-aim steers the visible reticle toward infected and firing uses the same NDC point;")
s = s.replace("Still intentionally owns orchestration/order plus:\n\n- combat event wiring;\n- Weapon/Damage/Projectile systems;\n- EnemySystem/WaveDirector/Pickup coordination;\n- aim coordination;\n- session score/kills;\n- top-level lifecycle/state transitions.", "Still intentionally owns orchestration/order plus:\n\n- construction/order of Weapon/Damage/Projectile systems while `CombatRuntime` owns combat event/hitscan coordination;\n- EnemySystem/WaveDirector/Pickup coordination;\n- aim coordination;\n- `RunSession` owns session score/kills;\n- top-level lifecycle/state transitions.")
s = s.replace("- [ ] extract `CombatRuntime` before combat complexity grows further;\n- [ ] extract `RunSession` when progression/run statistics expand;\n- [ ] optionally extract `EnemyRuntime` during authored AI/nav integration;\n- [ ] optionally extract `PresentationRuntime` if FX/audio ownership grows;\n- [ ] avoid service locator / DI framework.", "- [x] extracted `CombatRuntime` for shot/reload/hit/kill coordination and hitscan resolution;\n- [x] extracted `RunSession` for kill/score/reset accounting;\n- [x] architecture decision: keep `EnemySystem` as the current cohesive enemy boundary; do **not** add `EnemyRuntime` until authored AI/nav creates real ownership pressure;\n- [x] architecture decision: keep current FX/audio ownership; do **not** add `PresentationRuntime` until presentation lifecycle materially grows;\n- [x] no service locator / DI framework introduced.")
s = s.replace("- [ ] LOD/initial-download asset budget optimization.", "- [x] LOD/initial-download budget: weapon GLBs lazy-load on first selection; infected share one cached GLB; far infected disable decorative wounds/dynamic shadows; byte budgets are unit-tested.")
s = s.replace("- [ ] shotgun aim/fire/reload;\n- [ ] bow draw/release;\n- [ ] hit;\n- [ ] death;", "- [x] shotgun aim/fire/reload via upper-body skeletal combat overlay with authored-clip preference if a future library provides one;\n- [x] bow draw/release skeletal overlay synchronized with string/arrow presentation;\n- [x] hit reaction with authored-clip preference and procedural skeletal fallback;\n- [x] death reaction with authored-clip preference and persistent procedural skeletal fallback;")
s = s.replace("- [ ] shotgun GLB;\n- [ ] bow + arrow GLB;", "- [x] shotgun GLB generated from the production-direction weapon geometry and lazy-loaded on first shotgun selection;\n- [x] bow + arrow GLB generated from the production-direction geometry; nocked GLB arrow remains connected to draw/release state;")
s = s.replace("- [ ] Walker GLB + locomotion/attack/stagger/death;\n- [ ] Runner GLB + distinct silhouette/animation;\n- [ ] Brute GLB + distinct mass/silhouette/animation;\n- [ ] body-part hit metadata/colliders mapped to real meshes;\n- [ ] pool/reuse assets instead of loading per spawn.", "- [x] Walker production GLB presentation + native-bind locomotion/attack/stagger/death;\n- [x] Runner uses the shared production zombie GLB with a narrower silhouette, forward lean, faster gait and distinct reactions — no duplicate binary payload;\n- [x] Brute uses the shared production zombie GLB with larger mass/width/depth, slower heavy gait and distinct reactions — no duplicate binary payload;\n- [x] body-part hit proxies are attached to real head/torso/arm/leg bones; visual skin raycast is disabled for gameplay;\n- [x] one cached zombie GLB source is reused/cloned for every archetype/spawn instead of network-loading per spawn.")
s = s.replace("- [x] screenshots uploaded as `facefall-visual-checkpoints` artifact;", "- [x] `mobile-production-weapons-third.png` validates lazy shotgun/bow GLB presentation + hero reaction states;\n- [x] `mobile-production-infected-third.png` validates Walker/Runner/Brute production presentation and bone hit proxies;\n- [x] screenshots uploaded as `facefall-visual-checkpoints` artifact;")
p.write_text(s)

# history.md: append recoverable milestone record.
p = Path('history.md'); s = p.read_text()
entry = """

---

# 0.10.0 — Production Core milestone

PR #27 closes the remaining architecture + Visual Vertical Slice checklist items from sections 6 and 8 without forcing optional abstractions.

Implemented:

- `CombatRuntime` extracted from `GameApp` for combat events and hitscan resolution;
- `RunSession` extracted for kills/score/reset accounting;
- explicit decision not to create `EnemyRuntime` / `PresentationRuntime` until real ownership pressure appears;
- no service locator or DI framework;
- hero shotgun aim/fire/reload, bow draw/release, hit and death skeletal overlays;
- real generated shotgun GLB and bow+arrow GLB, lazy-loaded on first selection;
- one cached CC0 Mesh2Motion zombie GLB reused for Walker / Runner / Brute;
- distinct infected scale/silhouette/gait plus attack/stagger/death reactions;
- invisible hit proxies attached to real skeleton bones; presentation skin no longer determines gameplay hit zone;
- far infected LOD removes decorative wounds/dynamic shadows while preserving hit proxies;
- byte-budget unit tests and expanded Playwright production visual gates.

Design rule reinforced: prefer shared assets + archetype presentation profiles over duplicated binaries, and extract runtimes only when they reduce actual coupling.
"""
if '# 0.10.0 — Production Core milestone' not in s: s += entry
p.write_text(s)

# structure.md: append the new stable boundaries without rewriting old history.
p = Path('structure.md'); s = p.read_text()
entry = """

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
"""
if '## 0.10.0 Production Core additions' not in s: s += entry
p.write_text(s)

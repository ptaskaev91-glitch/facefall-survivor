# Супер Макар — Development Plan

Последняя актуализация: **2026-08-20**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main`; рабочие изменения — только через focused feature branch / PR.  
Canonical infrastructure standard: `ptaskaev91-glitch/server-control-ru/DEVELOPMENT_STANDARD.md`.

Текущий стабильный gameplay checkpoint: **0.17.0 — Blood Moon / Weather Pass**.  
Infrastructure checkpoint: **Moscow Development Platform migration — COMPLETE**.  
Текущий активный gameplay этап: **Step 1 — Third-person Aim/Camera correctness**.  
Active PR: **#45 — Fix third-person reticle-to-shot correctness**.

> Рабочее правило: один bounded gameplay step → лёгкие проверки → один `dev-heavy` browser/build job → review/merge → deploy exact green SHA → smoke → следующий step.

`dev.md` — только актуальный roadmap. История завершённых решений и миграций — в `history.md`; архитектурные границы — в `ARCHITECTURE.md`; метаданные проекта — в `PROJECT.md`.

---

# 1. Product goal

**Супер Макар** — mobile-first browser 3D family action-survival против заражённых.

Базовая формула уже реализована:

- TOP + third-person camera на одной simulation;
- pistol / shotgun / bow;
- Walker / Runner / Brute;
- waves / pickups / coins / shop;
- Супермама / Суперпапа;
- локальный Face System 2.0;
- authored `Abandoned Outskirts`;
- offline Recast/Detour navigation;
- LOS / noise / AI LOD;
- weather / Blood Moon;
- debug performance instrumentation;
- Android — главная real-device платформа.

Главный hook: **«Твоё лицо — твой герой в survival shooter.»**

---

# 2. Canonical development / infrastructure contract

Единственный инфраструктурный source of truth:

```text
ptaskaev91-glitch/server-control-ru/DEVELOPMENT_STANDARD.md
```

Принцип:

```text
GitHub = code / branches / PR / history / events
Moscow 72.56.14.168 = compute / CI / build / tests / Playwright / automation / primary control plane
Netherlands 88.218.169.68 = foreign egress / proxy / network edge when needed
Vercel = optional preview / mirror, not platform core
```

## 2.1 Game identity on Moscow

```text
slug: game
repo: ptaskaev91-glitch/facefall-survivor
runner: moscow-game-01
label: moscow-game
runner user: github-runner-game
profile: node
```

Canonical paths:

```text
/srv/dev-platform/workspaces/game
/srv/dev-platform/services/game
/var/lib/dev-platform/artifacts/game
/var/lib/dev-platform/logs/game
/var/lib/dev-platform/state/game
/etc/dev-platform/projects.d/game.conf
```

Shared caches:

```text
/var/cache/dev-platform/npm
/var/cache/dev-platform/browsers
```

## 2.2 Resource policy — mandatory

Moscow VPS currently has about **2 GiB RAM + 1 GiB swap**.

Therefore:

```text
MAX_HEAVY_JOBS = 1
RAM soft limit = 75%
RAM hard limit = 85%
```

Rules:

- Chromium / Playwright / large build only through `dev-heavy`;
- never run two browser jobs in parallel;
- no duplicate push + PR full CI for the same feature branch;
- lightweight checks must finish before browser launch;
- orphan Chromium / Playwright / Runner.Worker processes are infrastructure defects and must be cleaned;
- GitHub-hosted runners are not normal compute;
- GitHub Artifacts are not normal diagnostics storage.

## 2.3 Current Moscow host state

After the 2026-08-20 recovery:

- [x] `moscow-game-01` accepted a real job again;
- [x] nginx local `/health` returned HTTP 200;
- [x] RAM returned to a healthy range (~841 MiB used / ~1.1 GiB available at verification time);
- [x] swap was effectively unused;
- [ ] platform-level resource guard / canonical `dev-platform-recover` still needs implementation in `server-control-ru`;
- [ ] public Moscow HTTPS certificate for `super-makar.72-56-14-168.sslip.io` needs correction;
- [ ] reduce unnecessary simultaneous Runner.Worker activity after reboot.

These are platform-hardening tasks. They must not be reimplemented as permanent Game-specific debug workflows.

## 2.4 CI contract

Normal Game validation:

```text
PR
 ↓
moscow-game-01
 ↓
npm ci
 ↓
typecheck
 ↓
unit tests
 ↓
dev-heavy: Playwright + deploy build
 ↓
local diagnostics
```

Diagnostics:

```text
/var/lib/dev-platform/artifacts/game/<run-id>
```

Feature branches are validated through PR CI; `push` full CI is reserved for `main` to avoid duplicate heavy runs.

## 2.5 Release contract

Production is **project-defined**, not Vercel-defined.

Target architecture for Game:

```text
exact green Git SHA
       ↓
Moscow build
       ↓
/srv/www/super-makar/releases/<sha>
       ↓
atomic current symlink
       ↓
nginx / HTTPS
       ↓
public smoke
```

Current status:

- Moscow nginx local HTTP path works;
- public Moscow HTTPS certificate still needs fixing before Moscow becomes verified primary public production;
- `https://super-makar-live.vercel.app` remains an already verified **optional public mirror/fallback**, not the development platform core.

---

# 3. Stable gameplay baseline

Stable checkpoint: **0.17.0 — Blood Moon / Weather Pass**.

Completed major checkpoints:

- [x] 0.11.0 — Abandoned Outskirts;
- [x] 0.12.0 — Family Survival;
- [x] 0.13.0 — Recast navigation;
- [x] 0.14.0 — Perception + AI LOD;
- [x] 0.15.0 — Face System 2.0;
- [x] 0.16.0 — Performance debug overlay;
- [x] 0.17.0 — Blood Moon / Weather Pass;
- [x] Moscow development migration completed without changing the 0.17 gameplay baseline.

Detailed historical implementation notes belong in `history.md`, not here.

---

# 4. ACTIVE — Step 1: Third-person Aim/Camera correctness

**Priority: P0 gameplay defect.**

User-visible problem: in 3RD the reticle can visually sit on an infected while the real shot follows another direction.

## 4.1 Root cause — confirmed

Current chain:

```text
reticle NDC
  ↓
AimController camera ray
  ↓
correct visual aim

BUT

WeaponSystem.fire(..., player.facing)
  ↓
ShotEvent.direction
  ↓
CombatRuntime
```

In TOP, body facing is aligned toward aim, so this mostly agrees. In 3RD, body facing and visible reticle are intentionally not identical, so using `player.facing` as shot authority is wrong.

`CombatRuntime` is not the root bug; it correctly consumes the direction it receives.

## 4.2 Implementation contract

Target:

```text
screen reticle
   ↓
exact camera ray
   ↓
nearest enemy/world aim point
   ↓
physical muzzle → aim point direction
   ↓
WeaponSystem.fire
   ↓
ShotEvent.direction
   ↓
CombatRuntime
```

Required:

- [ ] expose exact current camera ray from `AimController`;
- [ ] make `WeaponSystem` player aim resolver receive the physical muzzle origin;
- [ ] choose the first valid enemy/world point under the reticle;
- [ ] calculate shot direction from real muzzle to that point;
- [ ] retain vertical 3RD aim component;
- [ ] preserve TOP facing/gameplay behavior;
- [ ] preserve existing hit-zone/damage semantics;
- [ ] world cover must remain authoritative;
- [ ] no second hidden aim authority.

`player.facing` remains body/animation orientation, not universal 3RD shot direction.

## 4.3 Required tests

Unit:

- [ ] nearest camera-ray hit selection;
- [ ] muzzle → aim point direction;
- [ ] `WeaponSystem` passes exact physical origin to resolver;
- [ ] deterministic fallback direction.

Browser:

- [ ] 3RD reticle on target → emitted real shot follows target line;
- [ ] deliberately wrong `player.facing` does not redirect 3RD shot;
- [ ] vertical/off-axis reticle keeps X/Y semantics;
- [ ] cover still blocks shot;
- [ ] TOP regression remains green;
- [ ] no fatal page errors.

Exit condition:

> **What the player sees under the 3RD reticle is what the real shot tries to hit, subject to physical cover from the muzzle.**

---

# 5. Step 2 — Aim/Camera debug gizmo

**BLOCKED until Step 1 is green and merged.**

Dev/debug-only:

- [ ] camera forward ray;
- [ ] reticle camera ray;
- [ ] selected world aim point;
- [ ] muzzle → authoritative shot ray;
- [ ] actual first hit point;
- [ ] body-facing vector for comparison;
- [ ] zero normal-mode visibility/cost.

---

# 6. Step 3 — Android profiling

After Step 2:

- [ ] TOP low/medium/high enemy pressure;
- [ ] 3RD low/medium/high enemy pressure;
- [ ] frame ms / draw calls / triangles / DPR;
- [ ] LOS/NAV rate;
- [ ] Blood Moon / Overcast cost;
- [ ] actual real-device evidence.

---

# 7. Step 4 — Adaptive mobile budgets

Only from Step 3 measurements:

- [ ] DPR policy;
- [ ] shadows;
- [ ] FX budgets;
- [ ] enemy caps;
- [ ] atmosphere cost;
- [ ] LOS/NAV cadence.

No visual downgrade without measurement.

---

# 8. Step 5 — HUD / touch cleanup

- [ ] remove remaining diagnostic feel from production HUD;
- [ ] improve thumb reach / touch spacing;
- [ ] preserve accessibility labels;
- [ ] keep debug metrics behind `?debug=1` only.

---

# 9. Step 6 — Navigation debug visualization

Optional, debug-only:

- [ ] current Recast path;
- [ ] fallback path;
- [ ] LOS blocker;
- [ ] target/investigate state;
- [ ] no production cost when debug is off.

---

# 10. Step 7 — Progression / special infected

Start only after aim correctness + Android budgets are stable.

Possible scope:

- [ ] progression / upgrades;
- [ ] special infected archetype;
- [ ] additional wave modifiers;
- [ ] new authored encounters.

---

# 11. Immediate execution order

1. **Finish PR #45 — Third-person Aim/Camera correctness.**
2. Run lightweight checks on Moscow.
3. Run exactly one `dev-heavy` Playwright/build validation.
4. Inspect regression evidence.
5. Merge only after green.
6. Fix Moscow public HTTPS as infrastructure follow-up before declaring Moscow public production canonical.
7. Deploy exact green SHA and smoke.
8. Update `history.md` checkpoint.
9. Move to Step 2.

No parallel gameplay feature work until Step 1 is closed.

# Супер Макар — Development Plan

Последняя актуализация: **2026-08-17**  
Repository: `ptaskaev91-glitch/facefall-survivor`  
Source of truth: `main` + активная feature-ветка только до merge  
Testing preview: `engine-next-preview` после зелёного main CI.

Текущий стабильный checkpoint: **0.17.0 — Blood Moon / Weather Pass**.  
Текущий активный этап: **Android profiling + adaptive mobile budgets**.

Этот файл — актуальный roadmap. Подробные завершённые изменения фиксируются в `history.md`, ownership — в `structure.md`.

---

# 1. Product goal

**Супер Макар** — mobile-first browser 3D family action-survival против заражённых.

Обязательная формула:

- TOP survivor/action-RPG camera;
- third-person over-the-shoulder camera;
- одна simulation для обеих камер;
- pistol / shotgun / bow;
- Walker / Runner / Brute;
- waves + рост сложности;
- локальные фото Макара / Супермамы / Суперпапы;
- Android — главная real-device платформа;
- authored `Abandoned Outskirts`;
- Recast navigation;
- атмосферная погода / время суток;
- стабильные mobile performance budgets.

Главный hook: **«Твоё лицо — твой герой в survival shooter.»**

---

# 2. Canonical technology

> **TypeScript strict + Vite + bundled Three.js + glTF/GLB + manifest-driven authored level + Octree/Capsule + offline Recast/Detour + SpatialHash/local avoidance + data-driven combat + event-driven presentation + bounded FX/audio + local-first Face System + mobile-first controls + Playwright/CI.**

Hard rules:

- не возвращать gameplay ownership в God Object;
- не генерировать navmesh на телефоне;
- не отправлять пользовательские фото на сервер;
- не добавлять тяжёлый volumetric fog без реального Android-профиля;
- обычный запуск не должен платить за `?debug=1` instrumentation;
- не заявлять real-device/preview проверку без фактического evidence.

---

# 3. Current implemented baseline

## Gameplay / family

- [x] menu / loading / playing / paused / game-over / restart;
- [x] TOP + 3RD на одной simulation;
- [x] mobile dynamic joystick + manual fire;
- [x] mobile 3RD horizontal camera control + X/Y aim-assist reticle;
- [x] pistol / shotgun / bow;
- [x] health / ammo / reload / recoil / hit zones / stagger / death;
- [x] Walker / Runner / Brute;
- [x] waves / pickups / coins / weapon shop;
- [x] Супермама с wave 4, Суперпапа с wave 7;
- [x] family allies follow + shoot infected.

## Face System 2.0

- [x] три независимых локальных фото;
- [x] 512×640 / 4:5 JPEG normalization;
- [x] optional native `FaceDetector` crop;
- [x] deterministic fallback crop;
- [x] v1 → v2 local migration;
- [x] curved face shell on real `Head` bone;
- [x] TOP/3RD browser visual coverage.

## World / AI

- [x] authored `Abandoned Outskirts level.glb`;
- [x] authored structural collision;
- [x] manifest spawn / loot / light markers;
- [x] offline Recast/Detour bake + browser import;
- [x] collision-navigation fallback;
- [x] LOS perception;
- [x] weapon / footstep / family-fire noise perception;
- [x] target stickiness / last-seen memory;
- [x] distance-based perception + steering/nav cadence;
- [x] SpatialHash + local avoidance.

## Presentation / performance

- [x] grass;
- [x] rain field;
- [x] lightning/thunder foundation;
- [x] `FogExp2` foundation;
- [x] bounded particles / decals / dynamic lights;
- [x] WebAudio ambience/combat/zombie layer;
- [x] `?debug=1` FPS / frame time / draw / TRI / DPR / AI / LOS / NAV metrics;
- [x] debug instrumentation absent from normal mode.

---

# 4. Checkpoints

## 0.11.0 — Abandoned Outskirts

- [x] authored level active through `WorldRuntime`;
- [x] structural collision + procedural fallback;
- [x] manifest spawn/loot/light markers.

## 0.12.0 — Family Survival

- [x] three family photos;
- [x] mama/papa join logic;
- [x] family combat;
- [x] coins + shotgun/bow shop;
- [x] zombie audio.

## 0.13.0 — Recast navigation

- [x] offline navmesh bake;
- [x] browser Recast query;
- [x] cached paths / repath cadence;
- [x] collision fallback;
- [x] CI nav validation.

## 0.14.0 — Perception + AI LOD

- [x] static-world LOS;
- [x] noise hearing;
- [x] sticky target memory;
- [x] distance-based AI/nav cadence;
- [x] hidden → heard → visible → sticky → investigate regression.

## 0.15.0 — Face System 2.0

- [x] local auto crop / 4:5 normalization;
- [x] face-aware crop when supported;
- [x] compact v2 persistence;
- [x] production head fitting preserved.

## 0.16.0 — Performance debug overlay

- [x] ~4 Hz debug panel;
- [x] FPS + average/max frame time;
- [x] draw calls / triangles / DPR;
- [x] active infected + intent counts;
- [x] LOS/s + blocked share;
- [x] NAV/s + SpatialHash cells;
- [x] deterministic cumulative browser instrumentation verification.

---

# 5. 0.17.0 — Blood Moon / Weather Pass

**Status: COMPLETE.**

User-facing goal: сцена должна перестать выглядеть как один постоянный сумрачный preset и получить заметный survival-horror ритм: **рассвет → сумрачный дождливый день → закат → кровавая ночь**.

## 5.1 Touch/UI selection hardening

Problem evidence: на Android long-press по `FIRE / WEAP / CAM` иногда включает системное выделение текста и contextual search UI.

Required:

- [x] `user-select: none` / `-webkit-user-select: none` на gameplay controls;
- [x] `-webkit-touch-callout: none`;
- [x] prevent gameplay `contextmenu` / `selectstart` where appropriate;
- [x] сохранить `aria-label` и button semantics для accessibility;
- [x] Playwright regression: long-press/selection не создаёт text selection на action controls.

## 5.2 Atmosphere model

Добавить единый `AtmosphereSystem` / preset boundary, owned by `WorldRuntime`.

Canonical presets:

### DAWN — рассвет

- [x] холодный зелёно-синий ambient + мягкий тёплый key light;
- [x] умеренный туман;
- [x] дождь слабый/отсутствует;
- [x] visibility высокая.

### OVERCAST — сумрачный дождливый день

- [x] серо-зелёный ambient;
- [x] постоянный дождь;
- [x] мокрый/холодный визуальный тон;
- [x] умеренно плотный haze;
- [x] storm/lightning разрешены.

### DUSK — закат

- [x] оранжево-красный directional tint;
- [x] длинное/контрастное ощущение света;
- [x] туман чуть плотнее дня;
- [x] rain reduced.

### BLOOD_MOON — кровавая ночь

- [x] почти чёрный фон/ambient;
- [x] красная moon/key light;
- [x] красноватый дальний fog;
- [x] rain минимальный или выключен;
- [x] самая короткая визуальная дальность.

## 5.3 Progression policy

Первый production rule — **по волнам**, чтобы состояние было воспроизводимо и тестируемо:

- waves 1–2 → `DAWN`;
- waves 3–4 → `OVERCAST`;
- waves 5–6 → `DUSK`;
- wave 7+ → `BLOOD_MOON`.

Почему так:

- не зависит от реального времени телефона;
- одинаково работает в CI и у игрока;
- Супермама приходит в дождливую фазу;
- Суперпапа приходит непосредственно перед/на старте Blood Moon phase;
- high-wave survival визуально становится страшнее вместе со сложностью.

Debug override для тестов допускается как `?atmosphere=dawn|overcast|dusk|blood-moon`; обычная игра следует волнам.

## 5.4 Silent-Hill-style fog without mobile volumetrics

Не использовать тяжёлый true volumetric fog в 0.17.

- [x] динамический `FogExp2` density/color по preset;
- [x] дешёвый ground-haze слой только если mobile budget позволяет;
- [x] fog плавно интерполируется при смене фазы;
- [x] никакой новой per-pixel multi-pass postprocessing цепочки в этом этапе.

## 5.5 Night enemy visibility falloff

Gameplay AI **не должен получать искусственное ухудшение зрения** только из-за визуального эффекта.

Ночью ухудшается именно presentation для игрока:

- [x] near zone примерно 0–6 m — заражённый читается нормально;
- [x] mid zone 6–12 m — сильнее смешивается с fog/background;
- [x] far zone 12+ m — заметно темнее и менее контрастный;
- [x] эффект обновляется с LOD cadence, не через тяжёлый material clone каждый frame;
- [x] hit proxies / raycast / damage semantics не меняются;
- [x] близкий атакующий заражённый всегда остаётся читаемым.

Preferred implementation: shared visual-material tint/fog response or lightweight per-infected presentation LOD; не менять LOS/brain policy.

## 5.6 Weather controls

- [x] `RainField.setIntensity(0..1)` без пересоздания particle buffer;
- [x] `StormSystem.setEnabled()` / intensity policy;
- [x] environment transitions do not allocate large resources per wave;
- [x] debug overlay показывает текущий atmosphere preset.

## 5.7 Automated evidence

Unit:

- [x] wave → atmosphere mapping;
- [x] preset parameter sanity;
- [x] night visibility curve monotonic: distance ↑ → visibility ↓;
- [x] near-night visibility floor remains playable.

Playwright:

- [x] no gameplay text selection regression;
- [x] force each atmosphere preset and assert world state;
- [x] Blood Moon screenshot TOP;
- [x] Blood Moon screenshot 3RD;
- [x] overcast/rain screenshot;
- [x] no page errors;
- [x] existing aim/face/family/Recast tests remain green.

Exit criterion:

> На реальном Android одним взглядом различимы рассвет, дождливый день, закат и Blood Moon night; ночью дальний заражённый заметно хуже читается, но ближний бой остаётся понятным; long-press по action buttons больше не вызывает выделение текста в браузере.

---

# 6. Next

Ordered next work:

1. **Android profiling with the new atmosphere active** — TOP/3RD, low/medium/high enemy pressure.
2. Establish mobile budgets: frame ms / draw calls / triangles / DPR / LOS / NAV.
3. Tune DPR, shadows, FX, enemy caps and atmosphere density from measurements.
4. Final HUD cleanup: shorten build badge, reduce normal debug status, safe-area polish, final action-button art.
5. Optional nav visualization only if measurements show it helps.
6. Progression/special infected only after visual + performance quality is stable.

---

# 7. Documentation / release rule

After every major block:

- feature branch → PR → full CI → merge → main CI → preview publish;
- update `README.md`, `dev.md`, `history.md`, `structure.md` at checkpoints;
- completed/partial/pending must reflect actual implementation;
- inspect important visual screenshot artifacts before merge;
- do not merge temporary finalize/workflow helpers into `main`;
- do not claim interactive raw.githack/device testing unless it was actually performed.

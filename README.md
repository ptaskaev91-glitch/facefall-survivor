# Супер Макар

Mobile-first browser 3D family survival shooter. Супер Макар uses local photos for Макар, Супермама and Суперпапа.

## Current generation — Engine Next 0.13.0 · «Супер Макар»

The active game is built with **TypeScript + Vite + npm Three.js** and targets both Android/mobile and desktop browsers.

Current gameplay foundation:

- TOP survivor-style camera with mobile auto-aim;
- third-person over-the-shoulder camera with mobile X/Y aim-assist that moves the reticle toward a visible infected and fires through that same point;
- dynamic touch joystick that appears under the first free gameplay touch;
- pistol, shotgun and ballistic bow gameplay;
- recoil, movement-dependent spread, stagger and authored body-part hit zones;
- Walker / Runner / Brute production-infected presentations built from one cached CC0 rigged zombie source with distinct silhouettes, gait and combat reactions;
- waves, HP, score, kills, health/ammo pickups and game-over/restart;
- authored **Abandoned Outskirts** GLB level with static collision and gameplay manifest;
- offline-baked **Recast/Detour** navmesh for the authored level, imported in-browser with collision-navigation fallback;
- per-enemy cached path queries with repath throttling, plus SpatialHash/local avoidance;
- rain, fog, storm/lightning, grass, pooled particles/decals/lights and procedural Web Audio;
- strict TypeScript, reproducible `npm ci`, unit tests and Playwright desktop/mobile visual smoke gates.

### 0.13.0 navigation milestone

The Recast pass replaces the temporary authored-level steering path with a mobile-safe navigation foundation:

- `scripts/bake-navmesh.mjs` builds the Abandoned Outskirts navmesh in Node before dev/build;
- the browser never generates the navmesh on the phone: it imports the generated `navmesh.bin` and performs Detour queries only;
- `RecastNavigationQuery` sits behind the existing `NavigationQuery` interface, so `EnemySystem` does not depend on Recast/WASM directly;
- paths are cached per enemy and are refreshed on a bounded interval or when the target moves far enough;
- if the navmesh/WASM import fails, gameplay keeps using `CollisionNavigationQuery` instead of failing the run;
- CI/browser smoke asserts that the authored level reaches `nav=recast` and can return a finite waypoint;
- the build-time bake validates traversable paths from the authored north/west enemy spawns to the player start.

### 0.10.0 production core milestone

The production-core pass closes the remaining architecture and visual-vertical-slice items without inflating the runtime with unnecessary frameworks:

- `CombatRuntime` owns shot/reload/hit/kill event coordination and hitscan resolution;
- `RunSession` owns resettable kill/score accounting;
- `GameApp` remains the top-level lifecycle/update orchestrator;
- no service locator or DI framework was introduced;
- optional `EnemyRuntime` / `PresentationRuntime` extraction is deliberately deferred until their existing boundaries show real pressure;
- hero has shotgun aim/fire/reload, bow draw/release, hit and death skeletal overlays on top of stable locomotion;
- shotgun and bow+arrow are real GLB assets and are loaded lazily on first selection;
- Walker / Runner / Brute share one cached CC0 zombie GLB instead of duplicating network payloads;
- the three infected archetypes use different body scale, width/depth, gait speed, lean and attack/stagger/death posing;
- gameplay raycasts use invisible hit proxies attached to actual head/torso/limb bones rather than treating the whole skinned surface as one torso;
- far infected drop decorative wounds and dynamic shadow casting while keeping gameplay hit proxies active;
- byte-budget unit tests guard weapon and infected GLB payload sizes;
- Playwright captures production weapon and infected checkpoints in addition to the existing camera/face/combat screenshots.

The earlier 0.9.x hero slice remains the base: verified CC0 Quaternius humanoid, `SkeletonUtils` cloning, rotation-only locomotion retargeting, uploaded-face shell on the real `Head` bone, and animated weapon sockets.

## Architecture

Canonical architecture and roadmap live in:

- `structure.md` — current and target system/file structure;
- `dev.md` — implementation status and ordered roadmap;
- `history.md` — project decisions and checkpoints.

The current direction is:

`TypeScript + Vite + Three.js + GLB/glTF + Octree/Capsule + Recast/Detour NavigationQuery + SpatialHash/local avoidance + event-driven combat/presentation + bounded/lazy assets + pooled FX + mobile-first controls`.

## Development

```bash
npm ci
npm run dev:next
```

`npm run dev:next` and `npm run build:next` automatically run the offline navmesh bake first. The generated `public/assets/levels/abandoned-outskirts/navmesh.bin` is intentionally ignored by Git and is reproduced from the authored level during development/build.

Useful checks:

```bash
npm run typecheck
npm run test:unit
npm run test:smoke
npm run build:deploy
```

The Vite development entrypoint is `/engine-lab.html`; production promotes the exact same compiled document to `/` and CI verifies the two built HTML files are byte-identical.

## Hosting

GitHub is the source repository. The intended production target is Vercel. Until the Vercel project connection is restored, CI publishes the verified build to the `engine-next-preview` branch for browser testing.

## Next major product work

With the authored level and Recast navigation now active, the next ordered work is **final LOS/perception and AI update LOD**, followed by Face System 2.0 polish and final HUD/performance work.

## Asset / source licensing

Third-party code and vendored asset notices are tracked in `THIRD_PARTY_NOTICES.md`. Quaternius and Mesh2Motion asset folders retain provenance/license information; the shared Mesh2Motion zombie art source is CC0. Recast Navigation JS is used under MIT and is registered in the notices.

The Facefall repository itself currently has no explicit public reuse license; selecting the project license remains an intentional pending decision rather than something inferred from third-party dependencies.

---

## 0.13.0 — offline Recast navigation checkpoint (2026-08-14)

- Abandoned Outskirts remains the canonical authored production level.
- Added offline Recast/Detour navmesh bake from the authored GLB.
- Added browser runtime import of the baked navmesh; no per-phone runtime navmesh generation.
- `EnemySystem` is switched to `RecastNavigationQuery` only after successful authored-level/navmesh load, with collision-navigation fallback.
- Recast paths are cached per enemy and repathed at a bounded cadence / meaningful target displacement.
- HUD debug status exposes `nav=recast` / `nav=collision`.
- Added unit coverage for path caching/repath/fallback and mobile browser smoke for real Recast activation.
- Added pinned `recast-navigation@0.43.1` and `@recast-navigation/three@0.43.1` with locked dependencies and notices.

## 0.12.0 — «Супер Макар» family survival checkpoint (2026-08-14)

- Игра переименована в **«Супер Макар»**.
- Три независимых локальных фото: Супер Макар, Супермама, Суперпапа.
- Фото персонажа отображается на увеличенной голове спереди и сзади для быстрой идентификации в TOP/3RD.
- Супермама присоединяется после завершения 3-й волны (активна с wave 4), Суперпапа — после завершения 6-й (активен с wave 7).
- Союзники следуют за Макаром, автоматически выбирают заражённых и ведут огонь.
- Супермама получила отдельный процедурный силуэт/причёску; Суперпапа — отличимый масштаб корпуса. Новых внешних character assets для этого не добавлено.
- Сложность масштабируется по номеру волны и количеству активных героев.
- Добавлены zombie groan / pain / death WebAudio-эффекты.
- За убийства выпадают монеты; монеты подбираются игроком. Награда: walker 2, runner 3, brute 5.
- Магазин оружия: дробовик 20 монет, лук 30; до покупки оружие заблокировано.
- Добавлены `FamilyCompanionSystem`, `CoinSystem`, семейный HUD/menu и regression coverage.
- Семейный Playwright smoke загружает три разные тестовые фотографии, проверяет unlock/markers/shop и создаёт `mobile-super-makar-family.png`.
- Финальный релизный gate: TypeScript strict, unit tests, Playwright browser/visual smoke, deploy build и sole deployment-root assertion.
- Canonical source после merge: `main`.

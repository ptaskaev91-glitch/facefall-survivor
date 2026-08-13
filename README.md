# Facefall Survivor

Mobile-first browser 3D survival shooter. The player can upload a photo and Facefall uses it locally as the hero's face.

## Current generation — Engine Next 0.10.0

The active game is built with **TypeScript + Vite + npm Three.js** and targets both Android/mobile and desktop browsers.

Current gameplay foundation:

- TOP survivor-style camera with mobile auto-aim;
- third-person over-the-shoulder camera with mobile X/Y aim-assist that moves the reticle toward a visible infected and fires through that same point;
- dynamic touch joystick that appears under the first free gameplay touch;
- pistol, shotgun and ballistic bow gameplay;
- recoil, movement-dependent spread, stagger and authored body-part hit zones;
- Walker / Runner / Brute production-infected presentations built from one cached CC0 rigged zombie source with distinct silhouettes, gait and combat reactions;
- waves, HP, score, kills, health/ammo pickups and game-over/restart;
- obstacle collision, SpatialHash/local avoidance and navigation abstraction;
- rain, fog, storm/lightning, grass, pooled particles/decals/lights and procedural Web Audio;
- strict TypeScript, reproducible `npm ci`, unit tests and Playwright desktop/mobile visual smoke gates.

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

`TypeScript + Vite + Three.js + GLB/glTF + Octree/Capsule + SpatialHash/local avoidance + NavigationQuery/Recast target + event-driven combat/presentation + bounded/lazy assets + pooled FX + mobile-first controls`.

## Development

```bash
npm ci
npm run dev:next
```

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

With the production-core checklist closed, the next major visual gain is the authored **Abandoned Outskirts** level, followed by offline Recast navigation, Face System 2.0 polish and final HUD/performance work.

## Asset / source licensing

Third-party code and vendored asset notices are tracked in `THIRD_PARTY_NOTICES.md`. Quaternius and Mesh2Motion asset folders retain provenance/license information; the shared Mesh2Motion zombie art source is CC0.

The Facefall repository itself currently has no explicit public reuse license; selecting the project license remains an intentional pending decision rather than something inferred from third-party dependencies.

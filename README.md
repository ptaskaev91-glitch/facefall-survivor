# Facefall Survivor

Mobile-first browser 3D survival shooter. The player can upload a photo and Facefall uses it locally as the hero's face.

## Current generation — Engine Next 0.8.x

The active game is no longer the old vanilla-JS prototype. The production runtime is built with **TypeScript + Vite + npm Three.js** and targets both Android/mobile and desktop browsers.

Current gameplay foundation:

- TOP survivor-style camera with mobile auto-aim;
- third-person over-the-shoulder camera with fixed-center crosshair and horizontal auto-aim;
- dynamic touch joystick that appears under the first free gameplay touch;
- pistol, shotgun and ballistic bow;
- recoil, movement-dependent spread, stagger and hit zones;
- visible pistol/shotgun projectile-tracer layer and readable impact effects;
- Walker / Runner / Brute enemy archetypes with low-poly humanoid prototype visuals;
- waves, HP, score, kills, health/ammo pickups and game-over/restart;
- obstacle collision, SpatialHash/local avoidance and navigation abstraction;
- rain, fog, storm/lightning, grass, pooled particles/decals/lights and procedural Web Audio;
- local face persistence and a functional low-poly player with the uploaded photo mapped onto the head;
- strict TypeScript, reproducible `npm ci`, unit-test baseline and Playwright desktop/mobile browser smoke tests.

## Architecture

Canonical architecture and roadmap live in:

- `structure.md` — current and target system/file structure;
- `dev.md` — implementation status and ordered roadmap;
- `history.md` — project decisions and checkpoints.

The current direction is:

`TypeScript + Vite + Three.js + GLB/glTF + Octree/Capsule + SpatialHash/local avoidance + NavigationQuery/Recast target + event-driven combat/presentation + pooled FX + mobile-first controls`.

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

The Vite development entrypoint is `/engine-lab.html`; production promotes the same compiled application to `/`.

## Hosting

GitHub is the source repository. **Vercel is the only production hosting target.** GitHub Pages is intentionally not used.

Production URL:

`https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

## Next major product work

Before heavy production GLB integration, the project is hardening architecture and tests. Then the visual vertical slice will replace prototype art with:

1. production-direction humanoid hero + AnimationMixer state machine;
2. real weapon GLBs and hand sockets;
3. Walker / Runner / Brute authored models and animation;
4. authored `Abandoned Outskirts` level GLB;
5. offline Recast navmesh for the authored level;
6. Face System 2.0 fitting/crop;
7. final survivor-style HUD and Android performance pass.

## Asset / source licensing

Third-party code notices are tracked in `THIRD_PARTY_NOTICES.md`. External media used in production must be registered in `public/assets/ATTRIBUTION.md` before shipping.

The Facefall repository itself currently has no explicit public reuse license; selecting the project license is an intentional pending project decision rather than something inferred from third-party dependencies.

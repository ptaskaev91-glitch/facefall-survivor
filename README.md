# Facefall Survivor

Mobile-first browser 3D survival shooter. The player can upload a photo and Facefall uses it locally as the hero's face.

## Current generation — Engine Next 0.9.x

The active game is built with **TypeScript + Vite + npm Three.js** and targets both Android/mobile and desktop browsers.

Current gameplay foundation:

- TOP survivor-style camera with mobile auto-aim;
- third-person over-the-shoulder camera with fixed-center crosshair and horizontal auto-aim;
- dynamic touch joystick that appears under the first free gameplay touch;
- pistol, shotgun and ballistic bow gameplay;
- recoil, movement-dependent spread, stagger and hit zones;
- visible pistol/shotgun projectile-tracer layer and readable impact effects;
- Walker / Runner / Brute enemy archetypes with low-poly humanoid prototype visuals;
- waves, HP, score, kills, health/ammo pickups and game-over/restart;
- obstacle collision, SpatialHash/local avoidance and navigation abstraction;
- rain, fog, storm/lightning, grass, pooled particles/decals/lights and procedural Web Audio;
- strict TypeScript, reproducible `npm ci`, unit-test baseline and Playwright desktop/mobile browser smoke tests.

### 0.9.0 hero vertical slice

The player is no longer limited to the procedural low-poly body. The active 0.9.0 branch adds a real rigged GLTF hero behind `PlayerRuntime`:

- verified CC0 Quaternius Universal Base Characters male asset;
- 65-bone humanoid skeleton loaded with `GLTFLoader` and cloned with `SkeletonUtils`;
- scale normalized from anatomical skeleton height rather than unreliable undeformed SkinnedMesh bounds;
- CC0 Universal Animation Library locomotion with rotation-only retargeting, preserving the hero's own bone lengths;
- idle / walk / run crossfades through `AnimationMixer`;
- uploaded photo rendered on a curved face shell attached to the real `Head` bone;
- gameplay-facing corrected to match Facefall aiming;
- production pistol visual follows the animated `hand_r` position;
- muzzle origin now comes from the production weapon socket when the production hero is active;
- legacy procedural player remains an automatic fallback if the production asset fails to load.

Playwright visual smoke now uploads TOP, 3RD and front-facing uploaded-face inspection checkpoints so character regressions are caught before merge.

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

The visual vertical slice is now the priority. Ordered next work:

1. pistol fire/reload animation integration and final weapon-art pass;
2. shotgun and bow production weapon visuals/sockets;
3. production Walker / Runner / Brute models and animation;
4. authored `Abandoned Outskirts` level GLB;
5. offline Recast navmesh for the authored level;
6. Face System 2.0 crop/fitting polish on the production head;
7. final survivor-style HUD and Android performance pass.

## Asset / source licensing

Third-party code and vendored asset notices are tracked in `THIRD_PARTY_NOTICES.md`. The Quaternius character/animation folders also retain their source provenance and original CC0 license files.

The Facefall repository itself currently has no explicit public reuse license; selecting the project license is an intentional pending project decision rather than something inferred from third-party dependencies.

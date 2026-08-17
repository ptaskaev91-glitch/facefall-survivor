# Facefall Survivor — Asset Attribution

Every external model, texture, sound, animation, font or other media asset included in `public/assets` must be registered here before it is used in a production build.

For each asset record:

- project path;
- original source URL;
- author / publisher;
- license;
- attribution requirement;
- modifications performed for Facefall.

## Current production-quality assets

### Quaternius Universal Base Characters — hero body

- Project path: `public/assets/characters/quaternius-universal-base-male/`
- Source: Quaternius Universal Base Characters.
- Author / publisher: Quaternius.
- License: CC0 1.0.
- Attribution requirement: none required by CC0; source is retained for provenance.
- Facefall modifications: local asset package includes the documented URI patch required by the runtime loader; see `ASSET_SOURCE.md` in the asset directory for exact provenance and hashes.

### Quaternius Universal Animation Library — locomotion/combat animation source

- Project path: `public/assets/animations/quaternius-universal-animation-library/`
- Source: Quaternius Universal Animation Library.
- Author / publisher: Quaternius.
- License: CC0 1.0.
- Attribution requirement: none required by CC0; source is retained for provenance.
- Facefall modifications: runtime consumes selected non-root-motion clips; see `ASSET_SOURCE.md` in the asset directory for exact provenance and hashes.

### Mesh2Motion human-zombie — infected body

- Project path: `public/assets/enemies/mesh2motion-human-zombie/human-zombie.glb`
- Source: `Mesh2Motion/mesh2motion-app`, upstream model `static/models-variation/human-zombie.glb`.
- Author / publisher: Mesh2Motion project.
- License: CC0.
- Attribution requirement: none required by CC0; source is retained for provenance.
- Facefall modifications: vendored unchanged for the infected-character vertical slice; see `PROVENANCE.md` in the asset directory for the pinned upstream commit, blob SHA and SHA-256.

## First-party / project-authored production assets

- `public/assets/levels/abandoned-outskirts/level.glb` — authored Abandoned Outskirts gameplay level.
- `public/assets/levels/abandoned-outskirts/level.manifest.json` — authored level metadata, collision/spawn/gameplay layout description.
- `public/assets/weapons/shotgun.glb` — Facefall weapon asset.
- `public/assets/weapons/bow-arrow.glb` — Facefall weapon asset.

## 0.12.0 family checkpoint

No new third-party media was introduced for the family feature. Supermama visual differentiation is procedural and reuses the already documented Quaternius character/animation assets. Uploaded family photographs remain local user content and are not repository assets.

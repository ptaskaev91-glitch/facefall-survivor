# Third-party notices

Facefall Survivor primarily contains original project code. Where a small compatible implementation is directly adapted from an external permissively licensed project, or a production-direction asset is vendored from an external source, the source and license are recorded here.

## Web-Based First Person Shooter Engine (`ivanoskov/shooter`)

Source: `https://github.com/ivanoskov/shooter`

Used as a reference throughout the engine foundation.

Direct adaptations:

- `src/physics/PlayerCapsule.ts` adapts portions of the capsule movement/collision-response approach from `src/core/Player.ts`.
- `src/world/LevelLoader.ts` / `src/world/AssetManager.ts` adapt the small `GLTFLoader → traverse meshes → prepare bounds/shadows → build static collision` loading pattern from `src/core/Game.ts`.

Source revision for these adaptations: `70a7b9f7fc43d99db1e2833e0042b00da00d9cf0`.

The implementations are modified for Facefall's fixed-step, camera-independent, mobile-first architecture and separated into dedicated services rather than copied as whole source files.

MIT License

Copyright (c) 2024 Web-Based First Person Shooter Engine

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Quaternius — Universal Base Characters

Official source: `https://quaternius.com/packs/universalbasecharacters.html`  
Official itch distribution: `https://quaternius.itch.io/universal-base-characters`

Facefall vendors the male runtime subset used by the 0.9.0 hero vertical slice under:

`public/assets/characters/quaternius-universal-base-male/`

Source archive verification and the small upstream URI compatibility patch are documented in that folder's `ASSET_SOURCE.md`. The original pack license is retained as `License_Standard.txt`.

License: **CC0 1.0 Universal / Public Domain Dedication**.

---

## Quaternius — Universal Animation Library

Official distribution: `https://quaternius.itch.io/universal-animation-library`

Facefall vendors the non-root-motion Standard GLB used for hero locomotion under:

`public/assets/animations/quaternius-universal-animation-library/`

The non-root-motion variant is intentional because movement remains authoritative in Facefall's `PlayerRuntime`/collision simulation. The source archive SHA-256 and provenance are recorded in that folder's `ASSET_SOURCE.md`; the original license and README are retained verbatim.

License: **CC0 1.0 Universal / Public Domain Dedication**.

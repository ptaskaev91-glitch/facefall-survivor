# Quaternius Universal Base Characters — male runtime asset

- Source: Quaternius, **Universal Base Characters** (Standard pack)
- Official page: https://quaternius.com/packs/universalbasecharacters.html
- Official itch page: https://quaternius.itch.io/universal-base-characters
- Downloaded official file: `Universal Base Characters[Standard].zip`
- itch upload id: `15861669`
- Original archive SHA-256: `fdbf1804c90dfc1ea03e992bff7da2dfd1a79318e13270a660180f9308455f40`
- Runtime source model: `Base Characters/Godot - UE/Superhero_Male_FullBody.gltf`
- License: CC0; verbatim pack license is retained as `License_Standard.txt`.

## Local compatibility patch

The upstream glTF references two PNG URIs with `_png` duplicated in the file name, while the Standard archive contains the files without that suffix. The vendored glTF changes only those two image URIs:

- `T_Hair_1_Normal_png.png` → `T_Hair_1_Normal.png`
- `T_Eye_Normal_png.png` → `T_Eye_Normal.png`

No geometry, skeleton, UV, material, or texture data is otherwise modified.

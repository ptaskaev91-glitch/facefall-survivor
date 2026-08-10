# Facefall Survivor

Browser-based cinematic zombie survival shooter. Upload a photo and the game uses it as the hero's face locally in the browser.

## Current build — 0.4 Dual Camera 3D

- WebGL / Three.js 3D scene
- switchable top-down Diablo-style camera and third-person camera
- pistol, shotgun and bow
- walkers, runners and brutes
- infinite wave progression
- procedural grass, dirt and asphalt textures
- instanced 3D grass for performance
- puddles, wet-road look, fog and rain
- 3D trees, rocks, crates, abandoned cars and street lamps
- dynamic lighting, shadows, muzzle light and camera recoil
- blood decals, sparks, pickups and obstacle collision
- face upload processed locally in the browser and applied to the 3D hero
- desktop WASD + mouse controls
- mobile touch controls with assisted aiming
- camera can be switched during gameplay with C / CAM
- no backend required

## Hosting

GitHub is the source repository. **Vercel is the only production hosting target.** GitHub Pages is intentionally not used.

Production URL:

`https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

## Next quality pass

1. Replace placeholder geometry with authored GLB character, weapon and zombie models.
2. Skeletal walk/run/attack/death/reload animations.
3. Buildings, interiors, doors and stronger collision/camera collision.
4. Higher-detail ground blending, decals, footprints and vegetation variation.
5. Destructible props, exploding barrels and environmental combat.
6. Bosses, special infected and mini-events.
7. Better face fitting/masking and head animation.
8. Inventory, upgrades, progression and save system.

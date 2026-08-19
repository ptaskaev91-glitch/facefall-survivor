# Super Makar — Project Metadata

Purpose: mobile-first browser 3D family action-survival game.

Repository: `ptaskaev91-glitch/facefall-survivor`

Runtime: static/browser application built with Vite + TypeScript + Three.js.

Deploy: Vercel Git integration. `vercel.json` builds with `npm run build:deploy` and publishes `dist-next`.

Development compute: Moscow VPS `72.56.14.168` (`msk-1-vm-6dy5`).

Moscow project identity: `super-makar`.

Target repository runner label: `moscow-game`.

Control plane: `ptaskaev91-glitch/server-control-ru`.

CI diagnostics: `/var/lib/dev-platform/artifacts/super-makar/<github-run-id>` on Moscow VPS.

Caches:
- npm: `/var/cache/dev-platform/npm`
- Playwright browsers: `/var/cache/dev-platform/browsers`

External services:
- GitHub — source of truth and lifecycle events;
- Moscow Development Platform — build/test/Playwright compute;
- Vercel — Preview/Production web deployment;
- Netherlands VPS — outside the normal Game development/runtime path.

Current gameplay checkpoint: `0.17.0 — Blood Moon / Weather Pass`.

Current development status: `Migration Gate — Moscow Development Platform`.

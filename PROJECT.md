# Super Makar — Project Metadata

Purpose: mobile-first browser 3D family action-survival game.

Repository: `ptaskaev91-glitch/facefall-survivor`

Runtime: static/browser application built with Vite + TypeScript + Three.js.

Production: `https://super-makar-live.vercel.app`.

Deploy: Vercel production release from a **specific green GitHub SHA**. The Vercel deployment bootstrap checks out that SHA, runs the repository's locked `npm ci` + `npm run build:deploy`, and publishes `dist-next`. `vercel.json` remains the repository deployment contract (`npm run build:deploy` → `dist-next`). Automatic Vercel Git integration is **not** currently the canonical release path.

Development compute: Moscow VPS `72.56.14.168` (`msk-1-vm-6dy5`).

Moscow project identity: `game`.

Repository runner: `moscow-game-01`.

Runner label: `moscow-game`.

Runner user: `github-runner-game`.

Control plane: `ptaskaev91-glitch/server-control-ru`.

Canonical Moscow paths:
- workspace: `/srv/dev-platform/workspaces/game`
- services: `/srv/dev-platform/services/game`
- CI diagnostics: `/var/lib/dev-platform/artifacts/game/<github-run-id>`
- logs: `/var/lib/dev-platform/logs/game`
- state: `/var/lib/dev-platform/state/game`
- registry: `/etc/dev-platform/projects.d/game.conf`

Control-plane closeout evidence (2026-08-19):
- stale duplicate `super-makar.conf` for this repository was removed by the Moscow bootstrap;
- `game.conf` is the sole canonical registry entry for `facefall-survivor`;
- `moscow-game-01` was restarted through `moscow-control-ru` and verified `active (running)`;
- `github-runner-game` is a member of `dev-platform`;
- all canonical `game` directories were verified present with the platform group boundary.

Caches:
- npm: `/var/cache/dev-platform/npm`
- Playwright browsers: `/var/cache/dev-platform/browsers`

External services:
- GitHub — source of truth, branches, PRs, history and lifecycle events;
- Moscow Development Platform — normal typecheck/unit/build/Playwright compute and diagnostics;
- Vercel — public production web hosting/release target;
- Netherlands VPS — outside the normal Game development/runtime path.

Vercel note: generated deployment/team aliases can be protected by Vercel Authentication in this account; the canonical short production domain `https://super-makar-live.vercel.app` was independently verified public without Vercel login.

Current gameplay checkpoint: `0.17.0 — Blood Moon / Weather Pass`.

Current development status: `Migration Gate complete; Step 1 — Third-person Aim/Camera correctness`.

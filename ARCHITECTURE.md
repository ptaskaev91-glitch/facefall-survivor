# Super Makar — Architecture

## Runtime

The game is a browser-first static application built from TypeScript/Vite/Three.js. Production output is `dist-next`.

Core runtime rules:
- TOP and third-person cameras share one simulation;
- authored GLB world with structural collision;
- offline Recast/Detour navigation;
- local-first face photos; no user photo upload;
- mobile-first controls and bounded presentation effects;
- `?debug=1` instrumentation must not impose normal-mode cost.

## Development platform

Canonical lifecycle:

```text
feature branch / PR in GitHub
        ↓
Moscow self-hosted CI
        ↓
typecheck + unit + Playwright + build
        ↓
local Moscow diagnostics
        ↓
review / merge
        ↓
Moscow main CI
        ↓
Vercel Git deployment
        ↓
production smoke
```

Responsibilities:
- GitHub: source, branches, PRs, history and tags;
- Moscow VPS `72.56.14.168`: development compute, caches, tests and diagnostics;
- `server-control-ru`: Moscow control plane;
- Vercel: preview and production hosting;
- Netherlands VPS: network/edge services only, not normal Game CI.

## Moscow project boundary

Project identity: `super-makar`.
Target runner label: `moscow-game`.

Paths:
```text
/srv/dev-platform/workspaces/super-makar
/srv/dev-platform/services/super-makar
/var/lib/dev-platform/artifacts/super-makar
/var/lib/dev-platform/logs/super-makar
/var/lib/dev-platform/state/super-makar
/etc/dev-platform/projects.d/super-makar.conf
```

Shared caches:
```text
/var/cache/dev-platform/npm
/var/cache/dev-platform/browsers
```

Heavy Playwright/browser/build work must use `dev-heavy`.

## CI / deploy separation

CI validates the software. It does not use GitHub Artifacts as the deployment transport.

Vercel uses the repository and `vercel.json`:
- build: `npm run build:deploy`
- output: `dist-next`

Normal development must not depend on GitHub-hosted compute after the Moscow migration is complete.

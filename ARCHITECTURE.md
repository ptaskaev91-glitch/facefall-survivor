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
Moscow self-hosted CI (`moscow-game`)
        ↓
typecheck + unit + Playwright + deploy build
        ↓
local Moscow diagnostics
        ↓
review / merge
        ↓
Moscow validation of the release SHA
        ↓
Vercel production release from that exact green Git SHA
        ↓
public production smoke
```

Responsibilities:
- GitHub: source of truth, branches, PRs, history and tags;
- Moscow VPS `72.56.14.168`: normal development compute, caches, tests and diagnostics;
- `server-control-ru`: Moscow control plane and project/runner standard;
- Vercel: public production hosting/release target;
- Netherlands VPS: network/edge services only, not normal Game CI.

## Moscow project boundary

Project identity: `game`.
Repository runner: `moscow-game-01`.
Runner label: `moscow-game`.
Runner user: `github-runner-game`.

Paths:
```text
/srv/dev-platform/workspaces/game
/srv/dev-platform/services/game
/var/lib/dev-platform/artifacts/game
/var/lib/dev-platform/logs/game
/var/lib/dev-platform/state/game
/etc/dev-platform/projects.d/game.conf
```

Shared caches:
```text
/var/cache/dev-platform/npm
/var/cache/dev-platform/browsers
```

Heavy Playwright/browser/build work must use `dev-heavy`.

## CI / deploy separation

CI validates the software. It does not use GitHub Artifacts as deployment transport and does not require GitHub-hosted runners in the normal project path.

The repository deployment contract remains:
- `vercel.json` build: `npm run build:deploy`
- output: `dist-next`

The current Vercel release path is intentionally **SHA-pinned** rather than automatic Git integration:

```text
known green Git SHA
        ↓
Vercel deployment bootstrap
        ↓
checkout exact SHA from public GitHub repository
        ↓
npm ci
        ↓
npm run build:deploy
        ↓
publish dist-next
```

This keeps the released source unambiguous even though the current Vercel connector does not expose Git-repository linking/project-protection mutations.

Canonical public production URL:

```text
https://super-makar-live.vercel.app
```

Vercel's generated deployment/team aliases can be SSO-protected in the current account. They are not the public production contract; the short production domain above is independently checked without Vercel authentication.

## Release evidence rule

A gameplay release is considered eligible only when:
1. the source SHA passed Moscow typecheck/unit/Playwright/build gates;
2. Vercel production is built from that same SHA;
3. the canonical production domain is reachable publicly;
4. user-facing claims that require device/browser evidence are only made after that evidence exists.

# GitHub and Vercel delivery

The owner authorized production deployment and the ongoing commit → push → deploy workflow on September 6, 2026. This deploys the current Neon Spire development milestone; it does not declare full-game or physical-controller acceptance.

## Project

- GitHub: [therealjrhythm/snake-year-3039](https://github.com/therealjrhythm/snake-year-3039).
- Production branch: `main`.
- Vercel team: `acoldbrand` (COLD).
- Vercel project: `snake-year-3039`, ID `prj_v6MkDyZAMFwhBYui3uHWW5vmQXYF`.
- [Vercel dashboard](https://vercel.com/acoldbrand/snake-year-3039).
- Framework: Vite; repository root; output: `dist`; Node.js: `22.x`.
- Install: `npm ci`. Build: `npm run check && npm run build`, enforced by `vercel.json`.
- The static game requires no application environment variables or backend credentials. `.vercel/` and `.env*` stay local and ignored.

The GitHub connection was verified against the Vercel project API: provider `github`, organization `therealjrhythm`, repository `snake-year-3039`, production branch `main`. Vercel's Git integration builds branch pushes and assigns successful production builds to the production domain. See [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github) and [project configuration](https://vercel.com/docs/project-configuration).

## Deliver a change

1. Implement the intended change and update the feature matrix/handoff with actual behavior and evidence. Preserve the supplied builder package.
2. Run `npm run check`, `npm run build` and applicable development browser scripts sequentially. Development fixture scripts use Vite `/src/` imports and must stay on localhost.
3. Review `git diff` and `git diff --check`; stage intended source, assets, tests and documentation. Exclude local credentials, dependencies and build output.
4. Commit, then `git push origin main`. If a feature branch is required, use the `codex/` prefix and merge through the normal reviewed route. Do not force-push `main`.
5. Wait for Vercel's Git deployment of that exact pushed commit. Check build status and logs; Ready alone does not establish that the game loads.
6. Run `node scripts/verify-deployment.mjs <public-production-url>` against the production domain. Confirm GitHub/local HEAD and the deployment's Git SHA match. Report the URL and any unresolved issue.

The owner has already authorized these routine delivery steps. Do not repeatedly request permission for each commit, push or deployment. A later request to hold changes locally takes precedence. Do not upload uncommitted local source as production, create duplicate Vercel projects, expose authentication tokens, or claim a failed deployment succeeded.

If Git integration does not trigger a build, inspect the existing connection, branch, GitHub deployment checks and Vercel errors. An authenticated CLI/API deployment of the exact pushed commit is a fallback; it must retain source/commit traceability. Recover a broken production release using Vercel's deployment controls and repair the cause before the next handoff.

## Evidence boundary

`scripts/verify-deployment.mjs` uses an isolated installed-Chrome context and ordinary rendered UI. It checks production assets, menus, customization, help, game start, first-core movement and pause without Vite development imports, installed simulation snapshots, or the owner's storage. It is a deployment smoke check, not a complete Warden run, physical Xbox qualification, listening review, sustained hardware benchmark or five-player comprehension test.

Initial live URL and deployment verification will be recorded after the first production build is Ready and the public game passes this check. Browser saves remain local to their site origin: localhost and the hosted game have separate saved runs/settings/records.

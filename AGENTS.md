# Snake: Year 3039

Read `docs/SESSION_HANDOFF.md` and `docs/FEATURE_MATRIX.md` before changing the game. The supplied builder package's `docs/PRD.md` v2.0 is the active full-game design authority; the Word document and approved images are source material. Preserve the original package.

The playable root app is an initial Neon Spire foundation, not the full release. Keep all five districts, fifteen waves, five distinct finales and the complete mode/progression/accessibility inventory in scope. Data identifiers, arranged test fixtures and mocked gamepads are not implemented content, a normal playthrough or physical device acceptance.

Keep game rules in the fixed-step simulation and typed content. Rendering, React updates and display frame rate cannot change travel, collisions, resources, score or encounter time. New hazards need visible warnings and collision-accurate geometry. Do not weaken critical crash or rival physics to make a demo pass.

Run `npm run check` for simulation/type changes and `npm run build` before a handoff. With `npm run dev` running on `http://127.0.0.1:3039`, run `node scripts/verify-game.mjs`, `node scripts/verify-platform.mjs`, `node scripts/verify-controller.mjs`, `node scripts/verify-audio.mjs`, `node scripts/verify-enemies.mjs`, `node scripts/verify-systems.mjs`, `node scripts/verify-runtime.mjs` and `node scripts/verify-render-performance.mjs` for their respective changes, sequentially. They use isolated installed-Chrome contexts. Read their evidence limitations.

Update the feature matrix and session handoff with actual verification and remaining requirements. Compare rendered captures with the supplied references when changing art. The owner likes the overall graphics, sound effects and smooth controls; preserve that direction. Xbox menu navigation, enemy readability and futuristic music were the targeted feedback fixes. Revised-music listening feedback, full reference acceptance and physical Xbox confirmation remain outstanding.

## GitHub and Vercel delivery

The owner authorized ongoing delivery on September 6, 2026: after each completed change, run the applicable checks, commit the intended project files, push to `https://github.com/therealjrhythm/snake-year-3039.git`, and update Vercel. This authorization persists; routine commits, pushes and deployments do not need another confirmation. Respect any later instruction to hold a change locally.

Production uses `main` and the Vercel project `snake-year-3039` in team `acoldbrand` (COLD). Its GitHub connection deploys pushes to `main`; prefer this path so the live version corresponds to a pushed commit. Preserve remote history, resolve conflicts safely, and never force-push production as a shortcut. Do not upload a dirty working directory as production.

Before reporting delivery, confirm that GitHub and local HEAD match, Vercel's production deployment is Ready for that commit, and the public production URL passes `node scripts/verify-deployment.mjs <production-url>`. Run development-only verification scripts against localhost; they rely on Vite source imports and fixtures. Keep `.vercel/`, `.env*`, credentials and generated dependency/build directories out of Git. Record deployment failures accurately and repair or roll back a broken release. See `docs/DEPLOYMENT.md` for configuration, commands and evidence limitations.

# Snake: Year 3039

A single-player 3D cyberpunk browser game in development. The active brief is the supplied **Full Game PRD v2.0**: five distinct districts, fifteen campaign waves, five finales, four modes, twelve Trials and complete progression/presentation/reliability. The first Neon Spire playable is a development milestone, not the release scope.

## Deployment

Play the current Neon Spire milestone at **[snake-year-3039.vercel.app](https://snake-year-3039.vercel.app/)**.

The repository is connected to the Vercel project `acoldbrand/snake-year-3039`. Pushes to `main` build the production game after `npm ci`, the simulation/type checks and the production build. The ongoing delivery workflow and production verification are recorded in [DEPLOYMENT.md](docs/DEPLOYMENT.md). Future changes should be verified, committed, pushed and checked on Vercel before handoff.

## Run locally

From this folder with a current Node.js runtime and npm:

```sh
npm install
npm run dev
```

Open the local address printed by Vite (normally `http://127.0.0.1:3039`). The renderer targets WebGL 2 on desktop/laptop browsers. Hardware/browser/controller qualification is still required before a supported-platform claim.

```sh
npm run check   # TypeScript and simulation tests
npm run build   # TypeScript and production bundle
npm run preview # Serve the production bundle locally after building
```

The package pins dependency versions. Local development verification does not imply launch acceptance or physical Xbox compatibility.

To reproduce the browser checks with installed Chrome, start Vite on the verification port and run the scripts in a second terminal:

```sh
npm run dev -- --port 3039
node scripts/verify-game.mjs
node scripts/verify-platform.mjs
node scripts/verify-controller.mjs
node scripts/verify-audio.mjs
node scripts/verify-enemies.mjs
node scripts/verify-systems.mjs
node scripts/verify-runtime.mjs
node scripts/verify-render-performance.mjs
node scripts/verify-expansion.mjs
node scripts/verify-expansion-render.mjs
node scripts/verify-combat-update.mjs
```

Run these scripts sequentially. They accept a different local URL as their first argument. Controller/platform checks use mocked standard gamepads in isolated browser contexts; audio uses a real Web Audio graph and enemy captures use explicit frozen fixtures.

Historical 0.2 input-only simulation traces and a timing-sensitive rendered keyboard replay are documented separately in the handoff. Reproduce a successful pure trace with `node scripts/probe-ordinary-run.mjs --replay docs/evidence/ordinary-standard-3039-keyboard.json`. `node scripts/verify-ordinary-keyboard.mjs` requires a matching-version trace/build and exercises the actual App with keyboard events; its retained failed clear is not hidden by fixture results. Neither method is physical-controller or human acceptance.

## Current implementation checkpoint

Version **0.3.2** adds three lives with current-wave/boss retries, charged laser combat against a firing Warden, a stable gameplay camera, a more dimensional arena, crisp colored light strips and immediate menu feedback to the 36 × 26 Neon Spire expansion. Existing 0.1 and 0.2 saves keep their exact original geometry, body path and rules; records stay separated by content version. Use Start Game for the new rules. The 0.3.2 patch restores held steering immediately after countdowns and slightly widens collection contact for cores, powers and Warden spheres.

See the [current combat/interface addendum](docs/NEON_SPIRE_COMBAT_REFRESH.md), [expansion addendum](docs/NEON_SPIRE_EXPANSION.md), [session handoff](docs/SESSION_HANDOFF.md) and [feature matrix](docs/FEATURE_MATRIX.md) for actual verification and remaining acceptance. The source package remains unchanged. Physical Xbox testing, owner listening/reference review, ordinary full-district play and five-player comprehension observations remain distinct from automated evidence.

The other four districts/finales, full-city progression/ending, Arcade, Endless, twelve Trials, six liveries, six trails, twelve achievements, Workshop, full settings/accessibility, transactional save/recovery/export/import, performance and hardware qualification remain required work. Defining their IDs does not make them playable.

## Controls

| Action | Keyboard | Standard-mapped Xbox target |
| --- | --- | --- |
| Steer | WASD or arrows | Left stick or D-pad |
| Boost | Hold Shift | Right trigger |
| Fire blaster / charged boss laser | Hold F | Hold A |
| Use selected tactical | Space | X |
| Select tactical slot | E | Y |
| Pause / back | Escape | Menu / B |
| Confirm menu action | Enter; Space on a focused button | A |
| Navigate menus | Tab / Shift+Tab and supported arrows | D-pad / left stick |
| Open a choice list | Enter / Space | A |
| Choose / cancel an option | Up/down, Enter / Escape | D-pad up/down, A / B |
| Adjust a menu setting directly | Left / right arrows | D-pad left / right |
| Switch settings / guide tab | Tab then Enter | LB / RB |

Movement is continuous. Direction input changes heading; releasing it preserves direction. Shields protect against hostile attacks; colliding with walls, your own body or a rival remains a critical crash. A rival head striking your trailing body is the core combat interaction. Physical Xbox testing is outstanding; the mapping table records the intended shared controls.

## Pickups, tactics and recovery

Cyan cores advance the quota and grow the snake. Powerups activate immediately except stored EMP/Decoy charges and equipped blaster ammunition. The HUD shows bonus names, time remaining, glowing ready tactical slots and ammunition. Bonus cards expose effect descriptions to assistive technology and on hover; the Lab and paused guide explain effects in full. EMP begins in Wave 2, Decoy after its sixth core, and the blaster after its eighth. Empty eligible tactical slots receive repeating supply offers when safe floor space permits. Pause → Pickups & Tactics explains all twelve powers and the current Warden objective.

Wave 3 is the Hunter encounter; Warden follows its twelve-core quota. During the new Warden fight, collect spheres 1 → 2 → 3 to charge your laser and open the glowing target at top-center. Hold F / Xbox A to land three hits. Dodge the red shots along the warned orange lines, repeat for all three armor pieces, then exit north. The boss laser matches your snake and needs no ammunition. Earlier saves retain their pad/hybrid fight.

Customize Snake is available on the title and pause menus. Head/body glow is cosmetic, saved independently, and previewed through the existing renderer. Title → Powerup Lab offers each power and a Warden rehearsal without replacing a suspended campaign. Pause in the Lab to refill/reset or choose another system. Results → Replay This Seed starts a fresh attempt with the same seed and rules.

New runs have three lives total. A lost life retries the current wave or Warden with the score and equipment from that stage’s beginning; elapsed time and damage counts continue. The third loss ends the run. A suspended lost-life screen restores with the same remaining lives.

If the browser blocks sound, use the visible Click to enable sound button with a mouse or press a keyboard key. Automatic pauses show their cause; a performance pause offers Low graphics and a fresh countdown. Large displays use bounded rendering resolution while the HUD remains at full resolution. Movement and critical-crash collision rules remain unchanged; a crash spends a life.

## Files and authority

| Path | Purpose |
| --- | --- |
| `src/main.tsx` | React entry point and font/style imports |
| `src/App.tsx` | Application screen/state flow; creates and coordinates simulation, renderer, input, audio, settings and save/recovery UI |
| `src/components/GameplayGuide.tsx` | Device-aware Basics/Pickups/Tactics guide, reachable from title or the frozen pause menu |
| `src/components/Hud.tsx` | Live objective, score, integrity, boost, tactical slots and encounter information |
| `src/components/Modal.tsx` | Semantic modal presentation and focus handling |
| `src/components/MenuSelect.tsx` | Visible keyboard/controller option lists, confirmation/cancellation and focus |
| `src/components/Settings.tsx` | Initial Controls/Audio/Visuals/Accessibility settings and validated local settings defaults |
| `src/style.css` | Title, HUD, menus, modals, settings, focus and responsive visual styles |
| `src/game/types.ts` | Simulation/entity state, shared input types and full-release content contracts |
| `src/game/content.ts` | Expanded and legacy content versions, movement/rules, complete district/wave/pickup/trial/cosmetic/achievement IDs, and inventory validation; D2–D5 are declared planned content |
| `src/game/layouts.ts` | Versioned shared arena geometry, authored routes/spawns, boss and extraction definitions |
| `src/game/appearance.ts`, `src/components/CustomizeSnake.tsx` | Independent free glow persistence and same-renderer 3D preview UI |
| `src/components/PowerupLab.tsx` | Real Practice encounter selection and refill/reset navigation |
| `src/game/simulation.ts` | Authoritative fixed-step player/body movement, collisions, resources, seeded encounters, score, Neon Spire wave/boss progression and snapshot validation |
| `src/game/renderer.ts` | Three.js scene/cameras, instanced serpent geometry, city/grid/machinery, dynamic threats/pickups, reflections/bloom and renderer lifecycle |
| `src/game/input.ts` | Keyboard/gamepad polling, shared gameplay actions, menu navigation and input clearing/device handling |
| `src/game/audio.ts` | Original procedural music and event effects through browser audio |
| `src/game/persistence.ts` | IndexedDB suspend/checkpoint/record storage, envelope validation, and atomic result/save removal foundation |
| `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` | Pinned dependencies, dev/build/test scripts and app bootstrap |
| `public/assets/` | New production-direction image assets, with provenance recorded below |
| `docs/DESIGN_SYSTEM.md` | Translation of the approved art references into the playable presentation |
| `docs/ASSET_PROVENANCE.md` | New asset source, authorship and licensing notes |
| `docs/IMPLEMENTATION_ROADMAP.md` | Full PRD chapter 30 delivery sequence and milestone gates |
| `docs/FEATURE_MATRIX.md` | Complete launch inventory, honest implementation state and verification ledger |
| `docs/VISUAL_REVIEW.md` | Screenshot-specific comparison with the approved references and outstanding art-review work |
| `docs/SESSION_HANDOFF.md` | Exact checkpoint, reproduction commands, evidence limits and next implementation steps |
| `docs/DEPLOYMENT.md`, `vercel.json`, `scripts/verify-deployment.mjs` | GitHub/Vercel delivery workflow, test-gated production configuration and real-UI production smoke check |
| `tests/simulation.test.ts` | Bounded content, movement, collision, pickup, rival, boss and snapshot checks |
| `tests/expansion.test.ts` | Expanded power supply, weapon/target rules, buffs, boss routes, Lab and legacy/save compatibility checks |
| `scripts/verify-game.mjs`, `scripts/verify-platform.mjs`, `scripts/verify-controller.mjs` | Real-browser app checks and isolated mocked-gamepad/storage checks |
| `scripts/verify-systems.mjs`, `scripts/verify-runtime.mjs` | Actual App pickup/combat/guide snapshot fixtures and native audio/automatic-pause recovery checks |
| `scripts/verify-audio.mjs`, `scripts/verify-enemies.mjs`, `scripts/verify-render-performance.mjs` | Native audio rendering/lifecycle, frozen enemy/pickup/EMP visuals, bounded buffers and short diagnostic frame observations |
| `scripts/verify-expansion.mjs`, `scripts/verify-expansion-render.mjs` | Actual customization/Lab/replay/save flows and arranged arena/HUD/glow/power/boss presentation checks |
| `docs/evidence/` | Actual screenshots and machine-readable browser report; Warden capture is explicitly fixture-based |
| `Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/PRD.md` | Authoritative full-game specification |
| `Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/FULL_GAME_HANDOFF.md` | Builder priorities and scope/engineering/evidence guardrails |
| `Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/LAUNCH_ACCEPTANCE.md` | Original untested full-release acceptance checklist |
| `Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/references/` | The two approved flattened reference images; visual direction, not runtime geometry |
| `Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/asset-manifest.json` | Supplied reference provenance/checksums |
| `Snake_Year_3039_Full_Game_PRD_v2_0.docx` | Supplied Word version of the specification |
| `Snake_Year_3039_Full_Game_Builder_Package_v2_0.zip` | Original supplied package archive |

The supplied source package is preserved. New implementation and documentation live alongside it. Simulation, input, presentation and persistence are separately owned systems; the concrete modules above form the first-district implementation, not proof of completed launch systems.

See the [implementation roadmap](docs/IMPLEMENTATION_ROADMAP.md) and [feature matrix](docs/FEATURE_MATRIX.md) for the next work and acceptance boundaries.

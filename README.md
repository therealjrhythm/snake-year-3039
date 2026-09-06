# Snake: Year 3039

A single-player 3D cyberpunk browser game in development. The active brief is the supplied **Full Game PRD v2.0**: five distinct districts, fifteen campaign waves, five finales, four modes, twelve Trials and complete progression/presentation/reliability. The first Neon Spire playable is a development milestone, not the release scope.

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
```

Run these scripts sequentially. They accept a different local URL as their first argument. Controller/platform checks use mocked standard gamepads in isolated browser contexts; audio uses a real Web Audio graph and enemy captures use explicit frozen fixtures.

## Current implementation checkpoint

Version **0.1.0** implements a first playable foundation: a real Three.js arena and player serpent, React/HTML title/settings/HUD, fixed 60 Hz simulation, shared keyboard/gamepad actions, three Neon Spire wave definitions and runtime transitions, Hunter body-block combat, Warden mechanics and active extraction. Original procedural music/effects and IndexedDB suspend/checkpoint/records support the initial loop. The latest feedback pass adds explained pickup effects, a pause-menu tactical guide, visible head-hit feedback, native audio recovery and bounded large-display rendering. These foundations have bounded automated verification; the representative Neon Spire milestone is not yet accepted.

`npm run check` passed 43 tests and `npm run build` passed. The browser run passed 15 checks in headless Chrome 152.0.7977.77, including normal keyboard movement/first-core growth, pause, exact suspend/reload, focus-loss countdown pause, 150% HUD containment at 1280 × 720, named wall crash, once-only record/save clearing and checkpoint retry. Platform checks passed real React settings navigation, mocked gamepad edges and IndexedDB isolation. See the [browser report](docs/evidence/browser-report.json) and [feature matrix](docs/FEATURE_MATRIX.md) for coverage limits.

**No complete district has been demonstrated through ordinary play.** The Warden screenshot loads an explicit snapshot fixture; it proves rendering/restoration, not that a player completed the preceding waves or boss. Normal steering audits reached 10, 16 and 14 cores on three seeds before self-collision. The owner likes the graphics, sound effects and smooth controls. Their requested Xbox-menu, enemy-readability and futuristic-music changes are implemented; revised-music listening feedback, physical Xbox confirmation and normal complete-district play remain outstanding. The [visual review](docs/VISUAL_REVIEW.md) records the remaining material gap from the approved references.

The other four districts/finales, full-city progression/ending, Arcade, Endless, twelve Trials, six liveries, six trails, twelve achievements, Workshop, full settings/accessibility, transactional save/recovery/export/import, performance and hardware qualification remain required work. Defining their IDs does not make them playable.

## Controls

| Action | Keyboard | Standard-mapped Xbox target |
| --- | --- | --- |
| Steer | WASD or arrows | Left stick or D-pad |
| Boost | Hold Shift | Right trigger |
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

Cyan cores advance the quota and grow the snake. Wave 1 colored squares activate automatically: green Overdrive halves boost drain for 8s (hold RT/Shift), and magenta Score Surge doubles core/rival points for 15s. Their effects and timers appear beside integrity. Wave 2 adds blue Shield and cyan EMP charges. Collect an EMP, then use X/Space within four units of a drone or emitter; Y/E switches slots. Decoy is available in Practice in this build. Pause → Pickups & Tactics explains all eight pickups and head-only attack damage.

If the browser blocks sound, use the visible Click to enable sound button with a mouse or press a keyboard key. Automatic pauses show their cause; a performance pause offers Low graphics and a fresh countdown. Large displays use bounded rendering resolution while the HUD remains at full resolution. The challenge and critical-crash rules are unchanged.

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
| `src/game/content.ts` | `0.1.0-neon-spire` content version, movement/rules, complete district/wave/pickup/trial/cosmetic/achievement IDs, and inventory validation; D2–D5 are declared planned content |
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
| `tests/simulation.test.ts` | 43 bounded content, movement, collision, pickup, rival, boss and snapshot checks |
| `scripts/verify-game.mjs`, `scripts/verify-platform.mjs`, `scripts/verify-controller.mjs` | Real-browser app checks and isolated mocked-gamepad/storage checks |
| `scripts/verify-systems.mjs`, `scripts/verify-runtime.mjs` | Actual App pickup/combat/guide snapshot fixtures and native audio/automatic-pause recovery checks |
| `scripts/verify-audio.mjs`, `scripts/verify-enemies.mjs`, `scripts/verify-render-performance.mjs` | Native audio rendering/lifecycle, frozen enemy/pickup/EMP visuals, bounded buffers and short diagnostic frame observations |
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

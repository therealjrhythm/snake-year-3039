# Session handoff — 0.2.0 expanded Neon Spire

The owner explicitly authorized the [Neon Spire expansion plan](NEON_SPIRE_EXPANSION.md). It supplements the original [PRD v2.0](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/PRD.md); the supplied package, Word document and approved images remain unchanged. The complete destination is five distinct districts, fifteen waves/228 ordinary cores, five finales, four release modes, twelve Trials, earned liveries/trails/achievements, full Workshop, progression/ending, and complete accessibility/reliability. This checkpoint expands D1 before the remaining city; it is not full-release acceptance.

## What changed

- New attempts use `0.2.0-neon-spire` and `neon-spire-v2`, a 36 × 26 layout. `src/game/layouts.ts` owns physical arena bounds, obstacles, candidates, entries, gates, Warden and extraction. Original 0.1 saves infer `neon-spire-v1`, retaining 32 × 24 geometry, original pickup rules and exact body coordinates.
- All eight original powers enter the expanded campaign with staged eligibility. Pulse Blaster, Capacitor, Bullet Scrubber and Chain Buffer bring the roster to twelve. Typed content supplies introductions, activation and eligibility descriptions. Supply state persists the rotating EMP/Decoy/automatic opportunities and safe retries; three ground pickups, eight-second cadence, fifteen-second expiry and one charge per slot remain.
- Fire is held F / Xbox A. Twelve shots, four shots/s, bounded player projectile pool, ten-unit forward range and a 60° visible-target cone live in the simulation. Drones take two hits and award no new score. Solid scenery blocks shots; rival serpents stay armored. The accepted movement and critical-crash rules remain.
- Wave 3 says Hunter encounter and names the next Warden phase. Warden has separate relay charge and armor counters, next-relay highlighting, truthful pad states, an inner-edge receptor, armor feedback and links. Three relays plus recovery permit either automatic pad discharge or three blaster hits. Charge persists across missed windows; partial weapon hits reset. Extraction replaces obsolete boss timers/prompts.
- Typed events pass the entire payload to audio, including numeric relay index. Every event has an explicit audible or silent policy. Ascending relay cues, charge/recovery/armor/defeat, blaster/impact and new-power cues extend the existing musical/effects direction. Saved mute applies before the first audio sample.
- Customize Snake is reachable from title and pause. Eight free glows have live rotate/zoom previews in the same WebGL renderer, matching selected head/body/direction-marker colors, Apply/Cancel/Restore Cyan and independent persistence. It does not change simulation statistics or advance a paused run. Earned armor/trail rewards and full Workshop remain future work.
- Title → POWERUP LAB (also available under Start Game) offers all twelve powers and Warden boss practice, with actual pickup images, plain effect descriptions and device-aware activation help. Lab scenarios use real rules with explicitly prepared resources/threats, no records/rewards and no campaign-suspend replacement. Pause offers refill/reset, another system or Leave Lab.
- Results → Replay This Seed starts a new run identity with the same seed, content version, layout, mode and rules. Local best scores are separated by content version/rules/mode/district; unversioned earlier records remain visible in the Legacy collection.

## Earlier follow-up — illustrated Lab and clearer Warden help

The owner asked for simpler Lab descriptions, an explanation of the pad, and images of the powers. Each selection now shows its actual game model/symbol, a short effect description and a separate automatic/X/Space/A/F activation instruction. Thirteen transparent 320 × 320 exports (twelve powers plus the green Warden pad) add about 211 KiB, with no new runtime WebGL context. Regenerate with `node scripts/generate-powerup-previews.mjs` after pickup art changes; provenance is in [ASSET_PROVENANCE.md](ASSET_PROVENANCE.md).

The Lab and paused Warden guide share pictured instructions: collect 1 → 2 → 3, find the round pad at the bottom-center, cross when green, repeat for three armor pieces, and exit at the top-center. The optional shooting route identifies the yellow ⊕ target below Warden. Boss introduction/HUD/event prompts use these landmarks; legacy help retains its pad-only route. This changes presentation, not rules, timing, physics or save format.

Verification for this follow-up: 70 tests and build pass; expansion App, controller, systems and expansion-render scripts pass sequentially. Controller coverage now includes all thirteen Lab choices, image loading, Xbox glyphs, reachable Start practice and B-back at 1440 × 900 / 375 × 1020 using mocked standard pads. Expansion checks enter the Warden Lab and preserve the campaign save. The compiled production preview passes all eight smoke groups, including every image, ordinary first-core/pause, desktop/narrow Lab layouts and zero failed assets/browser errors. See the [report](evidence/lab-clarity-2026-09-06/report.json), [powerup view](evidence/lab-clarity-2026-09-06/lab-magnet.png), [Warden instructions](evidence/lab-clarity-2026-09-06/lab-warden.png) and [narrow layout](evidence/lab-clarity-2026-09-06/lab-narrow.png). These captures were visually reviewed against the owner's confusing Lab screenshot; accepted visual styling is retained. Rerun the same production smoke against Vercel after this commit deploys. Physical Xbox and new-player comprehension still require human observation.

## Latest owner revision — vibrant full-snake glow and direct Lab access

The owner explicitly replaced the fixed-cyan-head requirement with matching head/body glow. Wider, brighter emissive strips and more saturated presets improve recognition at Low and Medium, while the preview no longer darkens the model with a modal overlay. Head lights and the small direction marker follow the chosen preset; armor shape, hostile red faction, movement/collisions and saved appearance IDs remain intact. Apply/Cancel/Restore and independent persistence retain their existing behavior.

POWERUP LAB is now a full-size primary title button below START GAME. It opens directly, closes back to title, and preserves an existing campaign save. The original briefing shortcut remains. Responsive title spacing and scrolling keep CONTINUE RUN and the other actions reachable on smaller displays.

The combined check/build (70 tests) and game/controller/platform/enemy/expansion/expansion-render/performance checks pass sequentially. The 96-case render sweep verifies selected color on body, head, ports, direction marker and preview head while hostile red remains unchanged. All 32 actual customizer before/after captures (eight colors × Low/Medium × before/after) were visually reviewed. Keyboard title→Lab→Escape returns focus; guarded restoration does not override subsequent controller navigation. Six title sizes, including 960 × 540 and 375 × 1020 with a saved run, keep the primary buttons visible. Evidence: [before](evidence/glow-title-2026-09-06/glow-before.png), [after](evidence/glow-title-2026-09-06/glow-after.png), [title](evidence/glow-title-2026-09-06/title-lab.png), [narrow title](evidence/glow-title-2026-09-06/title-narrow.png), [renderer report](evidence/glow-title-2026-09-06/render-report.json), [controller log](evidence/glow-title-2026-09-06/controller.log), [title sizes](evidence/glow-title-2026-09-06/title-layout-report.json), [bounded render timing](evidence/glow-title-2026-09-06/render-performance.log). The timing sample is only 20 frames (2.3 ms median / 2.8 ms p95 completion here), not sustained hardware qualification. Physical Xbox and owner color approval remain open.

The [compiled local production smoke](evidence/glow-title-2026-09-06/production-local-report.json) also passes all ten groups: direct keyboard Lab access and return focus, eight persisted glow choices, twelve pickup images and illustrated Warden instructions, ordinary first-core movement/pause, paused guide, and saved-run title layouts. It reports zero browser errors, warnings or failed assets. Verify the exact pushed Vercel commit and repeat this smoke against the public domain before reporting delivery.

## Run and controls

Run `npm run dev` and open **http://127.0.0.1:3039/**. Refresh the preview to load the expansion. Continuing an old save deliberately keeps the legacy arena and powers; Start Game begins the expanded version. The Lab preserves a suspended campaign.

Keyboard: WASD/arrows steer, Shift boosts, Space uses the selected tactical, E switches, F fires, Escape pauses/backs out. Xbox target: left stick/D-pad steers, RT boosts, X uses, Y switches, A fires, Menu pauses; A/B select/back in menus and LB/RB switch tabs. Held actions are suppressed across menus/countdowns until release. Physical Xbox qualification remains outstanding.

## Verification ledger

The expanded implementation passes 70 simulation/content tests and production compilation. All ten targeted browser scripts below passed sequentially in installed Chrome 152.0.7977.77. Their logs and structured reports are in `docs/evidence/`; the [feature matrix](FEATURE_MATRIX.md#development-verification) records each scope and limitation.

The checks cover actual title/pause customization with independent persistence and one canvas, all twelve Lab selections plus Warden rehearsal, campaign-save isolation, the delayed-save/resume race, new-attempt replay identity, explicit relay sounds, both boss damage routes, supply retry/exact resume, fresh/held controller inputs, native audio recovery and protected pauses. The renderer check covers 96 glow/quality/ratio/scale combinations and a six-buff UI150 stress state with every effect and duration visible. Controller checks use mocked standard gamepads at 1440 × 900 and 375 × 1020; they are not physical Xbox acceptance.

Two fresh Standard seed 3039 input-only simulation runs collected all 36 cores, broke all three Warden nodes using the pad, and extracted. The analog trace also made an intentional Hunter body-block. The eight-direction trace used no blaster. Both used optional powers and an algorithm with read-only future-state forecasting; neither is a human playtest. Exact replay files are [analog](evidence/ordinary-standard-3039-analog.json) and [keyboard directions](evidence/ordinary-standard-3039-keyboard.json).

An actual rendered App keyboard replay reached Warden after all 36 cores, then self-crashed at 162.95 simulation seconds. It recorded zero automatic pauses and zero browser errors. A diagnostic checkpoint found no countdown key suppression; a one-step-delayed steering command reproduces the early crash. This failed full-browser clear is retained in [the failure report](evidence/ordinary-keyboard-browser-failed-162.95.json); production input/physics remain unchanged. No human or physical full-clear claim follows from the successful pure traces.

Browser verification runs in isolated installed-Chrome profiles using Playwright because the Browser plugin is unavailable. Scripts must run sequentially; concurrent browser/GPU workloads distort frame pacing. They do not alter the owner's browser saves. Arranged simulation/Lab/boss/render fixtures, ordinary input runs, physical devices and owner acceptance are separate evidence categories.

Required commands:

```sh
npm run check
npm run build
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
```

Additional ordinary-run probes are reproducible with `node scripts/probe-ordinary-run.mjs --replay docs/evidence/ordinary-standard-3039-keyboard.json` and `node scripts/verify-ordinary-keyboard.mjs`. The latter is a paced, rendered keyboard replay and can diverge when an input arrives a fixed step late. Do not relabel a fixture as an ordinary clear or weaken collision rules to pass it.

## Remaining acceptance and next work

- Complete ordinary Neon Spire runs using keyboard and a physical Xbox controller, including an intentional Hunter body-block and Warden clear without optional powers. An algorithmic steering probe or prepared boss snapshot is not a human/device pass.
- Observe five new players; at least four should explain pickup activation and the boss objective without verbal coaching. Record balance changes against those observations.
- Owner review of revised music, all glows, larger arena/readability and supplied-reference fidelity; actual supported landscape ratios and 80–150% UI scale; identified-machine sustained performance and USB/Bluetooth controller qualification.
- After this milestone passes playtesting, implement D2–D5 and their distinct bosses/routes, missing enemy archetypes/paired rivals/heat-data lanes, campaign map/progression/ending, Arcade/Endless/twelve Trials, earned cosmetics/achievements/full Workshop, interactive calibration/story/music, remaining remapping/accessibility/audio settings, save export/import/recovery and full QA-01–26.
- Preserve protective focus/visibility/controller/viewport/performance pauses. A long frame must not advance the snake through unseen hazards. Existing native audio recovery and bounded drawing/compositor budgets remain required. Do not weaken physics to make a playthrough probe pass.

The [feature matrix](FEATURE_MATRIX.md), [implementation roadmap](IMPLEMENTATION_ROADMAP.md), [visual review](VISUAL_REVIEW.md) and addendum remain the durable scope/evidence map.

## GitHub and Vercel delivery

The owner has authorized committing and pushing each completed change to `therealjrhythm/snake-year-3039`, then updating Vercel. The project `snake-year-3039` in team `acoldbrand` is connected to GitHub with production branch `main`, and the public game is **https://snake-year-3039.vercel.app/**. The initial Git-triggered deployment passed 70 tests and all six public production smoke groups with no runtime errors or failed assets. Follow [DEPLOYMENT.md](DEPLOYMENT.md): check/build, commit/push, wait for the exact commit's deployment and verify the public game. This standing workflow is also recorded in `AGENTS.md`; routine delivery does not need repeated confirmation. Production availability is separate from the outstanding human/full-district/hardware acceptance gates.

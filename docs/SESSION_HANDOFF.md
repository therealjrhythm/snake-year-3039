# Session handoff — 0.2.0 expanded Neon Spire

The owner explicitly authorized the [Neon Spire expansion plan](NEON_SPIRE_EXPANSION.md). It supplements the original [PRD v2.0](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/PRD.md); the supplied package, Word document and approved images remain unchanged. The complete destination is five distinct districts, fifteen waves/228 ordinary cores, five finales, four release modes, twelve Trials, earned liveries/trails/achievements, full Workshop, progression/ending, and complete accessibility/reliability. This checkpoint expands D1 before the remaining city; it is not full-release acceptance.

## What changed

- New attempts use `0.2.0-neon-spire` and `neon-spire-v2`, a 36 × 26 layout. `src/game/layouts.ts` owns physical arena bounds, obstacles, candidates, entries, gates, Warden and extraction. Original 0.1 saves infer `neon-spire-v1`, retaining 32 × 24 geometry, original pickup rules and exact body coordinates.
- All eight original powers enter the expanded campaign with staged eligibility. Pulse Blaster, Capacitor, Bullet Scrubber and Chain Buffer bring the roster to twelve. Typed content supplies introductions, activation and eligibility descriptions. Supply state persists the rotating EMP/Decoy/automatic opportunities and safe retries; three ground pickups, eight-second cadence, fifteen-second expiry and one charge per slot remain.
- Fire is held F / Xbox A. Twelve shots, four shots/s, bounded player projectile pool, ten-unit forward range and a 60° visible-target cone live in the simulation. Drones take two hits and award no new score. Solid scenery blocks shots; rival serpents stay armored. The accepted movement and critical-crash rules remain.
- Wave 3 says Hunter encounter and names the next Warden phase. Warden has separate relay charge and armor counters, next-relay highlighting, truthful pad states, an inner-edge receptor, armor feedback and links. Three relays plus recovery permit either automatic pad discharge or three blaster hits. Charge persists across missed windows; partial weapon hits reset. Extraction replaces obsolete boss timers/prompts.
- Typed events pass the entire payload to audio, including numeric relay index. Every event has an explicit audible or silent policy. Ascending relay cues, charge/recovery/armor/defeat, blaster/impact and new-power cues extend the existing musical/effects direction. Saved mute applies before the first audio sample.
- Customize Snake is reachable from title and pause. Eight free body glows have live rotate/zoom previews in the same WebGL renderer, a fixed cyan head marker, Apply/Cancel/Restore Cyan and independent persistence. It does not change simulation statistics or advance a paused run. Earned armor/trail rewards and full Workshop remain future work.
- Start Game → Powerup Lab offers all twelve powers and Warden rehearsal. Lab scenarios use real rules with explicitly prepared resources/threats, no records/rewards and no campaign-suspend replacement. Pause offers refill/reset, another system or Leave Lab.
- Results → Replay This Seed starts a new run identity with the same seed, content version, layout, mode and rules. Local best scores are separated by content version/rules/mode/district; unversioned earlier records remain visible in the Legacy collection.

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

The owner has authorized committing and pushing each completed change to `therealjrhythm/snake-year-3039`, then updating Vercel. The project `snake-year-3039` in team `acoldbrand` is connected to GitHub with production branch `main`. Follow [DEPLOYMENT.md](DEPLOYMENT.md): check/build, commit/push, wait for the exact commit's deployment and verify the public game. This standing workflow is also recorded in `AGENTS.md`; routine delivery does not need repeated confirmation. Initial production verification is being completed separately from the existing local gameplay evidence.

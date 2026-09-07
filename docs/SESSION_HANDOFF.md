# Session handoff — 0.3.2 Warden steering and collection contact

The owner explicitly authorized the [Neon Spire expansion plan](NEON_SPIRE_EXPANSION.md). It supplements the original [PRD v2.0](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/PRD.md); the supplied package, Word document and approved images remain unchanged. The complete destination is five distinct districts, fifteen waves/228 ordinary cores, five finales, four release modes, twelve Trials, earned liveries/trails/achievements, full Workshop, progression/ending, and complete accessibility/reliability. This checkpoint expands D1 before the remaining city; it is not full-release acceptance.

## Current owner fixes — 0.3.2

The September 7 owner report describes lost gamepad steering after the Warden instructions/countdown, a resulting wall crash, and visible close contacts that fail to collect an item.

- Root cause: every gameplay transition suppressed held movement along with action buttons. A stick held off-center, held D-pad, or held movement key stayed blocked until released—even if the player changed direction during the countdown. `setGameplay(true)` now accepts the current steering direction immediately. Held Fire, Boost, Use and Switch still require release; menus retain their held-navigation protection, and blur drops stale keyboard state. The live snake is never repositioned or made collision-immune.
- Current 0.3 collection radii, measured from the head center, increase by 0.18 arena units: ordinary cores 0.60 → 0.78; powerups 0.62 → 0.80; Warden spheres 0.72 → 0.90. Swept contact still catches passes between simulation steps; the wider reach cannot collect through solid scenery. Relay order, full-slot/usefulness exclusions, fatal-crash priority and all hostile/wall/self collision dimensions remain. Earlier 0.1/0.2 content retains its exact collection radii and rules.
- Patch version is 0.3.2; content remains `0.3.0-neon-spire`. Existing saves, snake paths and record partitions are preserved. Arena dimensions remain 36 × 26 (32 × 24 for legacy saves), with no rendering/layout changes in this patch.

### 0.3.2 verification

`npm run check` passes **101 tests**, including thirteen new pickup-contact regressions; production compilation passes. The new [Warden control script](../scripts/verify-warden-controls.mjs) first reproduced the held-steering failure for stick, D-pad, WASD and arrows in the original mapper ([before evidence](evidence/warden-controls-2026-09-07/before-input-failure.json)). Its fixed-version run checks 28 input boundaries plus real App final-core → Warden instructions → countdown → inward turn and ordinary pause/resume for stick, D-pad and keyboard. The prepared 40-segment approach earns the final core through ordinary simulation contact, freezes throughout the modal/countdown, then turns away from the wall without losing a life. Confirmation A remains unable to fire through either countdown.

All fourteen development browser scripts pass sequentially, including the new Warden handoff check. The compiled production smoke passes ten groups with no errors, warnings or failed assets. Final results are recorded in [the verification ledger](evidence/warden-controls-2026-09-07/verification.json) and [Warden report](evidence/warden-controls-2026-09-07/warden-controls-report.json). These use isolated installed Chrome, prepared saves and mocked standard gamepads. They do not establish physical Xbox qualification, an ordinary full district clear or owner acceptance. A physical-controller retry of the reported handoff remains required. The wider radii exposed an old systems fixture whose two items both began inside collection range; its coordinates now use collection edges so the existing pickup-before-core assertion still tests distinct contact times. The [original failure and adjustment](evidence/warden-controls-2026-09-07/systems-fixture-adjustment.json) are retained.

Publish after the ledger passes; confirm Git main and Vercel production reference the identical commit and rerun public production smoke.

## Previous owner refinement — 0.3.1

The owner rejected the misty snake halo and delayed selection flash, questioned the smaller-looking arena, and reported missing continuous tactical pulses and a pause when using Decoy. This patch retains `0.3.0-neon-spire` content rules and all existing saves/records.

- Removed halo billboards/textures and their per-frame camera alignment. Saturated physical bands and narrow solid light filaments keep all eight colors visible while exposing the dark armor. Head/body/laser stay matched; global bloom settings and hostile materials remain unchanged.
- Confirmation starts at full brightness on the activated control and fades for 200ms. It disappears with its source screen. Earlier outlines clear immediately during rapid tab changes, unchanged dialogs do not restart entrances, and app/OS reduced motion remain supported.
- The map was already given layered supports, floor panels/lanes and turbine detail. Its physical dimensions remain **36 × 26**, with legacy saves still 32 × 24. Timed bonuses now occupy a fixed bottom row and compact corner readouts free screen space. Camera matrices remain identical across pickups, expiry, combo, damage, tactical slots and ammo changes. At 1440 × 900/UI100 the projected floor is about 914px wide; final viewport measurements live in the renderer report. Large UI settings on short screens still trade arena screen area for larger text.
- Loaded EMP/Decoy slots pulse every 1.6s continuously until used. Reduced motion keeps a steady bright ready indicator. Decoy has an elevated violet identity marker, a visible active countdown, and its existing stationary four-second lure/targeting rules.
- Performance pauses now distinguish a retained unused tactical charge from a deployed frozen Decoy. A fresh X/Space press is required after an interrupted use; no action leaks through resume countdowns. Fixed-step protection/thresholds and collision rules are unchanged. The catch-up pause was previously misclassified as Recovery due to case-sensitive text matching; it now offers the same Performance recovery controls.

### 0.3.1 verification

**88 tests**, the production build, all eleven existing development browser scripts, and both new menu/tactical scripts pass. The compiled production smoke passes ten groups with zero errors, warnings or failed assets. Final sequential results are recorded in the [verification ledger](evidence/crisp-feedback-2026-09-06/verification.json). New [menu checks](evidence/crisp-feedback-2026-09-06/menu-motion-report.json) verify immediate activation, no delayed overlay, rapid-tab cleanup and reduced motion. New [tactical checks](evidence/crisp-feedback-2026-09-06/tactics-report.json) exercise real App code with prepared Wave 2 saves, mocked Xbox Y/X, visible persistent pulse, both deliberately induced frame-stall cases, held-input suppression, future Patrol targeting and exact pause/save. Three simulation regressions cover stationary Decoy/held use, already committed attacks and exact lifetime/save restoration.

Reviewed all sixteen actual Low/Medium customization selections: [all colors](evidence/crisp-feedback-2026-09-06/glow-contact-sheet.png), [blue](evidence/crisp-feedback-2026-09-06/glow-electric-blue.png), [violet](evidence/crisp-feedback-2026-09-06/glow-violet.png). [Glow review scope](evidence/crisp-feedback-2026-09-06/glow-review.json) and [visible Decoy](evidence/crisp-feedback-2026-09-06/decoy-active-medium.png) retain evidence. These isolated Chrome fixtures do not prove physical Xbox qualification, an ordinary human full clear, owner visual approval or sustained hardware performance. Normal Y/X deployment did not reproduce the owner's pause; forced stalls demonstrate the retained-charge and already-deployed outcomes.

Publish only after the ledger passes, then verify Git main and Vercel production carry the exact same commit and rerun public production smoke.

## 0.3.0 gameplay foundation (retained rules)

This records the preceding delivery. Its gameplay rules remain; the presentation refinement above supersedes earlier halo, pulse and camera details.

The [combat/interface addendum](NEON_SPIRE_COMBAT_REFRESH.md) records the latest owner request and supersedes the specified 0.2 boss/life rules for new attempts. **Start Game enables three lives and the laser Warden.** Continue preserves an older save's original rules, explained on the title screen. Content versions 0.1, 0.2 and 0.3 have separate records; saved snake paths are never rescaled.

- New runs have three lives. A critical crash still ends a life immediately. Retry restores the current wave or boss entry, including score, equipment, body length, RNG and supply schedule; remaining lives, run identity, elapsed time and damage taken persist. Later-wave and boss retry paths use a clear rounded perimeter route so a near-wall stage transition cannot trap the next life; this does not move the live player or grant collision immunity. Failed-wave points cannot be farmed. Campaign auto-saves the lost-life state, so a reload cannot refund a life. The third loss records one terminal result; a fresh attempt starts at Wave 1.
- Warden's three ordered numbered spheres immediately open its armor and charge the snake laser. Hold F / Xbox A toward the glowing target below Warden; three hits break one node. Charge and partial hits persist until that node breaks. Boss shots use no blaster ammunition; ordinary-wave blasters keep their twelve-round rules. The pad route remains only for older runs. Warden locks three orange warning rays, then shoots along those same paths. Shot caps, scenery collisions and critical crashes remain fixed-step rules.
- Camera fitting uses stable viewport/UI-scale reservations, removing powerup-driven view shifts. Compact automatic-bonus cards retain names/timers, with full effects in accessible labels and the Lab/guide. Layered arena structures and floor routes add depth within existing solid footprints. Instanced colored halos make all eight snake colors glow even at Low; head, body and laser match.
- EMP and Decoy show colored ready glows and two slow acquisition pulses. Customize Snake is a full-size title action. The briefing has a full-size Practice button and no duplicate Lab link. Normal/Easier/Harder explain the actual three-health/five-health/faster-shot profiles. Settings is centered. Shared neon outlines, a brief confirmation pulse and GSAP entrances respect app and OS reduced motion.
- Soundtrack files have not been supplied. MP3 delivery and WAV source originals are suitable; six to ten tracks of three to four minutes are acceptable. The procedural score remains active until supplied tracks are integrated.

### 0.3.0 verification record

`npm run check` currently passes **85 tests**; the production build passes. The new [combat App script](../scripts/verify-combat-update.mjs) passes [nine groups](evidence/combat-refresh-2026-09-06/combat-report.json) with no browser errors/warnings: actual difficulty application, Practice, lost-life save/reload/retry, no score farming, held-F isolation, three-loss records/replay, charged laser hits without ammo, warned counterfire, and original 0.2 compatibility. [Six menu viewport checks](evidence/combat-refresh-2026-09-06/menu-report.json) verify centered Settings, visible main actions, difficulty selection, neon focus and GSAP cleanup/reduced motion. The [renderer report](evidence/combat-refresh-2026-09-06/render-report.json) passes eight groups including 96 glow combinations and exact camera invariance with six buffs, tactics, combo, hit feedback and ammo. Three additional simulation tests cover a real near-wall stage entry and safe full-length retries, including the 128-segment save bound. All eleven applicable development browser scripts passed sequentially: game, platform, controller, audio, enemies, systems, runtime, render-performance, expansion, expansion-render and combat-update. Their current logs and reports are in [combat-refresh evidence](evidence/combat-refresh-2026-09-06/verification.json). Native audio recovery and protective pauses remain intact; controller evidence uses mocked standard pads. The bounded 20-frame large-view render diagnostic measured 2.8ms median / 3.3ms p95 GPU completion and 16.7ms frame intervals; it is not a sustained hardware benchmark. The [compiled local production smoke](evidence/combat-refresh-2026-09-06/production-local-report.json) passes ten groups with zero errors, warnings or failed assets, including ordinary first-core/pause, all twelve images, new Warden help, one-canvas customization and responsive full-size title actions. Title and paused-game captures were visually reviewed. After the commit/push, verify Vercel reports the exact Git SHA and rerun the same smoke on the public domain.

These are isolated installed-Chrome checks with prepared encounter snapshots where explicitly stated. They do not establish a human full clear, five-player comprehension, physical Xbox qualification or sustained hardware performance. The owner screenshots are the feedback baseline; full artistic acceptance remains open.

## Historical 0.2 expansion behavior

The following describes the earlier expansion and compatibility behavior. The current revision above replaces its single-attempt/hybrid boss rules for new games.

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

## Earlier owner revision — full-snake glow and direct Lab access

The owner explicitly replaced the fixed-cyan-head requirement with matching head/body glow. Wider, brighter emissive strips and more saturated presets improve recognition at Low and Medium, while the preview no longer darkens the model with a modal overlay. Head lights and the small direction marker follow the chosen preset; armor shape, hostile red faction, movement/collisions and saved appearance IDs remain intact. Apply/Cancel/Restore and independent persistence retain their existing behavior.

POWERUP LAB is now a full-size primary title button below START GAME. It opens directly, closes back to title, and preserves an existing campaign save. The original briefing shortcut remains. Responsive title spacing and scrolling keep CONTINUE RUN and the other actions reachable on smaller displays.

The combined check/build (70 tests) and game/controller/platform/enemy/expansion/expansion-render/performance checks pass sequentially. The 96-case render sweep verifies selected color on body, head, ports, direction marker and preview head while hostile red remains unchanged. All 32 actual customizer before/after captures (eight colors × Low/Medium × before/after) were visually reviewed. Keyboard title→Lab→Escape returns focus; guarded restoration does not override subsequent controller navigation. Six title sizes, including 960 × 540 and 375 × 1020 with a saved run, keep the primary buttons visible. Evidence: [before](evidence/glow-title-2026-09-06/glow-before.png), [after](evidence/glow-title-2026-09-06/glow-after.png), [title](evidence/glow-title-2026-09-06/title-lab.png), [narrow title](evidence/glow-title-2026-09-06/title-narrow.png), [renderer report](evidence/glow-title-2026-09-06/render-report.json), [controller log](evidence/glow-title-2026-09-06/controller.log), [title sizes](evidence/glow-title-2026-09-06/title-layout-report.json), [bounded render timing](evidence/glow-title-2026-09-06/render-performance.log). The timing sample is only 20 frames (2.3 ms median / 2.8 ms p95 completion here), not sustained hardware qualification. Physical Xbox and owner color approval remain open.

The [compiled local production smoke](evidence/glow-title-2026-09-06/production-local-report.json) also passes all ten groups: direct keyboard Lab access and return focus, eight persisted glow choices, twelve pickup images and illustrated Warden instructions, ordinary first-core movement/pause, paused guide, and saved-run title layouts. It reports zero browser errors, warnings or failed assets. Verify the exact pushed Vercel commit and repeat this smoke against the public domain before reporting delivery.

## Run and controls

Run `npm run dev` and open **http://127.0.0.1:3039/**. Refresh the preview to load the expansion. Continuing an old save deliberately keeps the legacy arena and powers; Start Game begins the expanded version. The Lab preserves a suspended campaign.

Keyboard: WASD/arrows steer, Shift boosts, Space uses the selected tactical, E switches, F fires, Escape pauses/backs out. Xbox target: left stick/D-pad steers, RT boosts, X uses, Y switches, A fires, Menu pauses; A/B select/back in menus and LB/RB switch tabs. Held actions are suppressed across menus/countdowns until release. Physical Xbox qualification remains outstanding.

## Historical expansion verification ledger

The earlier 0.2 expanded implementation passed 70 simulation/content tests and production compilation. All ten targeted browser scripts below passed sequentially in installed Chrome 152.0.7977.77. Their logs and structured reports are in `docs/evidence/`; the [feature matrix](FEATURE_MATRIX.md#development-verification) records each scope and limitation.

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
node scripts/verify-combat-update.mjs
```

Historical 0.2 pure-input traces remain replayable with `node scripts/probe-ordinary-run.mjs --replay docs/evidence/ordinary-standard-3039-keyboard.json`; replay explicitly selects the recorded content version. `verify-ordinary-keyboard.mjs` is the historical rendered probe and requires a matching-version trace/build. Its earlier failure is retained and must not be presented as a current 0.3 clear. Do not relabel a fixture as an ordinary clear or weaken collision rules to pass it.

## Remaining acceptance and next work

- Complete ordinary Neon Spire runs using keyboard and a physical Xbox controller, including an intentional Hunter body-block and Warden clear without optional powers. An algorithmic steering probe or prepared boss snapshot is not a human/device pass.
- Observe five new players; at least four should explain pickup activation and the boss objective without verbal coaching. Record balance changes against those observations.
- Owner review of revised music, all glows, larger arena/readability and supplied-reference fidelity; actual supported landscape ratios and 80–150% UI scale; identified-machine sustained performance and USB/Bluetooth controller qualification.
- After this milestone passes playtesting, implement D2–D5 and their distinct bosses/routes, missing enemy archetypes/paired rivals/heat-data lanes, campaign map/progression/ending, Arcade/Endless/twelve Trials, earned cosmetics/achievements/full Workshop, interactive calibration/story/music, remaining remapping/accessibility/audio settings, save export/import/recovery and full QA-01–26.
- Preserve protective focus/visibility/controller/viewport/performance pauses. A long frame must not advance the snake through unseen hazards. Existing native audio recovery and bounded drawing/compositor budgets remain required. Do not weaken physics to make a playthrough probe pass.

The [feature matrix](FEATURE_MATRIX.md), [implementation roadmap](IMPLEMENTATION_ROADMAP.md), [visual review](VISUAL_REVIEW.md) and addendum remain the durable scope/evidence map.

## GitHub and Vercel delivery

The owner has authorized committing and pushing each completed change to `therealjrhythm/snake-year-3039`, then updating Vercel. The project `snake-year-3039` in team `acoldbrand` is connected to GitHub with production branch `main`, and the public game is **https://snake-year-3039.vercel.app/**. The initial Git-triggered deployment passed 70 tests and all six public production smoke groups with no runtime errors or failed assets. Follow [DEPLOYMENT.md](DEPLOYMENT.md): check/build, commit/push, wait for the exact commit's deployment and verify the public game. This standing workflow is also recorded in `AGENTS.md`; routine delivery does not need repeated confirmation. Production availability is separate from the outstanding human/full-district/hardware acceptance gates.

# Session handoff — 0.1.0 feedback update

Active authority remains the untouched [PRD v2.0](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/PRD.md), [full-game handoff](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/FULL_GAME_HANDOFF.md), supplied Word document and both approved reference images. The requested full game remains five distinct districts, fifteen waves/228 ordinary cores, five finales, eight pickups, four modes, twelve Trials, six liveries, six trails, twelve achievements, Workshop, progression/ending and complete reliability/presentation. No scope reduction was made.

## What exists

The root app is a TypeScript/Vite/React/Three.js implementation with real 3D serpent, arena/city/machinery, semantic title/settings/HUD, fixed 60 Hz simulation, keyboard/gamepad action abstraction, seeded Neon Spire waves/Patrol/Hunter/mines/gates, Warden relay/discharge mechanics, active extraction, procedural audio, initial difficulty/settings, D1 Practice and IndexedDB suspend/checkpoint/records. Full content IDs and wave quotas are declared separately from executable D1 content. The complete module map is in [README.md](../README.md).

The representative district milestone is **not accepted**. No ordinary-play complete Neon Spire clear, deliberate human Hunter defeat, human Warden clear or complete physical Xbox qualification has been recorded. The owner has now reviewed the running game: graphics and sound effects are good and controls are smooth; Xbox menu input, enemy visibility and the futuristic character of music needed work. The latest play report likes the challenge, but finds tactical availability, colored pickups and enemy damage confusing; intermittent silence and spontaneous pauses were also reported. Preserve the liked movement, effects and overall scene. This targeted feedback does not establish full reference or release acceptance.

## Latest owner feedback and changes

The Xbox menu report was reproduced as invisible selection after mouse use: D-pad navigation changed the focused button while `:focus-visible` remained false. The actual in-app preview displayed GAMEPAD DETECTED but no focused menu control. Input now retains its own per-menu selection, renders an explicit bright focus marker, survives DOM focus refusal in embedded views, restores selection after dialogs and keeps held-button suppression. The owner then confirmed the other menus were working, but A still did not open Graphics quality or Rules profile. Those native selects have now been replaced by visible game-managed option lists: A opens, D-pad moves, A confirms, B cancels only the list. Left/right quick adjustment remains available; settings rows follow reading order. Popups preserve focus and held-input isolation. All gameplay movement and simulation rules are unchanged.

Enemy materials and markings now remain readable through decorative fog and with bloom off. Red armor/top accents, bright mine spikes and true-radius footprints distinguish hostile bodies; amber warnings and gray disabled cues show state. Small separate glyphs aid narrow previews, and projectiles have bright cores and tapered light streaks. Player, environment, camera and collision geometry remain unchanged.

The procedural score now has evolving stereo synth pads, syncopated filtered bass, metallic FM pulses, stereo echoes and distinct title/play/Warden layers. Existing event sound recipes and effects-bus scaling are unchanged. New music remains subject to owner listening feedback.

### Gameplay clarity and reliability follow-up

Wave 1 squares are automatic Overdrive (8s, half boost drain while boosting, unchanged speed) and Score Surge (15s, double core/rival points). EMP and Shield enter in Wave 2. Decoy, Magnet, Repair and Tail Splice are currently Practice-only; their later campaign content remains unbuilt. The HUD now states this availability, displays each active bonus/effect/timer beside integrity, shows one stored charge rather than ambiguous READY, and includes Use X/Space. A pause-menu **Pickups & Tactics** guide explains all eight, changes its control labels with the active device and returns to the same frozen run. World pickup colors and symbols now come from the same content table; glyphs sit above their cubes where they can be seen.

Enemy shots really remove one integrity on head contact. Trailing segments are intentionally immune; a Shield absorbs one head hit and grants the existing temporary protection. The HUD now reports HEAD HIT / SHIELD ABSORBED explicitly. A bounded event history keeps same-frame pickup, damage and action feedback from being overwritten by core/shot/lock events, while preserving individual sound categories. Old v1 snapshots migrate only these added presentation fields. Warden/extraction empty-slot hints no longer ask the player to collect pickups that do not spawn there. An EMP now reports the number of affected systems and displays its exact four-unit pulse at the action origin. Decoy absorption was corrected to one projectile when simultaneous shots arrive. Movement, difficulty, enemy schedules, health, timing and critical crashes remain unchanged.

Audio now reports actual native readiness, shows **Click to enable sound** when blocked and retries on real pointer/key gestures. Visibility recovery and gameplay pause are separate; interrupted audio can recover without resuming a run. Closed contexts rebuild, pending browser resume promises time out and remain retryable, and disposed graphs cannot restart. The header preserves the intended Enable action if pointer-down unlocks audio before click. Music composition and the accepted SFX recipes are preserved.

Large-window rendering previously multiplied display dimensions by DPR and left compositor DPR stale across quality changes. Medium at the screenshot-sized 3622 × 2300/DPR2 fixture allocated 5433 × 3450 (18.74M pixels). It now fits a 1920 × 1080 pixel budget: 1807 × 1147 (2.073M), approximately 89% fewer pixels. Low/High have 720p/1440p budgets; the HTML HUD stays full-resolution and the camera/geometry/collision remain unchanged. This addresses a confirmed load source, not every possible reported pause. A duplicate no-op resize no longer pauses. Genuine performance/focus/viewport/controller pauses remain protective and now identify their cause; a performance pause offers **Use Low graphics & resume**. The owner's screenshot uses the manual-pause text and does not prove which automatic condition they encountered. No new physical-controller or long-session acceptance is claimed.

## Reproduce and inspect

From the repository root:

```sh
npm install
npm run dev
```

The configured local development address is `http://127.0.0.1:3039` (strict port). Use a second terminal for checks while the server remains active:

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
```

The browser scripts require installed Chrome and accept a local URL argument. Run browser scripts sequentially; concurrent isolated Chrome launches caused resource contention during this pass. They use isolated test contexts; the platform script mocks a standard gamepad and does not certify hardware. The browser report records Chrome 152.0.7977.77 headless. The focused checks use the installed-Chrome test harness; the actual in-app preview was also inspected through CUA for the controller report.

## Evidence and its limits

- `npm run check`: 43 passing tests covering declared inventory and bounded movement/body/clock, collision, pickup, rival, transition/boss/extraction and snapshot contracts. Focused test states are not normal gameplay completion.
- `npm run build`: passed TypeScript and production bundling.
- `scripts/verify-game.mjs`: 15 passed browser checks and no uncaught browser/console errors in those flows; [machine-readable report](evidence/browser-report.json).
- Actual keyboard path: start/countdown; forward movement; first core and nine body segments; frozen pause; exact Save & Exit; unchanged reload; focus-loss pause during resume countdown; resume; 1280 × 720 HUD containment at 150%; named wall crash through movement; once-only record and suspend clearing; district checkpoint retry; real Records display. A 390-pixel title-containment check does not qualify touch/mobile play.
- `scripts/verify-platform.mjs`: passed React keyboard/settings/select/slider checks, mocked-gamepad A/B/tabs/edges/held-input and neutral ownership checks, and IndexedDB checkpoint isolation/overwrite plus atomic idempotent records. Complete storage denial/corruption/migration and physical USB/Bluetooth remain outstanding.
- `scripts/verify-controller.mjs`: controller-only title → settings/tabs/sliders → difficulty → start → pause → settings/back → Pickups & Tactics/tabs/back → Save & Exit passed at 1440 × 900 and 375 × 1020. Includes held-A suppression, visible option-list opening/selection/confirmation and B cancellation, stick navigation and test-only DOM focus refusal. [Controller report](evidence/controller-report.json) records the final flow. The new quality and rules lists were also visually inspected in the actual narrow in-app preview through CUA. The owner confirmed the other menus now work on their controller; the final dropdown revision still needs their recheck. Exact model/connection and full hardware qualification remain unrecorded.
- `scripts/verify-audio.mjs`: native 14-second stereo render and live unlock/lifecycle checks passed. No invalid samples; measured full-volume peak 0.2243, mute/pause silence, audible pickup SFX while music is muted, all 243 sources ended and none retained. Repeated unlock, actual-clock pause/resume and disposal passed. Expanded checks reproduce native autoplay blocking and recover by a real click, overlapping unlock calls, native suspension/visibility return without gameplay resume, closed-context rebuilding, and bounded pending-resume retry/disposal. [Audio report](evidence/audio-report.json) establishes audio behavior, not subjective approval of the new composition.
- `scripts/verify-enemies.mjs`: four final renderer captures passed at Medium desktop and Low/bloom-off desktop, 1280 × 720 and 375 × 844; unchanged simulation state, clean disposal and no browser errors. [Enemy evidence](evidence/enemy-visibility-report.json) is an explicit frozen fixture without HUD, not a normal wave playthrough.
- `scripts/verify-systems.mjs`: seven bounded real-App checks pass using explicit validated snapshots: pickup/core same-tick feedback plus later shot, active-buff explanation, exact frozen guide/save, actual EMP collection/use, body-only projectile immunity, head-hit damage, a later deliberate empty-use result staying visible, and Shield feedback. [Systems report](evidence/systems-report.json).
- `scripts/verify-runtime.mjs`: nine real-App checks pass for the sound-callout/footer layout, strict native autoplay block and true status, real-click recovery (including the header pointer-down/click race), native suspension, duplicate no-op resize, real viewport pause, forced long-frame freeze, and Low-graphics/countdown recovery. [Runtime report](evidence/runtime-report.json), [blocked audio](evidence/audio-enable-1280.png), [performance pause](evidence/performance-pause-1120.png).
- `scripts/verify-render-performance.mjs`: exact canvas/compositor sizing for three quality presets, large/desktop/narrow dimensions, no-op resize, unchanged simulation, all eight pickup identities and actual EMP origin/radius/pause freeze pass. A short frozen-fixture observation improved median frame interval from 50ms to 16.7ms; this is not long-session performance or hardware qualification. [Renderer report](evidence/render-performance-report.json).
- [Title](evidence/title-1672.png), [gameplay](evidence/gameplay-1672.png), [settings](evidence/settings-1672.png), [results](evidence/results-1280.png), [records](evidence/records-1280.png) and [150% HUD](evidence/pause-1280-ui150.png) are actual captures.
- [Warden](evidence/warden-fixture-1672.png) uses an **explicit saved-state fixture**. It verifies restoration and rendered relays/nodes/HUD; it does not prove reaching or completing Warden through normal play.
- An ordinary steering audit on seeds 3039, 76113 and 20260905 reached 10, 16 and 14 total cores, then own-body critical crashes. These are limited observations, not proof of a soft lock or accepted balance. No normal complete-district evidence exists yet.

See [FEATURE_MATRIX.md](FEATURE_MATRIX.md) for every launch item and the distinction between bounded partial evidence and full QA gate completion. See [VISUAL_REVIEW.md](VISUAL_REVIEW.md) for concrete remaining art work.

## Exact next sequence

1. **Finish and prove Neon Spire through ordinary input.** Run the three audited seeds and additional authored cases using actual keyboard controls; observe route choice, growing-body clearance, core spawn reachability, warning timing and difficulty. Diagnose failures from the rendered state and seed before changing balance. Retain critical self/solid collision; do not teleport the player, auto-award quotas or substitute fixture success for a playthrough. Record a complete three-wave → Warden → active-extraction journey with score/length and seed evidence.
2. **Demonstrate the defining combat and boss objectives.** Have a human deliberately bait a Hunter into the trailing body, then complete every Warden node without optional consumables. Record missed recovery windows, retained relay charge, safe re-entry/checkpoint and final active exit. Ensure node/relay labels and notices remain readable at the actual camera.
3. **Close the first-district art/audio review.** Preserve the graphics, effects and smooth controls the owner liked. Recheck enemy readability and the revised futuristic music in normal play before further aesthetic changes. The older visual ledger remains reference-gap context rather than a directive to redesign the accepted direction. Capture title, every settings tab, waves/Hunter/Warden/extraction/results at Low and Medium; review with the owner. Do not claim faithful reproduction or a numerical quality score without owner judgment.
4. **Qualify the first complete input flow.** Test a physical Xbox controller with exact model, OS/browser and USB/Bluetooth connection noted. Cover menus, settings, start/play/pause/retry/save/resume, device switching/removal/reconnect, neutral inputs and explicit countdown. Keep mocked checks labeled as such. Complete remapping/conflict handling and outstanding input settings before full launch acceptance.
5. **Milestone C — complete city and shared systems.** Build D2 Chrome Bazaar/Switchblade Twins, D3 Reactor Foundry/Crucible Engine, D4 Ghost Circuit/Null Choir and D5 Crown Array/Custodian as distinct layouts and mechanics. Finish Interceptor/Mine Layer/Ambush, all campaign pickup teaching, full progression/map/checkpoints, ending and reward integrity. Preserve fifteen waves/228 cores and no-consumable routes.
6. **Milestone D — replay and progression.** Implement full Arcade, Endless and all twelve authored Trial objectives/medals; six liveries/six trails/twelve once-only achievements; real 3D Workshop; complete tutorial/Practice, records, settings/accessibility, export/import/migrations/recovery. Data IDs alone do not complete these features.
7. **Milestones E/F — release evidence and owner acceptance.** Complete every original QA-01–26 gate, identified-machine performance/loading/stability, full hardware matrix, provenance/credits, new-player observation and complete owner review. Publish only after those requirements pass.

## Working rules for continuation

Keep simulation authoritative and independent of rendering. Preserve frame-rate independence, explicit input ownership, visible collision/warning truth, exact snapshots, stable IDs and transactional reward/record handling. Use targeted tests for confirmed changes and rerun the browser paths affected. Preserve the supplied source package. Update the roadmap, feature matrix and evidence with actual results; never relabel fixture/mocked/happy-path evidence as full-game or hardware acceptance.

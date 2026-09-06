# Snake: Year 3039 — full-release feature matrix

Authority: [PRD v2.0](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/PRD.md) and [full-game handoff](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/FULL_GAME_HANDOFF.md). Development sequence: [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md).

Build/content checkpoint: **0.1.0 / 0.1.0-neon-spire**, implemented first-district foundations with bounded automated verification. **The full release is incomplete.** Supplied specifications and art references are not implementation evidence. Declared content IDs are not playable content. The first district is a development milestone; every item below remains part of launch.

Status vocabulary: **In progress** = implementation is being built, with verification still required; **Incomplete** = final behavior is not complete; **Implemented** = behavior exists, with tests/review explicitly stated separately; **Tested** = a linked test demonstrates only its stated scope; **Owner reviewed** = explicit review is recorded. A build/test pass does not imply full acceptance. Targeted owner feedback now records good graphics/sound effects and smooth controls, plus requested fixes to Xbox menus, enemy visibility and music. The latest owner report likes the challenge and requests clearer tactics/pickups/damage plus reliable sound and pauses. Full owner acceptance and physical-controller qualification remain open. Milestone B remains open: an ordinary-play full district clear has not been demonstrated.

## Systems coverage

| PRD requirement | Release obligation | Current state | Required evidence / gate |
| --- | --- | --- | --- |
| Chapters 1–2 | Complete single-player cyberpunk game; opening, calibrated first minutes, resolved fiction | Incomplete | Complete journey and onboarding observation; C/F |
| Chapters 3–4, 25 | Actual dimensional armored cyan snake; layered city, readable reflective grid, energy, pickups and machinery; approved-reference review | Implemented first-district scene; reference fidelity remains incomplete | Captured real gameplay/title/settings; owner visual review; B then every district |
| Chapters 5–8 | Five distinct districts, 15 waves, five finales, 228 cores, map/unlocks/checkpoints/ending | D1 runtime implemented; full normal clear unverified; D2–D5 incomplete | Full campaign playthrough, quota/growth/route tests; C |
| MOV-01–05 | Continuous 4.5/6.3 movement, bounded 240° turns, sampled 0.55-spaced body, growth/Splice, 100-energy boost and release gating | Implemented D1 foundation; bounded tests; full requirement verification open | Movement, reverse/diagonal, boost, body spacing and render-frequency checks; A/B |
| INP-01–06 | Shared keyboard/Xbox actions, menu focus, device ownership/glyphs, remapping, dead zone, neutral transitions, disconnect recovery | Implemented shared actions plus explicit remembered menu selection, embedded-focus recovery, form-row navigation and custom option lists; full mocked controller menu flow passes; hardware/remapping incomplete | Full keyboard flow plus physical Xbox tests; remapping/recovery still required; B/D/E |
| CAM-01–04 | Elevated fixed gameplay camera, entire arena plus HUD-safe margins, 16:9/16:10/21:9, safe refit | Implemented D1 foundation; bounded tests; full requirement verification open | Actual viewport/resize/fullscreen captures and interactions; B/E |
| HUD-01–04 | Objective, quota, score/local best, combo/window, integrity, boost, both tactical slots, active buffs and boss nodes | Implemented D1 foundation plus explicit pickup effects/timers, tactical availability/charges, retained feedback and head-hit/Shield readouts; full verification open | Rendered states and 80–150% scale checks; B/D/E |
| COL-01–07 | Full head/body/hazard/exit collision table, critical-crash priority, equal-time ordering, swept collision, neck exclusion, contact deduplication | Implemented D1 foundation; bounded tests; full requirement verification open | Each collision row and simultaneous ordering tested; A/B/E |
| PWR-01–12 | Eight complete pickups; two selected tactical slots; refresh/expiry/usefulness limits; safe Magnet; EMP/Decoy commitments | Eight mechanics present; device-aware pause guide and matching world/HUD identities; actual EMP/head-hit/Shield App fixtures and one-shot Decoy checks pass; full campaign integration/QA incomplete | All pickup boundaries and paused timers; C/D |
| DIR-01–05 | Seeded authored safe candidates, connectivity/turn clearance, three cores/three optional pickups, no-overlap warnings, pressure arbitration, no-soft-lock retry | Implemented D1 foundation; bounded tests; full requirement verification open | Seeded stress and route/attack tests; C/E |
| SCR-01–06 | Formula/chain, once-only rival/boss/extraction score, separated local records, retry restoration, metadata | Implemented D1 record foundation; idempotent storage tested; full mode isolation incomplete | Formula and duplicate-event tests, full mode isolation; B/D |
| ENM-01–08 | Five archetypes, mines, gates and heat/data lanes with visible warning/attack/recovery/disabled/removal states | Implemented initial Neon Spire roster; bounded tests; full roster incomplete | Finite rosters/caps; each state's captured counterplay; C |
| RIV-01–07 | Real Hunter/Ambush body combat, own-body/wall/two-rival crashes, no teleport rescue, finite IDs and single awards | Implemented Hunter; simulation body-block checked; human demonstration outstanding | Deliberate human body-block, collision tests, Ambush and paired-rival review; B/C/E |
| BOS-01–07 | Five mechanically distinct finales with safe objectives, missed-window persistence, no required optional ability | Implemented Warden mechanics; simulation/fixture checks; normal boss playthrough outstanding | Every phase on keyboard and physical Xbox, objective/crash/no-soft-lock checks; B/C/E |
| MOD-01–05 | Campaign, full Arcade, Endless and 12 Trials; shared physical rules and distinct records | Implemented D1 foundation; full campaign and other modes incomplete | All four complete modes and authored Trial paths; C/D |
| PRO-01–06 | District progression, six liveries/six trails/12 achievements, 3D Workshop and once-only reward ledger | Incomplete | Earn/preview/equip all; retry/resume/import deduplication; D |
| UX-01–08 | Capability/loading/recovery, all selectors, tutorial/Practice, title/settings/pause/results/ending, explicit state/focus | Implemented initial shell; bounded keyboard/UI flows tested; full screens incomplete | Every real control works using each input; full states/recovery; B/D/E |
| ACC-01–09 | Standard/Expert/Assisted, record classification, remapping, readable scalable UI, motion/light/audio options | Implemented initial settings; browser controls/scale tested; full settings incomplete | Full settings, accessible focus, contrast, muted play and assistance rules; D/E |
| Chapter 26 | Original/licensed music, effects, ambience, dialogue/text, audio unlocking/buses, restrained game feel | Implemented futuristic synth score and preserved accepted effects; native readiness/blocked prompt, gesture retry, suspension/visibility/closed-context recovery tested; listening review outstanding | Actual audio/UI event review, blocked/muted boundary, full district music; B/C/E |
| TECH-01–09 | TypeScript/Three.js real 3D, semantic HTML, fixed 60 Hz, five-step debt cap, safe performance pause, instancing/lifecycle | Implemented D1 foundation; bounded tests; full requirement verification open | Typecheck/build, simulation/render tests, resource/context-loss tests; A/E |
| DATA-01–08 | Validated typed content; complete snapshots; transactional profile/checkpoint/suspend/records; safe export/import/migration/failures | Implemented IndexedDB foundation; bounded exact-restore/record/isolation checks; full recovery/export/import incomplete | Corrupt/version/denied/interrupted storage tests, exact restore and import validation; C/D/E |
| PERF-01–08 | Identified-machine 1080p Medium/720p Low budgets, real loading/resource measurements, full stress, browser/controller qualification | Incomplete | Five-minute frame times, 30-minute run/30 restarts, exact hardware matrix; E |
| BUILD-01–07, chapters 30–34 | Staged development without reduced scope; truthful evidence, provenance, acceptance and change control | Roadmap/matrix/provenance/handoff maintained; complete acceptance remains open | QA-01–26 evidence and complete owner acceptance; E/F |

## Districts, waves and bosses

Ordinary-core quotas total **228**. Starting each district at eight body segments gives unspliced end lengths **44 / 50 / 56 / 56 / 62**, excluding the head. Boss relays do not count or grow the snake. Distinct footprints, authored layouts and routing mechanics are required.

| District | Waves and quotas | Finale | Current state |
| --- | --- | --- | --- |
| D1 Neon Spire, 32 × 24 | D1-W1 12; D1-W2 12; D1-W3 12 | B1 Warden: three nodes, three ordered relays per discharge, safe/warning/attack/recovery, active exit | Implemented D1 runtime; bounded tests; normal full playthrough and visual/physical-input review required |
| D2 Chrome Bazaar, 36 × 26 | D2-W1 12; D2-W2 14; D2-W3 16 | B2 Switchblade Twins: two distinct armored rivals, two nodes each, safe re-entry | Incomplete |
| D3 Reactor Foundry, 38 × 28 | D3-W1 14; D3-W2 16; D3-W3 18 | B3 Crucible Engine: coolant circuits, three thermal nodes, vent targets and Mine Layer support | Incomplete |
| D4 Ghost Circuit, 40 × 28 | D4-W1 14; D4-W2 16; D4-W3 18 | B4 Null Choir: three A → B → C routing compositions, visible targets, Ambush support | Incomplete |
| D5 Crown Array, 42 × 30 | D5-W1 16; D5-W2 18; D5-W3 20 | B5 Custodian: six nodes across Surveillance/Containment/Release, replace accidental Hunter losses | Incomplete |
| Campaign completion | District unlocks, checkpoint restoration, body/resources reset at each new district | Final active extraction, city lighting release, rewards, credits and completed map | Incomplete |

## Enemy and hazard inventory

| Item | Distinguishing requirement | State |
| --- | --- | --- |
| Patrol Drone | Sampled target lock, projectile commitment, EMP/Decoy eligibility | Implemented D1 actor; bounded simulation checks; complete play review open |
| Interceptor Drone | Warned straight dash; committed path cannot retarget; delayed EMP disable | Incomplete |
| Mine Layer | Warned safe drops within global cap; EMP suspends drops | Incomplete |
| Hunter Serpent | 12-segment bounded-path rival; intentional player body-block earns one defeat | Implemented; moving-rival body-block simulation check; human demonstration open |
| Ambush Serpent | 16-segment rival with visible 1.2-second flank intent; complete shared collisions | Incomplete |
| Static/laid mines | Spiked footprint, minimum one-second arm warning, one consumed head hit | D1 static mines implemented/tested in bounded states; Mine Layer content incomplete |
| Laser gates | Safe/warning/active cycles, head-only damage, solid posts, warned EMP recovery | Implemented D1 gates; bounded timing/EMP/collision checks; complete play review open |
| Heat/data lanes | District-specific forms of the shared warned emitter rule | Incomplete |

## Pickup inventory

| Pickup | Required behavior | State |
| --- | --- | --- |
| Overdrive | Eight seconds, half boost drain, unchanged top speed | Implemented; bounded simulation tests; full pickup QA open |
| Shield | One hostile hit or twelve seconds; never protects a critical crash | Implemented; bounded simulation tests; full pickup QA open |
| Score Surge | Fifteen seconds, double eligible points; no fixed-bonus/objective multiplication | Implemented; bounded simulation tests; full pickup QA open |
| EMP Pulse | Slot 1 charge, four-unit radius, three-second eligible disable and warned reactivation | Implemented; bounded simulation tests; full pickup QA open |
| Magnet | Ten seconds; ordinary cores only within 2.5 units and continuously safe attraction route | Mechanics implemented in simulation/Practice; campaign introduction and complete QA incomplete |
| Repair | Restore one integrity only when useful; one spawn per regular wave | Mechanics implemented in simulation/Practice; campaign introduction and complete QA incomplete |
| Decoy | Slot 2 charge; four-second non-solid lure changes future eligible choices, not committed attacks | Mechanics implemented in simulation/Practice; campaign introduction and complete QA incomplete |
| Tail Splice | Retract up to four tail segments over 0.3 simulation seconds, minimum eight, no head teleport | Mechanics implemented in simulation/Practice; campaign introduction and complete QA incomplete |

All eight additionally require refresh/expiry handling, shape/text identity, pause-frozen timers and useless/full-slot pickup behavior. First-district implementation alone does not complete this shared contract.

## Modes and support experiences

| Mode / experience | Release requirement | State |
| --- | --- | --- |
| Campaign | Entire five-district path; faithful start/boss checkpoints; ending | Implemented D1 runtime; normal complete-district demonstration outstanding |
| Arcade Run | Entire city with carried score and terminal death; suspend grants no retry | Incomplete |
| Endless | All unlocked environments; quota min(20, 12 + 2 × floor((wave − 1) / 2)); fifth-wave boss cycles; declared caps; 80-segment ceiling | Incomplete |
| Trials | All twelve authored objectives and medal/failure paths, fixed seeds, isolated Standard/Assisted records | Incomplete |
| Calibration/tutorial | Skippable/replayable interactive steering, attacks versus crashes, boost, tactics and body-block teaching | Incomplete |
| Practice | Replayable learning with no records or progression awards | Implemented D1 Practice; no-score simulation check; full teaching/UX review incomplete |

## Twelve Trials

All are required at launch. Their source of truth is PRD chapter 21, including damage/failure rules, fixed starting state, seeded layout, supplied-charge exceptions and record isolation.

| ID | Trial | Bronze objective | Silver / Gold target | State |
| --- | --- | --- | --- | --- |
| T01 | First Current | Six cores in 60 s; eight segments | ≤35 s / ≤25 s | Incomplete |
| T02 | Needlework | Six ordered checkpoints in 75 s; fixed 20 segments | ≤55 s / ≤40 s | Incomplete |
| T03 | Green Window | Five timed gates in 90 s; no EMP | ≤65 s / ≤50 s without damage | Incomplete |
| T04 | Blackout | Three target-lock interrupts in 90 s with supplied EMP charges | ≤60 s / ≤45 s | Incomplete |
| T05 | False Signal | Three attacks diverted to supplied Decoys in 90 s | ≤60 s / ≤45 s without damage | Incomplete |
| T06 | Cross the Line | Body-block one Hunter in 90 s; 24 segments | ≤60 s / ≤40 s | Incomplete |
| T07 | Double Bind | Body-block two Hunters in 120 s; 28 segments | ≤85 s / ≤60 s without damage | Incomplete |
| T08 | Long Memory | Ten cores in 100 s; 48 segments; no Splice | ≤75 s / ≤55 s | Incomplete |
| T09 | Heat Signature | Three relay circuits in 120 s amid heat lanes | ≤90 s / ≤70 s without damage | Incomplete |
| T10 | Signal Chain | Twelve cores in 90 s with fixed pickups | Complete with 3× / 4× combo | Incomplete |
| T11 | Precision Cut | Eight checkpoints in 90 s; 24 segments; one supplied Splice | ≤65 s / ≤45 s | Incomplete |
| T12 | Last Light | Survive 120 s and collect 18 cores in fixed mixed encounter | Also body-block one / two rivals without integrity loss | Incomplete |

## Progression and Workshop

| Inventory | Items / behavior | State |
| --- | --- | --- |
| Six liveries | Cyan Origin (default), Neon Violet, Chrome Bloom, Foundry Ember, Ghost Pearl, Crown Obsidian | Incomplete as an unlock/equip inventory; first player visual is not six liveries |
| Six trails | Pulse (default), Circuit Ribbon, Ion Dust, Data Echo, Aurora Thread, Crown Wake | Incomplete |
| 3D Workshop | Real snake preview, rotate, zoom presets, trail preview, locked-condition display and working Equip by both inputs | Incomplete |
| Reward ledger | Stable attempt/event IDs, once-only achievement progress across retry/resume/import, Assisted eligibility, no tutorial/Practice progress | Incomplete |

| ID | Achievement | Condition / reward | State |
| --- | --- | --- | --- |
| ACH-01 | First Breach | Clear Neon Spire / Neon Violet | Incomplete |
| ACH-02 | Market Unbound | Clear Chrome Bazaar / Chrome Bloom | Incomplete |
| ACH-03 | Pressure Released | Clear Reactor Foundry / Foundry Ember | Incomplete |
| ACH-04 | Ghost in the Grid | Clear Ghost Circuit / Ghost Pearl | Incomplete |
| ACH-05 | Our Tomorrow | Finish Campaign or Arcade / Crown Obsidian and completed city | Incomplete |
| ACH-06 | Signal Breaker | Ten EMP preparation interrupts / Circuit Ribbon | Incomplete |
| ACH-07 | Perfect Current | 4× combo in a scored mode / Ion Dust | Incomplete |
| ACH-08 | Calibration Complete | Bronze in six distinct Trials / Data Echo | Incomplete |
| ACH-09 | Total Control | Silver in all twelve Trials / Aurora Thread | Incomplete |
| ACH-10 | One Continuous Line | Complete Arcade / Crown Wake | Incomplete |
| ACH-11 | Body Language | Five regular-rival body-block defeats / profile badge | Incomplete |
| ACH-12 | Unbroken Signal | Ten Endless waves in one run / profile badge | Incomplete |

## Release evidence ledger

The original [LAUNCH_ACCEPTANCE.md](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/LAUNCH_ACCEPTANCE.md) remains the complete gate. The status below means the **full launch requirement**, not a narrower development test.

| Gate | Evidence needed | Status |
| --- | --- | --- |
| QA-01 | All screens/modes/settings/Workshop/save flows using keyboard and physical Xbox | PARTIAL — bounded development evidence below; full gate open |
| QA-02 | Movement, turns, spacing, boost and 30/60/120 Hz independence | PARTIAL — bounded development evidence below; full gate open |
| QA-03 | All 15 quotas, exact growth and 228-core total | PARTIAL — bounded development evidence below; full gate open |
| QA-04 | Every collision row, equal-time ordering, neck/head rules and swept boost | PARTIAL — bounded development evidence below; full gate open |
| QA-05 | All eight pickups, slots, timers, usefulness, Magnet and Splice | PARTIAL — bounded development evidence below; full gate open |
| QA-06 | EMP and Decoy preparation/commitment boundaries | PARTIAL — bounded development evidence below; full gate open |
| QA-07 | All enemy states, finite actors and projectile/mine caps | PARTIAL — bounded development evidence below; full gate open |
| QA-08 | Human Hunter/Ambush body-blocks and full rival collision/attribution | PARTIAL — bounded development evidence below; full gate open |
| QA-09 | All five finales with both physical inputs and no optional consumables | PARTIAL — bounded development evidence below; full gate open |
| QA-10 | Transitions/checkpoints/extraction/unlocks/ending/reward commit | PARTIAL — bounded development evidence below; full gate open |
| QA-11 | Complete Arcade, terminal death, scoring and suspend integrity | NOT TESTED |
| QA-12 | Endless through wave ten/boss cycles, formulas/caps/Splice | NOT TESTED |
| QA-13 | Twelve Trials, all medals/failures, supplied charges and record isolation | NOT TESTED |
| QA-14 | Earn/equip all cosmetics and once-only twelve achievements | NOT TESTED |
| QA-15 | Score/combo/bonuses/rules separation, no tutorial/Practice progress | PARTIAL — bounded development evidence below; full gate open |
| QA-16 | Snapshot validation, storage denial/interruption, export/import/migration/fallback | PARTIAL — bounded development evidence below; full gate open |
| QA-17 | Device/focus/resize/fullscreen/audio/graphics failure and explicit recovery | PARTIAL — bounded development evidence below; full gate open |
| QA-18 | Seeded spawn stress, reachability, warnings and escape routes | PARTIAL — bounded development evidence below; full gate open |
| QA-19 | Medium captures of every required screen/district/boss, Low comparison and owner review | PARTIAL — bounded development evidence below; full gate open |
| QA-20 | Identified-machine performance/loading/stress/stability measurements | NOT TESTED |
| QA-21 | Remapping/dead zones/contrast/scaling/motion/flash/assistance/muted semantic UI | PARTIAL — bounded development evidence below; full gate open |
| QA-22 | Five new-player observation, understanding and confusion record | NOT TESTED |
| QA-23 | Observed deliberate rival defeats and boss-objective understanding | NOT TESTED |
| QA-24 | Actual published browser/hardware/controller compatibility and recovery | NOT TESTED |
| QA-25 | Asset provenance/licenses/credits and no missing/fake controls | PARTIAL — bounded development evidence below; full gate open |
| QA-26 | Every launch item complete, reachable and owner accepted | NOT TESTED |

## Development verification

Build/content: **0.1.0 / 0.1.0-neon-spire**. Browser report timestamp and exact browser version are in [browser-report.json](evidence/browser-report.json). Tests ran in an isolated headless installed Chrome context; the Browser plugin was unavailable. This is not identified-machine performance or physical controller qualification.

| Evidence | Result and bounded coverage | Limitation |
| --- | --- | --- |
| `npm run check`; [simulation.test.ts](../tests/simulation.test.ts) | 43 tests passed: full inventory declarations; movement/boost/clock/path; selected collision ordering and pickup boundaries; Hunter body-block/scenery crashes; wave/boss/extraction mechanics; seed/snapshot validation | Many cases construct focused states to test a rule. They do not demonstrate normal progression through the entire district or full release coverage. |
| `npm run build` | Passed TypeScript compilation and production bundling | No runtime, art, audio or hardware acceptance follows from compilation. |
| [verify-game.mjs](../scripts/verify-game.mjs), [browser-report.json](evidence/browser-report.json) | 15 checks passed, Chrome 152.0.7977.77 headless; no uncaught browser/console errors in these flows | Checks cover the first playable loop below, not the entire district or supported-platform matrix. |
| [verify-platform.mjs](../scripts/verify-platform.mjs) | Passed real React keyboard settings/sliders/selects, mocked gamepad A/B/tab and press-edge behavior, held-input isolation, neutral-device ownership, IndexedDB checkpoint isolation/overwrite and atomic idempotent record handling | Mocked standard gamepad does not establish physical Xbox USB/Bluetooth behavior. Storage tests are bounded, not full corruption/migration/denial qualification. |
| [verify-controller.mjs](../scripts/verify-controller.mjs), [controller report](evidence/controller-report.json) | Complete mocked controller-only title/settings/difficulty/start/pause/save flow passed at 1440 × 900 and 375 × 1020; A-hold isolation, visible dropdown opening/confirmation/B cancellation, tab/selector adjustment, paused Pickups & Tactics guide/back, stick navigation and explicit cursor under DOM focus refusal | Standard Xbox mapping simulation; owner reports other menus now work; the final dropdown revision needs their recheck. Narrow preview checks do not qualify touch gameplay. |
| [verify-audio.mjs](../scripts/verify-audio.mjs), [audio report](evidence/audio-report.json) | Native 14-second stereo rendering and live unlock/pause/resume/disposal passed. No invalid samples or clipping, mute/pause silent, pickup SFX preserved, all 243 sources ended. Native autoplay block/click recovery, suspension/visibility without gameplay resume, closed-context rebuild and delayed-resume/disposal races pass | Bounded audio/API verification; revised composition still needs owner listening feedback. |
| [verify-enemies.mjs](../scripts/verify-enemies.mjs), [enemy report](evidence/enemy-visibility-report.json) | Four final actual renderer captures: Medium 1672 × 941; Low/bloom off 1672 × 941, 1280 × 720 and 375 × 844. No simulation mutation, clean disposal and no browser errors | Explicit frozen enemy fixture without HUD; proves selected rendered states, not an ordinary encounter, full transition coverage or owner acceptance. |
| [verify-systems.mjs](../scripts/verify-systems.mjs), [systems report](evidence/systems-report.json) | Seven real-App checks pass: same-frame retained pickup/core and later shot, buff effect/timer, exact frozen guide/save, EMP pickup/use, head-vs-body projectile damage and Shield feedback | Explicit validated encounter snapshots in isolated storage; not normal progression, complete pickup QA or physical Xbox acceptance. |
| [verify-runtime.mjs](../scripts/verify-runtime.mjs), [runtime report](evidence/runtime-report.json) | Nine actual-App checks pass: blocked/real-click/suspended audio, truthful readiness and callout layout, no-op resize, viewport/fixed-frame safety pauses, frozen state and Low/countdown recovery | Strict-autoplay Chrome with native contexts observed; long frame deliberately induced. Does not identify every reported pause or qualify hardware/long sessions. |
| [verify-render-performance.mjs](../scripts/verify-render-performance.mjs), [renderer report](evidence/render-performance-report.json) | Pixel budgets/compositor/no-op resize, unchanged state, eight pickup identities, precise four-unit EMP origin/pause freeze pass. Large Medium buffer reduces from 18.74M to 2.073M pixels; short frozen frame median 50ms → 16.7ms | Bounded isolated fixture, not identified-machine sustained performance, full stress or proof every owner-reported pause is resolved. |
| [Title](evidence/title-1672.png), [gameplay](evidence/gameplay-1672.png), [settings](evidence/settings-1672.png) | Actual 1672 × 941 rendered captures inspected against both references; lighting/armor/machinery improvements visible | Material visual gaps remain; see [VISUAL_REVIEW.md](VISUAL_REVIEW.md). Owner likes overall graphics; full reference and release acceptance pending. |
| [Warden fixture](evidence/warden-fixture-1672.png) | Explicit valid snapshot restores and renders boss nodes, relays and HUD | **Fixture-based, not a normal playthrough, boss completion or human understanding test.** |
| Normal steering audit, seeds 3039 / 76113 / 20260905 | Reached 10 / 16 / 14 ordinary cores respectively, then own-body critical crashes | No completed normal district. This observation alone establishes neither a soft lock nor accepted balance. |

The real-browser loop starts from the actual menu and keyboard countdown, moves forward to collect one core (length nine), pauses with frozen resources, saves exact state, reloads the same snapshot, pauses a resume countdown on focus loss, resumes, verifies all four HUD groups fit 1280 × 720 at 150% UI scale, produces a named wall crash through movement, records once and clears suspend, retries the district checkpoint, and displays the real local record. A 390-pixel title-containment check is also included; touch gameplay and mobile support are not qualified.

The full normal Neon Spire journey, deliberate human rival defeat, optional-consumable-free human Warden clear, revised-music listening review, physical Xbox qualification, full-city modes/progression, measured performance, new-player observation and owner acceptance remain outstanding. See [SESSION_HANDOFF.md](SESSION_HANDOFF.md) for exact next steps.

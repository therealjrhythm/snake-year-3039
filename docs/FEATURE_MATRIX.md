# Snake: Year 3039 — full-release feature matrix

Authority: [PRD v2.0](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/PRD.md) and [full-game handoff](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/FULL_GAME_HANDOFF.md). Development sequence: [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md).

Build/content checkpoint: **0.3.1 / 0.3.0-neon-spire**. The [expansion addendum](NEON_SPIRE_EXPANSION.md) adds twelve powerups, free glow customization and the larger arena; the latest [combat/interface addendum](NEON_SPIRE_COMBAT_REFRESH.md) adds three lives, required charged boss laser combat, Warden counterfire and presentation changes. Existing 0.1/0.2 saves retain their original rules and geometry. **The full release is incomplete.** Supplied specifications and art references are not implementation evidence. Declared content IDs are not playable content. The first district is a development milestone; every item below remains part of launch.

Status vocabulary: **In progress** = implementation is being built, with verification still required; **Incomplete** = final behavior is not complete; **Implemented** = behavior exists, with tests/review explicitly stated separately; **Tested** = a linked test demonstrates only its stated scope; **Owner reviewed** = explicit review is recorded. A build/test pass does not imply full acceptance. Targeted owner feedback now records good graphics/sound effects and smooth controls, plus requested fixes to Xbox menus, enemy visibility and music. The latest owner report likes the challenge and requests clearer tactics/pickups/damage plus reliable sound and pauses. Full owner acceptance and physical-controller qualification remain open. Milestone B remains open: two fresh automated simulation traces clear D1, but a human/physical-input full district clear has not been demonstrated.

Latest owner design revision (September 6, 2026): stable pickup camera, richer dimensional arena, crisp colored player strips/laser, continuously pulsing tactical-ready feedback, full-size Customize/Practice actions, plain difficulty explanations, centered Settings, neon selection and reduced-motion-aware GSAP entrances. Three lives restart the current stage; three spheres charge the required no-ammunition Warden laser. A brief title notice distinguishes older Continue rules from new Start Game rules. Earlier automated pad clears remain historical 0.2 evidence, not a 0.3 laser clear.

Owner refinement 0.3.1 removes the rejected mist layer and delayed detached selection overlay. Menus confirm immediately on the actual control. The arena remains 36 × 26; compact corner HUD plus a fixed bonus footer improve framing without pickup-driven camera movement. EMP/Decoy keep pulsing until spent; deployed Decoy gains a visible hologram/countdown. Performance-pause text distinguishes an unspent charge from a deployed frozen lure. [Refinement evidence](evidence/crisp-feedback-2026-09-06/verification.json), [menu timing](evidence/crisp-feedback-2026-09-06/menu-motion-report.json), [tactical behavior](evidence/crisp-feedback-2026-09-06/tactics-report.json). 88 tests, build, eleven existing browser scripts, two new feedback/tactical scripts and the ten-group compiled production smoke pass. The exact owner-device pause remains unreproduced; controlled stalls and mocked gamepads are explicitly limited evidence.

## Systems coverage

| PRD requirement | Release obligation | Current state | Required evidence / gate |
| --- | --- | --- | --- |
| Chapters 1–2 | Complete single-player cyberpunk game; opening, calibrated first minutes, resolved fiction | Incomplete | Complete journey and onboarding observation; C/F |
| Chapters 3–4, 25 | Actual dimensional armored cyan snake; layered city, readable reflective grid, energy, pickups and machinery; approved-reference review | Implemented first-district scene; reference fidelity remains incomplete | Captured real gameplay/title/settings; owner visual review; B then every district |
| Chapters 5–8 | Five distinct districts, 15 waves, five finales, 228 cores, map/unlocks/checkpoints/ending | D1 runtime implemented; fresh automated simulation clears; human clear open; D2–D5 incomplete | Full campaign playthrough, quota/growth/route tests; C |
| MOV-01–05 | Continuous 4.5/6.3 movement, bounded 240° turns, sampled 0.55-spaced body, growth/Splice, 100-energy boost and release gating | Implemented D1 foundation; bounded tests; full requirement verification open | Movement, reverse/diagonal, boost, body spacing and render-frequency checks; A/B |
| INP-01–06 | Shared keyboard/Xbox actions, menu focus, device ownership/glyphs, remapping, dead zone, neutral transitions, disconnect recovery | Implemented shared actions plus explicit remembered menu selection, embedded-focus recovery, form-row navigation and custom option lists; full mocked controller menu flow passes; hardware/remapping incomplete | Full keyboard flow plus physical Xbox tests; remapping/recovery still required; B/D/E |
| CAM-01–04 | Elevated fixed gameplay camera, entire arena plus HUD-safe margins, 16:9/16:10/21:9, safe refit | Stable viewport/UI-scale camera reservations; pickup/tactic/combo changes do not refit; full requirement verification open | Actual viewport/resize/fullscreen captures and interactions; B/E |
| HUD-01–04 | Objective, quota, score/local best, combo/window, integrity, boost, both tactical slots, active buffs and boss nodes | Fixed footer bonus names/timers with accessible effect labels, lives/health, colored tactical-ready pulses, boss charge/armor/laser state and head-hit/Shield feedback; full verification open | Rendered states and 80–150% scale checks; B/D/E |
| COL-01–07 | Full head/body/hazard/exit collision table, critical-crash priority, equal-time ordering, swept collision, neck exclusion, contact deduplication | Implemented D1 foundation; bounded tests; full requirement verification open | Each collision row and simultaneous ordering tested; A/B/E |
| PWR-01–12 | Eight original plus four addendum pickups; two selected tactical slots; refresh/expiry/usefulness limits; safe Magnet; EMP/Decoy commitments | Twelve mechanics, campaign introductions and recurring EMP/Decoy supply; device-aware twelve-power guide and illustrated Practice Lab with plain effect/use help; simulation and bounded App checks pass | All pickup boundaries and paused timers; C/D |
| DIR-01–05 | Seeded authored safe candidates, connectivity/turn clearance, three cores/three optional pickups, no-overlap warnings, pressure arbitration, no-soft-lock retry | Implemented D1 foundation; bounded tests; full requirement verification open | Seeded stress and route/attack tests; C/E |
| SCR-01–06 | Formula/chain, once-only rival/boss/extraction score, separated local records, retry restoration, metadata | Three-life stage checkpoints restore entry score/resources; lost-life saves retain spent lives; versioned records and terminal deduplication tested; full mode isolation incomplete | Formula and duplicate-event tests, full mode isolation; B/D |
| ENM-01–08 | Five archetypes, mines, gates and heat/data lanes with visible warning/attack/recovery/disabled/removal states | Implemented initial Neon Spire roster; bounded tests; full roster incomplete | Finite rosters/caps; each state's captured counterplay; C |
| RIV-01–07 | Real Hunter/Ambush body combat, own-body/wall/two-rival crashes, no teleport rescue, finite IDs and single awards | Implemented Hunter; simulation body-block checked; human demonstration outstanding | Deliberate human body-block, collision tests, Ambush and paired-rival review; B/C/E |
| BOS-01–07 | Five mechanically distinct finales with safe objectives, missed-window persistence, no required optional ability | Charged laser Warden and locked warned counterfire implemented for 0.3; older pad/hybrid retained; bounded simulation/App checks pass; human boss playthrough outstanding | Every phase on keyboard and physical Xbox, objective/crash/no-soft-lock checks; B/C/E |
| MOD-01–05 | Campaign, full Arcade, Endless and 12 Trials; shared physical rules and distinct records | Implemented D1 foundation; full campaign and other modes incomplete | All four complete modes and authored Trial paths; C/D |
| PRO-01–06 | District progression, six liveries/six trails/12 achievements, 3D Workshop and once-only reward ledger | Incomplete | Earn/preview/equip all; retry/resume/import deduplication; D |
| UX-01–08 | Capability/loading/recovery, all selectors, tutorial/Practice, title/settings/pause/results/ending, explicit state/focus | Implemented initial shell; bounded keyboard/UI flows tested; full screens incomplete | Every real control works using each input; full states/recovery; B/D/E |
| ACC-01–09 | Standard/Expert/Assisted, record classification, remapping, readable scalable UI, motion/light/audio options | Normal/Easier/Harder apply existing distinct profiles; shared neon focus and reduced-motion GSAP verified; full settings/remapping incomplete | Full settings, accessible focus, contrast, muted play and assistance rules; D/E |
| Chapter 26 | Original/licensed music, effects, ambience, dialogue/text, audio unlocking/buses, restrained game feel | Implemented futuristic synth score and preserved accepted effects; native readiness/blocked prompt, gesture retry, suspension/visibility/closed-context recovery tested; listening review outstanding | Actual audio/UI event review, blocked/muted boundary, full district music; B/C/E |
| TECH-01–09 | TypeScript/Three.js real 3D, semantic HTML, fixed 60 Hz, five-step debt cap, safe performance pause, instancing/lifecycle | Implemented D1 foundation; bounded tests; full requirement verification open | Typecheck/build, simulation/render tests, resource/context-loss tests; A/E |
| DATA-01–08 | Validated typed content; complete snapshots; transactional profile/checkpoint/suspend/records; safe export/import/migration/failures | Implemented IndexedDB foundation; bounded exact-restore/record/isolation checks; full recovery/export/import incomplete | Corrupt/version/denied/interrupted storage tests, exact restore and import validation; C/D/E |
| PERF-01–08 | Identified-machine 1080p Medium/720p Low budgets, real loading/resource measurements, full stress, browser/controller qualification | Incomplete | Five-minute frame times, 30-minute run/30 restarts, exact hardware matrix; E |
| BUILD-01–07, chapters 30–34 | Staged development without reduced scope; truthful evidence, provenance, acceptance and change control | Roadmap/matrix/provenance/handoff maintained; complete acceptance remains open | QA-01–26 evidence and complete owner acceptance; E/F |

## Districts, waves and bosses

Ordinary-core quotas total **228**. Starting each district at eight body segments gives unspliced end lengths **44 / 50 / 56 / 56 / 62**, excluding the head. Boss relays do not count or grow the snake. Distinct footprints, authored layouts and routing mechanics are required.

| District | Waves and quotas | Finale | Current state |
| --- | --- | --- | --- |
| D1 Neon Spire, 36 × 26 (legacy 32 × 24 saves retained) | D1-W1 12; D1-W2 12; D1-W3 12 | B1 Warden: three armor nodes; three ordered spheres charge three required laser hits; warned counterfire and active exit; earlier pad/hybrid rules preserved | Implemented expanded D1; bounded tests and fresh automated simulation clears; human playthrough and owner/physical review required |
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
| Magnet | Ten seconds; ordinary cores only within 2.5 units and continuously safe attraction route | Implemented in expanded Neon Spire campaign and Practice Lab; full playtest acceptance open |
| Repair | Restore one integrity only when useful; one spawn per regular wave | Implemented in expanded Neon Spire campaign and Practice Lab; full playtest acceptance open |
| Decoy | Slot 2 charge; four-second non-solid lure changes future eligible choices, not committed attacks | Implemented in expanded Neon Spire campaign and Practice Lab; full playtest acceptance open |
| Tail Splice | Retract up to four tail segments over 0.3 simulation seconds, minimum eight, no head teleport | Implemented in expanded Neon Spire campaign and Practice Lab; full playtest acceptance open |
| Pulse Blaster (addendum) | Twelve rounds, four shots/s, forward 60° / 10-unit visible-target assistance; two hits per drone; armored rivals; 0.3 boss laser charges from spheres without ammo | Implemented in fixed-step simulation; bounded weapon/boss and actual App firing checks pass |
| Capacitor (addendum) | Restore 35 boost below 65 after boost use | Implemented; bounded simulation/browser checks pass |
| Bullet Scrubber (addendum) | Armed eight seconds; first bullet within two units clears hostile projectiles within three units once | Implemented; bounded simulation/browser checks pass |
| Chain Buffer (addendum) | Armed ten seconds; extend one expiring combo by three seconds; damage still resets | Implemented; bounded simulation/browser checks pass |

All twelve additionally require refresh/expiry handling, shape/text identity, pause-frozen timers and useless/full-slot pickup behavior. First-district implementation alone does not complete this shared contract.

## Modes and support experiences

| Mode / experience | Release requirement | State |
| --- | --- | --- |
| Campaign | Entire five-district path; faithful start/boss checkpoints; ending | Implemented D1 runtime; normal complete-district demonstration outstanding |
| Arcade Run | Entire city with carried score and terminal death; suspend grants no retry | Incomplete |
| Endless | All unlocked environments; quota min(20, 12 + 2 × floor((wave − 1) / 2)); fifth-wave boss cycles; declared caps; 80-segment ceiling | Incomplete |
| Trials | All twelve authored objectives and medal/failure paths, fixed seeds, isolated Standard/Assisted records | Incomplete |
| Calibration/tutorial | Skippable/replayable interactive steering, attacks versus crashes, boost, tactics and body-block teaching | Incomplete |
| Practice | Replayable learning with no records or progression awards | D1 Practice plus twelve-power Lab and Warden rehearsal; campaign suspend preserved; actual App isolation checks pass |
| Replay This Seed (addendum) | Fresh attempt with same seed, layout and rules | Implemented; bounded simulation/browser checks pass |

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
| Free glow customization (addendum) | Eight free named glows, existing-renderer preview, rotate/zoom, Apply/Cancel/Restore Cyan, independent persistence | Implemented; actual App and mocked-controller flows pass; owner/physical review open |
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
| QA-24 | Actual published browser/hardware/controller compatibility and recovery | PARTIAL — public production Chrome smoke passes; identified hardware/controller qualification remains open |
| QA-25 | Asset provenance/licenses/credits and no missing/fake controls | PARTIAL — bounded development evidence below; full gate open |
| QA-26 | Every launch item complete, reachable and owner accepted | NOT TESTED |

## Development verification

Current build/content: **0.3.1 / 0.3.0-neon-spire**, September 6, 2026. Earlier 70-test, hybrid/pad and glow evidence below is historical unless explicitly rerun for this revision. Browser reports contain exact timestamps and Chrome 152.0.7977.77 metadata. All scripts use isolated installed-Chrome profiles through Playwright because the Browser plugin is unavailable. They run sequentially and do not alter the owner's browser profile. Local diagnostic frame observations do not qualify a machine or physical Xbox connection.

| Evidence | Result and bounded coverage | Limitation |
| --- | --- | --- |
| [0.3 combat/interface report](evidence/combat-refresh-2026-09-06/combat-report.json), [renderer](evidence/combat-refresh-2026-09-06/render-report.json), [menu](evidence/combat-refresh-2026-09-06/menu-report.json), [tests](evidence/combat-refresh-2026-09-06/check.log) | 85 tests and build pass. Nine actual-App groups cover difficulty, Practice, spent-life persistence/exact retry, terminal records, input isolation, sphere-charged laser/counterfire and earlier saves. Safe full-length retry routes handle near-wall stage entries without moving the live world or changing critical collisions. Eight renderer groups include 96 color/ratio/quality/scale cases and identical camera matrices across transient HUD states. Six menu viewport sizes, centered Settings, neon selection, GSAP cleanup and reduced motion pass. [All eleven development browser scripts](evidence/combat-refresh-2026-09-06/verification.json) pass sequentially; current logs include native audio, mocked controller, systems, runtime and rendering regression coverage. | App boss/wave fixtures and mocked gamepads are explicit; human full clears, physical Xbox, new-player comprehension, artistic/listening review and sustained hardware performance remain open. [Compiled local production smoke](evidence/combat-refresh-2026-09-06/production-local-report.json) passes ten groups without errors or failed assets. Public production must be verified against the exact pushed SHA. |
| [Glow/title revision](evidence/glow-title-2026-09-06/render-report.json), [before](evidence/glow-title-2026-09-06/glow-before.png), [after](evidence/glow-title-2026-09-06/glow-after.png), [title](evidence/glow-title-2026-09-06/title-lab.png), [controller](evidence/glow-title-2026-09-06/controller.log) | Stronger player light strips, matching head/body/direction marker and full-size title Lab. 96 Low/Medium/ratio/UI-scale color combinations pass; all eight colors visually compared before/after. Keyboard return focus and mocked Xbox title flows pass. Six viewport sizes retain all saved-run title actions. No additional meshes/passes/WebGL contexts; original rendering budgets remain. Check/build and seven applicable browser scripts pass sequentially; [compiled local production smoke](evidence/glow-title-2026-09-06/production-local-report.json) passes ten groups without errors or failed assets. | Supersedes original fixed-cyan-head design at the owner's request. Visual captures and bounded fixtures do not establish subjective color approval, physical Xbox, complete playthrough or sustained performance. |
| [Illustrated Lab follow-up](evidence/lab-clarity-2026-09-06/report.json), [powerup](evidence/lab-clarity-2026-09-06/lab-magnet.png), [Warden](evidence/lab-clarity-2026-09-06/lab-warden.png), [narrow](evidence/lab-clarity-2026-09-06/lab-narrow.png) | Twelve canonical model images, simple effect/activation copy, shared pictured bottom-center green pad and yellow shooting-target instructions. Check/build and expansion/controller/systems/expansion-render reruns pass; compiled local production smoke passes eight groups with zero failed assets/runtime errors. Mocked controller covers all thirteen Lab choices and glyphs at two viewport sizes. | Static exported views add no WebGL context; configured effects/rules unchanged. Local compiled-build evidence; verify the exact pushed Vercel deployment separately. Human comprehension and physical controller acceptance remain open. |
| `npm run check`; [legacy tests](../tests/simulation.test.ts), [expansion tests](../tests/expansion.test.ts) | 85 tests pass: 43 foundation, 27 expansion/compatibility and 15 combat/lives cases. Safe full-length retry routes, near-wall transition recovery, stage persistence/no-farming, three-loss termination, original versions, charged laser and counterfire are included. Expansion coverage includes typed twelve-power rules, cadence/retries/full slots, exact scheduling/ammo/buff/projectile restore, legacy geometry/rules and rejection of expanded-only/unknown buff state, weapon rate/cone/LOS/caps/targets, Scrubber contact ordering, Chain Buffer, both boss routes/once-only consumption, and isolated Lab effects | Many tests arrange explicit states to isolate a rule; passing tests do not mean complete content, human comprehension or full-release QA. |
| `npm run build` | TypeScript and production bundle pass | Compilation alone establishes no runtime, visual, audio or hardware acceptance. |
| [Vercel deployment](DEPLOYMENT.md), [production smoke](evidence/deployment-production-initial/report.json), [cloud build](evidence/deployment-production-initial/build.log) | GitHub-triggered production deployment at [snake-year-3039.vercel.app](https://snake-year-3039.vercel.app/); all 70 tests in Vercel build; six public real-UI smoke groups pass with no failed assets, browser errors or warnings | Initial commit-specific hosting evidence; ordinary opening movement only. Full district, physical Xbox, sustained hardware performance and release acceptance remain open. |
| [Game script](../scripts/verify-game.mjs), [report](evidence/browser-report.json) | 15 checks pass: actual menu/countdown/first core, frozen pause, exact save/reload, focus recovery, 150% HUD, real wall crash/result/record/retry; explicit Warden snapshot | The ordinary part collects one core. Warden is an arranged fixture. A 390-pixel title check does not qualify mobile gameplay. |
| [Platform script](../scripts/verify-platform.mjs), [log](evidence/verification-platform.log) | Real React keyboard settings, mocked A/B/tabs, 23 input-boundary assertions including fresh input after pointer menu changes, held-input isolation, checkpoint/atomic record isolation, and legacy/new record coexistence pass | Mocked standard gamepads and bounded IndexedDB cases, not physical devices or comprehensive recovery/export/import. |
| [Controller script](../scripts/verify-controller.mjs), [report](evidence/controller-report.json) | Full controller-only title/settings/dropdowns/difficulty/start/pause/guide/save flows plus glow selection, rotation, zoom, Apply/Restore/Cancel pass at 1440 × 900 and 375 × 1020; visible selection survives refused DOM focus | Synthetic standard gamepads. Physical Xbox USB/Bluetooth and owner's current confirmation remain open. |
| [Audio script](../scripts/verify-audio.mjs), [report](evidence/audio-report.json) | Native 14-second music rendering, 42 typed event policies and 54 cue cases including numeric relays pass; no invalid samples/clipping; mute/pause silence; saved mute on initialization; autoplay/click/suspend/visibility/closed-context/disposal recovery | Native API/sample checks establish cue wiring and bounded signal health, not artistic listening approval or five district music identities. |
| [Enemy script](../scripts/verify-enemies.mjs), [report](evidence/enemy-visibility-report.json) | Four frozen actual-renderer Medium/Low captures, no state mutation, clean disposal, no browser errors | Selected enemy states, not ordinary encounter/balance or owner visual acceptance. |
| [Systems script](../scripts/verify-systems.mjs), [report](evidence/systems-report.json) | Seven actual-App checks: retained pickup/core/shot feedback, twelve-power guide, timed effects, exact frozen guide/save, real EMP acquisition/use, projectile head-vs-body damage and Shield feedback | Explicit validated encounter snapshots in isolated storage; no human/device acceptance. |
| [Runtime script](../scripts/verify-runtime.mjs), [report](evidence/runtime-report.json) | Nine actual-App native sound/readiness/autoplay, no-op resize, focus/viewport/fixed-frame safety pause, exact frozen state and Low/countdown recovery checks pass | Strict-autoplay contexts and an induced long frame. Does not prove every reported pause is resolved on every machine. |
| [Performance script](../scripts/verify-render-performance.mjs), [report](evidence/render-performance-report.json) | Pixel/compositor budgets, no-op resize, twelve pickup identities, exact 4-unit EMP, immutable render state, six player/eight hostile projectile fixture pass. Twenty sampled large-view frames: render median 3.0ms/p95 3.3ms; frame interval median/p95 16.7ms | Short headless fixture, not identified-machine sustained performance, full campaign stress or physical hardware qualification. |
| [Expansion App script](../scripts/verify-expansion.mjs), [report](evidence/expansion-report.json) | Seven actual-App checks pass: eight glows and same-canvas preview/persistence/cancel, frozen paused customization, delayed-save resume exclusion, all twelve Lab choices plus Warden and save/record isolation, held-F countdown suppression, same-seed fresh identity, prepared Warden three-hit node consumption/context guide, and truthful legacy supply/weapon help | App interactions are real; selected Lab/boss states are explicitly prepared. The flows do not establish ordinary full runs. |
| [Expansion render script](../scripts/verify-expansion-render.mjs), [report](evidence/expansion-render-report.json) | Shared 36×26 floor/Warden avoids real HUD panels across 16:9/16:10/21:9 and UI 80/150. 96 glow combinations cover eight colors × Low/Medium × three landscape ratios × UI80/150. Six simultaneous buffs at 1280 × 720/UI150 retain every name/effect/timer without clipping or HUD overlap; durations measure 20.2px. At the original expansion checkpoint all colors preserved the cyan head/hostile faction; the later owner revision changes the player head to match its selected glow. Twelve distinct pickup shapes, ordered relay highlighting, inactive/waiting/ready pad, exposed receptor, energy link, exact 3-unit Scrubber, projectile ownership, extraction cleanup, same-canvas preview and legacy 32 × 24 pass | Frozen rendered fixtures. Scope/counts are recorded in the report; captures still require owner review and do not establish player comprehension. |
| Fresh Standard seed 3039 [analog trace](evidence/ordinary-standard-3039-analog.json) | 36 ordinary cores, intentional Hunter body-block, three pad discharges, active north extraction; 228.58 simulation seconds, score 9900, integrity 3. Exact input replay passes | Automated fresh simulation with read-only forecasting and optional powers, including blaster. No snapshots installed; no normal rendered/human/device acceptance. |
| Fresh Standard seed 3039 [eight-direction trace](evidence/ordinary-standard-3039-keyboard.json) | 36 ordinary cores, three pad discharges, north extraction; 267.37 simulation seconds, score 9400, integrity 2. Exact replay passes without collecting/firing blaster | Automated simulation; EMP/Decoy and other powers used. Hunter died by its own crash. Does not meet deliberate human body-block or optional-consumable-free boss gate. |
| [Rendered keyboard replay failure](evidence/ordinary-keyboard-browser-failed-162.95.json) | Actual App/native clock/renderer and shared keyboard controller reached Warden after all 36 cores, then self-crashed at 162.95s; zero automatic pauses and zero browser errors | Open-loop replay is one-step timing-sensitive near a 180° steering boundary. A one-step-delayed command reproduces the crash in pure replay. Production rules remain unchanged; this is not a passing browser clear. |
| [Visual review](VISUAL_REVIEW.md), [customization](evidence/customize-magenta.png), [Warden UI150](evidence/expanded-warden-ui150.png), [context guide](evidence/warden-context-guide.png) | Current rendered states reviewed against supplied title/settings and gameplay images; accepted armored/cyan/magenta city direction preserved | Illustration-level material/city richness, moving readability, all new cosmetics and full reference acceptance require owner review. |

Successful command output is retained in `docs/evidence/verification-*.log`; structured reports specify their fixtures and limitations. The original QA-01–26 checklist above remains a release obligation. Fresh algorithmic simulation clears are recorded separately from arranged fixtures and real human/device play.

The human Neon Spire journey, deliberate human rival defeat, optional-consumable-free human Warden clear, revised-music listening review, physical Xbox qualification, full-city modes/progression, sustained hardware performance, five-player observation and owner acceptance remain outstanding. See [SESSION_HANDOFF.md](SESSION_HANDOFF.md) for reproduction and next steps.

# Snake: Year 3039 — implementation roadmap

Active product authority: [full PRD v2.0](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/PRD.md), [full-game handoff](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/FULL_GAME_HANDOFF.md), and both approved reference images in that package. The supplied package and Word document remain source material; implementation documentation lives here.

The destination is the complete five-district game. Version 0.1 is the beginning of development and the first Neon Spire playable milestone, not a reduced release definition. The status of every launch system remains visible in [FEATURE_MATRIX.md](FEATURE_MATRIX.md). No milestone acceptance implies full release acceptance.

## Current checkpoint — 0.1.0

The first-district foundations are implemented with bounded automated tests: real Three.js geometry, an armored player serpent, elevated arena view, semantic title/settings/HUD, shared keyboard/gamepad actions, fixed-step simulation, three collection waves, a Hunter rival, Warden objective finale, active extraction, procedural music/effects, restart and IndexedDB suspend/checkpoint/records.

Verification: `npm run check` passed 36 tests; `npm run build` passed; 15 real-browser checks passed in headless Chrome 152.0.7977.77; separate platform checks passed React controls, mocked-gamepad action/navigation edges and IndexedDB isolation. Details and limitations are in [FEATURE_MATRIX.md](FEATURE_MATRIX.md), [browser-report.json](evidence/browser-report.json) and [SESSION_HANDOFF.md](SESSION_HANDOFF.md).

**Milestone B remains open.** No ordinary-play full Neon Spire clear has been demonstrated. Normal steering audits reached 10/16/14 cores on seeds 3039/76113/20260905 before self-collision; these are observations, not a successful district playthrough or proof of unreachability. Warden rendering uses an explicit saved-state fixture. Physical controller qualification, subjective audio, human body-block/boss play and owner visual acceptance remain unverified. The current art has improved but still has material gaps against the supplied references, recorded in [VISUAL_REVIEW.md](VISUAL_REVIEW.md).

Content identifiers for the full game can be defined early. An ID, quota, menu label, or data entry is not evidence that its encounter, mode, reward, or screen is implemented. Unfinished launch functionality must not be presented as a working option in the playable build.

## A — Visual and control foundation

- Establish a TypeScript content model for districts, waves, enemy archetypes, pickups, bosses, trials, cosmetics, rules profiles, records and snapshots. Pin dependency versions and validate referenced IDs.
- Separate simulation from rendering and React updates. Use fixed 60 Hz simulation, distance-sampled body paths, bounded steering, normalized input, release-gated boost and explicit state transitions.
- Build the production-direction armored cyan snake, readable dark grid, city depth, dimensional pickups, restrained magenta energy and sound identity alongside the movement foundation.
- Keep source-of-truth hitboxes independent of glow, tilt and presentation effects. Define collision ordering and safe spawn rules before expanding encounters.
- Use semantic HTML controls and a shared action vocabulary for keyboard/gamepad. Handle focus loss, neutral input on transitions and explicit recovery.

Exit evidence: movement/resource/collision tests, successful typecheck and build, captured real title/settings/gameplay, readable camera at supported aspect ratios, keyboard flow through start/pause/restart, and a clearly identified boundary between automated gamepad checks and hardware evidence.

## B — Representative playable experience

- Finish Neon Spire's 32 × 24 arena, three 12-core waves and environmental identity against the supplied references.
- Add finite Patrol/Hunter encounter schedules, visible mine/gate warnings, a demonstrable Hunter body-block, and the first taught pickups: Overdrive, Score Surge, Shield and EMP.
- Implement Warden's three visible nodes, ordered relays, telegraph/attack/recovery cycle and discharge pad. Preserve relay charge across missed windows and require no random consumable.
- Open the actual extraction collision gap after Warden defeat and require the player to drive through it. Preserve solid/self collision during extraction.
- Complete a reliable first-district loop: start, countdown, play, wave transition, boss entry, pause, settings, failure/retry, save/resume, clear and results.
- Review playable presentation, music, warnings, controls and UI against both approved images. The image references provide art direction; they are not production geometry or gameplay captures.

Exit evidence: a real player completes all three waves and Warden, intentionally defeats a Hunter with the body, restarts and resumes safely, and navigates with keyboard and a physical Xbox controller. Record actual hardware, browser, seed, build/content version and captures. A simulated input test alone cannot close the controller requirement. Owner review establishes the visual benchmark.

## C — Complete city and systems

Build four additional districts using the proven systems while preserving their different routes and mechanics:

| Order | District | Required identity and finale | Collection quotas |
| --- | --- | --- | --- |
| D2 | Chrome Bazaar | 36 × 26 market/shutters/islands/bypasses; Switchblade Twins, two armored rival bosses | 12 / 14 / 16 |
| D3 | Reactor Foundry | 38 × 28 machinery/heat lanes; Crucible Engine coolant relays and vent recovery | 14 / 16 / 18 |
| D4 | Ghost Circuit | 40 × 28 data cathedral/routing paths; Null Choir A → B → C circuits | 14 / 16 / 18 |
| D5 | Crown Array | 42 × 30 orbital-array composition; Custodian's Surveillance, Containment and Release phases | 16 / 18 / 20 |

- Preserve all fifteen authored waves and 228 ordinary campaign cores. Boss relays and Trials do not contribute to this total or ordinary-core growth.
- Finish Interceptor, Mine Layer and Ambush Serpent with explicit attack states, warning commitments, full collision rules and finite campaign rosters. Complete two-rival interactions and attack arbitration.
- Complete Magnet, Repair, Decoy and Tail Splice plus all eight pickups' limits, expiry, safe-line rules and tactical selection behavior.
- Complete distinct layouts, non-consumable routes, spawn connectivity, visible shutdown/dissolve and seed reproduction. Do not reuse one obstacle layout with five lighting palettes.
- Implement campaign map/unlocks, district recalibration, faithful district-start/boss-entry checkpoints, once-only clear rewards, story transitions, Crown Array extraction, ending and credits.
- Upgrade persistence to validated versioned transactions for profile, records, checkpoint and suspend; retain memory-only play with clear failure UI if storage is unavailable.

Exit evidence: complete city playthrough, all boss phases without optional consumables, exact quotas/growth, no-soft-lock and seeded spawn tests, checkpoint/reward integrity and capture/review of each district at the established quality benchmark.

## D — Full replay and progression

- Finish Arcade Run across the entire campaign route with carried score, terminal death, district resets and suspension that grants no retry.
- Finish Endless in all unlocked environments, declared quota/pressure formulas, fifth-wave boss cycles, capped threats and 80-segment stabilization with Tail Splice recovery.
- Author and clearance-test all twelve Trials with fixed seeds, actual objectives, Bronze/Silver/Gold conditions, failure/retry, explicit supplied-charge exceptions and isolated records.
- Add six liveries, six trails and twelve once-only achievements; complete a real 3D Workshop with rotation, zoom, locked previews and Equip.
- Complete all records/profile metadata, tutorial and non-scoring Practice, district/trial selectors, results/rewards and completed-city states.
- Finish keyboard/gamepad remapping and conflict checks, configurable dead zone, hold/toggle boost, focus/glyphs/haptics, UI scale, contrast, subtitles, motion/light/trail settings, full audio buses and reduced dynamic range.
- Finish validated export/import, replace confirmation, imported-record flags, save migration, interrupted-write and corruption recovery.

Exit evidence: every mode and Trial is reachable; all rewards can be earned and equipped; records remain separated by mode/rules/content; tutorial/Practice do not advance progression; every menu and setting operates without a mouse; import/reload/retry cannot duplicate rewards.

## E — Full-game release candidate

- Balance the full encounter inventory and Trial medal targets with recorded playtests. Record tuning changes and the requirements they affect.
- Complete provenance, licenses, credits and finished audio identity across all five environments.
- Test the PRD's 1080p Medium and 720p Low targets on identified machines, including five-minute frame-time samples, full stress content, 128-segment safety, loading/transition measurements, thirty minutes of Endless and thirty restarts.
- Qualify actual Windows Chrome/Edge and macOS Chrome keyboard/Xbox combinations; assess Firefox/Safari and publish only passing combinations. Record USB/Bluetooth model and connection separately.
- Exercise storage denial/corruption/version mismatch, controller removal, focus/visibility changes, resize, fullscreen/audio refusal, context loss and explicit recovery. No invisible live simulation may continue behind failure UI.
- Test 80–150% UI scale, required landscape ratios, warning visibility at every preset, muted play and reduced effects. Observe at least five new players and intentional rival/boss understanding.

Exit evidence: [the original launch checklist](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/LAUNCH_ACCEPTANCE.md) QA-01 through QA-26 each has a traceable result; every launch inventory item is complete and reachable; remaining defects have explicit severity and resolution.

## F — Owner acceptance and publication

J Rhythm reviews the full journey, actual rendering, audio, controls, five districts/finales, modes, Workshop/rewards, ending and known limitations. Publish only after full launch acceptance and owner approval. Do not mark the game release-ready based only on the first district, generated art, compilation or automated tests.

## Architecture boundaries

The application shell owns semantic menus, focus, settings and legal state transitions. Input translates physical devices into shared actions. The simulation owns movement, entity state, collision, resources, score and encounter progression. The Three.js presentation reads authoritative state; it does not decide outcomes. Audio reacts to simulation/UI events. Typed content defines the complete inventory; validated persistence records state and deduplicates rewards. Tests distinguish pure simulation checks from rendered interaction tests and real hardware checks.

The [root README](../README.md) maps concrete files as implementation lands. This division is the architectural contract; it is not a claim that all final subsystems already exist.

## Checkpoint evidence and change control

For each meaningful checkpoint record: build/content version; date; requirement IDs; implemented/tested/owner-reviewed status; machine/OS; browser/version; controller/model/connection; mode/rules/seed; method; command/capture path; observed result; known limitations; reviewer. Keep source review, unit checks, browser playthroughs, visual review and physical tests distinct.

Never overwrite the supplied acceptance checklist to imply a pass. Add evidence here or in a linked implementation evidence file and update the matrix only as far as the evidence supports. Changes to names/balance may iterate with rationale; removal of required scope needs an explicit recorded decision identifying the affected requirement, player impact and purpose-preserving alternative.

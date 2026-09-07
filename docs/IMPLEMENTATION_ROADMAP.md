# Snake: Year 3039 — implementation roadmap

Active product authority: [full PRD v2.0](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/PRD.md), [full-game handoff](../Snake_Year_3039_Full_Game_Builder_Package_v2_0/docs/FULL_GAME_HANDOFF.md), and both approved reference images in that package. The supplied package and Word document remain source material; implementation documentation lives here.

The destination is the complete five-district game. Version 0.1 is the beginning of development and the first Neon Spire playable milestone, not a reduced release definition. The status of every launch system remains visible in [FEATURE_MATRIX.md](FEATURE_MATRIX.md). No milestone acceptance implies full release acceptance.

## Current checkpoint — 0.3.0 combat and interface update

The [latest owner revision](NEON_SPIRE_COMBAT_REFRESH.md) adds three lives and current-stage retries, required charged laser combat with Warden counterfire, a stable camera, dimensional arena dressing, all-color halos, ready-tactical feedback and GSAP menus. Earlier saves remain on their original rules. This is still Milestone B; D2–D5 and release acceptance remain required.

### Earlier 0.2 foundation

The owner-approved [Neon Spire expansion addendum](NEON_SPIRE_EXPANSION.md) extends milestone B before further city production. New attempts use a shared 36 × 26 layout; original saves retain 32 × 24 rules. Twelve campaign powers, reliable tactical supply, an optional forward blaster, clearer hybrid Warden combat, eight free glow colors, Practice Powerup Lab and Replay This Seed are implemented with simulation and targeted browser checks. Two fresh automated simulation runs clear the district; human and physical-controller playtesting remains open.

The September 6 owner follow-up adds actual powerup images, simple effect/use descriptions and a pictured Warden pad explanation in the Lab and paused guide. This presentation update leaves gameplay rules unchanged; new-player comprehension still needs observation.

The subsequent owner appearance/access revision makes the eight glows brighter, colors the head and body together, and promotes POWERUP LAB to a full-size title action. It supersedes the earlier fixed cyan head marker without changing rules or the full-game roadmap.

Current evidence and remaining requirements are maintained in [SESSION_HANDOFF.md](SESSION_HANDOFF.md) and [FEATURE_MATRIX.md](FEATURE_MATRIX.md). Milestone B acceptance remains open until an ordinary keyboard/physical Xbox clear, intentional Hunter body-block, representative performance and five-player comprehension review are recorded. Automated fixtures do not substitute for those observations.

After the expanded district passes playtesting, proceed through the remaining city, enemy variety, replay modes, earned Workshop/progression, learning/music/story, and release completeness in C–F below. Content identifiers and menu labels alone never establish implemented content.

## A — Visual and control foundation

- Establish a TypeScript content model for districts, waves, enemy archetypes, pickups, bosses, trials, cosmetics, rules profiles, records and snapshots. Pin dependency versions and validate referenced IDs.
- Separate simulation from rendering and React updates. Use fixed 60 Hz simulation, distance-sampled body paths, bounded steering, normalized input, release-gated boost and explicit state transitions.
- Build the production-direction armored cyan snake, readable dark grid, city depth, dimensional pickups, restrained magenta energy and sound identity alongside the movement foundation.
- Keep source-of-truth hitboxes independent of glow, tilt and presentation effects. Define collision ordering and safe spawn rules before expanding encounters.
- Use semantic HTML controls and a shared action vocabulary for keyboard/gamepad. Handle focus loss, neutral input on transitions and explicit recovery.

Exit evidence: movement/resource/collision tests, successful typecheck and build, captured real title/settings/gameplay, readable camera at supported aspect ratios, keyboard flow through start/pause/restart, and a clearly identified boundary between automated gamepad checks and hardware evidence.

## B — Representative playable experience

- Finish Neon Spire's expanded 36 × 26 arena (retain 32 × 24 legacy saves), three 12-core waves and environmental identity against the supplied references.
- Add finite Patrol/Hunter encounter schedules, visible mine/gate warnings, a demonstrable Hunter body-block, and all twelve addendum powers with staged introductions and repeating EMP/Decoy offers.
- Implement Warden’s three armor pieces, ordered spheres and visibly warned return fire. Three spheres unlock an unlimited boss laser; three hits break a piece. Preserve charged progress until the piece breaks and require no random consumable. Retain original pad/hybrid behavior only for earlier saved rules.
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
- Carry all twelve expanded powers into later district content with appropriate eligibility, limits, expiry, safe routes and readable counterplay. Weapons retain movement solutions for serpent encounters and routing objectives.
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

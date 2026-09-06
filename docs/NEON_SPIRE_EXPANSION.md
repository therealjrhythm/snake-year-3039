# Neon Spire expansion — approved implementation addendum

Approved by the owner on September 6, 2026. This supplements the untouched PRD v2.0 source package and changes its first-district teaching defaults, adds optional shooting and four pickups, adds free glow selection, and expands Neon Spire. It does not remove the remaining four districts, five total finales, fifteen waves/228 campaign cores, four release modes, twelve Trials, six earned liveries/trails, twelve achievements, full Workshop, ending, accessibility or reliability requirements.

## Next playable update

- New Neon Spire attempts use a shared versioned 36 × 26 layout. Existing saves retain their legacy 32 × 24 layout and rules; never rescale a saved head/body path. Keep 4.5/6.3 movement, bounded steering, twelve-core quotas, existing integrity, head-only attack damage and fatal solid/self/rival crashes.
- Keep the progression three collection waves → Warden finale → extraction. Wave 3 is labeled Hunter encounter. Separate relay charge from remaining armor nodes; highlight only the next valid relay and explain out-of-order contact. Show inactive/charged-waiting/ready pad states. Add relay 1/2/3, charge-ready, warning, recovery, discharge/node-break and defeat sounds, energy links, prominent Warden geometry and contextual paused help. Extraction replaces obsolete boss prompts.
- Optional Pulse Blaster: hold F/Xbox A, at most four shots per second, twelve-shot capacity/refill, forward aim assistance in a 60-degree total cone and ten-unit range with line of sight. Shots ignore the player, stop at scenery, destroy regular drones in two hits and cannot damage armored rivals. No new drone score. Implementation starting values: projectile speed eighteen units/s and six simultaneous player shots, separate from the existing hostile cap of eight.
- Hybrid Warden: three relays plus recovery expose one inner-edge receptor. Cross the pad for automatic discharge OR hit the receptor three times. Either consumes the relay bank and breaks one node once. Partial hit progress resets when the window closes; relay charge survives. Every boss remains completable without optional powers. No random boss pickups.
- Customize Snake: free Cyan, Electric Blue, Violet, Magenta, Mint, Teal, Gold, Pearl body glow. Retain cyan head identity and distinct hostile shapes. One existing renderer powers live preview with rotation/zoom, Apply/Cancel/Restore Cyan, keyboard/controller operation, title/pause entry and independent persistent appearance. Earned finishes/trails remain future progression work.
- Practice Powerup Lab: select/refill any of twelve powers in a suitable test encounter. Lab-only session points demonstrate Score Surge; they never become records or rewards and reset on refill. Ordinary Practice remains non-scoring. Replay This Seed creates a fresh attempt at the same seed.

## Twelve pickups

| ID | Effect | Campaign introduction |
| --- | --- | --- |
| overdrive | 8s half boost drain, same speed | Wave 1 |
| surge | 15s double eligible core/rival points | Wave 1 |
| magnet | 10s safe 2.5-unit ordinary-core attraction | Wave 1 after four cores |
| shield | One hostile hit or twelve seconds | Wave 2 |
| emp | One stored 4-unit/3s disruption charge | Wave 2, recurring |
| repair | Restore one missing integrity | Wave 2 onward when damaged |
| decoy | One stored four-second lure; future eligible targets | Wave 2 after six cores |
| splice | Retract up to four tail segments over 0.3s, minimum eight | Wave 3 |
| blaster | Refill weapon to twelve shots; held F/A fire | Wave 2 after eight cores |
| capacitor | Restore 35 boost, eligible below 65 after significant boost use | After first significant boost use |
| scrubber | Arm 8s; first hostile bullet within 2 units triggers one 3-unit hostile-shot purge | Wave 2 onward |
| chain-buffer | Arm 10s; extend one expired core-chain window by 3s; damage still resets chain | Wave 3 after reaching 2× combo |

Timed effects coexist and refresh, not stack. Ground pickups expire after fifteen active seconds, with at most three present. Full/unneeded pickups remain uncollected. Repair/Splice retain once-per-regular-wave spawn limits. Tactical slots each hold one charge and retain X/Space use, Y/E switch.

An eight-second opportunity cycle reserves EMP → Decoy → automatic bonus. Ineligible/loaded/already-grounded tactics substitute useful automatic bonuses. Retry failed scripted introductions and overdue tactics when safe/capacity allows; no duplicate charge on the ground and no forced unsafe placements. Required-core recovery always takes precedence. Each power needs distinct identity, sound, effect explanation, and real remaining time/ammunition.

## Engineering and verification

The fixed-step simulation owns all rules. A shared layout feeds simulation, spawning, renderer, camera, boss and exit. Typed events declare audible and intentionally silent outcomes; relay index is structured metadata. Player faction, fixed head identity and chosen glow are separate from color inference. New saves persist supply scheduling, ammo, projectiles, buffs and exact body state. Records distinguish content versions; legacy results remain visible.

Run the existing check/build and applicable browser scripts sequentially using isolated Chrome. Add meaningful supply/legacy/weapon/new-buff/boss/appearance/Lab tests. Inspect actual Low/Medium captures across supported landscape ratios and 80–150% UI scale. Preserve protective performance pauses and physical pixel budgets. Record browser fixtures, ordinary play, physical Xbox qualification, five-new-player comprehension and sustained hardware performance as distinct evidence; never invent physical or human acceptance.

## Remaining full-game sequence

After this expanded milestone is verified: complete D2 Chrome Bazaar/Switchblade Twins, D3 Reactor Foundry/Crucible Engine, D4 Ghost Circuit/Null Choir and D5 Crown Array/Custodian; complete Interceptor/Mine Layer/Ambush and district hazards; full campaign map/progression/ending; Arcade/Endless/twelve Trials; earned cosmetics/achievements/full Workshop; interactive calibration, district/ending music and remaining cues; complete settings/remapping/accessibility/save export/import/recovery; then full QA-01–26 and owner acceptance. No placeholder is implementation evidence.

## Delivery evidence

The 0.2.0 Neon Spire expansion is implemented. The [feature matrix](FEATURE_MATRIX.md#development-verification) and [session handoff](SESSION_HANDOFF.md#verification-ledger) record automated checks, rendered fixtures, fresh simulation runs and the remaining human/device acceptance gates. The original movement speeds, turn limits, critical crashes and quotas have not been tuned to accommodate test runs. Full-city production follows the milestone playtesting gate above.

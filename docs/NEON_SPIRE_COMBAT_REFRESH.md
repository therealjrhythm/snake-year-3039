# Neon Spire combat and interface revision

Owner requested September 6, 2026, using four title/briefing/settings screenshots and gameplay feedback. This addendum supersedes specified 0.2 rules for new **0.3.0-neon-spire** attempts. The supplied builder package remains untouched; all five districts, fifteen collection waves, five finales and the remaining release inventory still apply.

## Gameplay contract

- Three lives total, distinct from health. Critical wall/self/rival crashes still end the current life immediately. Hostile hits still cost one health unless protected. A lost life offers retry of the current collection wave or the Warden fight. After the third loss, only a new attempt starting at Wave 1 is available.
- Each stage has a serialized entry snapshot. Retry restores its score, ordinary-core counts, equipment, body length, RNG and encounter schedule. Later-wave and boss retries place that full-length snake on an authored rounded perimeter route with clear forward room; the live wave transition never teleports the player. This prevents a near-wall stage entry from trapping subsequent lives. Wave 1 and prepared Lab starts retain their own starting routes. Remaining lives, run identity, accumulated active time and damage taken persist. Failed-wave points cannot be farmed. The failed state is saved in Campaign, so reloading retains the spent life. Practice/Lab do not write campaign records.
- Warden: collect numbered spheres 1 → 2 → 3; armor opens immediately and the boss laser becomes available. Hold F / Xbox A and aim toward the glowing inner-edge target below Warden. Three hits break one armor piece and spend the charge once. Repeat for all three pieces and leave via north extraction. Charged progress persists until an armor break; there is no pad route under the new rules.
- The laser uses the existing bounded forward aim assistance and projectile collision system. It matches the selected snake color. Boss firing uses no campaign ammunition and requires all three spheres, preventing an ammunition softlock. Regular-wave blaster pickups retain twelve-shot capacity and existing target restrictions.
- Warden commits three orange warning trajectories before launching red shots. The warning and projectiles use the same locked origin and targets; solid scenery blocks them. Existing hostile-shot caps, damage protection, gate warnings and fixed-step timing remain.

## Presentation contract

- The camera reserves a stable HUD area from viewport and UI scale, rather than refitting when a pickup adds a HUD row. Real resize and settings changes still refit safely. Compact bonus cards keep names/timers visible; effects remain accessible and explained in the Lab/guide.
- The 36 × 26 arena gets layered supports, floor detailing, route markings, dimensional machinery and Warden architecture within established solid footprints. Decoration cannot introduce invisible collisions or alter movement.
- All eight snake colors have a colored halo independent of bloom brightness cutoff and quality tier, including blue/violet at Low. The selected color remains consistent across body, head and laser, with rival identity separate.
- EMP and Decoy slots show a colored glow and two slow acquisition pulses, then remain visibly ready until used. The selected slot has an additional outline. Reduced motion removes the pulses.
- Customize Snake is a primary title action; its tiny duplicate is removed. Powerup Lab remains on title and is removed from briefing. Practice without records becomes a full-size briefing action. Records/Credits remain readable secondary actions.
- Difficulty labels are Normal (three health), Easier (five health, 25% slower world, longer warnings), and Harder (three health, 15% faster enemy shots, shorter warnings). These map to the existing simulation profiles. All new profiles get three lives.
- Settings is centered. Interactive controls share a vibrant neon focus/hover/selection outline. Activation produces one brief confirmation pulse. GSAP animates menu entrances; both app and OS reduced-motion preferences suppress motion. Animation never advances or blocks gameplay rules.

## Compatibility and soundtrack

0.1 saves retain 32 × 24 single-attempt/pad rules; 0.2 saves retain 36 × 26 single-attempt/hybrid rules. New runs use 0.3. Existing saved paths are not moved. Earlier records remain visible in their original collections. The title explains that Start Game enables the new lives/laser rules.

The owner intends to supply six to ten songs. MP3 is suitable for browser delivery; WAV originals can be kept as source material and encoded for delivery. Three to four minutes per song is acceptable. Preferred delivery: stereo, consistent loudness, no accidental leading/trailing silence, descriptive filenames and a suggested menu/combat/boss mood. Seamless loops or clean endings are useful but optional. Tracks are not implemented until supplied; the procedural score continues meanwhile. See [MDN audio format guidance](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/Cross-browser_audio_basics).

## Verification

The completed implementation passes 85 tests, production compilation and all eleven sequential development browser scripts. Current logs/reports are linked from [SESSION_HANDOFF](SESSION_HANDOFF.md), [FEATURE_MATRIX](FEATURE_MATRIX.md) and the [verification ledger](evidence/combat-refresh-2026-09-06/verification.json). Required coverage includes current-wave/boss retries, three losses, no score farming, exact lost-life save/resume, older-save behavior, difficulty application, charged shots/counterfire, camera stability under pickup/HUD changes, all glows, responsive/controller menus, reduced motion and rendering budgets. Arranged fixtures and mocked controllers do not establish physical Xbox, subjective artistic acceptance, a human full clear or sustained hardware performance.

# Snake: Year 3039 — Full-Game Implementation Handoff

## Product authority
This is the full-game specification, not an MVP brief. `PRD.md` version 2.0 supersedes version 1.0. Read the entire PRD and inspect both images in `references/` before building. The first development milestone is not the intended release.

## Non-negotiable destination
Create an inspiring, fully playable single-player 3D cyberpunk browser game with keyboard and Xbox control throughout. Launch includes five distinct districts, fifteen campaign waves, five boss encounters, real rival-serpent combat, eight pickups, Campaign/Arcade Run/Endless/twelve Trials, six liveries, six trails, twelve achievements, Workshop, local records, save/suspend/export/import, settings, accessibility, music, sound and a complete ending. Do not demote these to future expansions.

The product is not a static picture, a menu mockup, a decorative snake, or one simple arena. No required menu item may be fake. No launch feature may be replaced with Coming Soon. This package describes the game; it contains no game implementation or production assets.

## Start with the complete architecture and an inspiring first presentable build
Create the typed content model, shared input actions, app/game state machine, fixed-step movement, body-path/collision system, and content/reward identifiers for the full game. Begin production-direction art and sound alongside those systems. Internal graybox tests are welcome; do not use them as a substitute for the first polished playable milestone.

The first presentable milestone must demonstrate a finished-looking snake and environment, responsive movement, polished HUD/title, music/sound, keyboard/Xbox flow, a real rival body-block, three Neon Spire waves, and the Warden finale. Treat this as the quality benchmark for every subsequent district, not permission to stop.

Then complete the other districts, finales, campaign ending, all modes, progression, Workshop, save/recovery, accessibility and compatibility work. Follow PRD chapter 30; keep unfinished launch requirements visible until complete.

## Art-direction guardrails
Use the exact included references. Keep the armored cyan snake, dark reflective grid, magenta/violet energy, dimensional pickups, hostile machinery and layered city. Raise the camera for playability and simplify HUD coverage. Do not copy the incidental Nexus Games mark or misleading reference labels. Actual performance and fidelity require a running-game review. Track the licensing and provenance of every new asset. Do not treat PNG references as 3D models or functional UI.

## Engineering guardrails
Separate simulation from rendering. Never let frame rate change travel, score or timers. Share input action logic across keyboard and gamepad. Physically test real controllers and label platform boundaries accurately. Use the defined collision matrix, explicit enemy/boss state machines, validated content, safe spawns, and versioned transactional saves. Do not introduce unexplained auto-difficulty, invincible rival geometry, hidden colliders, or random ability requirements for mandatory progress.

## Scope and change control
New content names, counts and balance values in version 2.0 are authored design defaults for iteration, not a claim of separate owner approval for every detail. Tune and improve them with evidence. Any proposed feature removal must identify the affected requirement, explain impact, present a purpose-preserving alternative, and receive an explicit scope decision. Do not silently substitute a simpler product.

## Evidence and reporting
Maintain a feature matrix mapping each PRD system and launch inventory item to implemented, tested, owner-reviewed, or incomplete. Record the actual build/content version, browser, machine, controller and seed with evidence. Distinguish unit tests, playthroughs, visual review and physical device tests.

At each checkpoint report what works, what was actually verified, screenshots/video of real gameplay, unresolved issues, and the remaining full-game requirements. Never mark an image as a gameplay capture, a mocked gamepad as hardware verification, or a successful build as complete acceptance.

Use `LAUNCH_ACCEPTANCE.md` for the release gate. Only label the game release-ready when every launch requirement is implemented and the complete experience has passed technical and owner review.

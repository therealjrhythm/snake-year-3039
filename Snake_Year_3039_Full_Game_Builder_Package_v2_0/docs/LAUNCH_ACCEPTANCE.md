# Full-game launch acceptance — version 2.0

All entries below start **NOT TESTED**. This file is a checklist, not evidence of a working game.

- [ ] **QA-01** Complete every screen, mode, settings tab, Workshop flow, pause, restart, and save/resume using keyboard only, then a physical Xbox gamepad only.
- [ ] **QA-02** Verify normalized diagonals, constant forward motion, bounded reverse turns, body spacing, no corner cutting, boost exhaustion, and 30/60/120 Hz render independence.
- [ ] **QA-03** Collect the authored quotas in all 15 campaign waves. Verify exact growth and the 228-core campaign total without Trial or boss-relay contamination.
- [ ] **QA-04** Exercise every collision-table row, equal-time event ordering, head-only hostile damage, neck exclusion, sustained contact, and swept collisions while boosting.
- [ ] **QA-05** Test all eight pickups, slot selection, refresh limits, useless-pickup behavior, Magnet safety, Tail Splice shrink, and pause-frozen timers.
- [ ] **QA-06** Verify EMP interruption and warned reactivation; Decoy affects future eligible target choice but not committed attacks or boss objectives.
- [ ] **QA-07** Record each regular enemy’s warning, attack, recovery, and disabled state. Validate finite wave actors, projectile caps, and Mine Layer capacity.
- [ ] **QA-08** Deliberately body-block Hunter and Ambush rivals; test their own-body/wall crashes, two-rival interaction, no teleport rescue, and single score attribution.
- [ ] **QA-09** Complete all five boss finales with each input type and without optional consumables. Test every node, missed window, phase, and no-soft-lock replacement rule.
- [ ] **QA-10** Test wave/boss transitions, campaign checkpoint restoration, active extraction, each district unlock, and the final ending/reward commit.
- [ ] **QA-11** Complete a full Arcade Run; confirm death is terminal, score sums correctly, and suspension does not grant retries or duplicate rewards.
- [ ] **QA-12** Run Endless through wave 10 and boss cycles; test quota formula, pressure caps, length stabilization at 80, and Tail Splice below cap.
- [ ] **QA-13** Verify Bronze/Silver/Gold and failure paths for all 12 Trials, including special supplied-charge rules and Trial record isolation.
- [ ] **QA-14** Unlock and equip all six liveries and six trails; verify all 12 achievements once only across retries, reloads, imports, and resumed attempts.
- [ ] **QA-15** Verify score formula, combo reset, fixed boss/extraction bonuses, difficulty separation, and no record/achievement progress from tutorial or Practice.
- [ ] **QA-16** Test valid/corrupt/version-mismatched snapshots, storage denial, export/import, interrupted save, checkpoint fallback, and no live simulation behind failure UI.
- [ ] **QA-17** Disconnect/reconnect controllers, change input device, blur/hide the tab, resize, deny fullscreen, block audio, and simulate graphics loss. Require safe explicit recovery.
- [ ] **QA-18** Run seeded spawn stress tests and inspect failures. No overlaps, inaccessible required objectives caused by new spawns, hidden colliders, or unavoidable synchronized attacks.

- [ ] QA-19: Capture title, settings, every district in active play, all five bosses, Workshop, and results at Medium; include Low comparisons. J Rhythm reviews against the two original references and the approved first polished district. No invented pixel-parity claim.

- [ ] QA-20: Measure the documented performance profiles on actual identified machines with representative and stress seeds. Separate cold loading, shader preparation, steady play, and transitions. Include frame-time data and a restart/resource-stability report.

- [ ] QA-21: Test remapping, dead zones, high contrast, 80–150% UI scale, reduced motion, flash reduction, assistance classification, muted play, and semantic menu/focus behavior.

- [ ] QA-22: Observe at least five new players without verbal coaching. Target four of five understanding steering, boost, crash versus attack, and tactical selection after calibration. Record confusion and unfair deaths. This small test improves usability; it does not validate market demand.

- [ ] QA-23: Observe players intentionally defeating rivals and explaining boss objectives. QA-24: Validate loading and recoverability on the published compatibility matrix. QA-25: Verify production-asset provenance, credits, and no missing/fake controls. QA-26: Confirm every launch-inventory item is complete and reachable.

## Completion inventory

- [ ] Five distinct finished districts, all fifteen campaign waves, and all five finales.
- [ ] Complete campaign story and ending; no missing progression path.
- [ ] Five regular enemy archetypes including functional Hunter and Ambush serpents.
- [ ] All eight pickups, both tactical slots, and their complete UI/tutorial behavior.
- [ ] Campaign, Arcade Run, Endless, and all twelve Trials with validated medal conditions.
- [ ] Six liveries, six trails, twelve achievements, working Workshop and Records.
- [ ] Settings, remapping, accessibility, save/suspend/export/import and all error/recovery states.
- [ ] Finished assets/audio with provenance; both references reviewed against actual running play.
- [ ] Published hardware/browser/controller matrix supported by real tests.
- [ ] No required stubs, fake buttons, invisible damage, or release-blocking progress loss.
- [ ] Owner acceptance of the full game, not only the first polished district.

## Evidence record template

Build/content version:  
Date:  
Requirement ID:  
Status: NOT TESTED / FAIL / PASS / OWNER REVIEWED  
Machine and OS:  
Browser/version:  
Controller/model/connection:  
Mode/profile/seed:  
Test method:  
Evidence path:  
Observed result:  
Known limitation:  
Reviewer:

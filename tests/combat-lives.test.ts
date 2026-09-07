import { describe, expect, it } from 'vitest';
import { CONTENT_VERSION, EXPANDED_CONTENT_VERSION, FIXED_DT, LEGACY_CONTENT_VERSION, MOVEMENT, RULES } from '../src/game/content';
import { getLayout } from '../src/game/layouts';
import { recordVersionLabel } from '../src/game/persistence';
import { Simulation } from '../src/game/simulation';
import type { Difficulty, GameInput, SimulationState } from '../src/game/types';

const input: GameInput = { x: 0, y: 0, boost: false, use: false, swap: false, fire: false };
function place(sim: Simulation, x = 0, z = 3, heading = 0) {
  Object.assign(sim.state.player, { x, z, heading, length: 8,
    body: Array.from({ length: 8 }, (_, i) => ({ x: x - Math.cos(heading) * (i + 1) * 0.55, z: z - Math.sin(heading) * (i + 1) * 0.55 })),
    path: Array.from({ length: 510 }, (_, i) => ({ x: x - Math.cos(heading) * i * 0.15, z: z - Math.sin(heading) * i * 0.15 })),
  });
}
function quiet(contentVersion = CONTENT_VERSION): Simulation {
  const sim = new Simulation({ seed: 43, contentVersion });
  Object.assign(sim.state, { obstacles: [], cores: [], pickups: [], mines: [], drones: [], rivals: [], gates: [], projectiles: [], pendingSpawns: [], optionalTimer: 9999, coreRetry: 9999 });
  place(sim); return sim;
}
function crash(sim: Simulation) {
  place(sim, getLayout(sim.state).halfWidth - 0.34, 3);
  sim.step(FIXED_DT, input);
  expect(sim.state.status).toBe('dead');
}
function bossScene(): Simulation {
  const sim = quiet();
  sim.state.wave = 3; sim.state.status = 'boss-intro'; sim.beginBoss();
  sim.state.gates = []; sim.state.pendingSpawns = []; sim.state.boss!.relays = [];
  return sim;
}
function hits(sim: Simulation, count: number) {
  sim.state.playerProjectiles = Array.from({ length: count }, (_, i) => ({ id: `hit-${sim.state.nextId++}-${i}`, ...sim.state.boss!.receptor, vx: 0, vz: -18, ttl: 0.5, range: 10 }));
  sim.step(FIXED_DT, input);
}

describe('three lives and wave entry snapshots', () => {
  it('provides three total lives in every new profile and leaves both previous rule versions at one attempt', () => {
    for (const difficulty of ['standard', 'assisted', 'expert'] as Difficulty[]) {
      const sim = new Simulation({ difficulty });
      expect(sim.state.lives).toBe(3);
      expect(sim.state.player.maxIntegrity).toBe(RULES[difficulty].integrity);
    }
    for (const contentVersion of [LEGACY_CONTENT_VERSION, EXPANDED_CONTENT_VERSION]) {
      const sim = quiet(contentVersion); expect(sim.state.lives).toBe(1);
      crash(sim); expect(sim.state.lives).toBe(0); expect(sim.canRetry).toBe(false); expect(sim.retryCurrentWave()).toBe(false);
    }
  });

  it('rolls wave score/resources and RNG back without restoring lives or duplicating a run identity', () => {
    const sim = quiet();
    Object.assign(sim.state, { status: 'transition', transitionTime: FIXED_DT, score: 1200, totalCores: 12, wave: 1 });
    sim.state.weapon.ammo = 7; sim.state.slots = [true, false]; sim.state.buffs.magnet = 5;
    sim.step(FIXED_DT, input); // The actual transition enters wave 2 and captures its entry.
    const entry = structuredClone(sim.state.retryCheckpoint!);
    expect(entry.wave).toBe(2); expect(entry.coresCollected).toBe(0);
    sim.state.cores = [{ id: 'earned-this-life', x: sim.state.player.x, z: sim.state.player.z }];
    sim.step(FIXED_DT, input);
    expect(sim.state.score).toBeGreaterThan(entry.score);
    sim.state.slots[0] = false; sim.state.weapon.ammo = 1; sim.state.damageTaken = 2;
    crash(sim);
    const elapsed = sim.state.time;
    expect(sim.state.lives).toBe(2); expect(sim.canRetry).toBe(true);
    expect(sim.retryCurrentWave()).toBe(true);
    for (const key of ['runId', 'wave', 'score', 'totalCores', 'coresCollected', 'rivalKills', 'empInterrupts', 'maxCombo', 'rng', 'nextId', 'player', 'weapon', 'slots', 'buffs', 'supply', 'cores', 'pickups', 'pendingSpawns', 'processedEvents'] as const) expect(sim.state[key], key).toEqual(entry[key]);
    expect(sim.state.time).toBe(elapsed); expect(sim.state.damageTaken).toBe(2); expect(sim.state.lives).toBe(2);
    expect(sim.retryCurrentWave()).toBe(false); // A running life cannot be refilled.
    sim.state.cores = [{ id: 'earned-on-retry', x: sim.state.player.x, z: sim.state.player.z }];
    sim.step(FIXED_DT, input);
    expect(sim.state.score).toBe(entry.score + 100);
  });

  it('consumes one life per fatal step and becomes terminal after exactly three deaths', () => {
    const sim = quiet(); const id = sim.state.runId;
    for (const remaining of [2, 1, 0]) {
      crash(sim);
      for (let i = 0; i < 120; i++) sim.step(FIXED_DT, input);
      expect(sim.state.lives).toBe(remaining); expect(sim.state.runId).toBe(id);
      expect(sim.canRetry).toBe(remaining > 0);
      expect(sim.retryCurrentWave()).toBe(remaining > 0);
    }
    expect(sim.state.status).toBe('dead');
    const replay = new Simulation({ seed: sim.state.seed });
    expect(replay.state.wave).toBe(1); expect(replay.state.lives).toBe(3); expect(replay.state.runId).not.toBe(id);
  });

  it('keeps exact retry entitlement, wave entry, supplies and weapon state through save/resume, including a dead life menu', () => {
    const sim = quiet();
    Object.assign(sim.state, { status: 'transition', transitionTime: FIXED_DT, wave: 1, totalCores: 12, score: 1800 });
    sim.step(FIXED_DT, input); crash(sim);
    const saved = sim.snapshot();
    const resumed = Simulation.restore(saved);
    expect(resumed.canRetry).toBe(true); expect(resumed.state.lives).toBe(2);
    expect(resumed.state.retryCheckpoint).toEqual(saved.retryCheckpoint);
    resumed.step(1 / 60, { ...input, fire: true });
    expect(resumed.state.status).toBe('dead'); expect(resumed.state.time).toBe(saved.time);
    expect(sim.retryCurrentWave()).toBe(true); expect(resumed.retryCurrentWave()).toBe(true);
    expect(resumed.snapshot()).toEqual(sim.snapshot());
    for (let i = 0; i < 20; i++) { sim.step(FIXED_DT, input); resumed.step(FIXED_DT, input); }
    expect(resumed.snapshot()).toEqual(sim.snapshot());
  });

  it('restarts the Warden encounter, including armor and supplies, rather than returning to the collection wave', () => {
    const sim = bossScene(); const entry = sim.state.retryCheckpoint!;
    sim.state.boss!.charge = 3; hits(sim, 3); expect(sim.state.boss!.nodes).toBe(2);
    crash(sim); expect(sim.retryCurrentWave()).toBe(true);
    expect(sim.state.status).toBe('boss'); expect(sim.state.wave).toBe(3); expect(sim.state.boss).toEqual(entry.boss);
    expect(sim.state.player).toEqual(entry.player); expect(sim.state.lives).toBe(2);
  });

  it('escapes a checkpoint captured just before a wall crash without teleporting the active wave', () => {
    const sim = new Simulation();
    place(sim, 17.55, 3);
    Object.assign(sim.state, { status: 'transition', transitionTime: FIXED_DT, score: 1200, totalCores: 12 });
    sim.state.weapon.ammo = 7; sim.state.slots = [true, true];
    sim.step(FIXED_DT, input);
    expect(sim.state.wave).toBe(2); expect(sim.state.status).toBe('playing');
    expect(sim.state.player.x).toBeCloseTo(17.55 + MOVEMENT.baseSpeed * FIXED_DT);
    expect(sim.state.player.z).toBe(3); // Entering the wave did not move the live snake to its retry lane.
    const checkpoint = structuredClone(sim.state.retryCheckpoint!);
    expect(checkpoint.player.x).toBe(0); expect(checkpoint.player.z).toBe(getLayout(sim.state).halfDepth - 3);
    expect(checkpoint.weapon.ammo).toBe(7); expect(checkpoint.slots).toEqual([true, true]);
    sim.step(FIXED_DT, input); // No arranged death: the next ordinary step hits the wall.
    expect(sim.state.status).toBe('dead'); expect(sim.state.lives).toBe(2);
    const resumed = Simulation.restore(sim.snapshot());
    expect(resumed.retryCurrentWave()).toBe(true);
    expect(resumed.state.player).toEqual(checkpoint.player);
    for (let step = 0; step < 120; step++) resumed.step(FIXED_DT, input);
    expect(resumed.state.status).toBe('playing'); expect(resumed.state.lives).toBe(2);
    expect(resumed.state.player.x).toBeCloseTo(9);
  });

  it('fits complete retry tails around clear rounded perimeter lanes and permits two seconds of ordinary or boosted travel', () => {
    for (const length of [20, 32, 44, 128]) for (const boost of [false, true]) {
      const sim = new Simulation();
      place(sim); sim.state.player.length = length;
      Object.assign(sim.state, { status: 'transition', transitionTime: FIXED_DT, score: 1200, totalCores: 12 });
      sim.step(FIXED_DT, input);
      const entry = sim.state.retryCheckpoint!;
      expect(entry.player.length).toBe(length); expect(entry.player.body).toHaveLength(length);
      const layout = getLayout(sim.state);
      for (const point of [...entry.player.path, ...entry.player.body]) {
        expect(Math.abs(point.x) + MOVEMENT.bodyRadius).toBeLessThan(layout.halfWidth);
        expect(Math.abs(point.z) + MOVEMENT.bodyRadius).toBeLessThan(layout.halfDepth);
        for (const obstacle of layout.obstacles) {
          const dx = Math.max(0, Math.abs(point.x - obstacle.x) - obstacle.width / 2);
          const dz = Math.max(0, Math.abs(point.z - obstacle.z) - obstacle.depth / 2);
          expect(Math.hypot(dx, dz)).toBeGreaterThan(MOVEMENT.bodyRadius);
        }
      }
      for (let i = 0; i < entry.player.body.length; i++) for (let j = i + 2; j < entry.player.body.length; j++) {
        const a = entry.player.body[i]; const b = entry.player.body[j];
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(MOVEMENT.bodyRadius * 2);
      }
      crash(sim); expect(sim.retryCurrentWave()).toBe(true);
      for (let step = 0; step < 120; step++) sim.step(FIXED_DT, { ...input, boost });
      expect(sim.state.status).toBe('playing'); expect(sim.state.lives).toBe(2);
      expect(sim.state.player.x).toBeCloseTo((boost ? MOVEMENT.boostSpeed : MOVEMENT.baseSpeed) * 2);
      expect(sim.state.player.length).toBe(length);
    }
  });

  it('preserves prepared Wave 1 and Lab entry paths while boss retries use the safe route and preserve an active splice', () => {
    const wave1 = new Simulation();
    expect(wave1.state.retryCheckpoint!.player).toEqual(wave1.state.player);
    for (const kind of ['warden', 'splice'] as const) {
      const lab = Simulation.createLab(kind);
      expect(lab.state.retryCheckpoint!.player).toEqual(lab.state.player);
    }
    const boss = quiet(); boss.state.wave = 3; boss.state.status = 'boss-intro';
    boss.state.player.length = 44;
    boss.state.player.splice = { from: 44, to: 40, remaining: 0.15 };
    const livePlayer = structuredClone(boss.state.player);
    boss.beginBoss();
    const saved = boss.state.retryCheckpoint!;
    expect(boss.state.player).toEqual(livePlayer);
    expect(saved.player.length).toBe(44); expect(saved.player.body).toHaveLength(42);
    expect(saved.player.splice).toEqual(livePlayer.splice);
    crash(boss); expect(boss.retryCurrentWave()).toBe(true);
    for (let step = 0; step < 120; step++) boss.step(FIXED_DT, { ...input, boost: true });
    expect(boss.state.status).toBe('boss'); expect(boss.state.player.length).toBe(40);
    expect(boss.state.player.splice).toBeNull(); expect(boss.state.lives).toBe(2);
  });

  it('rejects invalid or recursively nested retry snapshots and retains prior-version saves and labels', () => {
    const sim = new Simulation();
    for (const changes of [{ lives: 4 }, { lives: -1 }, { retryCheckpoint: null }, { retryCheckpoint: { ...sim.state.retryCheckpoint, runId: 'different-run' } }, { retryCheckpoint: { ...sim.state.retryCheckpoint, retryCheckpoint: sim.state.retryCheckpoint } }]) expect(() => Simulation.restore({ ...sim.snapshot(), ...changes })).toThrow();
    for (const version of [LEGACY_CONTENT_VERSION, EXPANDED_CONTENT_VERSION]) {
      const previous = new Simulation({ contentVersion: version });
      const raw = previous.snapshot() as Partial<SimulationState>;
      delete raw.lives; delete raw.retryCheckpoint;
      const restored = Simulation.restore(raw);
      expect(restored.state.contentVersion).toBe(version); expect(restored.state.lives).toBe(1); expect(restored.state.retryCheckpoint).toBeNull();
      expect(restored.state.player).toEqual(previous.state.player);
    }
    expect(recordVersionLabel({ contentVersion: CONTENT_VERSION } as Parameters<typeof recordVersionLabel>[0])).toContain('0.3');
    expect(recordVersionLabel({ contentVersion: EXPANDED_CONTENT_VERSION } as Parameters<typeof recordVersionLabel>[0])).toContain('0.2');
    expect(recordVersionLabel({ contentVersion: LEGACY_CONTENT_VERSION } as Parameters<typeof recordVersionLabel>[0])).toContain('0.1');
  });
});

describe('relay-powered Warden laser and counterfire', () => {
  it('requires ordered spheres, exposes immediately, and cannot discharge by crossing the old pad', () => {
    const sim = bossScene(); const boss = sim.state.boss!;
    place(sim, 0, 3);
    boss.relays = [{ id: 'out-of-order', x: 0, z: 3, number: 2 }]; sim.step(FIXED_DT, input);
    expect(boss.charge).toBe(0);
    for (const number of [1, 2, 3]) {
      place(sim, 0, 3); boss.relays = [{ id: `sphere-${number}`, x: 0, z: 3, number }]; sim.step(FIXED_DT, input);
    }
    expect(boss.stage).toBe('exposed'); expect(boss.phase).toBe('safe'); expect(boss.nodes).toBe(3);
    expect(sim.state.events.filter(event => event.kind === 'relay').map(event => event.relay)).toEqual([1, 2, 3]);
    place(sim, boss.pad.x, boss.pad.z); boss.phase = 'recovery'; sim.step(FIXED_DT, input);
    expect(boss.nodes).toBe(3); expect(boss.charge).toBe(3);
  });

  it('fires no laser before charge, then fires real unlimited boss shots without consuming carried ammo', () => {
    const sim = bossScene(); const s = sim.state;
    place(sim, 0, -6, -Math.PI / 2); s.weapon.ammo = 0;
    sim.step(FIXED_DT, { ...input, fire: true }); expect(s.playerProjectiles).toHaveLength(0);
    s.boss!.charge = 3;
    for (let i = 0; i < 45; i++) sim.step(FIXED_DT, { ...input, fire: true });
    expect(s.boss!.nodes).toBe(2); expect(s.boss!.charge).toBe(0); expect(s.weapon.ammo).toBe(0);
    expect(s.events.filter(event => event.kind === 'receptor-hit').map(event => event.amount)).toEqual([1, 2, 3]);
    expect(s.events.filter(event => event.kind === 'boss-node')).toHaveLength(1);
    place(sim, 0, -6, -Math.PI / 2); s.boss!.charge = 3; s.weapon.cooldown = 0;
    for (let i = 0; i < 45; i++) sim.step(FIXED_DT, { ...input, fire: true });
    expect(s.boss!.nodes).toBe(1); expect(s.weapon.ammo).toBe(0);
  });

  it('preserves charge and partial hits through phase changes and consumes each three-shot armor break once', () => {
    const sim = bossScene(); const boss = sim.state.boss!; boss.charge = 3;
    hits(sim, 2); expect(boss.receptorHits).toBe(2);
    boss.phase = 'recovery'; boss.phaseTime = 0.001; sim.step(FIXED_DT, input);
    expect(boss.stage).toBe('exposed'); expect(boss.receptorHits).toBe(2); expect(boss.charge).toBe(3);
    hits(sim, 4);
    expect(boss.nodes).toBe(2); expect(boss.charge).toBe(0); expect(boss.receptorHits).toBe(0);
    expect(sim.state.events.filter(event => event.kind === 'boss-node')).toHaveLength(1);
  });

  it('warns exact committed counterfire rays before any shots, preserves the lock after moving and through resume', () => {
    const sim = bossScene(); const boss = sim.state.boss!;
    boss.phaseTime = FIXED_DT; sim.step(FIXED_DT, input);
    const volley = structuredClone(boss.volley!);
    expect(boss.phase).toBe('warning'); expect(volley.remaining).toBeCloseTo(1.2); expect(volley.targets).toHaveLength(3); expect(sim.state.projectiles).toHaveLength(0);
    place(sim, 5, 3); sim.step(FIXED_DT, input);
    expect(boss.volley!.targets).toEqual(volley.targets);
    const restored = Simulation.restore(sim.snapshot());
    for (let i = 0; i < 72; i++) { sim.step(FIXED_DT, input); restored.step(FIXED_DT, input); }
    expect(sim.state.projectiles).toHaveLength(3); expect(boss.volley).toBeNull(); expect(restored.snapshot()).toEqual(sim.snapshot());
    for (const [index, shot] of sim.state.projectiles.entries()) {
      const target = volley.targets[index];
      expect(shot.id).toContain('warden-shot-');
      expect(Math.atan2(shot.vz, shot.vx)).toBeCloseTo(Math.atan2(target.z - volley.origin.z, target.x - volley.origin.x));
    }
  });

  it('uses the ordinary swept hostile collision, shield and scenery rules for Warden shots', () => {
    const sim = bossScene(); place(sim, 0, -9, 0);
    sim.state.boss!.phaseTime = FIXED_DT; sim.step(FIXED_DT, input);
    // Keep the head on a warned ray for this explicit collision fixture.
    for (let i = 0; i < 100; i++) { place(sim, 0, -9, 0); sim.step(FIXED_DT, input); }
    expect(sim.state.player.integrity).toBe(2); expect(sim.state.damageTaken).toBe(1);
    expect(sim.state.events.some(event => event.kind === 'damage' && event.text.includes('Warden projectile'))).toBe(true);
    const shield = bossScene(); place(shield); shield.state.buffs.shield = 12;
    shield.state.projectiles = [{ id: 'warden-shot-shield', x: 0, z: 3, vx: 0, vz: 4.8, ttl: 7 }]; shield.step(FIXED_DT, input);
    expect(shield.state.player.integrity).toBe(3); expect(shield.state.buffs.shield).toBe(0);
    const wall = bossScene(); place(wall, 8, 4);
    wall.state.obstacles = [{ x: 0, z: -10.8, width: 1, depth: 0.3 }];
    wall.state.projectiles = [{ id: 'warden-shot-solid', x: 0, z: -11, vx: 0, vz: 4.8, ttl: 7 }]; wall.step(FIXED_DT, input);
    expect(wall.state.projectiles).toHaveLength(0);
  });

  it('clears counterfire, warnings and attack objectives on the third break and awards the boss once', () => {
    const sim = bossScene();
    for (let node = 3; node > 0; node--) { sim.state.boss!.charge = 3; hits(sim, 3); expect(sim.state.boss!.nodes).toBe(node - 1); }
    expect(sim.state.status).toBe('extraction'); expect(sim.state.score).toBe(2500);
    expect(sim.state.projectiles).toHaveLength(0); expect(sim.state.gates).toHaveLength(0); expect(sim.state.boss!.volley).toBeNull();
    sim.step(FIXED_DT, input); expect(sim.state.score).toBe(2500);
    const practice = Simulation.createLab('warden');
    expect(practice.state.mode).toBe('practice'); expect(practice.state.retryCheckpoint!.lab).toBe('warden');
  });
});

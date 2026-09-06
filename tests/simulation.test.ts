import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, DISTRICTS, FIXED_DT, LIVERIES, TRAILS, TRIALS, validateContent } from '../src/game/content';
import { Simulation } from '../src/game/simulation';
import type { GameInput, Rival, SimulationState, Vec2 } from '../src/game/types';

const NEUTRAL: GameInput = { x: 0, y: 0, boost: false, use: false, swap: false };
const input = (partial: Partial<GameInput>): GameInput => ({ ...NEUTRAL, ...partial });
const run = (simulation: Simulation, seconds: number, controls = NEUTRAL) => {
  for (let frame = 0; frame < Math.round(seconds * 60); frame++) simulation.step(FIXED_DT, controls);
};

function place(simulation: Simulation, x = 0, z = 0, heading = 0, length = 8): void {
  const p = simulation.state.player;
  p.x = x; p.z = z; p.heading = heading; p.length = length; p.lastTurn = 1;
  p.path = Array.from({ length: 520 }, (_, i) => ({ x: x - Math.cos(heading) * i * 0.15, z: z - Math.sin(heading) * i * 0.15 }));
  p.body = Array.from({ length }, (_, i) => ({ x: x - Math.cos(heading) * (i + 1) * 0.55, z: z - Math.sin(heading) * (i + 1) * 0.55 }));
}

// Preserve the original 0.1 rules regression suite; expanded runs have their own suite.
function quiet(simulation = new Simulation({ seed: 3039, layoutId: 'neon-spire-v1' })): Simulation {
  const s = simulation.state;
  s.obstacles = []; s.cores = []; s.pickups = []; s.mines = []; s.drones = []; s.rivals = []; s.projectiles = []; s.gates = [];
  s.pendingSpawns = []; s.optionalTimer = 99999; s.coreRetry = 99999;
  place(simulation);
  return simulation;
}

function addCore(simulation: Simulation, suffix = 'test', point: Vec2 = simulation.state.player): void {
  simulation.state.cores.push({ id: `core-${suffix}`, x: point.x, z: point.z });
}

function makeRival(x: number, z: number, heading: number): Rival {
  return {
    id: 'test-hunter', x, z, heading, length: 12, lastTurn: 1,
    body: Array.from({ length: 12 }, (_, i) => ({ x: x - Math.cos(heading) * (i + 1) * 0.55, z: z - Math.sin(heading) * (i + 1) * 0.55 })),
    path: Array.from({ length: 510 }, (_, i) => ({ x: x - Math.cos(heading) * i * 0.15, z: z - Math.sin(heading) * i * 0.15 })),
    state: 'hunting', warning: 0, desiredHeading: heading, planning: 10, speed: 4.2,
  };
}

describe('full-release content contract', () => {
  it('retains all fifteen quotas and every declared launch content identifier', () => {
    expect(validateContent()).toEqual([]);
    expect(DISTRICTS.flatMap(d => d.waves).map(w => w.quota)).toEqual([12, 12, 12, 12, 14, 16, 14, 16, 18, 14, 16, 18, 16, 18, 20]);
    expect(DISTRICTS.flatMap(d => d.waves).reduce((sum, wave) => sum + wave.quota, 0)).toBe(228);
    expect([TRIALS.length, LIVERIES.length, TRAILS.length, ACHIEVEMENTS.length]).toEqual([12, 6, 6, 12]);
    expect(DISTRICTS.filter(d => d.implementation === 'representative').map(d => d.id)).toEqual(['D1']);
  });
});

describe('fixed-step steering and distance-based body', () => {
  it('continues at 4.5 units/s with neutral controls and exact body spacing', () => {
    const sim = quiet(); run(sim, 1);
    expect(sim.state.player.x).toBeCloseTo(4.5, 6);
    expect(sim.state.player.z).toBeCloseTo(0, 6);
    for (let i = 0; i < 8; i++) expect(sim.state.player.body[i].x).toBeCloseTo(4.5 - (i + 1) * 0.55, 6);
  });

  it('normalizes desired directions instead of granting diagonal or analog speed changes', () => {
    const full = quiet(); const small = quiet();
    place(full, 0, 0, Math.PI / 4); place(small, 0, 0, Math.PI / 4);
    run(full, 1, input({ x: 1, y: 1 })); run(small, 1, input({ x: 0.2, y: 0.2 }));
    expect(full.state.player.x).toBeCloseTo(small.state.player.x, 7);
    expect(Math.hypot(full.state.player.x, full.state.player.z)).toBeCloseTo(4.5, 7);
  });

  it('never snaps through an exact reversal and keeps the last turn direction', () => {
    const sim = quiet(); sim.state.player.lastTurn = -1;
    sim.step(FIXED_DT, input({ x: -1 }));
    expect(sim.state.player.heading).toBeCloseTo(-Math.PI * 4 / 3 / 60, 8);
    expect(sim.state.status).toBe('playing');
  });

  it('uses the same integration at 30, 60 and 120 render callbacks per second', () => {
    const results = [30, 60, 120].map(rate => {
      const sim = quiet();
      for (let frame = 0; frame < rate; frame++) sim.step(1 / rate, input({ x: 0, y: -1 }));
      return sim.state;
    });
    for (const state of results.slice(1)) {
      expect(state.player).toEqual(results[0].player);
      expect(state.time).toBe(results[0].time);
    }
  });

  it('samples the actual curved head path instead of cutting body corners', () => {
    const sim = quiet(); run(sim, 0.5); run(sim, 0.5, input({ x: 0, y: -1 }));
    const path = sim.state.player.path;
    for (const body of sim.state.player.body) {
      const nearest = Math.min(...path.map(point => Math.hypot(point.x - body.x, point.z - body.z)));
      expect(nearest).toBeLessThan(0.076);
    }
    expect(sim.state.player.body[6].z).toBeCloseTo(0, 4);
  });

  it('scales the whole Assisted simulation clock, including travel and timers', () => {
    const sim = quiet(new Simulation({ difficulty: 'assisted' })); sim.state.buffs.shield = 12;
    run(sim, 1);
    expect(sim.state.time).toBeCloseTo(0.75, 6);
    expect(sim.state.player.x).toBeCloseTo(3.375, 6);
    expect(sim.state.buffs.shield).toBeCloseTo(11.25, 6);
    expect(sim.state.player.maxIntegrity).toBe(5);
  });

  it('requests explicit recovery instead of fast-forwarding after a long frame', () => {
    const sim = quiet(); sim.step(0.3);
    expect(sim.state.pauseRequested).toContain('Performance pause');
    expect(sim.state.time).toBe(0);
    sim.resume(); sim.step(FIXED_DT);
    expect(sim.state.time).toBeCloseTo(FIXED_DT);
  });
});

describe('boost, damage and pickup semantics', () => {
  it('boosts at 6.3 and Overdrive halves drain without changing top speed', () => {
    const normal = quiet(); const overdrive = quiet(); overdrive.state.buffs.overdrive = 8;
    run(normal, 1, input({ boost: true })); run(overdrive, 1, input({ boost: true }));
    expect(normal.state.player.x).toBeCloseTo(6.3, 6);
    expect(overdrive.state.player.x).toBeCloseTo(6.3, 6);
    expect(normal.state.player.boost).toBeCloseTo(75, 6);
    expect(overdrive.state.player.boost).toBeCloseTo(87.5, 6);
  });

  it('requires a release after exhaustion even if some reservoir has recovered', () => {
    const sim = quiet(); sim.state.player.boost = 0.1;
    run(sim, 1, input({ boost: true }));
    expect(sim.state.player.boostLocked).toBe(true);
    expect(sim.state.player.boosting).toBe(false);
    expect(sim.state.player.boost).toBeGreaterThan(0);
    sim.step(FIXED_DT, NEUTRAL); sim.step(FIXED_DT, input({ boost: true }));
    expect(sim.state.player.boostLocked).toBe(false);
    expect(sim.state.player.boosting).toBe(true);
  });

  it('Shield absorbs an attack and grants protection without resetting combo', () => {
    const sim = quiet(); const s = sim.state;
    s.buffs.shield = 12; s.chain = 5; s.combo = 3; s.comboTimer = 4;
    s.mines.push({ id: 'hit', x: 0.1, z: 0, armed: true, armTime: 0 });
    sim.step(FIXED_DT);
    expect(s.player.integrity).toBe(3); expect(s.buffs.shield).toBe(0); expect(s.combo).toBe(3);
    expect(s.player.protection).toBeCloseTo(1.25); expect(s.mines).toHaveLength(0);
  });

  it('tests attacks only against the head, allowing the body through armed hazards', () => {
    const sim = quiet(); sim.state.mines.push({ id: 'body-mine', x: -2, z: 0, armed: true, armTime: 0 });
    sim.state.projectiles.push({ id: 'body-shot', x: -3, z: 0, vx: 0, vz: 1, ttl: 5 });
    sim.step(FIXED_DT);
    expect(sim.state.player.integrity).toBe(3);
    expect(sim.state.mines).toHaveLength(1); expect(sim.state.projectiles).toHaveLength(1);
  });

  it('a Patrol fires a committed shot that removes one integrity when it reaches the head', () => {
    const sim = quiet(); const s = sim.state;
    s.drones.push({ id: 'firing-patrol', x: 3, z: 0, state: 'prepare', target: { x: 0, z: 0 }, disabled: 0, timer: 0.005, cooldown: 0, anchor: { x: 3, z: 0 }, phase: 0 });
    run(sim, 0.4);
    expect(s.status).toBe('playing'); expect(s.player.integrity).toBe(2); expect(s.damageTaken).toBe(1);
    expect(s.projectiles).toHaveLength(0); expect(s.player.protection).toBeGreaterThan(1);
    expect(s.events.some(event => event.kind === 'shot')).toBe(true);
    expect(s.events.some(event => event.kind === 'damage' && event.text.includes('patrol projectile'))).toBe(true);
  });

  it('Shield never prevents a solid crash and equal-time pickups do not undo it', () => {
    const sim = quiet(); const s = sim.state;
    s.buffs.shield = 12; s.obstacles.push({ x: 0.3, z: 0, width: 0.3, depth: 2 });
    addCore(sim); sim.step(FIXED_DT);
    expect(s.status).toBe('dead'); expect(s.deathCause).toContain('closed machinery');
    expect(s.totalCores).toBe(0); expect(s.buffs.shield).toBeGreaterThan(0);
  });

  it('resolves a shield reached earlier in the swept step before a later projectile', () => {
    const sim = quiet(); sim.state.player.boost = 100;
    sim.state.pickups.push({ id: 'early-shield', x: 0.01, z: 0, kind: 'shield', ttl: 15 });
    sim.state.projectiles.push({ id: 'late-shot', x: 0.53, z: 0, vx: -1, vz: 0, ttl: 3 });
    sim.step(FIXED_DT, input({ boost: true }));
    expect(sim.state.player.integrity).toBe(3); expect(sim.state.buffs.shield).toBe(0);
  });

  it('applies equal-time hostile damage before the pickup benefit', () => {
    const sim = quiet(); sim.state.pickups.push({ id: 'shield', x: 0, z: 0, kind: 'shield', ttl: 15 });
    sim.state.mines.push({ id: 'mine', x: 0, z: 0, armed: true, armTime: 0 });
    sim.step(FIXED_DT);
    expect(sim.state.player.integrity).toBe(2); expect(sim.state.buffs.shield).toBe(12);
  });

  it('keeps useless Repair, minimum Splice and full-slot pickups on the ground', () => {
    const sim = quiet(); sim.state.slots[0] = true;
    sim.state.pickups = ['repair', 'splice', 'emp'].map((kind, i) => ({ id: `useless-${i}`, x: 0, z: 0, kind: kind as 'repair' | 'splice' | 'emp', ttl: 15 }));
    sim.step(FIXED_DT); expect(sim.state.pickups).toHaveLength(3);
  });

  it('preserves deliberate slot selection and uses the selected slot only on a press edge', () => {
    const sim = quiet(); const s = sim.state;
    s.pickups.push({ id: 'decoy', x: 0, z: 0, kind: 'decoy', ttl: 15 }); sim.step(FIXED_DT);
    expect(s.selectedSlot).toBe(1);
    s.pickups.push({ id: 'emp', x: s.player.x, z: 0, kind: 'emp', ttl: 15 }); sim.step(FIXED_DT);
    expect(s.selectedSlot).toBe(1);
    run(sim, 0.1, input({ use: true }));
    expect(s.slots).toEqual([true, false]); expect(s.decoys).toHaveLength(1);
    sim.step(FIXED_DT); sim.step(FIXED_DT, input({ swap: true, use: true }));
    expect(s.selectedSlot).toBe(0); expect(s.slots).toEqual([false, false]);
  });

  it('retracts Splice from the tail over 0.3 seconds without moving the head', () => {
    const sim = quiet(); place(sim, 0, 0, 0, 14);
    sim.state.pickups.push({ id: 'splice', x: 0, z: 0, kind: 'splice', ttl: 15 }); sim.step(FIXED_DT);
    expect(sim.state.player.length).toBe(14); expect(sim.state.player.splice?.to).toBe(10);
    const head = sim.state.player.x; run(sim, 0.15);
    expect(sim.state.player.body.length).toBeGreaterThan(10); expect(sim.state.player.body.length).toBeLessThan(14);
    expect(sim.state.player.x - head).toBeCloseTo(4.5 * 0.15, 6);
    run(sim, 0.2); expect(sim.state.player.length).toBe(10); expect(sim.state.player.splice).toBeNull();
  });

  it('EMP interrupts locks and restarts emitters through warning, leaving mines and projectiles intact', () => {
    const sim = quiet(); const s = sim.state;
    s.slots[0] = true;
    s.drones.push({ id: 'drone', x: 2, z: 2, state: 'prepare', target: { x: 0, z: 0 }, disabled: 0, timer: 0.5, cooldown: 0, anchor: { x: 2, z: 2 }, phase: 0 });
    s.gates.push({ id: 'gate', x: 1, z: 2, length: 2, axis: 'x', state: 'active', timer: 2, disabled: 0, boss: false });
    s.mines.push({ id: 'mine', x: 2, z: -3, armed: true, armTime: 0 });
    s.projectiles.push({ id: 'shot', x: 3, z: -3, vx: 0, vz: 0, ttl: 5 });
    sim.step(FIXED_DT, input({ use: true }));
    expect(s.drones[0].state).toBe('disabled'); expect(s.empInterrupts).toBe(1);
    expect(s.gates[0].state).toBe('disabled'); expect(s.mines).toHaveLength(1); expect(s.projectiles).toHaveLength(1);
    expect(s.events.filter(event => event.kind === 'emp').at(-1)?.text).toContain('2 systems disabled');
    s.gates[0].disabled = 0.01; sim.step(FIXED_DT);
    expect(s.gates[0].state).toBe('warning'); expect(s.gates[0].timer).toBeCloseTo(1);
  });

  it('reports an empty or out-of-range EMP truthfully without spending the other slot', () => {
    const sim = quiet(); const s = sim.state;
    s.slots[1] = true;
    sim.step(FIXED_DT, input({ use: true }));
    expect(s.slots).toEqual([false, true]); expect(s.event?.text).toContain('Wave 2');
    sim.step(FIXED_DT); s.slots[0] = true;
    sim.step(FIXED_DT, input({ use: true }));
    expect(s.slots).toEqual([false, true]); expect(s.event?.text).toContain('No drones or emitters within 4 units');
    const pulse = s.event!;
    const origin = { ...pulse.origin! };
    expect(origin).toEqual({ x: 4.5 * FIXED_DT * 2, z: 0 });
    run(sim, 0.1);
    expect(pulse.origin).toEqual(origin);
    expect(s.player.x).toBeGreaterThan(origin.x);
  });

  it('one Decoy absorbs only one of two projectiles reaching it in the same simulation step', () => {
    const sim = quiet(); const s = sim.state;
    s.decoys.push({ id: 'single-use-lure', x: -3, z: 3, ttl: 4 });
    s.projectiles = ['first', 'second'].map(id => ({ id, x: -3, z: 2.5, vx: 0, vz: 4, ttl: 3 }));
    sim.step(FIXED_DT);
    expect(s.decoys).toHaveLength(0); expect(s.projectiles).toHaveLength(1);
    expect(s.events.filter(event => event.kind === 'decoy-hit')).toHaveLength(1);
  });

  it('does not magnetize cores through solid machinery or trailing bodies', () => {
    const sim = quiet(); sim.state.buffs.magnet = 10;
    sim.state.obstacles.push({ x: 0, z: -0.8, width: 2, depth: 0.3 });
    sim.state.cores.push({ id: 'blocked', x: 0, z: -1.6 });
    sim.step(FIXED_DT);
    expect(sim.state.cores[0]).toEqual({ id: 'blocked', x: 0, z: -1.6 });
  });
});

describe('pickup teaching and retained gameplay feedback', () => {
  it('keeps the authored campaign pickup introductions and offers all eight only in Practice', () => {
    const sample = (mode: 'campaign' | 'practice', wave: number) => {
      const sim = quiet(new Simulation({ mode, seed: 3039, layoutId: 'neon-spire-v1' })); const found = new Set<string>();
      sim.state.wave = wave; sim.state.player.integrity = 2; place(sim, 0, 0, 0, 12);
      for (let attempt = 0; attempt < 150; attempt++) {
        sim.state.optionalTimer = 0; sim.state.pickups = []; sim.state.spawnedLimitedPickups = [];
        sim.step(FIXED_DT);
        for (const pickup of sim.state.pickups) found.add(pickup.kind);
      }
      expect(sim.state.status).toBe('playing');
      return [...found].sort();
    };
    expect(sample('campaign', 1)).toEqual(['overdrive', 'surge']);
    expect(sample('campaign', 2)).toEqual(['emp', 'overdrive', 'shield', 'surge']);
    expect(sample('practice', 1)).toEqual(['decoy', 'emp', 'magnet', 'overdrive', 'repair', 'shield', 'splice', 'surge']);
  });

  it('places the scripted Wave 2 EMP on the ground and leaves tactics empty until collected', () => {
    const sim = quiet(); const s = sim.state;
    s.coresCollected = 11; s.totalCores = 11; addCore(sim);
    sim.step(FIXED_DT); run(sim, 3.05);
    expect(s.wave).toBe(2); expect(s.slots).toEqual([false, false]);
    const emp = s.pickups.find(pickup => pickup.kind === 'emp');
    expect(emp).toBeDefined();
    place(sim, emp!.x, emp!.z);
    sim.step(FIXED_DT);
    expect(s.slots).toEqual([true, false]); expect(s.selectedSlot).toBe(0);
    expect(s.events.filter(event => event.kind === 'pickup').at(-1)?.pickup).toBe('emp');
  });

  it('retains tactical, damage and typed pickup feedback when a later event occurs in the same tick', () => {
    const sim = quiet(); const s = sim.state;
    s.slots[0] = true;
    s.mines.push({ id: 'head-mine', x: 0, z: 0, armed: true, armTime: 0 });
    s.pickups.push({ id: 'same-tick-shield', x: 0, z: 0, kind: 'shield', ttl: 15 });
    sim.step(FIXED_DT, input({ use: true }));
    expect(s.events.slice(-3).map(event => event.kind)).toEqual(['emp', 'damage', 'pickup']);
    expect(s.events.slice(-3).map(event => event.time)).toEqual([FIXED_DT, FIXED_DT, FIXED_DT]);
    expect(s.event).toEqual(s.events.at(-1)); expect(s.event?.pickup).toBe('shield');
    expect(s.player.integrity).toBe(2); expect(s.buffs.shield).toBe(12);
  });

  it('bounds feedback history and resumes original v1 saves without losing game resources', () => {
    const sim = quiet();
    for (let press = 0; press < 30; press++) { sim.step(FIXED_DT, input({ use: true })); sim.step(FIXED_DT); }
    expect(sim.state.events).toHaveLength(24);
    const frozen = sim.snapshot(); sim.step(0.3); sim.step(FIXED_DT, input({ use: true }));
    expect(sim.state.events).toEqual(frozen.events);
    const legacy = JSON.parse(JSON.stringify(frozen));
    delete legacy.events; delete legacy.event.time;
    const restored = Simulation.restore(legacy);
    expect(restored.state.events).toEqual([{ ...legacy.event, time: legacy.time }]);
    expect(restored.state.player).toEqual(frozen.player);
    restored.step(FIXED_DT, input({ use: true }));
    expect(restored.state.events.at(-1)?.id).toBe(frozen.eventCounter + 1);
    expect(() => Simulation.restore({ ...frozen, events: [{ ...frozen.event, pickup: 'unknown' }] })).toThrow('invalid');
    expect(() => Simulation.restore({ ...frozen, events: [{ ...frozen.event, time: frozen.time + 1 }] })).toThrow('invalid');
    expect(() => Simulation.restore({ ...frozen, events: [{ ...frozen.event, origin: { x: 'invalid', z: 0 } }] })).toThrow('invalid');
  });
});

describe('scoring, rival combat and campaign lifecycle', () => {
  it('uses the new core chain count, with fixed growth and a capped 4× multiplier', () => {
    const sim = quiet();
    for (let i = 0; i < 8; i++) { addCore(sim, String(i)); sim.step(FIXED_DT); }
    expect(sim.state.score).toBe(1900); expect(sim.state.combo).toBe(4); expect(sim.state.totalCores).toBe(8);
    expect(sim.state.player.length).toBe(16);
  });

  it('a moving Hunter genuinely crashes into the trailing player body and awards once', () => {
    const sim = quiet(); place(sim, 6, 0, 0);
    sim.state.rivals.push(makeRival(2, 0.9, -Math.PI / 2));
    run(sim, 0.1);
    expect(sim.state.status).toBe('playing'); expect(sim.state.rivals).toHaveLength(0);
    expect(sim.state.rivalKills).toBe(1); expect(sim.state.score).toBe(500);
    run(sim, 0.2); expect(sim.state.score).toBe(500);
  });

  it('a rival crashing elsewhere earns no body-block credit and cannot teleport out', () => {
    const sim = quiet(); sim.state.rivals.push(makeRival(15.6, -6, 0));
    run(sim, 0.1);
    expect(sim.state.rivals).toHaveLength(0); expect(sim.state.rivalKills).toBe(0); expect(sim.state.score).toBe(0);
  });

  it('simultaneous head-on contact kills the player and rival before granting any victory reward', () => {
    const sim = quiet(); sim.state.rivals.push(makeRival(0.67, 0, Math.PI));
    sim.step(FIXED_DT);
    expect(sim.state.status).toBe('dead'); expect(sim.state.deathCause).toBe('Critical crash: rival serpent');
    expect(sim.state.rivals).toHaveLength(0); expect(sim.state.score).toBe(0);
  });

  it('Hunter planning steers within physical limits and does not read a future input', () => {
    const sim = quiet(); place(sim, 9, 4, 0);
    const hunter = makeRival(-9, -5, 0); hunter.planning = 0; sim.state.rivals.push(hunter);
    const before = { x: hunter.x, z: hunter.z, heading: hunter.heading };
    sim.step(FIXED_DT, input({ x: 0, y: 1 }));
    expect(Math.hypot(hunter.x - before.x, hunter.z - before.z)).toBeCloseTo(4.2 / 60, 6);
    expect(Math.abs(hunter.heading - before.heading)).toBeLessThanOrEqual(Math.PI * 4 / 3 / 60 + 1e-7);
  });

  it('retains body and resources across three waves, with frozen boss entry and one repair', () => {
    const sim = quiet(); const s = sim.state;
    s.player.integrity = 2;
    for (let wave = 1; wave <= 3; wave++) {
      place(sim, 0, 5, -Math.PI / 2, s.player.length);
      s.pendingSpawns = []; s.mines = []; s.drones = []; s.gates = []; s.rivals = []; s.cores = []; s.pickups = []; s.coreRetry = 99999;
      for (let core = 0; core < 12; core++) { addCore(sim, `${wave}-${core}`); sim.step(FIXED_DT); }
      if (wave < 3) { expect(s.status).toBe('transition'); run(sim, 3); expect(s.wave).toBe(wave + 1); }
    }
    expect(s.totalCores).toBe(36); expect(s.player.length).toBe(44); expect(s.status).toBe('boss-intro');
    expect(s.player.integrity).toBe(3);
    const time = s.time; const head = s.player.x; run(sim, 1);
    expect(s.time).toBe(time); expect(s.player.x).toBe(head);
  });

  it('continues solid collision during the three-second wave transition', () => {
    const sim = quiet(); sim.state.status = 'transition'; sim.state.transitionTime = 3; place(sim, 15.6, 0);
    run(sim, 0.1); expect(sim.state.status).toBe('dead'); expect(sim.state.deathCause).toContain('arena wall');
  });

  it('separates boss relays from ordinary growth and retains charge across missed windows', () => {
    const sim = quiet(); sim.state.status = 'boss-intro'; sim.beginBoss();
    const s = sim.state; s.pendingSpawns = []; s.gates = []; s.boss!.relays = [{ id: 'relay-1', x: 0, z: 0, number: 1 }];
    sim.step(FIXED_DT);
    expect(s.boss!.charge).toBe(1); expect(s.player.length).toBe(8); expect(s.totalCores).toBe(0); expect(s.score).toBe(0);
    s.boss!.phase = 'recovery'; s.boss!.phaseTime = 0.01; s.boss!.charge = 3;
    sim.step(FIXED_DT);
    expect(s.boss!.phase).toBe('safe'); expect(s.boss!.charge).toBe(3); expect(s.boss!.nodes).toBe(3);
  });

  it('breaks exactly three Warden nodes then requires active extraction through a real open wall', () => {
    const sim = quiet(); sim.state.status = 'boss-intro'; sim.beginBoss(); const s = sim.state;
    s.pendingSpawns = []; s.gates = [];
    for (let node = 3; node >= 1; node--) {
      s.boss!.charge = 3; s.boss!.phase = 'recovery'; s.boss!.phaseTime = 3; s.boss!.pad = { x: s.player.x, z: s.player.z };
      sim.step(FIXED_DT); expect(s.boss!.nodes).toBe(node - 1);
    }
    expect(s.status).toBe('extraction'); expect(s.score).toBe(2500);
    place(sim, 0, -11.5, -Math.PI / 2); run(sim, 0.3);
    expect(s.status).toBe('complete'); expect(s.score).toBe(3500);
    run(sim, 1); expect(s.score).toBe(3500);
  });

  it('keeps all boss laser damage visible in the same gate state used by rendering', () => {
    const sim = quiet(); sim.state.status = 'boss-intro'; sim.beginBoss();
    sim.state.boss!.phase = 'warning'; sim.state.boss!.phaseTime = 0.01;
    sim.step(FIXED_DT);
    expect(sim.state.boss!.phase).toBe('attack'); expect(sim.state.gates.some(gate => gate.state === 'active')).toBe(true);
  });

  it('Practice uses the same physical objectives while producing no score', () => {
    const sim = quiet(new Simulation({ mode: 'practice' })); addCore(sim); sim.step(FIXED_DT);
    expect(sim.state.totalCores).toBe(1); expect(sim.state.player.length).toBe(9); expect(sim.state.score).toBe(0);
  });
});

describe('determinism, snapshots and spawn safety', () => {
  it('same seeds and observed controls produce the same simulation and director', () => {
    const first = new Simulation({ seed: 4482 }); const second = new Simulation({ seed: 4482 });
    second.state.runId = first.state.runId;
    for (let frame = 0; frame < 240; frame++) {
      const controls = frame < 120 ? input({ x: 0, y: -1 }) : input({ x: 1, y: 0 });
      first.step(FIXED_DT, controls); second.step(FIXED_DT, controls);
    }
    expect(first.snapshot()).toEqual(second.snapshot());
  });

  it('restores exact paths, resource timers, RNG and actor commitments with neutral physical input', () => {
    const first = new Simulation({ seed: 8901 });
    run(first, 1.5, input({ x: 0, y: -1 }));
    const snapshot = first.snapshot(); const resumed = Simulation.restore(snapshot);
    first.clearInput();
    run(first, 1, input({ x: 1, y: 0 })); run(resumed, 1, input({ x: 1, y: 0 }));
    expect(resumed.snapshot()).toEqual(first.snapshot());
    expect(snapshot.player.path).not.toEqual(first.state.player.path);
  });

  it('rejects malformed or version-mismatched saves instead of resuming partial state', () => {
    const snapshot = new Simulation().snapshot();
    expect(() => Simulation.restore({ ...snapshot, contentVersion: 'future' })).toThrow('different content version');
    expect(() => Simulation.restore({ ...snapshot, player: { ...snapshot.player, path: [] } })).toThrow('invalid');
    expect(() => Simulation.restore({ ...snapshot, drones: [{ id: 'broken', x: 0, z: 0 }] })).toThrow('invalid');
    expect(() => Simulation.restore({ ...snapshot, pickups: [{ id: 'bad', x: 0, z: 0, kind: 'javascript', ttl: 3 }] })).toThrow('invalid');
  });

  it('does not arm mines in the current snake and never exceeds the three-core budget', () => {
    for (const seed of [1, 2, 3, 3039, 3039001]) {
      const sim = new Simulation({ seed });
      const waypoints = [{ x: 0, z: -8 }, { x: 11, z: -8 }, { x: 11, z: 8 }, { x: -11, z: 8 }, { x: -11, z: -8 }];
      let target = 0;
      for (let frame = 0; frame < 420; frame++) {
        const p = sim.state.player; const point = waypoints[target];
        if (Math.hypot(point.x - p.x, point.z - p.z) < 1.5) target = (target + 1) % waypoints.length;
        sim.step(FIXED_DT, input({ x: waypoints[target].x - p.x, y: waypoints[target].z - p.z }));
        expect(sim.state.cores.length).toBeLessThanOrEqual(3);
        for (const mine of sim.state.mines) if (!mine.armed) {
          expect(Math.hypot(mine.x - p.x, mine.z - p.z)).toBeGreaterThan(0.8);
        }
      }
      expect(sim.state.status).not.toBe('dead');
    }
  });

  it('snapshots are plain JSON and cannot mutate the live world by alias', () => {
    const sim = new Simulation(); const save: SimulationState = JSON.parse(JSON.stringify(sim.snapshot()));
    save.player.body[0].x = 100;
    expect(sim.state.player.body[0].x).not.toBe(100);
    expect(Simulation.restore(sim.snapshot()).state.runId).toBe(sim.state.runId);
  });
});

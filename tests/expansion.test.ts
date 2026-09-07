import { describe, expect, it } from 'vitest';
import { BLASTER, CONTENT_VERSION, EXPANDED_CONTENT_VERSION, FIXED_DT, LEGACY_CONTENT_VERSION, PICKUPS } from '../src/game/content';
import { getLayout } from '../src/game/layouts';
import { Simulation } from '../src/game/simulation';
import type { GameInput, PickupKind, Rival } from '../src/game/types';

const neutral: GameInput = { x: 0, y: 0, boost: false, use: false, swap: false, fire: false };
const controls = (value: Partial<GameInput>) => ({ ...neutral, ...value });
const run = (sim: Simulation, seconds: number, input = neutral) => { for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) sim.step(FIXED_DT, input); };
function place(sim: Simulation, x = 0, z = 0, heading = 0, length = 8) {
  Object.assign(sim.state.player, { x, z, heading, length,
    body: Array.from({ length }, (_, i) => ({ x: x - Math.cos(heading) * (i + 1) * 0.55, z: z - Math.sin(heading) * (i + 1) * 0.55 })),
    path: Array.from({ length: 510 }, (_, i) => ({ x: x - Math.cos(heading) * i * 0.15, z: z - Math.sin(heading) * i * 0.15 })),
  });
}
function quiet() {
  const sim = new Simulation({ seed: 3039, contentVersion: EXPANDED_CONTENT_VERSION });
  Object.assign(sim.state, { obstacles: [], cores: [], pickups: [], mines: [], drones: [], rivals: [], gates: [], projectiles: [], playerProjectiles: [], pendingSpawns: [], coreRetry: 99999, optionalTimer: 99999 });
  sim.state.supply.introduced = Object.keys(PICKUPS) as PickupKind[]; sim.state.supply.pending = [];
  place(sim); return sim;
}
function circleStep(sim: Simulation) {
  const p = sim.state.player;
  const angle = Math.atan2(p.z - 6, p.x) + Math.PI / 2;
  sim.step(FIXED_DT, controls({ x: Math.cos(angle), y: Math.sin(angle) }));
}
function drone(sim: Simulation, x: number, z: number, id = 'target') {
  sim.state.drones.push({ id, x, z, hp: 2, state: 'recover', timer: 30, cooldown: 30, disabled: 0, anchor: { x, z }, phase: 0 });
}
function bossScene() {
  const sim = quiet(); sim.state.status = 'boss-intro'; sim.state.wave = 3; sim.beginBoss();
  sim.state.pendingSpawns = []; sim.state.gates = []; sim.state.boss!.relays = [];
  return sim;
}
function chargeBoss(sim: Simulation) {
  Object.assign(sim.state.boss!, { charge: 3, phase: 'recovery', phaseTime: 4, relays: [] });
}

describe('versioned arena and expanded inventory', () => {
  it('starts expanded 36×26 runs and preserves old 32×24 physical snapshots and future movement', () => {
    const expanded = new Simulation({ seed: 19 });
    expect(expanded.state.contentVersion).toBe(CONTENT_VERSION);
    expect([getLayout(expanded.state).width, getLayout(expanded.state).depth]).toEqual([36, 26]);
    const original = new Simulation({ seed: 19, layoutId: 'neon-spire-v1' });
    const raw = JSON.parse(JSON.stringify(original.snapshot()));
    for (const key of ['layoutId', 'weapon', 'playerProjectiles', 'supply', 'lab']) delete raw[key];
    delete raw.buffs.scrubber; delete raw.buffs['chain-buffer'];
    const restored = Simulation.restore(raw);
    expect(restored.state.contentVersion).toBe(LEGACY_CONTENT_VERSION);
    expect([getLayout(restored.state).width, getLayout(restored.state).depth]).toEqual([32, 24]);
    for (const key of ['player', 'cores', 'pickups', 'obstacles', 'rng'] as const) expect(restored.state[key]).toEqual(original.state[key]);
    run(original, 0.5); run(restored, 0.5);
    for (const key of ['player', 'cores', 'pickups', 'obstacles', 'rng', 'time'] as const) expect(restored.state[key]).toEqual(original.state[key]);
    expect(() => Simulation.restore({ ...raw, layoutId: 'neon-spire-v2' })).toThrow('invalid');
  });

  it('uses expanded boundaries and retains fatal walls without changing speed', () => {
    const sim = quiet(); place(sim, 16, 0); run(sim, 0.1);
    expect(sim.state.status).toBe('playing'); expect(sim.state.player.x).toBeCloseTo(16.45);
    run(sim, 0.4); expect(sim.state.status).toBe('dead'); expect(sim.state.deathCause).toContain('arena wall');
  });

  it('declares twelve distinct powers with typed teaching and activation metadata', () => {
    expect(Object.keys(PICKUPS)).toHaveLength(12);
    expect(PICKUPS.decoy.unlock).toEqual({ wave: 2, waveCores: 6 });
    expect(PICKUPS.blaster.activation).toBe('weapon'); expect(PICKUPS.emp.activation).toBe('tactical');
    expect(PICKUPS.capacitor.unlock.boostUsed).toBe(true);
  });
});

describe('tactical supply and introductions', () => {
  it('offers EMP, Decoy, automatic on successive eight-second opportunities without random tactical starvation', () => {
    const sim = quiet(); const s = sim.state;
    s.wave = 2; s.coresCollected = 8; s.totalCores = 20; s.optionalTimer = 8;
    const offers: PickupKind[] = [];
    for (let tick = 0; tick < 24 * 60 + 2; tick++) {
      circleStep(sim);
      if (s.pickups.length) { offers.push(s.pickups[0].kind); s.pickups = []; }
    }
    expect(s.status).toBe('playing'); expect(offers).toHaveLength(3);
    expect(offers.slice(0, 2)).toEqual(['emp', 'decoy']); expect(['emp', 'decoy']).not.toContain(offers[2]);
  });

  it('skips a full tactical slot without wasting the due opportunity', () => {
    const sim = quiet(); const s = sim.state;
    s.wave = 3; s.totalCores = 24; s.slots[0] = true; s.optionalTimer = FIXED_DT;
    sim.step(FIXED_DT);
    expect(s.pickups).toHaveLength(1); expect(s.pickups[0].kind).not.toBe('emp'); expect(s.supply.cursor).toBe(1);
    s.pickups = []; s.optionalTimer = FIXED_DT; sim.step(FIXED_DT);
    expect(s.pickups[0].kind).toBe('decoy');
  });

  it('reserves a capacity-blocked EMP once and retries safely without starving the following Decoy', () => {
    const sim = quiet(); const s = sim.state;
    s.wave = 3; s.totalCores = 24; s.optionalTimer = FIXED_DT;
    s.pickups = (['overdrive', 'surge', 'shield'] as PickupKind[]).map((kind, i) => ({ id: `full-${i}`, x: -12 + i * 4, z: 9, kind, ttl: 15 }));
    sim.step(FIXED_DT);
    expect(s.pickups).toHaveLength(3); expect(s.supply.pending).toContain('emp'); expect(s.supply.cursor).toBe(1);
    s.pickups.pop(); run(sim, 0.6);
    expect(s.pickups.filter(p => p.kind === 'emp')).toHaveLength(1); expect(s.supply.pending).not.toContain('emp'); expect(s.supply.cursor).toBe(1);
    s.pickups = []; s.optionalTimer = FIXED_DT; sim.step(FIXED_DT);
    expect(s.pickups[0].kind).toBe('decoy');
  });

  it('keeps an unsafe scripted introduction pending until a safe candidate exists', () => {
    const sim = quiet(); const s = sim.state;
    s.wave = 2; s.supply.introduced = (Object.keys(PICKUPS) as PickupKind[]).filter(kind => kind !== 'emp');
    s.obstacles = getLayout(s).coreCandidates.map(point => ({ ...point, width: 2, depth: 2 }));
    sim.step(FIXED_DT);
    expect(s.supply.pending).toContain('emp'); expect(s.pickups).toHaveLength(0);
    s.obstacles = []; run(sim, 0.55);
    expect(s.pickups[0].kind).toBe('emp'); expect(s.supply.pending).not.toContain('emp');
  });

  it('unlocks teaching at the authored core/boost thresholds and preserves one Repair/Splice per wave', () => {
    const sim = quiet(); const s = sim.state;
    s.supply.introduced = []; sim.step(FIXED_DT);
    expect(s.supply.pending).not.toContain('magnet');
    s.totalCores = 4; sim.step(FIXED_DT); expect(s.supply.pending).toContain('magnet');
    s.wave = 2; s.coresCollected = 5; sim.step(FIXED_DT); expect(s.supply.pending).not.toContain('decoy');
    s.coresCollected = 6; sim.step(FIXED_DT); expect(s.supply.pending).toContain('decoy');
    s.coresCollected = 8; sim.step(FIXED_DT); expect(s.supply.pending).toContain('blaster');
    s.supply.boostUsed = true; s.player.boost = 64; sim.step(FIXED_DT); expect(s.supply.pending).toContain('capacitor');
    s.wave = 3; s.maxCombo = 2; sim.step(FIXED_DT); expect(s.supply.pending).toContain('chain-buffer');
    s.pickups = []; s.supply.pending = ['repair', 'splice']; s.supply.introduced = Object.keys(PICKUPS) as PickupKind[];
    s.player.integrity = 2; place(sim, 0, 0, 0, 12); s.supply.retry = 0;
    sim.step(FIXED_DT); run(sim, 0.55);
    expect(s.spawnedLimitedPickups).toEqual(['repair', 'splice']);
    s.pickups = []; s.supply.pending = ['repair', 'splice']; s.supply.retry = 0; run(sim, 0.6);
    expect(s.pickups).toHaveLength(0);
  });
});

describe('Pulse Blaster', () => {
  it('refills to twelve and fires at four shots per second with a separate bounded projectile pool', () => {
    const sim = quiet(); const s = sim.state;
    s.pickups.push({ id: 'ammo', x: 0, z: 0, kind: 'blaster', ttl: 15 }); sim.step(FIXED_DT);
    expect(s.weapon.ammo).toBe(12);
    run(sim, 1, controls({ fire: true }));
    expect(s.weapon.ammo).toBe(8); expect(s.events.filter(event => event.kind === 'player-shot')).toHaveLength(4);
    expect(s.playerProjectiles.length).toBeLessThanOrEqual(BLASTER.projectileCap);
    expect(s.projectiles).toHaveLength(0);
    s.weapon.ammo = 12; s.pickups.push({ id: 'full-ammo', x: s.player.x, z: s.player.z, kind: 'blaster', ttl: 15 }); sim.step(FIXED_DT);
    expect(s.pickups.some(pickup => pickup.id === 'full-ammo')).toBe(true);
  });

  it('keeps firing, ammo and projectiles identical across render frequencies and never exceeds shot range', () => {
    const states = [30, 60, 120].map(rate => {
      const sim = quiet(); sim.state.weapon.ammo = 12;
      for (let frame = 0; frame < rate; frame++) sim.step(1 / rate, controls({ fire: true }));
      return sim.state;
    });
    for (const s of states.slice(1)) { expect(s.weapon).toEqual(states[0].weapon); expect(s.playerProjectiles).toEqual(states[0].playerProjectiles); }
    const sim = quiet(); sim.state.weapon.ammo = 12; drone(sim, 11, 0);
    sim.step(FIXED_DT, controls({ fire: true })); run(sim, 0.6);
    expect(sim.state.playerProjectiles).toHaveLength(0); expect(sim.state.drones[0].hp).toBe(2);
    sim.state.playerProjectiles = Array.from({ length: 6 }, (_, i) => ({ id: `capped-${i}`, x: 6, z: 6, vx: 0, vz: 0, ttl: 0.5, range: 10 }));
    const ammo = sim.state.weapon.ammo; sim.step(FIXED_DT, controls({ fire: true }));
    expect(sim.state.playerProjectiles).toHaveLength(6); expect(sim.state.weapon.ammo).toBe(ammo);
  });

  it('assists within ±30 degrees and ten units only when line of sight is clear', () => {
    const shoot = (angle: number, range = 5, blocked = false) => {
      const sim = quiet(); sim.state.weapon.ammo = 12;
      drone(sim, Math.cos(angle) * range, Math.sin(angle) * range);
      if (blocked) sim.state.obstacles = [{ x: Math.cos(angle) * 2.5, z: Math.sin(angle) * 2.5, width: 0.5, depth: 0.5 }];
      sim.step(FIXED_DT, controls({ fire: true })); return sim.state.playerProjectiles[0];
    };
    expect(Math.atan2(shoot(Math.PI / 6).vz, shoot(Math.PI / 6).vx)).toBeCloseTo(Math.PI / 6);
    expect(shoot(Math.PI / 6 + 0.02).vz).toBeCloseTo(0);
    expect(shoot(0.2, 10.1).vz).toBeCloseTo(0);
    expect(shoot(0.3, 5, true).vz).toBeCloseTo(0);
  });

  it('stops shots on machinery and ignores the player body', () => {
    const sim = quiet(); const s = sim.state; s.weapon.ammo = 12; drone(sim, 6, 0);
    s.obstacles = [{ x: 3, z: 0, width: 1, depth: 2 }];
    sim.step(FIXED_DT, controls({ fire: true })); run(sim, 0.2);
    expect(s.playerProjectiles).toHaveLength(0); expect(s.drones[0].hp).toBe(2);
    s.obstacles = []; s.drones = []; place(sim);
    s.player.body = Array.from({ length: 8 }, (_, i) => ({ x: 0.9 + i * 0.55, z: 0 }));
    s.playerProjectiles = [{ id: 'body-crossing', x: 0.8, z: 0, vx: 18, vz: 0, ttl: 0.5, range: 9 }];
    sim.step(FIXED_DT);
    expect(s.status).toBe('playing'); expect(s.playerProjectiles).toHaveLength(1); expect(s.player.integrity).toBe(3);
  });

  it('destroys a drone after two real projectile contacts without awarding points', () => {
    const sim = quiet(); const s = sim.state; s.weapon.ammo = 12; drone(sim, 5, 0);
    run(sim, 0.55, controls({ fire: true }));
    expect(s.drones).toHaveLength(0); expect(s.score).toBe(0); expect(s.rivalKills).toBe(0);
    expect(s.events.filter(event => event.kind === 'drone-hit')).toHaveLength(1);
    expect(s.events.filter(event => event.kind === 'drone-destroyed')).toHaveLength(1);
  });

  it('absorbs bullets on armored Hunter bodies while preserving the body-block rule', () => {
    const sim = quiet(); const s = sim.state; s.weapon.ammo = 12;
    const rival: Rival = { id: 'armor', x: 3, z: 3, heading: Math.PI / 2, length: 12, lastTurn: 1, body: Array.from({ length: 12 }, (_, i) => ({ x: 3, z: 3 - (i + 1) * 0.55 })), path: Array.from({ length: 510 }, (_, i) => ({ x: 3, z: 3 - i * 0.15 })), state: 'hunting', warning: 0, desiredHeading: Math.PI / 2, planning: 30, speed: 0 };
    s.rivals = [rival]; sim.step(FIXED_DT, controls({ fire: true })); run(sim, 0.2);
    expect(s.events.some(event => event.kind === 'armor-hit')).toBe(true);
    expect(s.rivals).toHaveLength(1); expect(s.rivalKills).toBe(0); expect(s.score).toBe(0);
  });
});

describe('new automatic power boundaries', () => {
  it('Capacitor adds thirty-five below sixty-five without unlocking exhausted held boost', () => {
    const sim = quiet(); const s = sim.state;
    s.player.boost = 30; s.player.boostLocked = true;
    s.pickups = [{ id: 'capacitor', x: 0, z: 0, kind: 'capacitor', ttl: 15 }];
    sim.step(FIXED_DT, controls({ boost: true }));
    expect(s.player.boost).toBe(65); expect(s.player.boostLocked).toBe(true); expect(s.player.boosting).toBe(false);
    s.pickups.push({ id: 'unneeded', x: s.player.x, z: 0, kind: 'capacitor', ttl: 15 }); sim.step(FIXED_DT);
    expect(s.pickups).toHaveLength(1);
  });

  it('Scrubber triggers once at two units, clears three units, and never grants later immunity', () => {
    const sim = quiet(); const s = sim.state; s.buffs.scrubber = 8;
    s.projectiles = [1.8, 2.8, 3.8].map((x, i) => ({ id: `bullet-${i}`, x, z: 0, vx: 0, vz: 0, ttl: 5 }));
    sim.step(FIXED_DT);
    expect(s.projectiles.map(shot => shot.id)).toEqual(['bullet-2']); expect(s.buffs.scrubber).toBe(0);
    expect(s.events.find(event => event.kind === 'scrubber')?.amount).toBe(2);
    s.projectiles.push({ id: 'later', x: s.player.x, z: 0, vx: 0, vz: 0, ttl: 5 }); sim.step(FIXED_DT);
    expect(s.player.integrity).toBe(2);
    s.buffs.scrubber = 0.001; sim.step(FIXED_DT);
    expect(s.events.some(event => event.kind === 'power-expired' && event.pickup === 'scrubber')).toBe(true);
  });

  it('allows an earlier Scrubber pickup to clear a later swept head shot without undoing prior damage', () => {
    const earlier = quiet();
    earlier.state.pickups = [{ id: 'early-scrubber', x: 0, z: 0, kind: 'scrubber', ttl: 15 }];
    earlier.state.projectiles = [{ id: 'late-shot', x: 0.53, z: 0, vx: -1, vz: 0, ttl: 3 }];
    earlier.step(FIXED_DT, controls({ boost: true }));
    expect(earlier.state.player.integrity).toBe(3); expect(earlier.state.projectiles).toHaveLength(0); expect(earlier.state.buffs.scrubber).toBe(0);
    const equal = quiet();
    equal.state.pickups = [{ id: 'equal-scrubber', x: 0, z: 0, kind: 'scrubber', ttl: 15 }];
    equal.state.projectiles = [{ id: 'equal-shot', x: 0, z: 0, vx: 0, vz: 0, ttl: 3 }];
    equal.step(FIXED_DT);
    expect(equal.state.player.integrity).toBe(2);
  });

  it('Chain Buffer saves exactly one timeout and never preserves a chain through damage or a wave transition', () => {
    const sim = quiet(); const s = sim.state;
    Object.assign(s, { chain: 3, combo: 2, comboTimer: 0.001 }); s.buffs['chain-buffer'] = 10;
    sim.step(FIXED_DT);
    expect(s.combo).toBe(2); expect(s.comboTimer).toBe(3); expect(s.buffs['chain-buffer']).toBe(0);
    run(sim, 3.05); expect(s.combo).toBe(1); expect(s.chain).toBe(0);
    place(sim); Object.assign(s, { chain: 3, combo: 2, comboTimer: 4 }); s.buffs['chain-buffer'] = 10;
    s.projectiles.push({ id: 'damage', x: 0, z: 0, vx: 0, vz: 0, ttl: 3 }); sim.step(FIXED_DT);
    expect(s.combo).toBe(1); expect(s.buffs['chain-buffer']).toBe(0);
    s.buffs['chain-buffer'] = 10; s.coresCollected = 12; sim.step(FIXED_DT);
    expect(s.status).toBe('transition'); expect(s.buffs['chain-buffer']).toBe(0);
  });
});

describe('Warden objective and alternate discharge', () => {
  it('rejects out-of-order relays visibly and announces each number plus full charge', () => {
    const sim = bossScene(); const s = sim.state; const boss = s.boss!;
    boss.relays = [{ id: 'wrong', x: 0, z: 0, number: 2 }]; sim.step(FIXED_DT);
    expect(boss.charge).toBe(0); expect(s.events.at(-1)?.kind).toBe('relay-wrong'); expect(s.events.at(-1)?.relay).toBe(2);
    for (let number = 1; number <= 3; number++) {
      place(sim); boss.relays = [{ id: `relay-${number}`, x: 0, z: 0, number }]; sim.step(FIXED_DT);
    }
    expect(s.events.filter(event => event.kind === 'relay').map(event => event.relay)).toEqual([1, 2, 3]);
    expect(boss.stage).toBe('charge-ready'); expect(s.events.at(-1)?.kind).toBe('charge-ready');
    expect(s.totalCores).toBe(0); expect(s.player.length).toBe(8);
  });

  it('breaks one charged node with three real receptor shots and also retains the non-weapon pad route', () => {
    const sim = bossScene(); const s = sim.state; chargeBoss(sim); place(sim, 0, -6, -Math.PI / 2); s.weapon.ammo = 12;
    run(sim, 0.75, controls({ fire: true }));
    expect(s.boss!.nodes).toBe(2); expect(s.boss!.charge).toBe(0); expect(s.boss!.receptorHits).toBe(0);
    expect(s.events.filter(event => event.kind === 'receptor-hit').map(event => event.amount)).toEqual([1, 2, 3]);
    expect(s.events.filter(event => event.kind === 'boss-node')).toHaveLength(1);
    const pad = bossScene(); chargeBoss(pad); place(pad, pad.state.boss!.pad.x, pad.state.boss!.pad.z);
    pad.step(FIXED_DT);
    expect(pad.state.boss!.nodes).toBe(2); expect(pad.state.weapon.ammo).toBe(0);
  });

  it('consumes relay charge once when pad crossing and the third receptor hit coincide', () => {
    const sim = bossScene(); const s = sim.state; chargeBoss(sim);
    place(sim, s.boss!.pad.x, s.boss!.pad.z);
    s.playerProjectiles = [0, 1, 2].map(i => ({ id: `hit-${i}`, x: s.boss!.receptor.x, z: s.boss!.receptor.z + 0.5, vx: 0, vz: -18, ttl: 0.5, range: 10 }));
    sim.step(FIXED_DT);
    expect(s.boss!.nodes).toBe(2); expect(s.boss!.charge).toBe(0); expect(s.events.filter(event => event.kind === 'boss-node')).toHaveLength(1);
  });

  it('resets partial receptor hits when armor closes, retains relay charge and gives armored feedback', () => {
    const sim = bossScene(); const s = sim.state; chargeBoss(sim);
    s.playerProjectiles = [0, 1].map(i => ({ id: `partial-${i}`, x: s.boss!.receptor.x, z: s.boss!.receptor.z + 0.5, vx: 0, vz: -18, ttl: 0.5, range: 10 }));
    sim.step(FIXED_DT); expect(s.boss!.receptorHits).toBe(2);
    s.boss!.phaseTime = 0.001; sim.step(FIXED_DT);
    expect(s.boss!.receptorHits).toBe(0); expect(s.boss!.charge).toBe(3); expect(s.boss!.stage).toBe('charge-ready');
    s.playerProjectiles = [{ id: 'closed', ...s.boss!.receptor, vx: 0, vz: -18, ttl: 0.5, range: 10 }]; sim.step(FIXED_DT);
    expect(s.boss!.nodes).toBe(3); expect(s.events.at(-1)?.kind).toBe('armor-hit');
  });
});

describe('Practice Lab isolation and snapshots', () => {
  it('creates each power and Warden scene without unrelated supply and refuses campaign refill', () => {
    for (const kind of [...Object.keys(PICKUPS) as PickupKind[], 'warden' as const]) {
      const sim = Simulation.createLab(kind, 99);
      expect(sim.state.mode).toBe('practice'); expect(sim.state.lab).toBe(kind);
      expect(Simulation.restore(sim.snapshot()).state.lab).toBe(kind);
      if (kind !== 'warden') expect(sim.state.pickups.map(pickup => pickup.kind)).toEqual([kind]);
      run(sim, 0.3);
      expect(sim.state.pickups.every(pickup => pickup.kind === kind)).toBe(true);
      expect(sim.state.pendingSpawns).toHaveLength(0); expect(sim.state.score).toBe(0);
      sim.refillLab(); expect(sim.state.time).toBe(0); expect(sim.state.lab).toBe(kind);
    }
    expect(() => new Simulation().refillLab('blaster')).toThrow('Practice Lab');
  });

  it('demonstrates doubled Surge core points only inside Lab and resets its session score on refill', () => {
    const lab = Simulation.createLab('surge', 99);
    const practice = Simulation.restore({ ...lab.snapshot(), lab: null, retryCheckpoint: { ...lab.state.retryCheckpoint, lab: null }, supply: { ...lab.state.supply, introduced: Object.keys(PICKUPS), pending: [] } });
    run(lab, 1); run(practice, 1);
    expect(lab.state.buffs.surge).toBeGreaterThan(0);
    expect(lab.state.coresCollected).toBe(1); expect(lab.state.score).toBe(200);
    expect(lab.state.events.find(event => event.kind === 'core')?.text).toContain('+200');
    expect(lab.state.status).toBe('playing'); expect(lab.state.mode).toBe('practice');
    expect(practice.state.coresCollected).toBe(1); expect(practice.state.score).toBe(0);
    expect(practice.state.events.find(event => event.kind === 'core')?.text).toContain('+0');
    lab.refillLab(); expect(lab.state.score).toBe(0); expect(lab.state.coresCollected).toBe(0);
  });

  it('continues an active expanded save exactly through supply, projectiles, ammo and buff expiry', () => {
    const original = quiet(); const s = original.state;
    s.wave = 2; s.coresCollected = 8; s.totalCores = 20;
    s.weapon.ammo = 9; s.optionalTimer = 0.45;
    s.supply.pending = ['emp']; s.supply.cursor = 1; s.supply.retry = 0.3;
    Object.assign(s.buffs, { overdrive: 4, shield: 3, surge: 3, magnet: 2, scrubber: 0.9, 'chain-buffer': 0.8 });
    s.chain = 3; s.combo = 2; s.maxCombo = 2; s.comboTimer = 0.2;
    s.projectiles = [{ id: 'resumed-hostile', x: 12, z: -5, vx: -1, vz: 0.2, ttl: 2 }];
    drone(original, 8, 2);
    original.step(FIXED_DT, controls({ boost: true, fire: true }));
    const saved = original.snapshot();
    expect(saved.playerProjectiles).toHaveLength(1); expect(saved.weapon.ammo).toBe(8);
    const resumed = Simulation.restore(saved);
    run(original, 1, controls({ boost: true })); run(resumed, 1, controls({ boost: true }));
    expect(resumed.state).toEqual(original.state);
    expect(resumed.state.status).toBe('playing');
    expect(resumed.state.pickups.map(pickup => pickup.kind)).toEqual(['emp', 'decoy']);
    expect(resumed.state.drones[0].hp).toBe(1);
    expect(resumed.state.buffs.scrubber).toBe(0);
    expect(resumed.state.combo).toBe(2); expect(resumed.state.buffs['chain-buffer']).toBe(0);
    expect(resumed.state.events.some(event => event.kind === 'power-expired' && event.pickup === 'scrubber')).toBe(true);
  });

  it('validates expanded resource limits and preserves weapon/supply/boss progress through restore', () => {
    const sim = bossScene(); chargeBoss(sim); sim.state.weapon.ammo = 7; sim.state.boss!.receptorHits = 2;
    sim.state.supply.pending = ['emp']; sim.state.supply.cursor = 1;
    const restored = Simulation.restore(sim.snapshot());
    expect(restored.state.weapon.ammo).toBe(7); expect(restored.state.boss!.receptorHits).toBe(2); expect(restored.state.supply).toEqual(sim.state.supply);
    expect(() => Simulation.restore({ ...sim.snapshot(), weapon: { ammo: 99, cooldown: 0, emptyCooldown: 0 } })).toThrow('invalid');
    expect(() => Simulation.restore({ ...sim.snapshot(), lab: 'emp' })).toThrow('invalid');
  });

  it('rejects expanded-only active state in legacy saves and unknown buff keys before rendering', () => {
    const legacy = new Simulation({ layoutId: 'neon-spire-v1' }).snapshot();
    expect(Simulation.restore(legacy).state.layoutId).toBe('neon-spire-v1');
    for (const kind of ['scrubber', 'chain-buffer']) expect(() => Simulation.restore({ ...legacy, buffs: { ...legacy.buffs, [kind]: 1 } })).toThrow('invalid');
    expect(() => Simulation.restore({ ...legacy, weapon: { ammo: 1, cooldown: 0, emptyCooldown: 0 } })).toThrow('invalid');
    expect(() => Simulation.restore({ ...legacy, playerProjectiles: [{ id: 'expanded-shot', x: 0, z: 0, vx: 18, vz: 0, ttl: 0.5, range: 9 }] })).toThrow('invalid');
    expect(() => Simulation.restore({ ...legacy, mode: 'practice', lab: 'surge' })).toThrow('invalid');
    const expanded = new Simulation().snapshot();
    expect(() => Simulation.restore({ ...expanded, buffs: { ...expanded.buffs, unknownPower: 0.1 } })).toThrow('invalid');
  });
});

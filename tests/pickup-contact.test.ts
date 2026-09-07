import { describe, expect, it } from 'vitest';
import { COLLECTION, CONTENT_VERSION, EXPANDED_CONTENT_VERSION, FIXED_DT, LEGACY_CONTENT_VERSION, MOVEMENT, PICKUPS } from '../src/game/content';
import { getLayout } from '../src/game/layouts';
import { Simulation } from '../src/game/simulation';
import type { GameInput, PickupKind, Vec2 } from '../src/game/types';

const boost: GameInput = { x: 1, y: 0, boost: true, use: false, swap: false, fire: false };
type Collectible = keyof typeof COLLECTION.current;
const categories: Collectible[] = ['core', 'powerup', 'relay'];

function quiet(contentVersion = CONTENT_VERSION) {
  const sim = new Simulation({ seed: 52, contentVersion });
  const p = sim.state.player;
  Object.assign(p, { x: 0, z: 0, heading: 0, length: 8,
    body: Array.from({ length: 8 }, (_, i) => ({ x: -(i + 1) * MOVEMENT.spacing, z: 0 })),
    path: Array.from({ length: 510 }, (_, i) => ({ x: -i * 0.15, z: 0 })),
  });
  Object.assign(sim.state, { obstacles: [], cores: [], pickups: [], mines: [], drones: [], rivals: [], gates: [], projectiles: [], playerProjectiles: [], pendingSpawns: [], coreRetry: 9999, optionalTimer: 9999 });
  sim.state.supply.introduced = Object.keys(PICKUPS) as PickupKind[];
  sim.state.supply.pending = [];
  return sim;
}

function add(sim: Simulation, kind: Collectible, point: Vec2) {
  if (kind === 'core') sim.state.cores = [{ id: 'test-core', ...point }];
  else if (kind === 'powerup') sim.state.pickups = [{ id: 'test-powerup', ...point, kind: 'emp', ttl: 15 }];
  else {
    sim.state.status = 'boss-intro'; sim.state.wave = 3; sim.beginBoss();
    sim.state.gates = []; sim.state.pendingSpawns = [];
    Object.assign(sim.state.boss!, { relays: [{ id: 'test-relay', ...point, number: 1 }], relayRetry: 9999 });
  }
}

function count(sim: Simulation, kind: Collectible) {
  return kind === 'core' ? sim.state.coresCollected : kind === 'powerup' ? Number(sim.state.slots[0]) : sim.state.boss!.charge;
}

describe('forgiving collection contact without larger hazard hitboxes', () => {
  it.each(categories)('collects a boosted grazing %s contact between two outside endpoints exactly once', kind => {
    const sim = quiet();
    const distance = MOVEMENT.boostSpeed * FIXED_DT;
    const radius = COLLECTION.current[kind];
    // The chord through the collection circle is only half a simulation step.
    // Both endpoints miss, so a point-only check would incorrectly skip it.
    const point = { x: distance / 2, z: Math.sqrt(radius * radius - (distance / 4) ** 2) };
    expect(Math.hypot(point.x, point.z)).toBeGreaterThan(radius);
    expect(Math.hypot(distance - point.x, point.z)).toBeGreaterThan(radius);
    add(sim, kind, point);
    sim.step(FIXED_DT, boost);
    expect(count(sim, kind)).toBe(1);
    expect(sim.state.player.x).toBeCloseTo(distance, 8);
    sim.step(FIXED_DT, boost);
    expect(count(sim, kind)).toBe(1);
  });

  it.each(categories)('leaves a %s just outside the new contact margin on the floor', kind => {
    const sim = quiet();
    add(sim, kind, { x: MOVEMENT.boostSpeed * FIXED_DT / 2, z: COLLECTION.current[kind] + 0.01 });
    sim.step(FIXED_DT, boost);
    expect(count(sim, kind)).toBe(0);
    expect(sim.state.status).toBe(kind === 'relay' ? 'boss' : 'playing');
  });

  it.each(categories)('cannot collect a nearby %s through solid scenery', kind => {
    const sim = quiet();
    add(sim, kind, { x: 0.05, z: COLLECTION.current[kind] - 0.01 });
    // The head has room to pass south of this thin piece of machinery, but
    // the collectible is on its other side within the forgiving radius.
    sim.state.obstacles = [{ x: 0.05, z: 0.39, width: 1, depth: 0.04 }];
    sim.step(FIXED_DT, boost);
    expect(count(sim, kind)).toBe(0);
    expect(sim.state.player.integrity).toBe(sim.state.player.maxIntegrity);
    expect(sim.state.status).toBe(kind === 'relay' ? 'boss' : 'playing');
  });

  it('retains full-slot and usefulness exclusions at the enlarged edge', () => {
    for (const kind of ['emp', 'decoy', 'repair', 'splice', 'blaster', 'capacitor'] as PickupKind[]) {
      const sim = quiet();
      sim.state.slots = [true, true]; sim.state.weapon.ammo = 12;
      sim.state.pickups = [{ id: `full-${kind}`, x: 0.05, z: 0.79, kind, ttl: 15 }];
      const equipment = structuredClone({ slots: sim.state.slots, ammo: sim.state.weapon.ammo, integrity: sim.state.player.integrity, length: sim.state.player.length });
      sim.step(FIXED_DT, boost);
      expect(sim.state.pickups.map(item => item.kind)).toEqual([kind]);
      expect({ slots: sim.state.slots, ammo: sim.state.weapon.ammo, integrity: sim.state.player.integrity, length: sim.state.player.length }).toEqual(equipment);
    }
  });

  it('keeps numbered spheres in order and makes an out-of-order edge contact harmless', () => {
    const sim = quiet(); add(sim, 'relay', { x: 4, z: 0 });
    const boss = sim.state.boss!;
    boss.relays.push({ id: 'test-relay-two', x: 0.05, z: 0.89, number: 2 });
    sim.step(FIXED_DT, boost);
    expect(boss.charge).toBe(0); expect(boss.relays).toHaveLength(2);
    expect(sim.state.player.integrity).toBe(sim.state.player.maxIntegrity);
    expect(sim.state.events.some(event => event.kind === 'relay-wrong')).toBe(true);
    boss.relays[1].x = 4;
    boss.relays[0].x = sim.state.player.x + 0.05; boss.relays[0].z = 0.89;
    sim.step(FIXED_DT, boost);
    expect(boss.charge).toBe(1);
    boss.relays[0].x = sim.state.player.x + 0.05;
    sim.step(FIXED_DT, boost);
    expect(boss.charge).toBe(2);
  });

  it('still resolves a simultaneous fatal crash before a collectible', () => {
    const sim = quiet();
    const edge = getLayout(sim.state).halfWidth - MOVEMENT.headRadius;
    sim.state.player.x = edge;
    for (const point of [...sim.state.player.body, ...sim.state.player.path]) point.x += edge;
    // Both contacts are at t=0, with no scenery to filter out collection first.
    sim.state.cores = [{ id: 'unsafe-core', x: edge, z: 0 }];
    sim.step(FIXED_DT, boost);
    expect(sim.state.status).toBe('dead'); expect(sim.state.coresCollected).toBe(0);
    expect(sim.state.cores).toHaveLength(1);
    expect(sim.state.deathCause).toContain('arena wall');
  });

  it('preserves both older content versions and exact contact behavior after save restoration', () => {
    for (const contentVersion of [LEGACY_CONTENT_VERSION, EXPANDED_CONTENT_VERSION, CONTENT_VERSION]) {
      const sim = quiet(contentVersion);
      add(sim, 'core', { x: 0.05, z: 0.70 });
      const restored = Simulation.restore(sim.snapshot());
      sim.step(FIXED_DT, boost); restored.step(FIXED_DT, boost);
      expect(sim.state.coresCollected).toBe(contentVersion === CONTENT_VERSION ? 1 : 0);
      expect(restored.snapshot()).toEqual(sim.snapshot());
    }
  });
});

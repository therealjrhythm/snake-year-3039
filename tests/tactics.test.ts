import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../src/game/content';
import { Simulation } from '../src/game/simulation';
import type { GameInput } from '../src/game/types';

const neutral: GameInput = { x: 1, y: 0, boost: false, swap: false, use: false, fire: false };
function encounter() {
  const sim = new Simulation({ seed: 3039417 });
  const s = sim.state;
  Object.assign(s, { wave: 2, coresCollected: 8, cores: [], pickups: [], mines: [], rivals: [], projectiles: [], gates: [], pendingSpawns: [], optionalTimer: 99999, coreRetry: 99999, selectedSlot: 1, slots: [true, true] });
  Object.assign(s.player, { x: -8, z: 6, heading: 0 });
  s.player.body = Array.from({ length: 8 }, (_, i) => ({ x: -8 - (i + 1) * .55, z: 6 }));
  s.player.path = Array.from({ length: 510 }, (_, i) => ({ x: -8 - i * .15, z: 6 }));
  s.drones = [{ id: 'lure-patrol', x: -7, z: 3, hp: 2, state: 'recover', timer: .25, cooldown: .25, disabled: 0, anchor: { x: -7, z: 3 }, phase: 0 }];
  return sim;
}
const advance = (sim: Simulation, frames: number) => { for (let i = 0; i < frames; i++) sim.step(FIXED_DT, neutral); };

describe('Decoy activation and future targeting', () => {
  it('uses one selected charge, leaves a stationary lure and redirects the next eligible lock', () => {
    const sim = encounter();
    sim.step(FIXED_DT, { ...neutral, use: true });
    for (let i = 0; i < 30; i++) sim.step(FIXED_DT, { ...neutral, use: true });
    const s = sim.state, lure = s.decoys[0];
    expect(s.pauseRequested).toBeNull();
    expect(s.slots).toEqual([true, false]);
    expect(s.events.filter(event => event.kind === 'decoy')).toHaveLength(1);
    expect(s.decoys).toHaveLength(1);
    expect({ x: lure.x, z: lure.z }).toEqual({ x: -8, z: 6 });
    expect(s.player.x).toBeGreaterThan(lure.x);
    expect(s.drones[0].targetDecoy).toBe(lure.id);
    expect(s.drones[0].target).toEqual({ x: lure.x, z: lure.z });
  });

  it('does not rewrite an already warned lock or bend a projectile that has been fired', () => {
    const sim = encounter(), s = sim.state;
    Object.assign(s.drones[0], { state: 'prepare', timer: .6, target: { x: -8, z: 5 }, targetDecoy: undefined });
    s.projectiles = [{ id: 'already-fired', x: 4, z: 6, vx: 0, vz: -4, ttl: 5 }];
    sim.step(FIXED_DT, { ...neutral, use: true });
    expect(s.drones[0].target).toEqual({ x: -8, z: 5 });
    expect(s.drones[0].targetDecoy).toBeUndefined();
    expect(s.projectiles[0].vx).toBe(0);
    expect(s.projectiles[0].vz).toBe(-4);
  });

  it('retains deployed lures through save/resume and removes an untouched lure after four simulation seconds', () => {
    const sim = encounter(); sim.state.drones = [];
    sim.step(FIXED_DT, { ...neutral, use: true });
    advance(sim, 30);
    const resumed = Simulation.restore(sim.snapshot());
    expect(resumed.state.decoys).toEqual(sim.state.decoys);
    advance(sim, 208); advance(resumed, 208);
    expect(sim.state.decoys).toHaveLength(1);
    expect(resumed.state.decoys).toEqual(sim.state.decoys);
    advance(sim, 3); advance(resumed, 3);
    expect(sim.state.status).toBe('playing');
    expect(sim.state.decoys).toHaveLength(0);
    expect(resumed.state.decoys).toHaveLength(0);
  });
});

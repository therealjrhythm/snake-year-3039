import { createServer } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Test-only, state-reading pilot. A fresh campaign receives ordinary 60 Hz inputs.
// It never edits world state, grants resources, uses a Lab, or skips a wave.
// Omniscient steering is not evidence of human difficulty or physical controls.
const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
const started = Date.now();
try {
  const { Simulation } = await server.ssrLoadModule('/src/game/simulation.ts');
  const { getLayout } = await server.ssrLoadModule('/src/game/layouts.ts');
  const { MOVEMENT, FIXED_DT } = await server.ssrLoadModule('/src/game/content.ts');
  if (process.argv[2] === '--replay') {
    const recorded = JSON.parse(await readFile(process.argv[3], 'utf8'));
    const replay = new Simulation({ seed: recorded.seed, difficulty: recorded.difficulty });
    let input = { x: 0, y: -1, boost: false, fire: false, use: false, swap: false };
    let cursor = 0;
    let observedEvent = 0;
    const eventCounts = {}, pickups = {}, nodeOrigins = [];
    const finalFrame = recorded.framesAdvanced ?? recorded.trace.at(-1).frame + 6;
    for (let frame = 0; frame < finalFrame && !['dead', 'complete'].includes(replay.state.status); frame++) {
      while (recorded.trace[cursor]?.frame === frame) {
        const entry = recorded.trace[cursor++];
        if (entry.action === 'beginBoss') {
          assert.equal(replay.state.status, 'boss-intro', 'A trace cannot enter Warden without earning the checkpoint');
          replay.beginBoss();
        } else input = entry.input;
      }
      replay.step(FIXED_DT, input);
      assert.equal(replay.state.pauseRequested, null);
      for (const event of replay.state.events.filter(event => event.id > observedEvent)) {
        observedEvent = event.id; eventCounts[event.kind] = (eventCounts[event.kind] ?? 0) + 1;
        if (event.kind === 'pickup') pickups[event.pickup ?? 'missing metadata'] = (pickups[event.pickup ?? 'missing metadata'] ?? 0) + 1;
        if (event.kind === 'boss-node') nodeOrigins.push(event.origin);
      }
    }
    for (const key of ['status', 'score']) assert.equal(replay.state[key], recorded[key], key);
    assert.equal(replay.state.totalCores, recorded.cores);
    assert.equal(replay.state.player.integrity, recorded.integrity);
    assert.ok(Math.abs(replay.state.time - recorded.time) < 1e-6);
    console.log(JSON.stringify({ replayPassed: true, freshCampaign: true, stateEdited: false, seed: recorded.seed, difficulty: recorded.difficulty, status: replay.state.status, time: replay.state.time, cores: replay.state.totalCores, integrity: replay.state.player.integrity, score: replay.state.score, rivalKills: replay.state.rivalKills, pickups, eventCounts, nodeOrigins, limitation: 'Deterministic input replay; no rendered or physical-controller evidence.' }, null, 2));
  } else {
  const seeds = (process.argv[2] ?? '3039').split(',').map(Number);
  const difficulty = process.argv[3] ?? 'standard';
  const keyboard = process.argv.includes('--keyboard');
  const robust = process.argv.includes('--robust');
  const reports = [];
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const delta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const segmentDistance = (p, a, b) => {
    const x = b.x - a.x, z = b.z - a.z;
    const t = clamp(((p.x - a.x) * x + (p.z - a.z) * z) / Math.max(1e-8, x * x + z * z), 0, 1);
    return Math.hypot(p.x - a.x - t * x, p.z - a.z - t * z);
  };
  for (const seed of seeds) {
    const sim = new Simulation({ seed, difficulty });
    const layout = getLayout(sim.state);
    const spacing = 0.75, nx = Math.floor((layout.width - 1.5) / spacing) + 1, nz = Math.floor((layout.depth - 1.5) / spacing) + 1;
    const points = Array.from({ length: nx * nz }, (_, i) => ({ x: -layout.halfWidth + 0.75 + (i % nx) * spacing, z: -layout.halfDepth + 0.75 + Math.floor(i / nx) * spacing }));
    const cell = p => clamp(Math.round((p.x + layout.halfWidth - 0.75) / spacing), 0, nx - 1) + nx * clamp(Math.round((p.z + layout.halfDepth - 0.75) / spacing), 0, nz - 1);
    let target = null;
    let input = { x: 0, y: -1, fire: false, boost: false, use: false, swap: false };
    let lastEvent = 0;
    let furthestWave = 1;
    let framesAdvanced = 0;
    const trace = [], milestones = [], eventCounts = {};
    const blocked = (point, time = 0, includeBody = true) => {
      const s = sim.state;
      if (Math.abs(point.x) > layout.halfWidth - 0.52 || point.z > layout.halfDepth - 0.52 || point.z < -layout.halfDepth + 0.52 && !(s.status === 'extraction' && Math.abs(point.x) < 1.3)) return true;
      if (s.obstacles.some(o => Math.abs(point.x - o.x) < o.width / 2 + 0.53 && Math.abs(point.z - o.z) < o.depth / 2 + 0.53)) return true;
      if (includeBody) {
        const remaining = Math.ceil(s.player.body.length - time * MOVEMENT.baseSpeed / MOVEMENT.spacing);
        for (let i = 1; i < remaining - 1; i++) if (segmentDistance(point, s.player.body[i], s.player.body[i + 1]) < 0.78) return true;
      }
      return s.rivals.some(r => r.state === 'hunting' && [r, ...r.body].some(part => distance(part, point) < 1.1));
    };
    const threatCost = point => {
      const s = sim.state;
      let cost = 0;
      for (const mine of s.mines) cost += Math.max(0, 2.4 - distance(point, mine)) * 8;
      for (const drone of s.drones) if (drone.state !== 'warning' && drone.disabled <= 0) cost += Math.max(0, 3 - distance(point, drone)) * 6;
      for (const shot of s.projectiles) cost += Math.max(0, 1.8 - distance(point, shot)) * 12;
      for (const gate of s.gates) if (gate.state === 'active' || gate.state === 'warning') {
        const a = { x: gate.x - (gate.axis === 'x' ? gate.length / 2 : 0), z: gate.z - (gate.axis === 'z' ? gate.length / 2 : 0) };
        const b = { x: gate.x + (gate.axis === 'x' ? gate.length / 2 : 0), z: gate.z + (gate.axis === 'z' ? gate.length / 2 : 0) };
        cost += Math.max(0, 1.6 - segmentDistance(point, a, b)) * 10;
      }
      return cost;
    };
    const selectTarget = () => {
      const s = sim.state, p = s.player;
      let goals;
      if (s.status === 'extraction') return { id: 'exit', x: 0, z: -layout.halfDepth - 1 };
      if (s.status === 'boss' && s.boss) {
        if (s.boss.charge < 3) goals = s.boss.relays.filter(r => r.number === s.boss.charge + 1);
        else if (s.boss.phase === 'recovery' || s.boss.phase === 'attack' && s.boss.phaseTime < 1.8) goals = [{ id: 'pad', ...s.boss.pad }];
        else goals = [];
      } else goals = [...s.cores];
      const pickups = s.pickups.filter(item => item.ttl > distance(item, p) / MOVEMENT.baseSpeed + 1 && (item.kind === 'repair' || item.kind === 'splice' || item.kind === 'blaster' && s.weapon.ammo < 4 || item.kind === 'shield' && s.buffs.shield < 2 || item.kind === 'magnet' && s.status === 'playing' || ['emp', 'decoy'].includes(item.kind)));
      if (s.status === 'playing') goals.push(...pickups.map(item => ({ ...item, priority: ['repair', 'shield', 'splice'].includes(item.kind) ? -3 : -1 })));
      if (!goals.length) goals = [{ id: 'loop0', x: -12, z: 9 }, { id: 'loop1', x: 12, z: 9 }, { id: 'loop2', x: 12, z: -9 }, { id: 'loop3', x: -12, z: -9 }].filter(point => distance(point, p) > 4);
      if (target && goals.some(goal => goal.id === target.id) && distance(target, p) > 0.4) return goals.find(goal => goal.id === target.id);
      return goals.sort((a, b) => distance(a, p) + (a.priority ?? 0) + Math.abs(delta(p.heading, Math.atan2(a.z - p.z, a.x - p.x))) * 1.3 - distance(b, p) - (b.priority ?? 0) - Math.abs(delta(p.heading, Math.atan2(b.z - p.z, b.x - p.x))) * 1.3)[0];
    };
    const steer = () => {
      const s = sim.state, p = s.player;
      target = selectTarget();
      const costs = new Float64Array(points.length).fill(Infinity);
      const blockedCells = points.map(point => blocked(point));
      const penalties = points.map(threatCost);
      let root = cell(target);
      if (blockedCells[root]) root = points.map((point, index) => ({ index, d: blockedCells[index] ? Infinity : distance(point, target) })).sort((a, b) => a.d - b.d)[0].index;
      // Small binary heap for Dijkstra distances around solid obstacles and the tail.
      const heap = [[0, root]];
      const push = (cost, index) => { let at = heap.length; heap.push([cost, index]); while (at) { const parent = (at - 1) >> 1; if (heap[parent][0] <= cost) break; heap[at] = heap[parent]; at = parent; } heap[at] = [cost, index]; };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let at = 0; while (at * 2 + 1 < heap.length) { let child = at * 2 + 1; if (child + 1 < heap.length && heap[child + 1][0] < heap[child][0]) child++; if (heap[child][0] >= last[0]) break; heap[at] = heap[child]; at = child; } heap[at] = last; } return top; };
      costs[root] = 0;
      while (heap.length) {
        const [cost, index] = pop(); if (cost !== costs[index]) continue;
        const x = index % nx, z = Math.floor(index / nx);
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
          if (!dx && !dz || x + dx < 0 || x + dx >= nx || z + dz < 0 || z + dz >= nz) continue;
          const next = index + dx + dz * nx;
          if (blockedCells[next] || dx && dz && (blockedCells[index + dx] || blockedCells[index + dz * nx])) continue;
          const nextCost = cost + spacing * Math.hypot(dx, dz) + penalties[next] * 0.12;
          if (nextCost < costs[next]) { costs[next] = nextCost; push(nextCost, next); }
        }
      }
      let waypoint = target;
      if (distance(p, target) > 2) {
        const nearby = points.map((point, index) => ({ point, cost: costs[index] + distance(point, p), d: distance(point, p) })).filter(item => item.d > 1.4 && item.d < 2.5 && Number.isFinite(item.cost));
        if (nearby.length) waypoint = nearby.sort((a, b) => a.cost - b.cost)[0].point;
      }
      const wanted = Math.atan2(waypoint.z - p.z, waypoint.x - p.x);
      const candidates = keyboard ? Array.from({ length: 8 }, (_, index) => index * Math.PI / 4) : [wanted, ...[0, -0.25, 0.25, -0.55, 0.55, -0.9, 0.9, -1.3, 1.3, -1.8, 1.8, Math.PI].map(offset => p.heading + offset)];
      let choice = p.heading, best = -Infinity;
      const ranked = [];
      for (const heading of candidates) {
        // Leave 30 degrees around an about-face: one delayed display frame
        // must not reverse which way a recorded keyboard turn travels.
        if (robust && Math.abs(delta(p.heading, heading)) > Math.PI * 5 / 6) continue;
        const point = { x: p.x, z: p.z }; let facing = p.heading, safe = 0, danger = 0;
        for (let t = 1; t <= 16; t++) {
          facing += clamp(delta(facing, heading), -MOVEMENT.turnRate * 0.1, MOVEMENT.turnRate * 0.1);
          point.x += Math.cos(facing) * MOVEMENT.baseSpeed * 0.1; point.z += Math.sin(facing) * MOVEMENT.baseSpeed * 0.1;
          if (blocked(point, t * 0.1)) break;
          safe++; danger += threatCost(point) * 0.2;
        }
        const route = Number.isFinite(costs[cell(point)]) ? costs[cell(point)] : distance(point, target) + 15;
        const progress = distance(p, target) < 3 ? distance(point, target) : route;
        const score = safe * 1000 - progress * 6 - danger - Math.abs(delta(p.heading, heading)) * 0.25;
        ranked.push({ heading, score });
        if (score > best) { best = score; choice = heading; }
      }
      // Prediction worlds restore exact snapshots and receive only inputs too.
      // They are discarded; the observed campaign is never replaced or edited.
      const snapshot = sim.snapshot();
      let forecastBest = -Infinity;
      for (const candidate of ranked.sort((a, b) => b.score - a.score).slice(0, 6)) {
        const forecast = Simulation.restore(snapshot);
        const command = { x: Math.cos(candidate.heading), y: Math.sin(candidate.heading), boost: false, fire: false, use: false, swap: false };
        let ticks = 0;
        for (; ticks < 54 && forecast.state.status !== 'dead'; ticks++) forecast.step(FIXED_DT, command);
        const score = candidate.score - (forecast.state.status === 'dead' ? 1000000 + (54 - ticks) * 1000 : 0) - (s.player.integrity - forecast.state.player.integrity) * 150;
        if (score > forecastBest) { forecastBest = score; choice = candidate.heading; }
      }
      const aimed = s.drones.some(drone => drone.state !== 'warning' && distance(p, drone) < 9 && Math.abs(delta(p.heading, Math.atan2(drone.z - p.z, drone.x - p.x))) < Math.PI / 6);
      const nearbyThreat = s.drones.some(drone => drone.disabled <= 0 && distance(p, drone) < (s.selectedSlot === 0 ? 3.6 : 5)) || s.rivals.some(rival => rival.state === 'hunting' && distance(rival, p) < 5);
      const dx = keyboard ? Math.round(Math.cos(choice)) : Math.cos(choice), dy = keyboard ? Math.round(Math.sin(choice)) : Math.sin(choice);
      const magnitude = keyboard ? Math.hypot(dx, dy) : 1;
      const x = Math.abs(dx) < 1e-8 ? 0 : dx / magnitude, y = Math.abs(dy) < 1e-8 ? 0 : dy / magnitude;
      return { x, y, boost: false, fire: s.weapon.ammo > 0 && aimed, use: s.slots[s.selectedSlot] && nearbyThreat, swap: !s.slots[s.selectedSlot] && s.slots[1 - s.selectedSlot] };
    };
    for (let frame = 0; frame < 60 * 480 && Date.now() - started < 90_000; frame++) {
      const s = sim.state;
      if (s.status === 'dead' || s.status === 'complete' || s.pauseRequested) break;
      if (s.status === 'boss-intro') { trace.push({ frame, action: 'beginBoss' }); sim.beginBoss(); target = null; }
      if (frame % 6 === 0) {
        input = steer();
        trace.push({ frame, input });
      }
      sim.step(FIXED_DT, input);
      framesAdvanced++;
      furthestWave = Math.max(furthestWave, s.wave);
      for (const event of s.events.filter(event => event.id > lastEvent)) {
        lastEvent = event.id; eventCounts[event.kind] = (eventCounts[event.kind] ?? 0) + 1;
        if (['wave', 'transition', 'boss-intro', 'boss', 'relay', 'boss-node', 'boss-defeated', 'complete', 'damage', 'crash'].includes(event.kind)) milestones.push({ time: +event.time.toFixed(2), kind: event.kind, text: event.text });
      }
    }
    const s = sim.state;
    const report = { seed, difficulty, inputMode: keyboard ? 'eight-direction keyboard' : 'analog', steeringTurnMarginDegrees: robust ? 30 : 0, framesAdvanced, termination: s.status === 'complete' ? 'completed' : s.status === 'dead' ? 'death' : s.pauseRequested ? 'automatic-pause' : Date.now() - started >= 90_000 ? 'wall-time-budget' : 'simulation-time-limit', contentVersion: s.contentVersion, freshCampaign: true, stateEdited: false, steering: 'omniscient grid routing plus isolated exact-snapshot forecasts; only input frames affect the campaign', mode: s.mode, status: s.status, cause: s.deathCause || s.pauseRequested, time: s.time, wave: furthestWave, cores: s.totalCores, integrity: s.player.integrity, score: s.score, boss: s.boss ? { nodes: s.boss.nodes, charge: s.boss.charge } : null, eventCounts, milestones, trace };
    const output = `/tmp/s39-ordinary-${seed}-${difficulty}${keyboard ? '-keyboard' : ''}${robust ? '-robust' : ''}.json`;
    await writeFile(output, JSON.stringify(report));
    reports.push({ ...report, trace: `${trace.length} input/control records in ${output}` });
    console.log(JSON.stringify(reports.at(-1), null, 2));
  }
  }
} finally { await server.close(); }

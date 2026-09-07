import { BLASTER, CONTENT_VERSION, LEGACY_CONTENT_VERSION, DISTRICTS, FIXED_DT, MOVEMENT, PICKUPS, RULES } from './content';
import { getLayout } from './layouts';
import { GAME_EVENT_KINDS } from './types';
import type { Difficulty, GameEvent, GameEventKind, GameInput, GameMode, Gate, LabKind, LayoutId, Obstacle, PickupKind, Positioned, Rival, SimulationState, Snake, Vec2 } from './types';

export { FIXED_DT } from './content';
const EPSILON = 1e-8;
const HEAD = MOVEMENT.headRadius;
const BODY = MOVEMENT.bodyRadius;
const TAU = Math.PI * 2;
const EMPTY_INPUT: GameInput = { x: 0, y: 0, boost: false, use: false, swap: false };

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
const copy = (p: Vec2): Vec2 => ({ x: p.x, z: p.z });
const mix = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
const angleDelta = (a: number, b: number) => ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;

function turn(snake: Snake, desired: number, dt: number): void {
  let delta = angleDelta(snake.heading, desired);
  if (Math.abs(Math.abs(delta) - Math.PI) < 1e-6) delta = Math.PI * (snake.lastTurn || 1);
  const change = clamp(delta, -MOVEMENT.turnRate * dt, MOVEMENT.turnRate * dt);
  if (Math.abs(change) > EPSILON) snake.lastTurn = Math.sign(change);
  snake.heading = ((snake.heading + change + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

function initialSnake(x: number, z: number, heading: number, length: number): Snake {
  const path: Vec2[] = [];
  for (let d = 0; d <= 76; d += 0.15) path.push({ x: x - Math.cos(heading) * d, z: z - Math.sin(heading) * d });
  const snake: Snake = { x, z, heading, length, path, body: [], lastTurn: 1 };
  sampleBody(snake, length);
  return snake;
}

function sampleBody(snake: Snake, length: number): void {
  const result: Vec2[] = [];
  let pathIndex = 1;
  let before = 0;
  for (let segment = 1; segment <= Math.ceil(length); segment++) {
    const target = Math.min(segment, length) * MOVEMENT.spacing;
    while (pathIndex < snake.path.length - 1 && before + distance(snake.path[pathIndex - 1], snake.path[pathIndex]) < target) {
      before += distance(snake.path[pathIndex - 1], snake.path[pathIndex]);
      pathIndex++;
    }
    const previous = snake.path[pathIndex - 1];
    const next = snake.path[pathIndex];
    const span = distance(previous, next);
    result.push(mix(previous, next, clamp((target - before) / Math.max(span, EPSILON), 0, 1)));
  }
  snake.body = result;
}

function advanceSnake(snake: Snake, speed: number, dt: number, visibleLength = snake.length): void {
  snake.x += Math.cos(snake.heading) * speed * dt;
  snake.z += Math.sin(snake.heading) * speed * dt;
  snake.path.unshift(copy(snake));
  let travelled = 0;
  for (let index = 1; index < snake.path.length; index++) {
    travelled += distance(snake.path[index - 1], snake.path[index]);
    if (travelled > 75) { snake.path.length = index + 1; break; }
  }
  sampleBody(snake, visibleLength);
}

function pointSegmentDistance(point: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = clamp(((point.x - a.x) * dx + (point.z - a.z) * dz) / Math.max(dx * dx + dz * dz, EPSILON), 0, 1);
  return distance(point, { x: a.x + dx * t, z: a.z + dz * t });
}

/** Earliest time in [0,1] of a swept point entering a circle. */
function circleTOI(start: Vec2, end: Vec2, center: Vec2, radius: number): number | null {
  const x = start.x - center.x;
  const z = start.z - center.z;
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const c = x * x + z * z - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dz * dz;
  if (a < EPSILON) return null;
  const b = 2 * (x * dx + z * dz);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= -EPSILON && t <= 1 + EPSILON ? clamp(t, 0, 1) : null;
}

/** A capsule preserves collision coverage between the rendered body segments. */
function capsuleTOI(start: Vec2, end: Vec2, a: Vec2, b: Vec2, radius: number): number | null {
  if (pointSegmentDistance(start, a, b) <= radius) return 0;
  const times = [circleTOI(start, end, a, radius), circleTOI(start, end, b, radius)].filter((time): time is number => time !== null);
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const length = Math.hypot(vx, vz);
  if (length > EPSILON) {
    const nx = -vz / length;
    const nz = vx / length;
    const startSide = (start.x - a.x) * nx + (start.z - a.z) * nz;
    const sideChange = (end.x - start.x) * nx + (end.z - start.z) * nz;
    if (Math.abs(sideChange) > EPSILON) for (const side of [-radius, radius]) {
      const t = (side - startSide) / sideChange;
      if (t < 0 || t > 1) continue;
      const point = mix(start, end, t);
      const along = ((point.x - a.x) * vx + (point.z - a.z) * vz) / (length * length);
      if (along >= 0 && along <= 1) times.push(t);
    }
  }
  return times.length ? Math.min(...times) : null;
}

function bodyTOI(start: Vec2, end: Vec2, body: Vec2[], radius: number, skip = 0): number | null {
  let first: number | null = null;
  for (let i = skip; i < body.length; i++) {
    const t = i + 1 < body.length ? capsuleTOI(start, end, body[i], body[i + 1], radius) : circleTOI(start, end, body[i], radius);
    if (t !== null && (first === null || t < first)) first = t;
  }
  return first;
}

function rectangleTOI(start: Vec2, end: Vec2, box: Obstacle, radius: number): number | null {
  let near = 0;
  let far = 1;
  for (const axis of ['x', 'z'] as const) {
    const half = (axis === 'x' ? box.width : box.depth) / 2 + radius;
    const delta = end[axis] - start[axis];
    if (Math.abs(delta) < EPSILON) {
      if (start[axis] < box[axis] - half || start[axis] > box[axis] + half) return null;
    } else {
      const t1 = (box[axis] - half - start[axis]) / delta;
      const t2 = (box[axis] + half - start[axis]) / delta;
      near = Math.max(near, Math.min(t1, t2));
      far = Math.min(far, Math.max(t1, t2));
      if (near > far) return null;
    }
  }
  return near >= 0 && near <= 1 ? near : null;
}

function roundedRectangleTOI(start: Vec2, end: Vec2, box: Obstacle, radius: number): number | null {
  const times: number[] = [];
  const include = (time: number | null) => { if (time !== null) times.push(time); };
  include(rectangleTOI(start, end, { ...box, width: box.width + radius * 2 }, 0));
  include(rectangleTOI(start, end, { ...box, depth: box.depth + radius * 2 }, 0));
  for (const x of [-1, 1]) for (const z of [-1, 1]) include(circleTOI(start, end, { x: box.x + box.width / 2 * x, z: box.z + box.depth / 2 * z }, radius));
  return times.length ? Math.min(...times) : null;
}

function gateEnds(gate: Gate): [Vec2, Vec2] {
  return gate.axis === 'x'
    ? [{ x: gate.x - gate.length / 2, z: gate.z }, { x: gate.x + gate.length / 2, z: gate.z }]
    : [{ x: gate.x, z: gate.z - gate.length / 2 }, { x: gate.x, z: gate.z + gate.length / 2 }];
}

interface CollisionEvent { time: number; priority: number; id: string; resolve: () => void }

/** Pure, serializable game world. Rendering and audio consume this state but never drive its rules. */
export class Simulation {
  public state: SimulationState;
  private previousUse = false;
  private previousSwap = false;
  private queuedUse = false;
  private queuedSwap = false;

  constructor(options: { seed?: number; difficulty?: Difficulty; mode?: GameMode; layoutId?: LayoutId } = {}) {
    const seed = (options.seed ?? 3039) >>> 0 || 3039;
    const difficulty = options.difficulty ?? 'standard';
    const integrity = RULES[difficulty].integrity;
    const layout = getLayout(options.layoutId);
    this.state = {
      version: 1, contentVersion: layout.id === 'neon-spire-v1' ? LEGACY_CONTENT_VERSION : CONTENT_VERSION, layoutId: layout.id, status: 'playing', mode: options.mode ?? 'campaign', difficulty,
      time: 0, accumulator: 0, pauseRequested: null,
      player: { ...initialSnake(layout.playerStart.x, layout.playerStart.z, layout.playerStart.heading, 8), integrity, maxIntegrity: integrity, boost: 100, boostLocked: false, boosting: false, boostRest: 0, protection: 0, splice: null },
      wave: 1, waveTime: 0, transitionTime: 0, coresCollected: 0, totalCores: 0, quota: 12,
      score: 0, combo: 1, chain: 0, comboTimer: 0, selectedSlot: 0, slots: [false, false],
      buffs: { overdrive: 0, shield: 0, surge: 0, magnet: 0, scrubber: 0, 'chain-buffer': 0 },
      weapon: { ammo: 0, cooldown: 0, emptyCooldown: 0 }, playerProjectiles: [],
      supply: { cursor: 0, pending: [], introduced: [], boostUsed: false, retry: 0 }, lab: null,
      cores: [], pickups: [], mines: [], drones: [], rivals: [], projectiles: [], gates: [],
      obstacles: layout.obstacles.map(obstacle => ({ ...obstacle })),
      boss: null, event: null, events: [], eventCounter: 0, deathCause: '', seed, rng: seed,
      runId: `s39-${seed}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
      rivalKills: 0, nextId: 1, pendingSpawns: [], optionalTimer: 8, spawnBlockedTime: 0, coreRetry: 0,
      spawnedLimitedPickups: [], processedEvents: [], contacts: [], decoys: [], empInterrupts: 0, damageTaken: 0, maxCombo: 1,
    };
    this.setupWave(1);
    this.emit('start', 'NEON SPIRE · Recover 12 energy cores.');
  }

  /** dt is elapsed real time. Internal integration always uses the same fixed 60 Hz step. */
  step(dt: number, input: GameInput = EMPTY_INPUT): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (['dead', 'complete', 'boss-intro'].includes(this.state.status) || this.state.pauseRequested) {
      this.clearInput();
      return;
    }
    if (dt > 0.25) {
      this.state.pauseRequested = 'Performance pause · a long frame interrupted the signal.';
      this.state.accumulator = 0;
      this.clearInput();
      return;
    }
    this.queuedUse ||= input.use && !this.previousUse;
    this.queuedSwap ||= input.swap && !this.previousSwap;
    this.previousUse = input.use;
    this.previousSwap = input.swap;
    this.state.accumulator += dt * RULES[this.state.difficulty].clock;
    let steps = 0;
    while (this.state.accumulator + EPSILON >= FIXED_DT && steps < 5) {
      this.state.accumulator = Math.max(0, this.state.accumulator - FIXED_DT);
      this.tick(FIXED_DT, input);
      steps++;
      if (['dead', 'complete', 'boss-intro'].includes(this.state.status)) { this.state.accumulator = 0; break; }
    }
    if (this.state.accumulator + EPSILON >= FIXED_DT) {
      this.state.pauseRequested = 'Performance pause · the simulation could not keep pace.';
      this.state.accumulator = 0;
      this.clearInput();
    }
  }

  /** Call when focus is lost or an interface layer takes input ownership. */
  clearInput(): void {
    this.previousUse = false;
    this.previousSwap = false;
    this.queuedUse = false;
    this.queuedSwap = false;
    this.state.player.boosting = false;
  }

  /** The application owns the explicit countdown; this removes only the simulation's recovery latch. */
  resume(): void { this.state.pauseRequested = null; this.state.accumulator = 0; this.clearInput(); }

  beginBoss(): void {
    if (this.state.status !== 'boss-intro') return;
    this.state.status = 'boss';
    const layout = getLayout(this.state);
    this.state.boss = { id: 'B1', nodes: 3, charge: 0, phase: 'safe', phaseTime: 3, relays: [], pad: copy(layout.boss.pad), cycle: 0, relayRetry: 0, relayBlockedTime: 0, stage: 'collecting-relays', receptor: copy(layout.boss.receptor), receptorHits: 0, relayFeedbackCooldown: 0 };
    this.state.gates = [{ id: this.id('warden-beam'), ...layout.boss.sectors[0], state: 'safe', timer: 3, disabled: 0, boss: true }];
    this.refillRelays();
    this.state.pendingSpawns = [{ id: this.id('support'), kind: 'drone', at: this.state.waveTime + 5, position: copy(layout.boss.supportSpawn) }];
    this.clearInput();
    this.emit('boss', 'WARDEN · Collect 1 → 2 → 3. Cross the round pad at the bottom-center when it turns green.');
  }

  snapshot(): SimulationState { return JSON.parse(JSON.stringify(this.state)) as SimulationState; }

  /** Explicit, isolated teaching scenes. These never enter campaign or records. */
  static createLab(kind: LabKind, seed = 3039120): Simulation {
    if (kind !== 'warden' && !Object.keys(PICKUPS).includes(kind)) throw new Error('Unknown Practice Lab system.');
    const sim = new Simulation({ mode: 'practice', seed });
    const s = sim.state;
    s.lab = kind; s.pendingSpawns = []; s.mines = []; s.drones = []; s.rivals = []; s.gates = [];
    s.cores = []; s.pickups = []; s.optionalTimer = 99999; s.coreRetry = 99999;
    s.supply.pending = []; s.events = []; s.event = null; s.eventCounter = 0;
    if (kind === 'warden') {
      s.status = 'boss-intro'; s.wave = 3; sim.beginBoss(); s.pendingSpawns = [];
      s.weapon.ammo = 12; s.slots[0] = true;
    } else {
      if (kind === 'splice') Object.assign(s.player, initialSnake(0, 2, -Math.PI / 2, 16));
      s.pickups.push({ id: sim.id('lab-pickup'), x: s.player.x, z: s.player.z - 1.2, kind, ttl: 15 });
      if (kind === 'overdrive' || kind === 'capacitor') { s.player.boost = 30; s.supply.boostUsed = true; }
      if (kind === 'repair') s.player.integrity--;
      if (kind === 'magnet') s.cores = [{ id: sim.id('lab-core'), x: 1.8, z: 3 }, { id: sim.id('lab-core'), x: -1.8, z: 1 }, { id: sim.id('lab-core'), x: 1.8, z: -2 }];
      if (kind === 'surge') s.cores = [{ id: sim.id('lab-core'), x: 0, z: 2 }, { id: sim.id('lab-core'), x: 0, z: -3 }];
      if (kind === 'chain-buffer') {
        s.chain = 3; s.combo = 2; s.maxCombo = 2; s.comboTimer = 2;
        s.cores = [{ id: sim.id('lab-core'), x: 0, z: -8 }];
      }
      if (['shield', 'scrubber'].includes(kind)) s.projectiles = [{ id: sim.id('lab-shot'), x: 0, z: -1, vx: 0, vz: 4, ttl: 6 }];
      if (['emp', 'decoy', 'blaster'].includes(kind)) s.drones = [{ id: sim.id('lab-patrol'), x: kind === 'blaster' ? 0 : 2, z: 0, hp: 2, state: 'recover', timer: kind === 'blaster' ? 30 : 0.8, cooldown: 0.8, disabled: 0, anchor: { x: kind === 'blaster' ? 0 : 2, z: 0 }, phase: 0 }];
    }
    sim.emit('lab-ready', kind === 'warden' ? 'WARDEN LAB · Collect 1 → 2 → 3. Find the round pad at the bottom-center; cross it when green.' : `${PICKUPS[kind].name.toUpperCase()} LAB · Collect the marked pickup. Reset or refill to try again.`, kind === 'warden' ? {} : { pickup: kind });
    return sim;
  }

  refillLab(kind: LabKind = this.state.lab ?? 'overdrive'): void {
    if (this.state.mode !== 'practice' || !this.state.lab) throw new Error('Refill is only available inside Practice Lab.');
    this.state = Simulation.createLab(kind, this.state.seed).state;
    this.clearInput();
  }

  static restore(snapshot: unknown): Simulation {
    const encoded = JSON.stringify(snapshot);
    if (!encoded || encoded.length > 1_500_000) throw new Error('Save is empty or exceeds the 1.5 MB limit.');
    const parsed: unknown = JSON.parse(encoded);
    validateSnapshot(parsed);
    const simulation = new Simulation({ seed: parsed.seed, difficulty: parsed.difficulty, mode: parsed.mode, layoutId: parsed.contentVersion === LEGACY_CONTENT_VERSION ? 'neon-spire-v1' : 'neon-spire-v2' });
    // Original v1 saves predate retained feedback; migrate only this presentation data.
    if (parsed.event && parsed.event.time === undefined) parsed.event.time = parsed.time;
    parsed.events ??= parsed.event ? [{ ...parsed.event }] : [];
    parsed.layoutId ??= 'neon-spire-v1';
    parsed.weapon ??= { ammo: 0, cooldown: 0, emptyCooldown: 0 };
    parsed.playerProjectiles ??= [];
    parsed.supply ??= { cursor: 0, pending: [], introduced: [], boostUsed: false, retry: 0 };
    parsed.lab ??= null;
    parsed.buffs.scrubber ??= 0; parsed.buffs['chain-buffer'] ??= 0;
    if (parsed.boss) {
      parsed.boss.receptor ??= copy(getLayout(parsed).boss.receptor);
      parsed.boss.receptorHits ??= 0; parsed.boss.relayFeedbackCooldown ??= 0;
      parsed.boss.stage ??= parsed.boss.nodes <= 0 ? 'defeated' : parsed.boss.charge < 3 ? 'collecting-relays' : parsed.boss.phase === 'recovery' ? 'exposed' : 'charge-ready';
    }
    simulation.state = parsed;
    simulation.state.accumulator = 0;
    simulation.state.pauseRequested = null;
    simulation.updateBossStage();
    simulation.clearInput();
    return simulation;
  }

  private tick(dt: number, input: GameInput): void {
    const s = this.state;
    s.time += dt;
    s.waveTime += dt;
    this.tickResources(dt, input);
    if (this.queuedSwap) { s.selectedSlot = s.selectedSlot === 0 ? 1 : 0; this.emit('select', `${s.selectedSlot === 0 ? 'EMP' : 'DECOY'} selected`); }
    if (this.queuedUse) this.useTactical();
    this.queuedSwap = false;
    this.queuedUse = false;
    this.tickWeapon(dt, input);

    const previousPlayer = copy(s.player);
    const previousBody = s.player.body.map(copy);
    const previousRivals = new Map(s.rivals.map(rival => [rival.id, { head: copy(rival), body: rival.body.map(copy), state: rival.state }]));
    const previousDrones = new Map(s.drones.map(drone => [drone.id, copy(drone)]));
    const previousProjectiles = new Map(s.projectiles.map(projectile => [projectile.id, copy(projectile)]));
    const previousPlayerShots = new Map(s.playerProjectiles.map(projectile => [projectile.id, copy(projectile)]));

    if (Number.isFinite(input.x) && Number.isFinite(input.y) && Math.hypot(input.x, input.y) > EPSILON) turn(s.player, Math.atan2(input.y, input.x), dt);
    const visibleLength = s.player.splice ? s.player.splice.to + (s.player.splice.from - s.player.splice.to) * s.player.splice.remaining / 0.3 : s.player.length;
    advanceSnake(s.player, s.player.boosting ? MOVEMENT.boostSpeed : MOVEMENT.baseSpeed, dt, visibleLength);

    if (s.status === 'playing' || s.status === 'boss') {
      this.tickDirector(dt);
      this.tickMines(dt);
      this.tickGates(dt);
      this.tickDrones(dt);
      this.tickRivals(dt);
      this.tickProjectiles(dt);
      this.tickPlayerProjectiles(dt);
      this.tickScrubber();
      if (s.status === 'boss') this.tickBoss(dt);
    }
    this.tickMagnet(dt);
    this.resolveCollisions(previousPlayer, previousBody, previousRivals, previousDrones, previousProjectiles, previousPlayerShots);
    if (s.status === 'dead' || s.status === 'complete') return;

    const layout = getLayout(s);
    s.projectiles = s.projectiles.filter(p => p.ttl > 0 && Math.abs(p.x) < layout.halfWidth + 2 && Math.abs(p.z) < layout.halfDepth + 2);
    s.playerProjectiles = s.playerProjectiles.filter(p => p.ttl > 0 && p.range > EPSILON);
    s.pickups = s.pickups.filter(p => p.ttl > 0);
    s.decoys = s.decoys.filter(p => p.ttl > 0);

    if (s.status === 'transition') {
      s.transitionTime -= dt;
      if (s.transitionTime <= EPSILON) this.setupWave(s.wave + 1);
    } else if (s.status === 'playing' && s.coresCollected >= s.quota) this.completeWave();
    else if (s.status === 'boss' && s.boss && s.boss.nodes <= 0) this.defeatBoss();
  }

  private tickResources(dt: number, input: GameInput): void {
    const s = this.state;
    const p = s.player;
    p.protection = Math.max(0, p.protection - dt);
    for (const key of Object.keys(s.buffs) as (keyof SimulationState['buffs'])[]) {
      const previous = s.buffs[key];
      s.buffs[key] = Math.max(0, previous - dt);
      if (previous > 0 && s.buffs[key] === 0 && !this.legacy) this.emit('power-expired', `${PICKUPS[key].name.toUpperCase()} expired.`, { pickup: key });
    }
    for (const pickup of s.pickups) pickup.ttl -= dt;
    for (const decoy of s.decoys) decoy.ttl -= dt;
    s.comboTimer = Math.max(0, s.comboTimer - dt);
    if (s.chain && s.comboTimer === 0) {
      if (s.buffs['chain-buffer'] > 0 && !this.legacy) { s.buffs['chain-buffer'] = 0; s.comboTimer = 3; this.emit('chain-buffer', 'CHAIN BUFFER · Combo saved for 3 more seconds.', { pickup: 'chain-buffer' }); }
      else this.resetCombo();
    }
    if (!input.boost) p.boostLocked = false;
    p.boosting = input.boost && !p.boostLocked && p.boost > 0;
    if (p.boosting) {
      p.boost = Math.max(0, p.boost - (s.buffs.overdrive > 0 ? 12.5 : 25) * dt);
      p.boostRest = 0;
      if (p.boost < 65) s.supply.boostUsed = true;
      if (p.boost <= EPSILON) { p.boost = 0; p.boosting = false; p.boostLocked = true; this.emit('boost-empty', 'Boost depleted · release to recharge.'); }
    } else {
      p.boostRest += dt;
      if (p.boostRest >= 0.75) p.boost = Math.min(100, p.boost + 15 * dt);
    }
    if (p.splice) {
      p.splice.remaining = Math.max(0, p.splice.remaining - dt);
      if (p.splice.remaining <= 0) { p.length = p.splice.to; p.splice = null; }
    }
  }

  private setupWave(wave: number): void {
    const s = this.state;
    const layout = getLayout(s);
    const definition = DISTRICTS[0].waves[wave - 1];
    s.wave = wave;
    s.waveTime = 0;
    s.status = 'playing';
    s.coresCollected = 0;
    s.quota = definition.quota;
    s.optionalTimer = 8;
    s.coreRetry = 0;
    s.spawnBlockedTime = 0;
    s.spawnedLimitedPickups = [];
    s.pendingSpawns = [];
    s.contacts = [];
    for (let i = 0; i < definition.threats.mines; i++) s.pendingSpawns.push({ id: this.id('mine'), kind: 'mine', at: 4 + i * 6, position: copy(layout.mineSpawns[i]) });
    for (let i = 0; i < definition.threats.patrol; i++) s.pendingSpawns.push({ id: this.id('patrol'), kind: 'drone', at: 3 + i * 5, position: copy(layout.droneSpawns[i]) });
    if (definition.threats.hunter) s.pendingSpawns.push({ id: this.id('hunter'), kind: 'rival', at: 8, position: copy(layout.rivalSpawn), heading: layout.rivalSpawn.heading });
    s.gates = definition.threats.gates ? [{ id: this.id('gate'), ...layout.regularGate, state: 'safe', timer: 3, disabled: 0, boss: false }] : [];
    if (wave === 1) {
      for (const point of layout.initialCores) s.cores.push({ id: this.id('core'), ...point });
      s.pickups.push({ id: this.id('pickup'), ...layout.initialOverdrive, kind: 'overdrive', ttl: 15 });
      if (!this.legacy) s.supply.introduced.push('overdrive');
    } else {
      this.fillCores();
      if (this.legacy) {
        const point = this.findPosition('pickup');
        if (point) s.pickups.push({ id: this.id('pickup'), ...point, kind: wave === 2 ? 'emp' : 'shield', ttl: 15 });
      } else this.queueIntroductions();
    }
    this.emit('wave', `WAVE ${wave} / 3 · Recover ${s.quota} energy cores${wave === 3 ? ' · HUNTER inbound' : ''}.`);
  }

  private completeWave(): void {
    const s = this.state;
    s.cores = [];
    s.projectiles = [];
    s.playerProjectiles = [];
    s.mines = [];
    s.drones = [];
    s.rivals = [];
    s.gates = [];
    s.pendingSpawns = [];
    s.contacts = [];
    this.resetCombo();
    s.buffs['chain-buffer'] = 0;
    if (s.wave < 3) {
      s.status = 'transition';
      s.transitionTime = 3;
      this.emit('transition', `Wave ${s.wave} complete · Keep moving. Next signal in 3s.`);
    } else {
      s.status = 'boss-intro';
      s.pickups = [];
      s.player.integrity = Math.min(s.player.maxIntegrity, s.player.integrity + 1);
      s.player.boosting = false;
      this.emit('boss-intro', 'CHECKPOINT · Warden perimeter sentinel online. Integrity repaired +1.');
    }
  }

  private tickDirector(dt: number): void {
    const s = this.state;
    if (s.lab) return;
    s.coreRetry -= dt;
    if (s.status === 'playing' && s.cores.length < Math.min(3, s.quota - s.coresCollected) && s.coreRetry <= 0) {
      const filled = this.fillCores();
      s.coreRetry = 0.25;
      s.spawnBlockedTime = filled ? 0 : s.spawnBlockedTime + 0.25;
    }
    if (s.spawnBlockedTime >= 3 || (s.boss?.relayBlockedTime ?? 0) >= 3) {
      // Keep existing hazards honest while suspending new pressure until an executable core route reopens.
      for (const drone of s.drones) if (drone.state === 'prepare') { drone.state = 'recover'; drone.timer = 1; }
      return;
    }
    for (const pending of [...s.pendingSpawns]) {
      if (s.waveTime < pending.at) continue;
      if (pending.kind === 'rival') {
        const rival = { ...initialSnake(pending.position.x, pending.position.z, pending.heading ?? 0, 12), id: pending.id, state: 'warning' as const, warning: this.warningTime(1.5), desiredHeading: pending.heading ?? 0, planning: 0, speed: 4.2 };
        if (!this.rivalSpawnSafe(rival)) { pending.at += 0.5; continue; }
        s.rivals.push(rival);
        this.emit('rival-warning', 'HUNTER approach · Cross its path. Let your BODY make the hit.');
      } else {
        let point = pending.position;
        if (!this.positionSafe(point, 'hazard')) {
          const fallback = this.findPosition('hazard');
          if (!fallback) { pending.at += 0.5; continue; }
          point = fallback;
        }
        if (pending.kind === 'mine') s.mines.push({ id: pending.id, ...point, armed: false, armTime: this.warningTime(1) });
        else s.drones.push({ id: pending.id, ...point, state: 'warning', timer: this.warningTime(1.5), cooldown: 2.5, disabled: 0, anchor: copy(point), phase: this.random() * TAU, ...(!this.legacy ? { hp: 2 } : {}) });
      }
      s.pendingSpawns = s.pendingSpawns.filter(item => item.id !== pending.id);
    }
    if (s.status !== 'playing') return;
    if (!this.legacy) {
      this.queueIntroductions();
      s.supply.retry = Math.max(0, s.supply.retry - dt);
      if (s.supply.pending.length && s.pickups.length < 3 && s.supply.retry === 0) {
        const kind = s.supply.pending.find(item => (item === 'emp' || item === 'decoy') && this.pickupUseful(item)) ?? s.supply.pending.find(item => this.pickupUseful(item));
        if (kind && this.placePickup(kind)) s.supply.pending = s.supply.pending.filter(item => item !== kind);
        s.supply.retry = 0.5;
      }
    }
    s.optionalTimer -= dt;
    if (s.optionalTimer <= 0) {
      s.optionalTimer += 8;
      if (!this.legacy || s.pickups.length < 3) this.spawnPickup();
    }
  }

  private fillCores(): boolean {
    const s = this.state;
    const count = Math.min(3, s.quota - s.coresCollected);
    while (s.cores.length < count) {
      const point = this.findPosition('core');
      if (!point) return false;
      s.cores.push({ id: this.id('core'), ...point });
    }
    return true;
  }

  private spawnPickup(): void {
    const s = this.state;
    if (!this.legacy) {
      const tactical = s.supply.cursor === 0 ? 'emp' : s.supply.cursor === 1 ? 'decoy' : null;
      let selected: PickupKind | undefined = tactical && this.pickupUnlocked(tactical) && this.pickupUseful(tactical) ? tactical : undefined;
      if (!selected) {
        const eligible = (Object.keys(PICKUPS) as PickupKind[]).filter(kind => kind !== 'emp' && kind !== 'decoy' && this.pickupUnlocked(kind) && this.pickupUseful(kind));
        if (!eligible.length) return;
        let roll = this.random() * eligible.reduce((sum, kind) => sum + PICKUPS[kind].weight, 0);
        selected = eligible[eligible.length - 1];
        for (const kind of eligible) { roll -= PICKUPS[kind].weight; if (roll <= 0) { selected = kind; break; } }
      }
      const placed = this.placePickup(selected);
      if (!placed && (selected === 'emp' || selected === 'decoy') && !s.supply.pending.includes(selected)) s.supply.pending.push(selected);
      s.supply.cursor = ((s.supply.cursor + 1) % 3) as 0 | 1 | 2;
      return;
    }
    const eligible = (Object.keys(PICKUPS) as PickupKind[]).filter(kind => {
      if (['blaster', 'capacitor', 'scrubber', 'chain-buffer'].includes(kind)) return false;
      if (s.mode !== 'practice' && !['overdrive', 'surge', ...(s.wave >= 2 ? ['shield', 'emp'] : [])].includes(kind)) return false;
      if (kind === 'repair' && (s.player.integrity >= s.player.maxIntegrity || s.spawnedLimitedPickups.includes(kind))) return false;
      if (kind === 'splice' && (s.player.length <= 8 || s.player.splice || s.spawnedLimitedPickups.includes(kind))) return false;
      if (kind === 'emp' && s.slots[0] || kind === 'decoy' && s.slots[1]) return false;
      return true;
    });
    const point = this.findPosition('pickup');
    if (!eligible.length || !point) return;
    let roll = this.random() * eligible.reduce((sum, kind) => sum + PICKUPS[kind].weight, 0);
    let selected = eligible[eligible.length - 1];
    for (const kind of eligible) { roll -= PICKUPS[kind].weight; if (roll <= 0) { selected = kind; break; } }
    s.pickups.push({ id: this.id('pickup'), ...point, kind: selected, ttl: 15 });
    if (selected === 'repair' || selected === 'splice') s.spawnedLimitedPickups.push(selected);
  }

  private get legacy(): boolean { return this.state.contentVersion === LEGACY_CONTENT_VERSION; }

  private pickupUnlocked(kind: PickupKind): boolean {
    const s = this.state;
    if (s.mode === 'practice') return true;
    const unlock = PICKUPS[kind].unlock;
    return s.wave >= unlock.wave && (s.wave > unlock.wave || s.coresCollected >= (unlock.waveCores ?? 0)) && s.totalCores >= (unlock.totalCores ?? 0) && (!unlock.boostUsed || s.supply.boostUsed) && s.maxCombo >= (unlock.combo ?? 1);
  }

  private pickupUseful(kind: PickupKind): boolean {
    const s = this.state;
    if (s.pickups.some(pickup => pickup.kind === kind)) return false;
    if (kind === 'emp') return !s.slots[0];
    if (kind === 'decoy') return !s.slots[1];
    if (kind === 'repair') return s.player.integrity < s.player.maxIntegrity && !s.spawnedLimitedPickups.includes(kind);
    if (kind === 'splice') return s.player.length > 8 && !s.player.splice && !s.spawnedLimitedPickups.includes(kind);
    if (kind === 'capacitor') return s.player.boost < 65;
    if (kind === 'blaster') return s.weapon.ammo < BLASTER.ammo;
    return true;
  }

  private queueIntroductions(): void {
    const s = this.state;
    const order: PickupKind[] = ['overdrive', 'surge', 'magnet', 'shield', 'emp', 'repair', 'decoy', 'blaster', 'splice', 'capacitor', 'scrubber', 'chain-buffer'];
    for (const kind of order) if (this.pickupUnlocked(kind) && !s.supply.introduced.includes(kind) && !s.supply.pending.includes(kind)) s.supply.pending.push(kind);
  }

  private placePickup(kind: PickupKind): boolean {
    const s = this.state;
    if (s.pickups.length >= 3 || !this.pickupUseful(kind)) return false;
    const point = this.findPosition('pickup');
    if (!point) return false;
    s.pickups.push({ id: this.id('pickup'), ...point, kind, ttl: 15 });
    if (kind === 'repair' || kind === 'splice') s.spawnedLimitedPickups.push(kind);
    if (!s.supply.introduced.includes(kind)) s.supply.introduced.push(kind);
    s.supply.pending = s.supply.pending.filter(item => item !== kind);
    return true;
  }

  private positionSafe(point: Vec2, purpose: 'core' | 'pickup' | 'hazard'): boolean {
    const s = this.state;
    const layout = getLayout(s);
    if (Math.abs(point.x) > layout.halfWidth - 2 || Math.abs(point.z) > layout.halfDepth - 2) return false;
    if (s.obstacles.some(obstacle => rectangleTOI(point, point, obstacle, 1) !== null)) return false;
    if (distance(point, s.player) < (purpose === 'hazard' ? 6 : 1.4)) return false;
    if (bodyTOI(point, point, s.player.body, purpose === 'hazard' ? 1.8 : 0.85) !== null) return false;
    if (s.rivals.some(rival => distance(point, rival) < 2 || bodyTOI(point, point, rival.body, 1.2) !== null)) return false;
    if ([...s.cores, ...s.pickups, ...s.mines, ...s.drones].some(entity => distance(point, entity) < 1.4)) return false;
    if (s.boss?.relays.some(relay => distance(point, relay) < 1.4)) return false;
    if (s.gates.some(gate => { const [a, b] = gateEnds(gate); return pointSegmentDistance(point, a, b) < 1.2; })) return false;
    if (purpose === 'hazard') {
      const projected = { x: s.player.x + Math.cos(s.player.heading) * 6.3, z: s.player.z + Math.sin(s.player.heading) * 6.3 };
      if (pointSegmentDistance(point, s.player, projected) < 2.5) return false;
    }
    return true;
  }

  /** Static circulation plus current-body connectivity, using conservative one-unit route cells. */
  private routeExists(target: Vec2): boolean {
    const s = this.state;
    const layout = getLayout(s);
    const start = { x: Math.round(s.player.x), z: Math.round(s.player.z) };
    const goal = { x: Math.round(target.x), z: Math.round(target.z) };
    const queue = [start];
    const visited = new Set<string>([`${start.x},${start.z}`]);
    for (let index = 0; index < queue.length && index < Math.max(900, layout.width * layout.depth); index++) {
      const current = queue[index];
      if (current.x === goal.x && current.z === goal.z) return true;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const next = { x: current.x + dx, z: current.z + dz };
        const key = `${next.x},${next.z}`;
        if (visited.has(key) || Math.abs(next.x) > layout.halfWidth - 2 || Math.abs(next.z) > layout.halfDepth - 2) continue;
        if (s.obstacles.some(obstacle => rectangleTOI(current, next, obstacle, 0.7) !== null)) continue;
        if (bodyTOI(current, next, s.player.body, 0.65, 3) !== null) continue;
        if (s.mines.some(mine => mine.armed && circleTOI(current, next, mine, 1.1) !== null)) continue;
        visited.add(key);
        queue.push(next);
      }
    }
    return false;
  }

  private findPosition(purpose: 'core' | 'pickup' | 'hazard'): Vec2 | null {
    const candidates = getLayout(this.state).coreCandidates;
    const offset = Math.floor(this.random() * candidates.length);
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[(i + offset) % candidates.length];
      const point = { x: candidate.x + (this.random() - 0.5) * 0.8, z: candidate.z + (this.random() - 0.5) * 0.8 };
      if (this.positionSafe(point, purpose) && (purpose === 'hazard' || this.routeExists(point))) return point;
    }
    return null;
  }

  private tickMines(dt: number): void {
    for (const mine of this.state.mines) if (!mine.armed) {
      mine.armTime -= dt;
      if (mine.armTime <= 0) { mine.armed = true; this.emit('mine-arm', 'Mine armed · marked footprint active.'); }
    }
  }

  private tickGates(dt: number): void {
    for (const gate of this.state.gates) {
      if (gate.disabled > 0) {
        gate.disabled = Math.max(0, gate.disabled - dt);
        if (gate.disabled <= 0) { gate.state = 'warning'; gate.timer = this.warningTime(1); this.emit('gate-warning', 'Emitter restarting · full warning.'); }
        continue;
      }
      if (gate.boss) continue;
      gate.timer -= dt;
      if (gate.timer > 0) continue;
      if (gate.state === 'safe') { gate.state = 'warning'; gate.timer = this.warningTime(1); this.emit('gate-warning', 'Laser gate charging · take a bypass.'); }
      else if (gate.state === 'warning') { gate.state = 'active'; gate.timer = 2; }
      else { gate.state = 'safe'; gate.timer = 3; }
    }
  }

  private tickDrones(dt: number): void {
    const s = this.state;
    const layout = getLayout(s);
    for (const drone of s.drones) {
      if (drone.disabled > 0) {
        drone.disabled = Math.max(0, drone.disabled - dt);
        if (drone.disabled <= 0) { drone.state = 'recover'; drone.timer = this.warningTime(1); drone.cooldown = 1; }
        continue;
      }
      drone.cooldown = Math.max(0, drone.cooldown - dt);
      if (drone.state === 'prepare') {
        drone.timer -= dt;
        if (drone.timer <= 0) {
          if (drone.target && s.projectiles.length < 8) {
            const d = Math.max(distance(drone, drone.target), EPSILON);
            const speed = 4 * RULES[s.difficulty].projectile;
            s.projectiles.push({ id: this.id('projectile'), ...copy(drone), vx: (drone.target.x - drone.x) / d * speed, vz: (drone.target.z - drone.z) / d * speed, ttl: 9 });
            this.emit('shot', 'Patrol fired · the shot keeps its committed line.');
          }
          drone.state = 'recover';
          drone.timer = 0.7;
          drone.cooldown = 3;
        }
        continue;
      }
      if (drone.state === 'recover' || drone.state === 'warning') {
        drone.timer -= dt;
        if (drone.timer <= 0) drone.state = 'patrol';
        continue;
      }
      drone.phase += dt * 0.65;
      const target = { x: clamp(drone.anchor.x + Math.cos(drone.phase) * 2, -layout.halfWidth + 3, layout.halfWidth - 3), z: clamp(drone.anchor.z + Math.sin(drone.phase) * 2, -layout.halfDepth + 3, layout.halfDepth - 3) };
      const movement = distance(drone, target);
      if (movement > EPSILON) {
        drone.x += (target.x - drone.x) / movement * Math.min(2.2 * dt, movement);
        drone.z += (target.z - drone.z) / movement * Math.min(2.2 * dt, movement);
      }
      if (drone.cooldown > 0 || s.spawnBlockedTime >= 3 || (s.boss?.relayBlockedTime ?? 0) >= 3 || s.projectiles.length >= 8) continue;
      const decoy = s.decoys.find(lure => lure.ttl > 0 && distance(drone, lure) <= 6);
      const chosen = decoy ?? s.player;
      if (!this.lineClear(drone, chosen, false)) continue;
      // Only one new target lock commits at a time. Fired projectiles retain their physical trajectories.
      if (s.drones.some(other => other.id !== drone.id && other.state === 'prepare')) continue;
      if (s.boss?.phase === 'warning' || s.gates.some(gate => gate.state === 'warning' && gate.timer < 0.6)) continue;
      drone.target = copy(chosen);
      drone.targetDecoy = decoy?.id;
      drone.state = 'prepare';
      drone.timer = this.warningTime(0.8);
      this.emit('lock', decoy ? 'Patrol locked the holographic Decoy.' : 'Patrol target lock · change your route.');
    }
  }

  private tickProjectiles(dt: number): void {
    for (const projectile of this.state.projectiles) { projectile.x += projectile.vx * dt; projectile.z += projectile.vz * dt; projectile.ttl -= dt; }
  }

  private tickWeapon(dt: number, input: GameInput): void {
    const s = this.state;
    s.weapon.cooldown = Math.max(0, s.weapon.cooldown - dt);
    s.weapon.emptyCooldown = Math.max(0, s.weapon.emptyCooldown - dt);
    if (this.legacy || !input.fire || !['playing', 'boss'].includes(s.status) || s.weapon.cooldown > EPSILON) return;
    if (!s.weapon.ammo) {
      if (s.weapon.emptyCooldown === 0) { this.emit('weapon-empty', 'BLASTER EMPTY · Collect an ammo pickup.'); s.weapon.emptyCooldown = 1; }
      return;
    }
    if (s.playerProjectiles.length >= BLASTER.projectileCap) return;
    let heading = s.player.heading;
    const targets: (Vec2 & { id: string })[] = s.drones.filter(drone => drone.state !== 'warning').map(drone => ({ id: drone.id, ...copy(drone) }));
    if (s.boss && s.boss.charge === 3 && s.boss.phase === 'recovery' && s.boss.nodes > 0) targets.push({ id: 'warden-receptor', ...s.boss.receptor });
    const target = targets.filter(point => distance(point, s.player) <= BLASTER.range && Math.abs(angleDelta(heading, Math.atan2(point.z - s.player.z, point.x - s.player.x))) <= BLASTER.coneHalfAngle && this.lineClear(s.player, point, false) && !s.rivals.some(rival => rival.state === 'hunting' && bodyTOI(s.player, point, [rival, ...rival.body], BODY + BLASTER.radius) !== null)).sort((a, b) => Math.abs(angleDelta(heading, Math.atan2(a.z - s.player.z, a.x - s.player.x))) - Math.abs(angleDelta(heading, Math.atan2(b.z - s.player.z, b.x - s.player.x))) || distance(a, s.player) - distance(b, s.player))[0];
    if (target) heading = Math.atan2(target.z - s.player.z, target.x - s.player.x);
    s.weapon.ammo--;
    s.weapon.cooldown = BLASTER.interval;
    s.playerProjectiles.push({ id: this.id('player-shot'), ...copy(s.player), vx: Math.cos(heading) * BLASTER.speed, vz: Math.sin(heading) * BLASTER.speed, ttl: BLASTER.range / BLASTER.speed, range: BLASTER.range });
    this.emit('player-shot', 'PULSE BLASTER fired.', { origin: copy(s.player), target: target ? copy(target) : { x: s.player.x + Math.cos(heading) * BLASTER.range, z: s.player.z + Math.sin(heading) * BLASTER.range }, amount: s.weapon.ammo, targetId: target?.id });
  }

  private tickPlayerProjectiles(dt: number): void {
    for (const shot of this.state.playerProjectiles) {
      const speed = Math.hypot(shot.vx, shot.vz);
      const span = Math.min(speed * dt, shot.range);
      shot.x += shot.vx / Math.max(speed, EPSILON) * span;
      shot.z += shot.vz / Math.max(speed, EPSILON) * span;
      shot.range = Math.max(0, shot.range - span); shot.ttl -= dt;
    }
  }

  private tickScrubber(): void {
    const s = this.state;
    if (s.buffs.scrubber <= 0 || !s.projectiles.some(shot => shot.ttl > 0 && distance(shot, s.player) <= 2)) return;
    const count = s.projectiles.length;
    s.projectiles = s.projectiles.filter(shot => distance(shot, s.player) > 3);
    s.buffs.scrubber = 0;
    this.emit('scrubber', `BULLET SCRUBBER · ${count - s.projectiles.length} hostile shots cleared.`, { origin: copy(s.player), amount: count - s.projectiles.length, pickup: 'scrubber' });
  }

  private rivalSpawnSafe(rival: Rival): boolean {
    const s = this.state;
    const layout = getLayout(s);
    const points = [rival, ...rival.body];
    if (points.some(point => Math.abs(point.x) > layout.halfWidth - 1 || Math.abs(point.z) > layout.halfDepth - 1 || distance(point, s.player) < 5 || bodyTOI(point, point, s.player.body, 1.4) !== null || s.obstacles.some(obstacle => rectangleTOI(point, point, obstacle, 1) !== null) || [...s.cores, ...s.pickups, ...s.mines, ...s.drones].some(entity => distance(point, entity) < 1))) return false;
    const firstTurn = { x: rival.x + Math.cos(rival.heading) * 4.2, z: rival.z + Math.sin(rival.heading) * 4.2 };
    return this.worldTOI(rival, firstTurn, false) === null && bodyTOI(rival, firstTurn, s.player.body, 1) === null;
  }

  private tickRivals(dt: number): void {
    for (const rival of this.state.rivals) {
      if (rival.state === 'warning') {
        rival.warning -= dt;
        if (rival.warning <= 0) {
          if (!this.rivalSpawnSafe(rival)) { rival.warning = this.warningTime(1.5); continue; }
          rival.state = 'hunting';
          rival.planning = 0;
          this.emit('rival', 'HUNTER active · its head can crash into your body.');
        } else continue;
      }
      rival.planning -= dt;
      if (rival.planning <= 0) { rival.desiredHeading = this.planRival(rival); rival.planning += 0.1; }
      turn(rival, rival.desiredHeading, dt);
      advanceSnake(rival, rival.speed, dt);
    }
  }

  private planRival(rival: Rival): number {
    const s = this.state;
    const decoy = s.decoys.find(lure => lure.ttl > 0 && distance(lure, rival) <= 6 && this.lineClear(rival, lure, false));
    const target = decoy ?? { x: s.player.x + Math.cos(s.player.heading) * 2.7, z: s.player.z + Math.sin(s.player.heading) * 2.7 };
    const intercept = Math.atan2(target.z - rival.z, target.x - rival.x);
    const candidates = [intercept, ...[0, -0.4, 0.4, -0.8, 0.8, -1.3, 1.3, -2.1, 2.1, Math.PI].map(offset => rival.heading + offset)];
    let selected = rival.heading;
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      let point = copy(rival);
      let heading = rival.heading;
      let safeSteps = 0;
      for (let step = 0; step < 10; step++) {
        const delta = angleDelta(heading, candidate);
        heading += clamp(delta, -MOVEMENT.turnRate * 0.125, MOVEMENT.turnRate * 0.125);
        const next = { x: point.x + Math.cos(heading) * rival.speed * 0.125, z: point.z + Math.sin(heading) * rival.speed * 0.125 };
        if (this.worldTOI(point, next, false) !== null || bodyTOI(point, next, s.player.body, HEAD + BODY + 0.08) !== null || bodyTOI(point, next, rival.body, HEAD + BODY, 2) !== null) break;
        if (s.rivals.some(other => other.id !== rival.id && other.state === 'hunting' && bodyTOI(point, next, [other, ...other.body], HEAD + BODY) !== null)) break;
        point = next;
        safeSteps++;
      }
      const score = safeSteps * 100 - distance(point, target) * 1.5 - Math.abs(angleDelta(rival.heading, candidate)) * 0.4;
      if (score > bestScore) { bestScore = score; selected = candidate; }
    }
    return selected;
  }

  private tickBoss(dt: number): void {
    const s = this.state;
    const boss = s.boss;
    if (!boss) return;
    boss.relayFeedbackCooldown = Math.max(0, boss.relayFeedbackCooldown - dt);
    this.updateBossStage();
    boss.relayRetry -= dt;
    if (boss.relays.length < 3 - boss.charge && boss.relayRetry <= 0) {
      this.refillRelays();
      boss.relayRetry = 0.25;
      boss.relayBlockedTime = boss.relays.length < 3 - boss.charge ? boss.relayBlockedTime + 0.25 : 0;
    }
    boss.phaseTime -= dt;
    if (boss.phaseTime > 0) return;
    if (boss.phase === 'safe') { boss.phase = 'warning'; boss.phaseTime = this.warningTime(1); this.emit('boss-warning', 'WARDEN · Laser fan charging. Outer routes remain open.'); }
    else if (boss.phase === 'warning') { boss.phase = 'attack'; boss.phaseTime = 2; }
    else if (boss.phase === 'attack') { boss.phase = 'recovery'; boss.phaseTime = 4; this.emit('boss-recovery', boss.charge === 3 ? 'PAD GREEN · Cross the round pad at the bottom-center now.' : 'Collect all three numbers to turn the bottom-center pad green.'); }
    else {
      boss.phase = 'safe';
      boss.phaseTime = 3;
      boss.receptorHits = 0;
      boss.cycle++;
      for (const gate of s.gates) if (gate.boss) Object.assign(gate, getLayout(s).boss.sectors[boss.cycle % 2]);
    }
    for (const gate of s.gates) if (gate.boss && gate.disabled <= 0) gate.state = boss.phase === 'attack' ? 'active' : boss.phase === 'warning' ? 'warning' : 'safe';
    this.updateBossStage();
  }

  private updateBossStage(): void {
    const boss = this.state.boss;
    if (boss) boss.stage = boss.nodes <= 0 ? 'defeated' : boss.charge < 3 ? 'collecting-relays' : boss.phase === 'recovery' ? 'exposed' : 'charge-ready';
  }

  private breakBossNode(origin: Vec2): void {
    const s = this.state, boss = s.boss;
    if (!boss || boss.phase !== 'recovery' || boss.charge !== 3 || boss.nodes <= 0) return;
    boss.nodes--; boss.charge = 0; boss.receptorHits = 0;
    this.updateBossStage();
    this.emit('boss-node', `WARDEN ARMOR BROKEN · ${boss.nodes} ${boss.nodes === 1 ? 'node' : 'nodes'} remain.`, { origin: copy(origin), target: copy(getLayout(s).boss.anchor), amount: boss.nodes });
    if (boss.nodes > 0) this.refillRelays();
  }

  private refillRelays(): void {
    const boss = this.state.boss;
    if (!boss) return;
    const defaults = getLayout(this.state).boss.relayCandidates;
    for (let i = boss.charge; i < 3; i++) {
      if (boss.relays.some(relay => relay.number === i + 1)) continue;
      const preferred = defaults[(i + (3 - boss.nodes)) % 3];
      const point = this.positionSafe(preferred, 'core') && this.routeExists(preferred) ? preferred : this.findPosition('core');
      if (!point) continue;
      boss.relays.push({ id: this.id('relay'), ...point, number: i + 1 });
    }
  }

  private defeatBoss(): void {
    const s = this.state;
    if (!this.once('boss-complete')) return;
    if (s.mode !== 'practice') s.score += 2500;
    s.status = 'extraction';
    s.gates = [];
    s.drones = [];
    s.rivals = [];
    s.mines = [];
    s.projectiles = [];
    s.playerProjectiles = [];
    s.pendingSpawns = [];
    s.cores = [];
    if (s.boss) s.boss.relays = [];
    this.updateBossStage();
    this.resetCombo();
    this.emit('boss-defeated', 'WARDEN OFFLINE · Steer through the north extraction gate. Crashes still matter.');
  }

  private useTactical(): void {
    const s = this.state;
    if (!s.slots[s.selectedSlot]) {
      const availability = s.mode === 'practice' ? 'Collect a matching tactical pickup first.'
        : s.selectedSlot === 0 ? s.boss ? 'No new EMP pickups during Warden. Relays do not require tactics.' : s.wave === 1 ? 'EMP pickups arrive in Wave 2.' : 'Collect a cyan EMP pickup first.'
          : this.legacy ? 'Find Decoy pickups in Practice.' : s.boss ? 'No new Decoy pickups during Warden. Relays do not require tactics.' : s.wave < 2 || s.wave === 2 && s.coresCollected < 6 ? 'Decoy arrives after six cores in Wave 2.' : 'Collect a purple Decoy pickup first.';
      this.emit('empty', `${s.selectedSlot === 0 ? 'EMP' : 'DECOY'} EMPTY · ${availability}`);
      return;
    }
    s.slots[s.selectedSlot] = false;
    if (s.selectedSlot === 0) {
      let interrupts = 0;
      let affected = 0;
      for (const drone of s.drones) if (distance(drone, s.player) <= 4) {
        affected++;
        if (drone.state === 'prepare') interrupts++;
        drone.state = 'disabled';
        drone.disabled = 3;
        delete drone.target;
        delete drone.targetDecoy;
      }
      for (const gate of s.gates) {
        const [a, b] = gateEnds(gate);
        if (Math.min(distance(a, s.player), distance(b, s.player)) <= 4) { affected++; gate.state = 'disabled'; gate.disabled = 3; gate.timer = this.warningTime(1); }
      }
      s.empInterrupts += interrupts;
      this.emit('emp', affected ? `EMP PULSE · ${affected} ${affected === 1 ? 'system' : 'systems'} disabled for 3s${interrupts ? ` · ${interrupts} ${interrupts === 1 ? 'lock' : 'locks'} broken` : ''}.`
        : 'EMP PULSE · No drones or emitters within 4 units. Mines and fired shots are unaffected.', { origin: copy(s.player) });
    } else {
      s.decoys.push({ id: this.id('decoy'), ...copy(s.player), ttl: 4 });
      this.emit('decoy', 'DECOY deployed · Future target locks can follow the lure.');
    }
  }

  private tickMagnet(dt: number): void {
    if (this.state.buffs.magnet <= 0) return;
    for (const core of this.state.cores) if (distance(core, this.state.player) <= 2.5 && this.lineClear(core, this.state.player, true)) {
      const d = Math.max(distance(core, this.state.player), EPSILON);
      const pull = Math.min(d, 5 * dt);
      core.x += (this.state.player.x - core.x) / d * pull;
      core.z += (this.state.player.z - core.z) / d * pull;
    }
  }

  private lineClear(a: Vec2, b: Vec2, magnet: boolean): boolean {
    const s = this.state;
    if (s.obstacles.some(obstacle => rectangleTOI(a, b, obstacle, 0.15) !== null)) return false;
    if (!magnet) return true;
    if (bodyTOI(a, b, s.player.body, BODY + 0.15, 1) !== null) return false;
    if (s.rivals.some(rival => rival.state === 'hunting' && bodyTOI(a, b, [rival, ...rival.body], BODY + 0.15) !== null)) return false;
    if (s.mines.some(mine => mine.armed && circleTOI(a, b, mine, 0.8) !== null)) return false;
    return !s.gates.some(gate => { const [first, last] = gateEnds(gate); return gate.state === 'active' && capsuleTOI(a, b, first, last, 0.3) !== null; });
  }

  private worldTOI(start: Vec2, end: Vec2, openExit: boolean): { time: number; cause: string } | null {
    const layout = getLayout(this.state);
    let result: { time: number; cause: string } | null = null;
    const include = (time: number | null, cause: string) => { if (time !== null && (result === null || time < result.time)) result = { time, cause }; };
    for (const obstacle of this.state.obstacles) include(roundedRectangleTOI(start, end, obstacle, HEAD), obstacle.kind === 'emitter' ? 'solid emitter post' : 'closed machinery');
    for (const [axis, extent] of [['x', layout.halfWidth], ['z', layout.halfDepth]] as const) {
      for (const sign of [-1, 1]) {
        const limit = sign * (extent - HEAD);
        if (end[axis] * sign < extent - HEAD) continue;
        const delta = end[axis] - start[axis];
        const time = Math.abs(delta) < EPSILON ? 0 : clamp((limit - start[axis]) / delta, 0, 1);
        const point = mix(start, end, time);
        if (axis === 'z' && sign === -1 && openExit && Math.abs(point.x - layout.exit.center.x) <= layout.exit.halfWidth - HEAD) continue;
        include(time, 'arena wall');
      }
    }
    return result;
  }

  private resolveCollisions(
    previous: Vec2,
    previousBody: Vec2[],
    previousRivals: Map<string, { head: Vec2; body: Vec2[]; state: string }>,
    previousDrones: Map<string, Vec2>,
    previousProjectiles: Map<string, Vec2>,
    previousPlayerShots: Map<string, Vec2>,
  ): void {
    const s = this.state;
    const p = s.player;
    const events: CollisionEvent[] = [];
    const add = (time: number | null, priority: number, id: string, resolve: () => void) => { if (time !== null) events.push({ time, priority, id, resolve }); };
    const world = this.worldTOI(previous, p, s.status === 'extraction');
    if (world) add(world.time, 0, 'crash-world', () => this.fail(`Critical crash: ${world.cause}`));
    add(bodyTOI(previous, p, previousBody, HEAD + BODY, 1), 0, 'crash-self', () => this.fail('Critical crash: your own body'));

    for (const rival of [...s.rivals]) {
      if (rival.state !== 'hunting') continue;
      const old = previousRivals.get(rival.id) ?? { head: copy(rival), body: rival.body, state: rival.state };
      if (old.state === 'warning') continue;
      const relativeEnd = { x: p.x - (rival.x - old.head.x), z: p.z - (rival.z - old.head.z) };
      add(circleTOI(previous, relativeEnd, old.head, HEAD * 2), 0, `head-to-head-${rival.id}`, () => {
        if (!s.rivals.some(active => active.id === rival.id)) return;
        this.removeRival(rival, false);
        this.fail('Critical crash: rival serpent');
      });
      add(bodyTOI(previous, p, old.body, HEAD + BODY), 0, `player-rival-${rival.id}`, () => { if (s.rivals.some(active => active.id === rival.id)) this.fail('Critical crash: rival serpent'); });
      const rivalWorld = this.worldTOI(old.head, rival, false);
      if (rivalWorld) add(rivalWorld.time, 0, `rival-wall-${rival.id}`, () => this.removeRival(rival, false));
      add(bodyTOI(old.head, rival, old.body, HEAD + BODY, 1), 0, `rival-self-${rival.id}`, () => this.removeRival(rival, false));
      add(bodyTOI(old.head, rival, previousBody, HEAD + BODY), 2, `body-block-${rival.id}`, () => this.removeRival(rival, true));
      for (const other of s.rivals) if (other.id !== rival.id && other.state === 'hunting') {
        const otherOld = previousRivals.get(other.id);
        if (otherOld) add(bodyTOI(old.head, rival, [otherOld.head, ...otherOld.body], HEAD + BODY), 0, `rival-other-${rival.id}`, () => this.removeRival(rival, false));
      }
    }

    const hostile = s.status === 'playing' || s.status === 'boss';
    if (hostile) {
      for (const mine of [...s.mines]) if (mine.armed) add(circleTOI(previous, p, mine, HEAD + 0.45), 1, `mine-${mine.id}`, () => {
        if (!s.mines.some(active => active.id === mine.id)) return;
        s.mines = s.mines.filter(active => active.id !== mine.id);
        this.damage('armed mine');
      });
      for (const projectile of [...s.projectiles]) {
        const old = previousProjectiles.get(projectile.id) ?? { x: projectile.x - projectile.vx * FIXED_DT, z: projectile.z - projectile.vz * FIXED_DT };
        const relativeEnd = { x: p.x - (projectile.x - old.x), z: p.z - (projectile.z - old.z) };
        add(circleTOI(previous, relativeEnd, old, HEAD + 0.14), 1, `shot-${projectile.id}`, () => {
          if (!s.projectiles.some(active => active.id === projectile.id)) return;
          s.projectiles = s.projectiles.filter(active => active.id !== projectile.id);
          this.damage('patrol projectile');
        });
        for (const obstacle of s.obstacles) add(rectangleTOI(old, projectile, obstacle, 0.12), 1, `projectile-solid-${projectile.id}`, () => { s.projectiles = s.projectiles.filter(active => active.id !== projectile.id); });
        for (const decoy of s.decoys) if (decoy.ttl > 0) add(circleTOI(old, projectile, decoy, 0.45), 1, `projectile-decoy-${projectile.id}`, () => {
          // A co-located player remains vulnerable; damage at an equal impact wins above lure absorption.
          if (decoy.ttl <= 0 || !s.projectiles.some(active => active.id === projectile.id)) return;
          s.projectiles = s.projectiles.filter(active => active.id !== projectile.id);
          decoy.ttl = 0;
          this.emit('decoy-hit', 'Decoy absorbed a diverted shot.');
        });
      }
      for (const drone of s.drones) if (drone.state !== 'warning' && drone.disabled <= 0 && !s.contacts.includes(drone.id)) {
        const old = previousDrones.get(drone.id) ?? copy(drone);
        add(circleTOI(previous, { x: p.x - (drone.x - old.x), z: p.z - (drone.z - old.z) }, old, HEAD + 0.45), 1, `drone-${drone.id}`, () => { if (s.drones.some(active => active.id === drone.id)) this.damage('drone contact'); });
      }
      for (const gate of s.gates) if (gate.state === 'active' && !s.contacts.includes(gate.id)) {
        const [a, b] = gateEnds(gate);
        add(capsuleTOI(previous, p, a, b, HEAD + 0.12), 1, `gate-${gate.id}`, () => this.damage(gate.boss ? 'Warden laser fan' : 'laser gate'));
      }
    }

    for (const shot of [...s.playerProjectiles]) {
      const old = previousPlayerShots.get(shot.id) ?? copy(shot);
      const active = () => s.playerProjectiles.some(item => item.id === shot.id);
      const consume = () => { s.playerProjectiles = s.playerProjectiles.filter(item => item.id !== shot.id); };
      for (const obstacle of s.obstacles) add(rectangleTOI(old, shot, obstacle, BLASTER.radius), 0, `player-solid-${shot.id}`, consume);
      const layout = getLayout(s);
      for (const [axis, extent] of [['x', layout.halfWidth], ['z', layout.halfDepth]] as const) for (const sign of [-1, 1]) {
        if (shot[axis] * sign < extent - BLASTER.radius) continue;
        const delta = shot[axis] - old[axis];
        add(Math.abs(delta) < EPSILON ? 0 : clamp((sign * (extent - BLASTER.radius) - old[axis]) / delta, 0, 1), 0, `player-wall-${axis}-${sign}-${shot.id}`, consume);
      }
      for (const drone of s.drones) if (drone.state !== 'warning') {
        const before = previousDrones.get(drone.id) ?? copy(drone);
        const end = { x: shot.x - (drone.x - before.x), z: shot.z - (drone.z - before.z) };
        add(circleTOI(old, end, before, 0.45 + BLASTER.radius), 1, `player-drone-${shot.id}-${drone.id}`, () => {
          if (!active() || !s.drones.some(item => item.id === drone.id)) return;
          consume(); drone.hp = (drone.hp ?? 2) - 1;
          if (drone.hp <= 0) {
            s.drones = s.drones.filter(item => item.id !== drone.id);
            this.emit('drone-destroyed', 'PATROL DISABLED · Route clear. No score awarded.', { origin: copy(drone), targetId: drone.id });
          } else this.emit('drone-hit', 'PATROL HIT · One more shot.', { origin: copy(drone), amount: drone.hp, targetId: drone.id });
        });
      }
      for (const rival of s.rivals) if (rival.state === 'hunting') add(bodyTOI(old, shot, [rival, ...rival.body], BODY + BLASTER.radius), 1, `player-armor-${shot.id}-${rival.id}`, () => {
        if (!active() || !s.rivals.some(item => item.id === rival.id)) return;
        consume(); this.emit('armor-hit', 'HUNTER ARMORED · Defeat it with your trailing body.', { origin: copy(shot), targetId: rival.id });
      });
      const receptor = s.boss?.receptor;
      if (s.status === 'boss' && receptor && !this.legacy) add(circleTOI(old, shot, receptor, 0.65 + BLASTER.radius), 1, `player-receptor-${shot.id}`, () => {
        if (!active() || !s.boss || s.boss.nodes <= 0) return;
        consume();
        if (s.boss.charge !== 3 || s.boss.phase !== 'recovery') { this.emit('armor-hit', 'WARDEN ARMORED · Collect 1 → 2 → 3 and wait for the bottom-center pad to turn green.', { origin: copy(receptor), targetId: 'warden-receptor' }); return; }
        s.boss.receptorHits++;
        this.emit('receptor-hit', `RECEPTOR HIT ${s.boss.receptorHits} / 3`, { origin: copy(receptor), amount: s.boss.receptorHits, targetId: 'warden-receptor' });
        if (s.boss.receptorHits >= 3) this.breakBossNode(receptor);
      });
    }

    if (s.status === 'playing') for (const core of [...s.cores]) add(circleTOI(previous, p, core, HEAD + 0.28), 2, core.id, () => this.collectCore(core));
    for (const pickup of [...s.pickups]) add(circleTOI(previous, p, pickup, HEAD + 0.3), 2, pickup.id, () => this.collectPickup(pickup.id));
    const boss = s.boss;
    if (s.status === 'boss' && boss) {
      for (const relay of [...boss.relays]) add(circleTOI(previous, p, relay, HEAD + 0.4), 2, relay.id, () => {
        if (!boss.relays.some(active => active.id === relay.id)) return;
        if (boss.charge + 1 !== relay.number) {
          if (!this.legacy && boss.relayFeedbackCooldown === 0) { this.emit('relay-wrong', `RELAY ${relay.number} LOCKED · Collect relay ${boss.charge + 1} first.`, { relay: relay.number, amount: boss.charge + 1, origin: copy(relay) }); boss.relayFeedbackCooldown = 0.75; }
          return;
        }
        boss.charge++;
        boss.relays = boss.relays.filter(active => active.id !== relay.id);
        this.emit('relay', `RELAY ${boss.charge} / 3${boss.charge === 3 ? ' · Cross the bottom-center pad when green.' : ` · Follow relay ${boss.charge + 1}.`}`, { relay: boss.charge, origin: copy(relay) });
        this.updateBossStage();
        if (boss.charge === 3 && !this.legacy) this.emit('charge-ready', 'CHARGE READY · Cross the round pad at the bottom-center when green.');
      });
      add(circleTOI(previous, p, boss.pad, HEAD + 1), 3, 'boss-pad', () => {
        if (boss.phase !== 'recovery' || boss.charge < 3 || boss.nodes <= 0) return;
        this.breakBossNode(boss.pad);
      });
    }
    const exit = getLayout(s).exit;
    if (s.status === 'extraction' && p.z < exit.completionZ && Math.abs(p.x - exit.center.x) < exit.halfWidth - HEAD) add(1, 3, 'extraction', () => {
      if (!this.once('district-extracted')) return;
      if (s.mode !== 'practice') s.score += 1000;
      s.status = 'complete';
      p.boosting = false;
      this.emit('complete', 'NEON SPIRE LIBERATED · The first signal is yours.');
    });

    events.sort((a, b) => Math.abs(a.time - b.time) < EPSILON ? a.priority - b.priority : a.time - b.time);
    const resolved = new Set<string>();
    for (const event of events) {
      if (s.status === 'dead' || s.status === 'complete') break;
      if (resolved.has(event.id)) continue;
      resolved.add(event.id);
      event.resolve();
    }
    s.contacts = [
      ...s.drones.filter(drone => drone.state !== 'warning' && drone.disabled <= 0 && distance(drone, p) <= HEAD + 0.45).map(drone => drone.id),
      ...s.gates.filter(gate => { const [a, b] = gateEnds(gate); return gate.state === 'active' && pointSegmentDistance(p, a, b) <= HEAD + 0.12; }).map(gate => gate.id),
    ];
  }

  private collectCore(core: Positioned): void {
    const s = this.state;
    if (!s.cores.some(active => active.id === core.id) || s.coresCollected >= s.quota || !this.once(core.id)) return;
    s.cores = s.cores.filter(active => active.id !== core.id);
    s.coresCollected++;
    s.totalCores++;
    s.player.length++;
    if (s.player.splice) { s.player.splice.from++; s.player.splice.to++; }
    sampleBody(s.player, s.player.splice ? s.player.splice.to + (s.player.splice.from - s.player.splice.to) * s.player.splice.remaining / 0.3 : s.player.length);
    s.chain = s.comboTimer > 0 ? s.chain + 1 : 1;
    s.comboTimer = 5;
    s.combo = s.chain >= 8 ? 4 : s.chain >= 5 ? 3 : s.chain >= 3 ? 2 : 1;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    const points = 100 * s.combo * (s.buffs.surge > 0 ? 2 : 1);
    // Lab points demonstrate score powers locally; the practice mode still excludes records and rewards.
    const awarded = s.mode !== 'practice' || s.lab !== null ? points : 0;
    s.score += awarded;
    this.emit('core', `+${awarded} · ${s.combo}× SIGNAL · ${s.coresCollected}/${s.quota}`);
  }

  private collectPickup(id: string): void {
    const s = this.state;
    const pickup = s.pickups.find(item => item.id === id);
    if (!pickup || pickup.ttl <= 0) return;
    const p = s.player;
    if (pickup.kind === 'repair' && p.integrity >= p.maxIntegrity || pickup.kind === 'splice' && (p.length <= 8 || p.splice) || pickup.kind === 'emp' && s.slots[0] || pickup.kind === 'decoy' && s.slots[1] || pickup.kind === 'blaster' && s.weapon.ammo >= BLASTER.ammo || pickup.kind === 'capacitor' && p.boost >= 65) return;
    if (pickup.kind === 'emp' || pickup.kind === 'decoy') {
      const slot = pickup.kind === 'emp' ? 0 : 1;
      if (!s.slots[0] && !s.slots[1]) s.selectedSlot = slot;
      s.slots[slot] = true;
    } else if (pickup.kind === 'repair') p.integrity = Math.min(p.maxIntegrity, p.integrity + 1);
    else if (pickup.kind === 'splice') p.splice = { from: p.length, to: Math.max(8, p.length - 4), remaining: 0.3 };
    else if (pickup.kind === 'blaster') s.weapon.ammo = BLASTER.ammo;
    else if (pickup.kind === 'capacitor') p.boost = Math.min(100, p.boost + 35);
    else s.buffs[pickup.kind] = { overdrive: 8, shield: 12, surge: 15, magnet: 10, scrubber: 8, 'chain-buffer': 10 }[pickup.kind];
    s.pickups = s.pickups.filter(item => item.id !== id);
    this.emit('pickup', `${PICKUPS[pickup.kind].name.toUpperCase()} · ${PICKUPS[pickup.kind].description}`, { pickup: pickup.kind });
    // An earlier swept pickup can protect against a later hostile event this tick.
    if (pickup.kind === 'scrubber') this.tickScrubber();
  }

  private damage(cause: string): void {
    const s = this.state;
    if (s.player.protection > 0 || s.status === 'transition') return;
    s.player.protection = 1.25;
    if (s.buffs.shield > 0) { s.buffs.shield = 0; this.emit('shield-hit', `SHIELD absorbed ${cause}.`); return; }
    s.player.integrity--;
    s.damageTaken++;
    s.buffs['chain-buffer'] = 0;
    this.resetCombo();
    if (s.player.integrity <= 0) this.fail(`Integrity depleted: ${cause}`);
    else this.emit('damage', `INTEGRITY −1 · ${cause}.`);
  }

  private removeRival(rival: Rival, earned: boolean): void {
    const s = this.state;
    if (!s.rivals.some(active => active.id === rival.id) || !this.once(`rival-${rival.id}`)) return;
    s.rivals = s.rivals.filter(active => active.id !== rival.id);
    if (earned) {
      s.rivalKills++;
      const points = 500 * s.combo * (s.buffs.surge > 0 ? 2 : 1);
      if (s.mode !== 'practice') s.score += points;
      this.emit('rival-defeated', `BODY BLOCK · Hunter defeated${s.mode === 'practice' ? '' : ` +${points}`}.`);
    } else this.emit('rival-crash', 'Hunter crashed into its route · no score awarded.');
  }

  private fail(cause: string): void {
    this.state.status = 'dead';
    this.state.deathCause = cause;
    this.state.player.boosting = false;
    this.emit('crash', cause);
  }

  private resetCombo(): void { this.state.chain = 0; this.state.combo = 1; this.state.comboTimer = 0; }
  private warningTime(base: number): number { return Math.max(0.6, base * RULES[this.state.difficulty].warning); }
  private emit(kind: GameEventKind, text: string, details: Omit<Partial<GameEvent>, 'id' | 'kind' | 'text' | 'time'> = {}): void {
    const event = { id: ++this.state.eventCounter, kind, text, time: this.state.time, ...details };
    this.state.event = event;
    this.state.events.push(event);
    if (this.state.events.length > 24) this.state.events.splice(0, this.state.events.length - 24);
  }
  private id(prefix: string): string { return `${prefix}-${this.state.nextId++}`; }
  private once(id: string): boolean { if (this.state.processedEvents.includes(id)) return false; this.state.processedEvents.push(id); return true; }
  private random(): number { let value = this.state.rng; value ^= value << 13; value ^= value >>> 17; value ^= value << 5; this.state.rng = value >>> 0; return this.state.rng / 4294967296; }
}

function validateSnapshot(value: unknown): asserts value is SimulationState {
  const invalid = () => { throw new Error('Save data is invalid or incompatible. Your profile can be retained separately.'); };
  if (!value || typeof value !== 'object') return invalid();
  const state = value as Record<string, unknown>;
  if (state.version !== 1 || ![CONTENT_VERSION, LEGACY_CONTENT_VERSION].includes(String(state.contentVersion))) throw new Error('This run belongs to a different content version and cannot be resumed.');
  const legacy = state.contentVersion === LEGACY_CONTENT_VERSION;
  if (state.layoutId !== (legacy ? 'neon-spire-v1' : 'neon-spire-v2') && !(legacy && state.layoutId === undefined)) invalid();
  let entries = 0;
  const walk = (item: unknown, depth: number): void => {
    if (++entries > 50000 || depth > 10) invalid();
    if (typeof item === 'number' && !Number.isFinite(item)) invalid();
    if (typeof item === 'string' && item.length > 1000) invalid();
    if (Array.isArray(item)) { if (item.length > 5000) invalid(); for (const child of item) walk(child, depth + 1); }
    else if (item && typeof item === 'object') for (const child of Object.values(item)) walk(child, depth + 1);
  };
  walk(value, 0);
  const number = (item: unknown): item is number => typeof item === 'number' && Number.isFinite(item);
  const point = (item: unknown): boolean => !!item && typeof item === 'object' && number((item as Vec2).x) && number((item as Vec2).z);
  const object = (item: unknown): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item);
  const array = (key: string): unknown[] => { if (!Array.isArray(state[key])) invalid(); return state[key] as unknown[]; };
  if (!['playing', 'transition', 'boss-intro', 'boss', 'extraction', 'dead', 'complete'].includes(String(state.status)) || !['campaign', 'practice'].includes(String(state.mode)) || !['standard', 'assisted', 'expert'].includes(String(state.difficulty))) invalid();
  for (const key of ['time', 'accumulator', 'wave', 'waveTime', 'transitionTime', 'coresCollected', 'totalCores', 'quota', 'score', 'combo', 'chain', 'comboTimer', 'seed', 'rng', 'nextId', 'rivalKills', 'eventCounter', 'optionalTimer', 'spawnBlockedTime', 'coreRetry', 'empInterrupts', 'damageTaken', 'maxCombo']) if (!number(state[key])) invalid();
  if ((state.wave as number) < 1 || (state.wave as number) > 3 || (state.score as number) < 0 || typeof state.runId !== 'string' || typeof state.deathCause !== 'string') invalid();
  const player = state.player;
  if (!object(player) || !point(player) || !Array.isArray(player.body) || !player.body.every(point) || player.body.length > 128 || !Array.isArray(player.path) || player.path.length < 2 || !player.path.every(point)) return invalid();
  for (const key of ['heading', 'length', 'lastTurn', 'integrity', 'maxIntegrity', 'boost', 'boostRest', 'protection']) if (!number(player[key])) invalid();
  if ((player.length as number) < 8 || (player.length as number) > 128 || (player.integrity as number) < 0 || (player.integrity as number) > 5 || (player.boost as number) < 0 || (player.boost as number) > 100 || typeof player.boostLocked !== 'boolean' || typeof player.boosting !== 'boolean') invalid();
  if (player.splice !== null && (!object(player.splice) || !['from', 'to', 'remaining'].every(key => number((player.splice as Record<string, unknown>)[key])))) invalid();
  const slots = array('slots');
  if (slots.length !== 2 || !slots.every(item => typeof item === 'boolean') || state.selectedSlot !== 0 && state.selectedSlot !== 1) invalid();
  if (!object(state.buffs) || !['overdrive', 'shield', 'surge', 'magnet'].every(key => number((state.buffs as Record<string, unknown>)[key]))) invalid();
  if (Object.keys(state.buffs as Record<string, unknown>).some(key => !['overdrive', 'shield', 'surge', 'magnet', 'scrubber', 'chain-buffer'].includes(key))) invalid();
  for (const key of ['scrubber', 'chain-buffer']) if (!(legacy && (state.buffs as Record<string, unknown>)[key] === undefined) && !number((state.buffs as Record<string, unknown>)[key])) invalid();
  if (legacy && ['scrubber', 'chain-buffer'].some(key => (state.buffs as Record<string, unknown>)[key] !== undefined && (state.buffs as Record<string, unknown>)[key] !== 0)) invalid();
  if (!(legacy && state.weapon === undefined)) {
    if (!object(state.weapon) || !['ammo', 'cooldown', 'emptyCooldown'].every(key => number(state.weapon && (state.weapon as Record<string, unknown>)[key])) || !Number.isInteger(state.weapon.ammo) || Number(state.weapon.ammo) < 0 || Number(state.weapon.ammo) > BLASTER.ammo || Number(state.weapon.cooldown) < 0 || Number(state.weapon.cooldown) > BLASTER.interval || Number(state.weapon.emptyCooldown) < 0 || Number(state.weapon.emptyCooldown) > 1) invalid();
    if (legacy && Object.values(state.weapon as Record<string, unknown>).some(value => value !== 0)) invalid();
  }
  if (!(legacy && state.playerProjectiles === undefined)) {
    if (!Array.isArray(state.playerProjectiles) || state.playerProjectiles.length > BLASTER.projectileCap || !state.playerProjectiles.every(shot => object(shot) && point(shot) && typeof shot.id === 'string' && ['vx', 'vz', 'ttl', 'range'].every(key => number(shot[key])) && Number(shot.range) >= 0 && Number(shot.range) <= BLASTER.range)) invalid();
    if (legacy && (state.playerProjectiles as unknown[]).length !== 0) invalid();
  }
  if (!(legacy && state.supply === undefined)) {
    const supply = state.supply;
    if (!object(supply) || !number(supply.cursor) || ![0, 1, 2].includes(supply.cursor) || typeof supply.boostUsed !== 'boolean' || !number(supply.retry) || !['pending', 'introduced'].every(key => Array.isArray(supply[key]) && (supply[key] as unknown[]).length <= 12 && new Set(supply[key] as unknown[]).size === (supply[key] as unknown[]).length && (supply[key] as unknown[]).every(kind => Object.keys(PICKUPS).includes(String(kind))))) invalid();
  }
  if (state.lab !== null && !(legacy && state.lab === undefined) && (state.mode !== 'practice' || !['warden', ...Object.keys(PICKUPS)].includes(String(state.lab)))) invalid();
  if (legacy && state.lab !== null && state.lab !== undefined) invalid();
  for (const key of ['cores', 'pickups', 'mines', 'drones', 'rivals', 'projectiles', 'gates', 'decoys']) {
    const entities = array(key);
    if (entities.length > 128 || !entities.every(entity => object(entity) && typeof entity.id === 'string' && point(entity))) invalid();
  }
  for (const pickup of array('pickups')) if (!object(pickup) || !Object.keys(PICKUPS).includes(String(pickup.kind)) || legacy && ['blaster', 'capacitor', 'scrubber', 'chain-buffer'].includes(String(pickup.kind)) || !number(pickup.ttl)) invalid();
  for (const mine of array('mines')) if (!object(mine) || typeof mine.armed !== 'boolean' || !number(mine.armTime)) invalid();
  for (const drone of array('drones')) if (!object(drone) || !['warning', 'patrol', 'prepare', 'recover', 'disabled'].includes(String(drone.state)) || !['timer', 'disabled', 'cooldown', 'phase'].every(key => number(drone[key])) || !point(drone.anchor) || drone.target !== undefined && !point(drone.target)) invalid();
  for (const drone of array('drones')) if (object(drone) && drone.hp !== undefined && (!number(drone.hp) || !Number.isInteger(drone.hp) || drone.hp < 1 || drone.hp > 2)) invalid();
  for (const rival of array('rivals')) if (!object(rival) || !['warning', 'hunting'].includes(String(rival.state)) || !['heading', 'length', 'lastTurn', 'warning', 'desiredHeading', 'planning', 'speed'].every(key => number(rival[key])) || !Array.isArray(rival.body) || !rival.body.every(point) || !Array.isArray(rival.path) || rival.path.length < 2 || !rival.path.every(point)) invalid();
  for (const projectile of array('projectiles')) if (!object(projectile) || !['vx', 'vz', 'ttl'].every(key => number(projectile[key]))) invalid();
  for (const gate of array('gates')) if (!object(gate) || !['safe', 'warning', 'active', 'disabled'].includes(String(gate.state)) || gate.axis !== 'x' && gate.axis !== 'z' || !['length', 'timer', 'disabled'].every(key => number(gate[key])) || typeof gate.boss !== 'boolean') invalid();
  for (const decoy of array('decoys')) if (!object(decoy) || !number(decoy.ttl)) invalid();
  for (const obstacle of array('obstacles')) if (!object(obstacle) || !point(obstacle) || !number(obstacle.width) || !number(obstacle.depth)) invalid();
  for (const spawn of array('pendingSpawns')) if (!object(spawn) || typeof spawn.id !== 'string' || !['drone', 'rival', 'mine'].includes(String(spawn.kind)) || !number(spawn.at) || !point(spawn.position)) invalid();
  for (const key of ['processedEvents', 'contacts', 'spawnedLimitedPickups']) if (!array(key).every(item => typeof item === 'string')) invalid();
  const validEvent = (event: unknown, untimed = false) => object(event) && number(event.id) && GAME_EVENT_KINDS.includes(event.kind as GameEventKind) && typeof event.text === 'string' && (untimed && event.time === undefined || number(event.time) && event.time >= 0 && event.time <= (state.time as number)) && (event.pickup === undefined || Object.keys(PICKUPS).includes(String(event.pickup))) && (event.origin === undefined || point(event.origin)) && (event.target === undefined || point(event.target)) && (event.relay === undefined || number(event.relay) && event.relay >= 1 && event.relay <= 3) && (event.amount === undefined || number(event.amount)) && (event.targetId === undefined || typeof event.targetId === 'string');
  if (state.event !== null && !validEvent(state.event, true)) invalid();
  if (state.events !== undefined && (!Array.isArray(state.events) || state.events.length > 24 || !state.events.every(event => validEvent(event)))) invalid();
  if (state.boss !== null) {
    const boss = state.boss;
    if (!object(boss) || boss.id !== 'B1' || !['safe', 'warning', 'attack', 'recovery'].includes(String(boss.phase)) || !['nodes', 'charge', 'phaseTime', 'cycle', 'relayRetry', 'relayBlockedTime'].every(key => number(boss[key])) || !point(boss.pad) || !Array.isArray(boss.relays) || !boss.relays.every(relay => object(relay) && point(relay) && typeof relay.id === 'string' && number(relay.number))) invalid();
    if (!legacy && (!object(boss) || !['collecting-relays', 'charge-ready', 'exposed', 'defeated'].includes(String(boss.stage)) || !point(boss.receptor) || !number(boss.receptorHits) || boss.receptorHits < 0 || boss.receptorHits > 3 || !number(boss.relayFeedbackCooldown))) invalid();
  }
}

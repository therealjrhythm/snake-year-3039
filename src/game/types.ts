export type Difficulty = 'standard' | 'assisted' | 'expert';
export type GameMode = 'campaign' | 'practice';
export type LaunchMode = GameMode | 'arcade' | 'endless' | 'trial';
export type DistrictId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5';
export type BossId = 'B1' | 'B2' | 'B3' | 'B4' | 'B5';
export type EnemyKind = 'patrol' | 'interceptor' | 'mine-layer' | 'hunter' | 'ambush';
export type PickupKind = 'overdrive' | 'shield' | 'surge' | 'emp' | 'magnet' | 'repair' | 'decoy' | 'splice' | 'blaster' | 'capacitor' | 'scrubber' | 'chain-buffer';
export type LayoutId = 'neon-spire-v1' | 'neon-spire-v2';
export type LabKind = PickupKind | 'warden';
export type GameStatus = 'playing' | 'transition' | 'boss-intro' | 'boss' | 'extraction' | 'dead' | 'complete';

export interface Vec2 { x: number; z: number }
export interface GameInput { x: number; y: number; boost: boolean; use: boolean; swap: boolean; fire?: boolean }
export interface Positioned extends Vec2 { id: string }
export interface Obstacle extends Vec2 { width: number; depth: number; kind?: 'machinery' | 'emitter' }
export interface Snake extends Vec2 {
  heading: number;
  body: Vec2[];
  path: Vec2[];
  length: number;
  lastTurn: number;
}
export interface Player extends Snake {
  integrity: number;
  maxIntegrity: number;
  boost: number;
  boostLocked: boolean;
  boosting: boolean;
  boostRest: number;
  protection: number;
  splice: { from: number; to: number; remaining: number } | null;
}
export interface Pickup extends Positioned { kind: PickupKind; ttl: number }
export interface Mine extends Positioned { armed: boolean; armTime: number }
export interface Drone extends Positioned {
  hp?: number;
  state: 'warning' | 'patrol' | 'prepare' | 'recover' | 'disabled';
  target?: Vec2;
  targetDecoy?: string;
  disabled: number;
  timer: number;
  cooldown: number;
  anchor: Vec2;
  phase: number;
}
export interface Rival extends Snake {
  id: string;
  state: 'warning' | 'hunting';
  warning: number;
  desiredHeading: number;
  planning: number;
  speed: number;
}
export interface Projectile extends Positioned { vx: number; vz: number; ttl: number }
export interface PlayerProjectile extends Projectile { range: number }
export interface Gate extends Positioned {
  length: number;
  axis: 'x' | 'z';
  state: 'safe' | 'warning' | 'active' | 'disabled';
  timer: number;
  disabled: number;
  boss: boolean;
}
export interface Relay extends Positioned { number: number }
export interface BossState {
  id: 'B1';
  nodes: number;
  charge: number;
  phase: 'safe' | 'warning' | 'attack' | 'recovery';
  phaseTime: number;
  relays: Relay[];
  pad: Vec2;
  cycle: number;
  relayRetry: number;
  relayBlockedTime: number;
  stage: 'collecting-relays' | 'charge-ready' | 'exposed' | 'defeated';
  receptor: Vec2;
  receptorHits: number;
  relayFeedbackCooldown: number;
}
export interface PendingSpawn { id: string; kind: 'drone' | 'rival' | 'mine'; at: number; position: Vec2; heading?: number }
export const GAME_EVENT_KINDS = ['start', 'wave', 'transition', 'core', 'pickup', 'boost-empty', 'select', 'empty', 'emp', 'decoy', 'decoy-hit', 'mine-arm', 'gate-warning', 'lock', 'shot', 'rival-warning', 'rival', 'rival-crash', 'rival-defeated', 'boss-intro', 'boss', 'boss-warning', 'boss-recovery', 'relay', 'relay-wrong', 'charge-ready', 'boss-node', 'boss-defeated', 'complete', 'damage', 'shield-hit', 'crash', 'player-shot', 'weapon-empty', 'drone-hit', 'drone-destroyed', 'armor-hit', 'receptor-hit', 'scrubber', 'chain-buffer', 'power-expired', 'lab-ready'] as const;
export type GameEventKind = typeof GAME_EVENT_KINDS[number];
export interface GameEvent { id: number; kind: GameEventKind; text: string; time: number; pickup?: PickupKind; origin?: Vec2; target?: Vec2; relay?: number; amount?: number; targetId?: string }

/** Everything needed to resume a run. Physical input state is deliberately excluded. */
export interface SimulationState {
  version: 1;
  contentVersion: string;
  layoutId: LayoutId;
  status: GameStatus;
  mode: GameMode;
  difficulty: Difficulty;
  time: number;
  accumulator: number;
  pauseRequested: string | null;
  player: Player;
  wave: number;
  waveTime: number;
  transitionTime: number;
  coresCollected: number;
  totalCores: number;
  quota: number;
  score: number;
  combo: number;
  chain: number;
  comboTimer: number;
  selectedSlot: 0 | 1;
  slots: [boolean, boolean];
  buffs: { overdrive: number; shield: number; surge: number; magnet: number; scrubber: number; 'chain-buffer': number };
  weapon: { ammo: number; cooldown: number; emptyCooldown: number };
  playerProjectiles: PlayerProjectile[];
  supply: { cursor: 0 | 1 | 2; pending: PickupKind[]; introduced: PickupKind[]; boostUsed: boolean; retry: number };
  lab: LabKind | null;
  cores: Positioned[];
  pickups: Pickup[];
  mines: Mine[];
  drones: Drone[];
  rivals: Rival[];
  projectiles: Projectile[];
  gates: Gate[];
  obstacles: Obstacle[];
  boss: BossState | null;
  event: GameEvent | null;
  /** Bounded presentation history so simultaneous rules events are never overwritten. */
  events: GameEvent[];
  eventCounter: number;
  deathCause: string;
  seed: number;
  rng: number;
  runId: string;
  rivalKills: number;
  nextId: number;
  pendingSpawns: PendingSpawn[];
  optionalTimer: number;
  spawnBlockedTime: number;
  coreRetry: number;
  spawnedLimitedPickups: PickupKind[];
  processedEvents: string[];
  contacts: string[];
  decoys: (Positioned & { ttl: number })[];
  empInterrupts: number;
  damageTaken: number;
  maxCombo: number;
}

export interface ThreatRoster { patrol: number; interceptor: number; mineLayer: number; hunter: number; ambush: number; mines: number; gates: number }
export interface WaveDefinition { id: string; quota: number; threats: ThreatRoster }
export interface DistrictDefinition { id: DistrictId; name: string; width: number; depth: number; bossId: BossId; bossName: string; waves: WaveDefinition[]; implementation: 'representative' | 'planned' }
export interface TrialDefinition { id: string; name: string; seed: number; length: number; limit: number; objective: string; target: number; silver: string; gold: string }
export interface CosmeticDefinition { id: string; name: string; color: string; achievement: string | null }
export interface AchievementDefinition { id: string; name: string; condition: string; reward: string }

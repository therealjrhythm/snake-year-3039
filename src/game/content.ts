import type { AchievementDefinition, CosmeticDefinition, Difficulty, DistrictDefinition, PickupKind, ThreatRoster, TrialDefinition } from './types';

export const CONTENT_VERSION = '0.3.0-neon-spire';
export const EXPANDED_CONTENT_VERSION = '0.2.0-neon-spire';
export const LEGACY_CONTENT_VERSION = '0.1.0-neon-spire';
export const SUPPORTED_CONTENT_VERSIONS: readonly string[] = [CONTENT_VERSION, EXPANDED_CONTENT_VERSION, LEGACY_CONTENT_VERSION];
export const BLASTER = { ammo: 12, interval: 0.25, speed: 18, range: 10, coneHalfAngle: Math.PI / 6, projectileCap: 6, radius: 0.12 } as const;
export const FIXED_DT = 1 / 60;
export const MOVEMENT = { baseSpeed: 4.5, boostSpeed: 6.3, turnRate: Math.PI * 4 / 3, spacing: 0.55, headRadius: 0.32, bodyRadius: 0.28, neckExclusion: 1.1, startingLength: 8, endlessCap: 80 } as const;
export const RULES: Record<Difficulty, { integrity: number; clock: number; projectile: number; warning: number }> = {
  standard: { integrity: 3, clock: 1, projectile: 1, warning: 1 },
  expert: { integrity: 3, clock: 1, projectile: 1.15, warning: 0.9 },
  assisted: { integrity: 5, clock: 0.75, projectile: 1, warning: 1.5 },
};

const roster = (patrol = 0, interceptor = 0, mineLayer = 0, hunter = 0, ambush = 0, mines = 0, gates = 0): ThreatRoster => ({ patrol, interceptor, mineLayer, hunter, ambush, mines, gates });
/** The complete release inventory is authored here; only D1 is executable in this milestone. */
export const DISTRICTS: DistrictDefinition[] = [
  { id: 'D1', name: 'Neon Spire', width: 36, depth: 26, bossId: 'B1', bossName: 'Warden', implementation: 'representative', waves: [
    { id: 'D1-W1', quota: 12, threats: roster(0, 0, 0, 0, 0, 2, 0) },
    { id: 'D1-W2', quota: 12, threats: roster(2, 0, 0, 0, 0, 3, 1) },
    { id: 'D1-W3', quota: 12, threats: roster(2, 0, 0, 1, 0, 3, 1) },
  ] },
  { id: 'D2', name: 'Chrome Bazaar', width: 36, depth: 26, bossId: 'B2', bossName: 'Switchblade Twins', implementation: 'planned', waves: [
    { id: 'D2-W1', quota: 12, threats: roster(2, 1, 0, 0, 0, 2, 2) },
    { id: 'D2-W2', quota: 14, threats: roster(1, 1, 0, 1, 0, 3, 2) },
    { id: 'D2-W3', quota: 16, threats: roster(0, 2, 0, 2, 0, 3, 2) },
  ] },
  { id: 'D3', name: 'Reactor Foundry', width: 38, depth: 28, bossId: 'B3', bossName: 'Crucible Engine', implementation: 'planned', waves: [
    { id: 'D3-W1', quota: 14, threats: roster(2, 0, 1, 0, 0, 4, 2) },
    { id: 'D3-W2', quota: 16, threats: roster(0, 1, 1, 1, 0, 5, 2) },
    { id: 'D3-W3', quota: 18, threats: roster(2, 1, 1, 1, 0, 6, 3) },
  ] },
  { id: 'D4', name: 'Ghost Circuit', width: 40, depth: 28, bossId: 'B4', bossName: 'Null Choir', implementation: 'planned', waves: [
    { id: 'D4-W1', quota: 14, threats: roster(1, 0, 0, 0, 1, 3, 2) },
    { id: 'D4-W2', quota: 16, threats: roster(0, 1, 0, 1, 1, 4, 2) },
    { id: 'D4-W3', quota: 18, threats: roster(2, 1, 0, 1, 1, 4, 3) },
  ] },
  { id: 'D5', name: 'Crown Array', width: 42, depth: 30, bossId: 'B5', bossName: 'Custodian', implementation: 'planned', waves: [
    { id: 'D5-W1', quota: 16, threats: roster(2, 1, 0, 1, 0, 4, 2) },
    { id: 'D5-W2', quota: 18, threats: roster(1, 1, 1, 1, 1, 5, 3) },
    { id: 'D5-W3', quota: 20, threats: roster(2, 2, 1, 1, 1, 6, 3) },
  ] },
];

const PICKUP_BASE: Record<PickupKind, { name: string; color: string; symbol: string; description: string; weight: number }> = {
  overdrive: { name: 'Overdrive', color: '#32eda0', symbol: '»', description: 'Boost uses half as much energy for 8 seconds.', weight: 20 },
  shield: { name: 'Shield', color: '#40aaff', symbol: '◇', description: 'Blocks one enemy hit for up to 12 seconds. Crashes still cost a life.', weight: 20 },
  surge: { name: 'Score Surge', color: '#ea39f5', symbol: '2×', description: 'Doubles points from energy cores and rival snakes for 15 seconds.', weight: 15 },
  emp: { name: 'EMP Pulse', color: '#20dfff', symbol: '◎', description: 'Stops nearby drones and laser beams for 3 seconds.', weight: 15 },
  magnet: { name: 'Magnet', color: '#a583ff', symbol: '∩', description: 'Pulls nearby energy cores toward your snake for 10 seconds.', weight: 10 },
  repair: { name: 'Repair', color: '#ffcb83', symbol: '+', description: 'Restores one missing health bar.', weight: 8 },
  decoy: { name: 'Decoy', color: '#c69aff', symbol: '⋈', description: 'Leaves a hologram that distracts nearby enemies for up to 4 seconds.', weight: 7 },
  splice: { name: 'Tail Splice', color: '#ffaf56', symbol: '−4', description: 'Shortens your tail by up to four segments, leaving at least eight.', weight: 5 },
  blaster: { name: 'Pulse Blaster', color: '#fff080', symbol: '⊕', description: 'Gives you 12 shots. Two hits destroy a drone. Rival snakes block your shots.', weight: 12 },
  capacitor: { name: 'Capacitor', color: '#87ff58', symbol: '+35', description: 'Refills 35% of your boost bar.', weight: 10 },
  scrubber: { name: 'Bullet Scrubber', color: '#f1f8ff', symbol: '⊗', description: 'For 8 seconds, clears nearby enemy bullets once when one gets close.', weight: 8 },
  'chain-buffer': { name: 'Chain Buffer', color: '#ff78bc', symbol: '+3s', description: 'Gives you 3 extra seconds to keep your score combo going. Works once within 10 seconds.', weight: 8 },
};

export interface PickupUnlock { wave: number; waveCores?: number; totalCores?: number; boostUsed?: boolean; combo?: number }
const PICKUP_UNLOCKS: Record<PickupKind, PickupUnlock> = {
  overdrive: { wave: 1 }, surge: { wave: 1 }, magnet: { wave: 1, totalCores: 4 }, shield: { wave: 2 }, emp: { wave: 2 }, repair: { wave: 2 },
  decoy: { wave: 2, waveCores: 6 }, blaster: { wave: 2, waveCores: 8 }, splice: { wave: 3 }, capacitor: { wave: 1, boostUsed: true }, scrubber: { wave: 2 }, 'chain-buffer': { wave: 3, combo: 2 },
};
const PICKUP_INTRODUCTIONS: Record<PickupKind, string> = {
  overdrive: 'Wave 1', surge: 'Wave 1', magnet: 'Wave 1 · after four cores', shield: 'Wave 2', emp: 'Wave 2', repair: 'Wave 2 · when damaged',
  decoy: 'Wave 2 · after six cores', blaster: 'Wave 2 · after eight cores', splice: 'Wave 3', capacitor: 'After using boost below 65%', scrubber: 'Wave 2', 'chain-buffer': 'Wave 3 · after reaching 2× combo',
};
const PICKUP_ELIGIBILITY: Record<PickupKind, string> = {
  overdrive: 'Refreshes its timer; does not stack.', shield: 'One absorbed hit maximum; refreshes expiry.', surge: 'Refreshes its timer; does not stack.', emp: 'One stored charge; full slot leaves pickup on the ground.',
  magnet: 'Ordinary cores only; safe attraction paths.', repair: 'Only when damaged; one spawned per wave.', decoy: 'One stored charge; full slot leaves pickup on the ground.', splice: 'Length above eight; one spawned per wave.',
  blaster: 'Refills to 12 shots; full ammo leaves pickup on the ground.', capacitor: 'Only below 65% boost; adds 35 without changing speed.', scrubber: 'One triggered purge; refreshes the arming timer.', 'chain-buffer': 'One saved timeout; damage still resets the combo.',
};
export const PICKUPS = Object.fromEntries((Object.keys(PICKUP_BASE) as PickupKind[]).map(kind => [kind, {
  ...PICKUP_BASE[kind], unlock: PICKUP_UNLOCKS[kind], introduction: PICKUP_INTRODUCTIONS[kind], eligibility: PICKUP_ELIGIBILITY[kind],
  activation: kind === 'emp' || kind === 'decoy' ? 'tactical' : kind === 'blaster' ? 'weapon' : 'automatic',
  legacyIntroduction: kind === 'overdrive' || kind === 'surge' ? 'Wave 1' : kind === 'emp' || kind === 'shield' ? 'Wave 2' : ['magnet', 'repair', 'decoy', 'splice'].includes(kind) ? 'Practice only' : 'Expanded runs only',
}])) as Record<PickupKind, (typeof PICKUP_BASE)[PickupKind] & { unlock: PickupUnlock; introduction: string; eligibility: string; activation: 'automatic' | 'tactical' | 'weapon'; legacyIntroduction: string }>;

export const TRIALS: TrialDefinition[] = [
  { id: 'T01', name: 'First Current', seed: 3039001, length: 8, limit: 60, objective: 'ordinary-cores', target: 6, silver: 'Finish within 35s', gold: 'Finish within 25s' },
  { id: 'T02', name: 'Needlework', seed: 3039002, length: 20, limit: 75, objective: 'ordered-checkpoints', target: 6, silver: 'Finish within 55s', gold: 'Finish within 40s' },
  { id: 'T03', name: 'Green Window', seed: 3039003, length: 8, limit: 90, objective: 'timed-gates-no-emp', target: 5, silver: 'Finish within 65s', gold: 'Finish within 50s without damage' },
  { id: 'T04', name: 'Blackout', seed: 3039004, length: 8, limit: 90, objective: 'supplied-emp-interrupts', target: 3, silver: 'Finish within 60s', gold: 'Finish within 45s' },
  { id: 'T05', name: 'False Signal', seed: 3039005, length: 8, limit: 90, objective: 'supplied-decoy-diversions', target: 3, silver: 'Finish within 60s', gold: 'Finish within 45s without damage' },
  { id: 'T06', name: 'Cross the Line', seed: 3039006, length: 24, limit: 90, objective: 'hunter-body-blocks', target: 1, silver: 'Finish within 60s', gold: 'Finish within 40s' },
  { id: 'T07', name: 'Double Bind', seed: 3039007, length: 28, limit: 120, objective: 'hunter-body-blocks', target: 2, silver: 'Finish within 85s', gold: 'Finish within 60s without damage' },
  { id: 'T08', name: 'Long Memory', seed: 3039008, length: 48, limit: 100, objective: 'ordinary-cores-no-splice', target: 10, silver: 'Finish within 75s', gold: 'Finish within 55s' },
  { id: 'T09', name: 'Heat Signature', seed: 3039009, length: 8, limit: 120, objective: 'heat-relay-circuits', target: 3, silver: 'Finish within 90s', gold: 'Finish within 70s without damage' },
  { id: 'T10', name: 'Signal Chain', seed: 3039010, length: 8, limit: 90, objective: 'ordinary-cores-combo', target: 12, silver: 'Reach 3× combo and complete', gold: 'Reach 4× combo and complete' },
  { id: 'T11', name: 'Precision Cut', seed: 3039011, length: 24, limit: 90, objective: 'checkpoints-use-supplied-splice', target: 8, silver: 'Finish within 65s', gold: 'Finish within 45s' },
  { id: 'T12', name: 'Last Light', seed: 3039012, length: 8, limit: 120, objective: 'survive-120s-and-cores', target: 18, silver: 'Also body-block one rival', gold: 'Also body-block two rivals without damage' },
];

export const LIVERIES: CosmeticDefinition[] = [
  { id: 'livery-cyan-origin', name: 'Cyan Origin', color: '#20dfff', achievement: null },
  { id: 'livery-neon-violet', name: 'Neon Violet', color: '#af6bff', achievement: 'ACH-01' },
  { id: 'livery-chrome-bloom', name: 'Chrome Bloom', color: '#c3dbe9', achievement: 'ACH-02' },
  { id: 'livery-foundry-ember', name: 'Foundry Ember', color: '#ff9255', achievement: 'ACH-03' },
  { id: 'livery-ghost-pearl', name: 'Ghost Pearl', color: '#efd5ff', achievement: 'ACH-04' },
  { id: 'livery-crown-obsidian', name: 'Crown Obsidian', color: '#5b6e8c', achievement: 'ACH-05' },
];
export const TRAILS: CosmeticDefinition[] = [
  { id: 'trail-pulse', name: 'Pulse', color: '#20dfff', achievement: null },
  { id: 'trail-circuit-ribbon', name: 'Circuit Ribbon', color: '#68edff', achievement: 'ACH-06' },
  { id: 'trail-ion-dust', name: 'Ion Dust', color: '#f4a0ff', achievement: 'ACH-07' },
  { id: 'trail-data-echo', name: 'Data Echo', color: '#997cff', achievement: 'ACH-08' },
  { id: 'trail-aurora-thread', name: 'Aurora Thread', color: '#80ffcb', achievement: 'ACH-09' },
  { id: 'trail-crown-wake', name: 'Crown Wake', color: '#eaf8ff', achievement: 'ACH-10' },
];
export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'ACH-01', name: 'First Breach', condition: 'Clear Neon Spire', reward: 'livery-neon-violet' },
  { id: 'ACH-02', name: 'Market Unbound', condition: 'Clear Chrome Bazaar', reward: 'livery-chrome-bloom' },
  { id: 'ACH-03', name: 'Pressure Released', condition: 'Clear Reactor Foundry', reward: 'livery-foundry-ember' },
  { id: 'ACH-04', name: 'Ghost in the Grid', condition: 'Clear Ghost Circuit', reward: 'livery-ghost-pearl' },
  { id: 'ACH-05', name: 'Our Tomorrow', condition: 'Complete Campaign or Arcade Run', reward: 'livery-crown-obsidian' },
  { id: 'ACH-06', name: 'Signal Breaker', condition: 'Interrupt ten preparations with EMP', reward: 'trail-circuit-ribbon' },
  { id: 'ACH-07', name: 'Perfect Current', condition: 'Reach 4× core combo in a scored mode', reward: 'trail-ion-dust' },
  { id: 'ACH-08', name: 'Calibration Complete', condition: 'Earn Bronze in six distinct Trials', reward: 'trail-data-echo' },
  { id: 'ACH-09', name: 'Total Control', condition: 'Earn Silver in all twelve Trials', reward: 'trail-aurora-thread' },
  { id: 'ACH-10', name: 'One Continuous Line', condition: 'Complete an Arcade Run', reward: 'trail-crown-wake' },
  { id: 'ACH-11', name: 'Body Language', condition: 'Earn five regular-rival body-block defeats', reward: 'badge-body-language' },
  { id: 'ACH-12', name: 'Unbroken Signal', condition: 'Clear ten Endless waves in one run', reward: 'badge-unbroken-signal' },
];

export function validateContent(): string[] {
  const errors: string[] = [];
  const ids = [...DISTRICTS.map(d => d.id), ...DISTRICTS.flatMap(d => d.waves.map(w => w.id)), ...TRIALS.map(t => t.id), ...LIVERIES.map(c => c.id), ...TRAILS.map(c => c.id), ...ACHIEVEMENTS.map(a => a.id)];
  if (new Set(ids).size !== ids.length) errors.push('Content IDs must be unique.');
  if (DISTRICTS.length !== 5 || DISTRICTS.some(d => d.waves.length !== 3)) errors.push('The complete campaign requires five districts and fifteen waves.');
  if (DISTRICTS.flatMap(d => d.waves).reduce((sum, wave) => sum + wave.quota, 0) !== 228) errors.push('Campaign ordinary-core total must be 228.');
  for (const district of DISTRICTS) for (const wave of district.waves) {
    if (!Number.isInteger(wave.quota) || wave.quota < 1) errors.push(`${wave.id}: invalid quota.`);
    if (wave.threats.hunter + wave.threats.ambush > 2 || wave.threats.gates > 3 || wave.threats.mines > 8) errors.push(`${wave.id}: threat capacity exceeded.`);
  }
  if (TRIALS.length !== 12 || LIVERIES.length !== 6 || TRAILS.length !== 6 || ACHIEVEMENTS.length !== 12) errors.push('Launch progression inventory is incomplete.');
  for (const cosmetic of [...LIVERIES, ...TRAILS]) if (cosmetic.achievement && !ACHIEVEMENTS.some(a => a.id === cosmetic.achievement)) errors.push(`${cosmetic.id}: unknown achievement.`);
  const rewards = new Set([...LIVERIES, ...TRAILS].map(c => c.id).concat(['badge-body-language', 'badge-unbroken-signal']));
  for (const achievement of ACHIEVEMENTS) if (!rewards.has(achievement.reward)) errors.push(`${achievement.id}: unknown reward.`);
  return errors;
}

const validationErrors = validateContent();
if (validationErrors.length) throw new Error(validationErrors.join('\n'));

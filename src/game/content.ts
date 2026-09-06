import type { AchievementDefinition, CosmeticDefinition, Difficulty, DistrictDefinition, PickupKind, ThreatRoster, TrialDefinition } from './types';

export const CONTENT_VERSION = '0.1.0-neon-spire';
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
  { id: 'D1', name: 'Neon Spire', width: 32, depth: 24, bossId: 'B1', bossName: 'Warden', implementation: 'representative', waves: [
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

export const PICKUPS: Record<PickupKind, { name: string; color: string; symbol: string; description: string; weight: number }> = {
  overdrive: { name: 'Overdrive', color: '#32eda0', symbol: '»', description: '8s · half boost drain. Same top speed.', weight: 20 },
  shield: { name: 'Shield', color: '#40aaff', symbol: '◇', description: 'One attack absorbed · 12s. Crashes remain fatal.', weight: 20 },
  surge: { name: 'Score Surge', color: '#ea39f5', symbol: '2×', description: '15s · double core and rival points.', weight: 15 },
  emp: { name: 'EMP Pulse', color: '#20dfff', symbol: '◎', description: 'Stored · disable drones and emitters for 3s within 4 units.', weight: 15 },
  magnet: { name: 'Magnet', color: '#a583ff', symbol: '∩', description: '10s · safely attracts nearby ordinary cores.', weight: 10 },
  repair: { name: 'Repair', color: '#ffcb83', symbol: '+', description: 'Restore one integrity when damaged.', weight: 8 },
  decoy: { name: 'Decoy', color: '#c69aff', symbol: '⋈', description: 'Stored · leave a 4s holographic lure.', weight: 7 },
  splice: { name: 'Tail Splice', color: '#ffaf56', symbol: '−4', description: 'Retract four tail segments · minimum eight.', weight: 5 },
};

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

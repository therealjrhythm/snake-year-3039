import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// Isolated App flows. Lab/installed snapshots are explicitly prepared encounters;
// these checks are not a normal campaign clear or physical-controller acceptance.
const url = process.argv[2] ?? 'http://127.0.0.1:3039';
const output = '/tmp/snake-expansion';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const checks = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const pass = name => { checks.push(name); console.log(`PASS ${name}`); };
const saved = () => page.evaluate(async () => (await import('/src/game/persistence.ts')).getSavedRun());
const read = () => page.evaluate(() => structuredClone(window.__observedSim.state));
const observe = () => page.evaluate(async () => {
  const moduleURL = performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => new URL(name).pathname === '/src/game/simulation.ts') ?? '/src/game/simulation.ts';
  const { Simulation } = await import(moduleURL);
  const step = Simulation.prototype.step;
  Simulation.prototype.step = function (...args) { window.__observedSim = this; return step.apply(this, args); };
});
const active = () => page.locator('.countdown-overlay').waitFor({ state: 'hidden', timeout: 10000 });
const pause = async () => { await page.keyboard.press('Escape'); await page.getByRole('heading', { name: 'PAUSED', exact: true }).waitFor(); };
async function select(label, option) { await page.getByRole('combobox', { name: label, exact: true }).click(); await page.getByRole('option', { name: option, exact: true }).click(); }
try {
  await page.route('**/src/game/persistence.ts*', async route => {
    const response = await route.fetch();
    const source = (await response.text()).replace(/export function saveRun\(snapshot\) \{\s*return putSnapshot\(SAVE_KEY, snapshot\);\s*\}/, 'export async function saveRun(snapshot) { await new Promise(resolve => setTimeout(resolve, 650)); return putSnapshot(SAVE_KEY, snapshot); }');
    await route.fulfill({ response, body: source });
  });
  await page.addInitScript(() => {
    if (!localStorage.getItem('s39.settings.v1')) localStorage.setItem('s39.settings.v1', JSON.stringify({ quality: 'low', reducedMotion: true, master: 0 }));
  });
  await page.goto(url);
  await expect(page.getByRole('button', { name: 'START GAME', exact: true })).toBeEnabled({ timeout: 30000 });
  await page.getByRole('button', { name: 'CUSTOMIZE SNAKE', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Body glow colors' }).getByRole('button')).toHaveCount(8);
  for (const glow of ['Cyan', 'Electric Blue', 'Violet', 'Magenta', 'Mint', 'Teal', 'Gold', 'Pearl']) {
    await page.getByRole('button', { name: `${glow} glow`, exact: true }).click();
    await expect(page.getByRole('img', { name: `Live 3D snake with ${glow} body glow and a cyan head marker`, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Rotate snake right', exact: true }).click();
  await select('Preview zoom', 'Head detail');
  await page.getByRole('button', { name: 'Magenta glow', exact: true }).click();
  await page.screenshot({ path: `${output}/customize-magenta.png` });
  assert.equal(await page.locator('.world canvas').count(), 1);
  await page.getByRole('button', { name: 'Apply glow', exact: true }).click();
  assert.equal(await page.evaluate(async () => (await import('/src/game/appearance.ts')).readAppearance()), 'magenta');
  await page.reload();
  await expect(page.getByRole('button', { name: 'START GAME', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'CUSTOMIZE SNAKE', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Magenta glow', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Restore Cyan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cyan glow', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await page.evaluate(async () => (await import('/src/game/appearance.ts')).readAppearance()), 'magenta');
  pass('All eight free glows, same-canvas preview, rotate/zoom, Apply persistence and Cancel/Restore semantics');

  await observe();
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  await page.getByRole('button', { name: 'ENTER NEON SPIRE', exact: true }).click();
  await active();
  await page.waitForFunction(() => window.__observedSim?.state.totalCores >= 1);
  await pause();
  const beforeCustomize = await read();
  assert.equal(beforeCustomize.layoutId, 'neon-spire-v2');
  await page.getByRole('button', { name: 'CUSTOMIZE SNAKE', exact: true }).click();
  await page.getByRole('button', { name: 'Gold glow', exact: true }).click();
  await page.getByRole('button', { name: 'Rotate snake left', exact: true }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Apply glow', exact: true }).click();
  assert.deepEqual(await read(), beforeCustomize);
  await page.getByRole('button', { name: 'SAVE & EXIT', exact: true }).click();
  await expect(page.locator('.pause-panel')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.countdown-overlay').count(), 0);
  assert.deepEqual(await read(), beforeCustomize);
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).waitFor();
  const campaignSave = await saved();
  assert.deepEqual(campaignSave.player, beforeCustomize.player);
  pass('Expanded run uses v2 layout; customization freezes exact state and a delayed save blocks resume until committed');

  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  await page.getByRole('button', { name: 'Powerup Lab', exact: true }).click();
  await select('Test system', 'Pulse Blaster');
  await page.getByRole('button', { name: 'Try system', exact: true }).click();
  // Hold Fire throughout countdown: entering play must still require release.
  await page.keyboard.down('f');
  await active();
  await page.waitForFunction(() => window.__observedSim?.state.lab === 'blaster' && window.__observedSim.state.weapon.ammo === 12);
  assert.equal((await read()).events.some(event => event.kind === 'player-shot'), false);
  await page.keyboard.up('f');
  await page.keyboard.down('f');
  await page.waitForFunction(() => window.__observedSim.state.weapon.ammo < 12);
  await page.keyboard.up('f');
  await pause();
  const lab = await read();
  assert.equal(lab.mode, 'practice'); assert.equal(lab.lab, 'blaster');
  await expect(page.locator('.hud-objective')).toContainText('land two hits');
  await expect(page.locator('.hud-objective')).not.toContainText('12 energy cores');
  assert.ok(lab.events.some(event => event.kind === 'player-shot'));
  assert.deepEqual(await saved(), campaignSave);
  await page.getByRole('button', { name: 'REFILL & RESET LAB', exact: true }).click();
  await active();
  await page.waitForFunction(() => window.__observedSim.state.weapon.ammo === 12);
  await pause();
  await page.getByRole('button', { name: 'CHOOSE LAB SYSTEM', exact: true }).click();
  for (const name of ['Overdrive', 'Score Surge', 'Magnet', 'Shield', 'EMP Pulse', 'Repair', 'Decoy', 'Tail Splice', 'Pulse Blaster', 'Capacitor', 'Bullet Scrubber', 'Chain Buffer', 'Warden · movement or blaster']) {
    await select('Test system', name);
  }
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'LEAVE LAB', exact: true }).click();
  assert.deepEqual(await saved(), campaignSave);
  assert.deepEqual(await page.evaluate(async () => (await import('/src/game/persistence.ts')).getRecords()), []);
  pass('Powerup Lab equips/fires/refills through real keyboard input; held-F suppression and all 13 choices; campaign save and records remain intact');

  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
  await active();
  await page.getByRole('heading', { name: 'CONNECTION SEVERED', exact: true }).waitFor({ timeout: 12000 });
  const ended = await read();
  await page.getByRole('button', { name: 'REPLAY THIS SEED', exact: true }).click();
  await active();
  await page.waitForFunction(runId => window.__observedSim.state.runId !== runId, ended.runId);
  await pause();
  const replay = await read();
  assert.equal(replay.seed, ended.seed); assert.equal(replay.layoutId, ended.layoutId);
  assert.equal(replay.contentVersion, ended.contentVersion); assert.notEqual(replay.runId, ended.runId);
  assert.ok(replay.time < ended.time); assert.equal(replay.wave, 1);
  pass('Replay This Seed starts a fresh attempt with the same seed, layout and rules, and a distinct run identity');

  // Explicit hybrid-boss snapshot: no claim of ordinary collection-wave progression.
  await page.goto(url);
  await page.evaluate(async () => {
    const { Simulation } = await import('/src/game/simulation.ts');
    const { saveRun } = await import('/src/game/persistence.ts');
    const sim = new Simulation({ seed: 3039042 });
    Object.assign(sim.state, { wave: 3, coresCollected: 12, totalCores: 36, status: 'boss-intro', pendingSpawns: [], mines: [], drones: [], pickups: [], cores: [] });
    sim.beginBoss();
    const s = sim.state, p = s.player;
    Object.assign(p, { x: 0, z: -6, heading: -Math.PI / 2 });
    p.body = Array.from({ length: p.length }, (_, i) => ({ x: 0, z: -6 + (i + 1) * .55 }));
    p.path = Array.from({ length: 400 }, (_, i) => ({ x: 0, z: -6 + i * .125 }));
    Object.assign(s.boss, { charge: 3, phase: 'recovery', phaseTime: 4, stage: 'exposed', relays: [] });
    s.weapon.ammo = 12;
    s.drones = []; s.gates = []; s.pendingSpawns = [];
    Simulation.restore(sim.snapshot()); await saveRun(sim.snapshot());
  });
  await page.reload(); await observe();
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
  await active();
  await expect(page.locator('.boss-counters')).toContainText('RELAY CHARGE 3 / 3');
  await expect(page.locator('.boss-counters')).toContainText('ARMOR NODES LEFT 3 / 3');
  await page.keyboard.down('f');
  await page.waitForFunction(() => window.__observedSim?.state.boss.nodes === 2);
  await page.keyboard.up('f'); await pause();
  const boss = await read();
  assert.equal(boss.boss.charge, 0); assert.equal(boss.events.filter(event => event.kind === 'boss-node').length, 1);
  await page.getByRole('button', { name: 'PICKUPS & TACTICS', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Warden', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.warden-guide')).toContainText('Armor nodes remaining 2 / 3');
  await page.screenshot({ path: `${output}/warden-context-guide.png` });
  pass('Prepared Warden encounter: visible independent counters, real F shots break one node and spend charge once; paused guide matches current boss state');

  // A genuine legacy-layout attempt must not promise the expanded supply/weapon rules.
  await page.goto(url);
  await page.evaluate(async () => {
    const { Simulation } = await import('/src/game/simulation.ts');
    const { saveRun } = await import('/src/game/persistence.ts');
    await saveRun(new Simulation({ seed: 3039043, layoutId: 'neon-spire-v1' }).snapshot());
  });
  await page.reload(); await observe();
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
  await active(); await pause();
  await page.getByRole('button', { name: 'PICKUPS & TACTICS', exact: true }).click();
  await expect(page.locator('.legacy-note')).toContainText('original 32 × 24 rules');
  await page.getByRole('tab', { name: 'Pickups', exact: true }).click();
  await expect(page.locator('.guide-dialog')).toContainText('Legacy supply uses weighted random offers; Campaign Decoy is unavailable.');
  await page.getByRole('tab', { name: 'Tactics', exact: true }).click();
  await expect(page.locator('.tactical-guide')).toContainText('Legacy Campaign introduces EMP in Wave 2; later offers are random.');
  await expect(page.locator('.tactical-guide')).toContainText('Available in legacy Practice only; this Campaign does not supply it.');
  await expect(page.locator('.weapon-guide')).toContainText('Unavailable in this legacy run.');
  await page.getByRole('tab', { name: 'Warden', exact: true }).click();
  await expect(page.locator('.warden-guide')).toContainText('A successful pad discharge spends all three relays and breaks exactly one node.');
  await expect(page.locator('.warden-guide')).not.toContainText('Partial blaster hits');
  pass('Legacy save guide truthfully retains original supply, Practice-only Decoy and pad-only Warden guidance');

  assert.deepEqual(errors, []); pass('No uncaught browser or console errors');
  await writeFile(`${output}/report.json`, JSON.stringify({ date: new Date().toISOString(), browser: browser.version(), checks, errors, limitations: ['Isolated installed Chrome with Low graphics; Browser plugin unavailable.', 'Mouse/keyboard App actions and explicit Lab/boss fixtures; no physical Xbox or ordinary full campaign clear is established.', 'No changes to owner browser storage.'] }, null, 2));
} finally { await browser.close(); }

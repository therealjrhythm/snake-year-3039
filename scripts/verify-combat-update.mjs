import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// Development-only App integration. Explicitly prepared wave/boss saves isolate
// life/weapon boundaries. These are not an ordinary clear or physical Xbox QA.
// State observers only read after the real App calls step/retry; they do not steer,
// advance, or mutate its live simulation. Run sequentially with all browser QA.
const target = new URL(process.argv[2] ?? 'http://127.0.0.1:3039');
assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname), 'Use localhost: this check imports development modules and installs isolated fixture saves.');
const output = process.argv[3] ?? '/tmp/snake-combat-update';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(12000);
const checks = [], errors = [], warnings = [], evidence = [];
let failure = null;
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
  if (message.type() === 'warning') warnings.push(message.text());
});
const pass = name => { checks.push(name); console.log(`PASS ${name}`); };
const capture = async name => { await page.screenshot({ path: `${output}/${name}.png` }); evidence.push(`${name}.png`); };
const read = () => page.evaluate(() => structuredClone(window.__combatObserved?.state));
const saved = () => page.evaluate(async () => (await import('/src/game/persistence.ts')).getSavedRun());
const records = () => page.evaluate(async () => (await import('/src/game/persistence.ts')).getRecords());
const observe = () => page.evaluate(async () => {
  const moduleURL = performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => new URL(name).pathname === '/src/game/simulation.ts') ?? '/src/game/simulation.ts';
  const { Simulation } = await import(moduleURL);
  const step = Simulation.prototype.step;
  const retry = Simulation.prototype.retryCurrentWave;
  Simulation.prototype.step = function (...args) { window.__combatObserved = this; return step.apply(this, args); };
  Simulation.prototype.retryCurrentWave = function (...args) {
    const result = retry.apply(this, args);
    if (result) window.__combatRetryBoundary = structuredClone(this.state);
    return result;
  };
});
async function title(reload = false) {
  if (reload) await page.reload(); else await page.goto(target.href);
  await expect(page.getByRole('button', { name: 'START GAME', exact: true })).toBeEnabled({ timeout: 30000 });
  await observe();
}
async function active() {
  await page.locator('.countdown-overlay').waitFor({ state: 'hidden', timeout: 10000 });
  await page.waitForFunction(() => window.__combatObserved?.state.status === 'playing' || window.__combatObserved?.state.status === 'boss');
}
async function pause() {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'PAUSED', exact: true })).toBeVisible();
}
async function choose(label, option) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: new RegExp(`^${option}(?:\\s|$)`) }).click();
}

// Build fixtures separately, then let the App restore them through Continue Run.
async function install(kind) {
  await title();
  const fixture = await page.evaluate(async kind => {
    const { Simulation, FIXED_DT } = await import('/src/game/simulation.ts');
    const { EXPANDED_CONTENT_VERSION } = await import('/src/game/content.ts');
    const { saveRun } = await import('/src/game/persistence.ts');
    const neutral = { x: 0, y: 0, boost: false, use: false, swap: false, fire: false };
    const sim = new Simulation({ seed: kind === 'wave' ? 3039301 : kind === 'laser' ? 3039302 : kind === 'volley' ? 3039303 : 3039304, ...(kind === 'previous' ? { contentVersion: EXPANDED_CONTENT_VERSION } : {}) });
    const place = (x, z, heading = 0) => {
      const p = sim.state.player;
      Object.assign(p, { x, z, heading, length: 8 });
      p.body = Array.from({ length: 8 }, (_, i) => ({ x: x - Math.cos(heading) * (i + 1) * 0.55, z: z - Math.sin(heading) * (i + 1) * 0.55 }));
      p.path = Array.from({ length: 510 }, (_, i) => ({ x: x - Math.cos(heading) * i * 0.15, z: z - Math.sin(heading) * i * 0.15 }));
    };
    if (kind === 'wave') {
      place(0, 3);
      Object.assign(sim.state, { status: 'transition', transitionTime: FIXED_DT, wave: 1, totalCores: 12, score: 1200, cores: [], pickups: [], mines: [], drones: [], rivals: [], gates: [], pendingSpawns: [] });
      sim.state.weapon.ammo = 7; sim.state.slots = [true, false]; sim.state.buffs.magnet = 5;
      sim.step(FIXED_DT, neutral); // Actual transition logic captures the wave-2 entry.
      sim.state.cores = [{ id: 'fixture-earned-core', x: sim.state.player.x, z: sim.state.player.z }];
      sim.step(FIXED_DT, neutral); // A genuine pickup earns points after that entry.
      sim.step(FIXED_DT, { ...neutral, fire: true, use: true });
      place(17.45, 3); // Prepared approach: actual App movement causes the wall crash.
    } else if (kind === 'laser' || kind === 'volley') {
      place(0, kind === 'laser' ? -4 : 3, kind === 'laser' ? -Math.PI / 2 : 0);
      Object.assign(sim.state, { wave: 3, status: 'boss-intro', totalCores: 36, coresCollected: 12, score: 3600, cores: [], pickups: [], mines: [], drones: [], rivals: [], gates: [], pendingSpawns: [] });
      sim.beginBoss();
      sim.state.gates = []; sim.state.pendingSpawns = [];
      sim.state.weapon.ammo = 0;
      if (kind === 'laser') Object.assign(sim.state.boss, { charge: 2, phase: 'safe', phaseTime: 10, relays: [{ id: 'fixture-sphere-3', number: 3, x: 0, z: -8 }] });
      else sim.state.boss.phaseTime = 0.2;
    }
    const snapshot = sim.snapshot();
    Simulation.restore(snapshot); // The normal untrusted-save validator must accept it.
    await saveRun(snapshot);
    return snapshot;
  }, kind);
  await title(true);
  await expect(page.getByRole('button', { name: 'CONTINUE RUN', exact: true })).toBeEnabled();
  return fixture;
}

try {
  await page.addInitScript(() => localStorage.setItem('s39.settings.v1', JSON.stringify({ quality: 'low', reducedMotion: true, master: 0, music: 0, effects: 0 })));
  await title();
  await expect(page).toHaveTitle('Snake: Year 3039');
  assert.equal(await page.locator('vite-error-overlay').count(), 0);
  for (const profile of [{ label: 'Normal', difficulty: 'standard', health: 3 }, { label: 'Easier', difficulty: 'assisted', health: 5 }, { label: 'Harder', difficulty: 'expert', health: 3 }]) {
    await page.getByRole('button', { name: 'START GAME', exact: true }).click();
    await choose('Difficulty', profile.label);
    await expect(page.locator('.difficulty-description')).toContainText(`${profile.health} health`);
    await page.getByRole('button', { name: 'ENTER NEON SPIRE', exact: true }).click();
    await active(); await pause();
    const state = await read();
    assert.equal(state.difficulty, profile.difficulty); assert.equal(state.player.maxIntegrity, profile.health); assert.equal(state.lives, 3); assert.equal(state.contentVersion, '0.3.0-neon-spire');
    await title();
  }
  pass('Each real Difficulty choice creates the intended health/rules profile and three-life run');

  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  const enter = await page.getByRole('button', { name: 'ENTER NEON SPIRE', exact: true }).boundingBox();
  const practice = await page.getByRole('button', { name: 'PRACTICE WITHOUT RECORDS', exact: true }).boundingBox();
  assert.ok(enter && practice && Math.abs(enter.width - practice.width) < 1 && Math.abs(enter.height - practice.height) < 1);
  await expect(page.locator('.briefing').getByRole('button', { name: 'Powerup Lab', exact: true })).toHaveCount(0);
  await choose('Difficulty', 'Easier');
  await page.getByRole('button', { name: 'PRACTICE WITHOUT RECORDS', exact: true }).click();
  await active(); await pause();
  assert.equal((await read()).mode, 'practice'); assert.equal((await read()).difficulty, 'assisted'); assert.equal((await read()).player.maxIntegrity, 5); assert.deepEqual(await records(), []);
  pass('Full-size briefing Practice action uses its selected rules without creating records; duplicate Lab link is removed');

  const wave = await install('wave');
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
  await expect(page.locator('.life-panel')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.life-panel')).toContainText('2 LIVES REMAINING');
  await expect(page.getByRole('button', { name: 'RETRY WAVE 2', exact: true })).toBeVisible();
  await expect.poll(async () => (await saved())?.lives).toBe(2);
  const death = await read();
  assert.equal(death.wave, 2); assert.equal(death.score, 1300); assert.equal(death.runId, wave.runId); assert.equal(death.status, 'dead');
  const frozen = await read();
  await page.keyboard.down('f'); await page.waitForTimeout(150); await page.keyboard.up('f');
  assert.deepEqual(await read(), frozen);
  await capture('life-lost-wave-2');
  await title(true);
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
  await expect(page.locator('.life-panel')).toBeVisible();
  await expect(page.locator('.countdown-overlay')).toHaveCount(0);
  await expect(page.locator('.life-panel')).toContainText('2 LIVES REMAINING');
  assert.equal((await saved()).runId, wave.runId);
  pass('Prepared wave-2 wall approach loses exactly one life; dead-state autosave reloads into the frozen life menu with two lives');

  await page.getByRole('button', { name: 'RETRY WAVE 2', exact: true }).click();
  await page.keyboard.down('f');
  const boundary = await page.evaluate(() => window.__combatRetryBoundary);
  for (const key of ['runId', 'wave', 'score', 'coresCollected', 'totalCores', 'rng', 'nextId', 'player', 'weapon', 'slots', 'buffs', 'supply', 'pendingSpawns', 'cores', 'pickups']) assert.deepEqual(boundary[key], wave.retryCheckpoint[key], `Retry ${key}`);
  assert.equal(boundary.lives, 2); assert.equal(boundary.time, death.time);
  await active();
  await page.waitForFunction(() => window.__combatObserved?.state.wave === 2 && window.__combatObserved.state.status === 'playing');
  assert.equal((await read()).weapon.ammo, 7);
  await page.keyboard.up('f'); await page.keyboard.down('f');
  await page.waitForFunction(() => window.__combatObserved.state.weapon.ammo < 7);
  await page.keyboard.up('f'); await pause();
  assert.equal((await read()).score, 1200);
  const paused = await read(); await page.waitForTimeout(150); assert.deepEqual(await read(), paused);
  pass('Real Retry restores exact wave-entry score, equipment and body with the same identity; countdown suppresses held Fire until release and pause freezes state');

  await page.getByRole('button', { name: 'RESUME', exact: true }).click();
  await expect(page.locator('.life-panel')).toBeVisible({ timeout: 15000 }); // Continue straight along the clear lane to the wall.
  await expect(page.locator('.life-panel')).toContainText('1 LIFE REMAINING');
  await page.getByRole('button', { name: 'RETRY WAVE 2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'CONNECTION SEVERED', exact: true })).toBeVisible({ timeout: 15000 });
  assert.equal((await read()).lives, 0); assert.equal((await read()).runId, wave.runId);
  await expect(page.getByRole('button', { name: 'RETRY CHECKPOINT', exact: true })).toHaveCount(0);
  await expect.poll(async () => (await records()).filter(record => record.runId === wave.runId).length).toBe(1);
  await expect.poll(saved).toBeNull();
  await page.getByRole('button', { name: 'REPLAY THIS SEED', exact: true }).click();
  await active(); await pause();
  const replay = await read();
  assert.equal(replay.lives, 3); assert.equal(replay.wave, 1); assert.equal(replay.seed, wave.seed); assert.notEqual(replay.runId, wave.runId);
  pass('Three actual wall deaths end one run exactly once; no checkpoint bypass remains, and replay begins Wave 1 with a new identity and three lives');

  const laser = await install('laser');
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
  await active();
  await page.keyboard.down('f');
  await page.waitForFunction(() => window.__combatObserved.state.events.some(event => event.kind === 'weapon-empty'));
  const uncharged = await read();
  assert.equal(uncharged.boss.charge, 2); assert.equal(uncharged.boss.nodes, 3); assert.equal(uncharged.weapon.ammo, 0); assert.equal(uncharged.playerProjectiles.length, 0);
  await page.waitForFunction(() => window.__combatObserved.state.boss.charge === 3);
  const charged = await read(); assert.equal(charged.boss.stage, 'exposed'); assert.equal(charged.boss.phase, 'safe');
  await page.waitForFunction(() => window.__combatObserved.state.boss.nodes === 2);
  await page.keyboard.up('f'); await pause();
  const hit = await read();
  assert.equal(hit.runId, laser.runId); assert.equal(hit.boss.charge, 0); assert.equal(hit.weapon.ammo, 0);
  assert.equal(hit.events.filter(event => event.kind === 'boss-node').length, 1);
  assert.deepEqual(hit.events.filter(event => event.kind === 'receptor-hit').map(event => event.amount), [1, 2, 3]);
  await expect(page.getByLabel('Boss laser status')).toContainText('SNAKE LASER');
  await expect(page.getByLabel('Boss laser status')).toContainText('COLLECT 1 → 2 → 3 TO CHARGE');
  await page.getByRole('button', { name: 'PICKUPS & TACTICS', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Warden', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.warden-guide')).toContainText('Armor nodes remaining 2 / 3');
  await expect(page.locator('.warden-guide')).toContainText('needs no ammo');
  await expect(page.locator('.warden-guide')).not.toContainText('Green = ready to cross');
  await capture('laser-warden-guide');
  pass('Prepared Warden approach uses actual sphere contact and held F: no precharge fire, immediate exposure outside recovery, three no-ammo laser hits and one armor break with truthful HUD/guide');

  await install('volley');
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
  await active();
  await page.waitForFunction(() => window.__combatObserved.state.boss.volley !== null);
  const warning = await read();
  assert.equal(warning.boss.volley.targets.length, 3); assert.equal(warning.projectiles.filter(shot => shot.id.startsWith('warden-shot-')).length, 0);
  await expect(page.locator('.boss-phase')).toContainText('INCOMING SHOTS');
  await capture('warden-counterfire-warning');
  await page.waitForFunction(() => window.__combatObserved.state.projectiles.some(shot => shot.id.startsWith('warden-shot-')));
  await pause();
  const fired = await read(); const shots = fired.projectiles.filter(shot => shot.id.startsWith('warden-shot-'));
  assert.equal(shots.length, 3); assert.equal(fired.boss.volley, null);
  for (const [index, shot] of shots.entries()) {
    const target = warning.boss.volley.targets[index], origin = warning.boss.volley.origin;
    assert.ok(Math.abs(Math.atan2(shot.vz, shot.vx) - Math.atan2(target.z - origin.z, target.x - origin.x)) < 1e-8);
  }
  pass('Prepared Warden attack shows incoming-fire HUD and three warning rays before emitting actual shots on those locked trajectories');

  await install('previous');
  await expect(page.locator('.saved-rules-note')).toContainText('Continue keeps earlier rules');
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
  await active(); await pause();
  const earlier = await read();
  assert.equal(earlier.contentVersion, '0.2.0-neon-spire'); assert.equal(earlier.lives, 1); assert.equal(earlier.retryCheckpoint, null);
  await page.getByRole('button', { name: 'PICKUPS & TACTICS', exact: true }).click();
  await page.getByRole('tab', { name: 'Tactics', exact: true }).click();
  await expect(page.locator('.weapon-guide')).toContainText('In this earlier run');
  await expect(page.locator('.weapon-guide')).not.toContainText('unlimited boss laser');
  await page.getByRole('tab', { name: 'Warden', exact: true }).click();
  await expect(page.locator('.warden-guide')).toContainText('Green = ready to cross');
  await expect(page.locator('.warden-guide')).toContainText('Partial blaster hits reset');
  pass('Earlier 0.2 saves display a Continue notice and retain one life, finite ammunition, hybrid pad guidance and original rules');
  assert.deepEqual(errors, []);
  pass('No uncaught browser or console errors in the actual App integration');
} catch (error) {
  failure = error.stack ?? String(error);
  await capture('failure').catch(() => {});
  console.error(failure);
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify({ date: new Date().toISOString(), target: target.href, browser: browser.version(), checks, errors, warnings, evidence, failure, limitations: ['Browser plugin not available; isolated installed Chrome with Low graphics and reduced motion.', 'Actual App mouse/keyboard actions plus clearly prepared wave/boss saves and read-only state observers.', 'No ordinary full campaign clear, physical Xbox acceptance or sustained performance measurement is claimed.', 'The owner browser, saves and records are never touched.'] }, null, 2));
  await browser.close();
}
if (failure) process.exitCode = 1;

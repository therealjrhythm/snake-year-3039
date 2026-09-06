import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Arranged, validated snapshots exercise the real App and keyboard input. They
// are not normal wave progression, a full playthrough, or physical Xbox evidence.
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3039';
const outputDir = path.resolve(process.argv[3] ?? '/tmp/snake-systems-verification');
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.setDefaultTimeout(6000);
const checks = [], captures = [], evidence = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const pass = name => { checks.push(name); console.log(`PASS ${name}`); };

async function capture(name) {
  const file = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: file });
  captures.push(file);
}
async function saved() {
  return page.evaluate(async () => (await import('/src/game/persistence.ts')).getSavedRun());
}
async function pause() {
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await page.getByRole('heading', { name: 'PAUSED', exact: true }).waitFor();
}
async function saveAndRead() {
  await page.getByRole('button', { name: 'SAVE & EXIT', exact: true }).click();
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).waitFor();
  return saved();
}
async function loadFixture(kind) {
  // The bootstrap document has no running App, so no terminal-record transaction
  // can race with fixture installation. This is an ephemeral browser profile.
  await page.goto(new URL('/systems-fixture', baseUrl).href);
  await page.evaluate(async kind => {
    const { Simulation } = await import('/src/game/simulation.ts');
    const { saveRun } = await import('/src/game/persistence.ts');
    localStorage.setItem('s39.settings.v1', JSON.stringify({ quality: 'low', bloom: 0, reducedMotion: true }));
    const sim = new Simulation({ seed: 3039088, difficulty: 'standard', mode: 'campaign' });
    const s = sim.state;
    Object.assign(s, {
      runId: `systems-fixture-${kind}`, cores: [], pickups: [], mines: [], drones: [],
      rivals: [], projectiles: [], gates: [], pendingSpawns: [],
      optionalTimer: 99999, coreRetry: 99999, events: [], event: null, eventCounter: 0,
    });
    if (kind === 'automatic') {
      // Pickup contact precedes a core within one fixed step. A later Patrol
      // shot then checks that routine events cannot erase the pickup explanation.
      s.pickups = [{ id: 'fixture-overdrive', x: 0, z: 5.45, kind: 'overdrive', ttl: 15 }];
      s.cores = [{ id: 'fixture-core', x: 0, z: 5.335 }];
      s.drones = [{ id: 'distant-patrol', x: 10, z: -7, state: 'prepare', target: { x: 0, z: 6 }, disabled: 0, timer: 0.18, cooldown: 0, anchor: { x: 10, z: -7 }, phase: 0 }];
    } else if (kind === 'emp') {
      s.wave = 2;
      s.pickups = [{ id: 'fixture-emp', x: 0, z: 5.45, kind: 'emp', ttl: 15 }];
      s.cores = [{ id: 'fixture-core', x: 0, z: 5.335 }];
      s.drones = [{ id: 'near-patrol', x: 2, z: 4, state: 'prepare', target: { x: 0, z: 6 }, disabled: 0, timer: 0.8, cooldown: 0, anchor: { x: 2, z: 4 }, phase: 0 }];
    } else if (kind === 'body-shot') {
      s.projectiles = [{ id: 'fixture-body-shot', x: 0, z: 8, vx: 4, vz: 0, ttl: 5 }];
    } else {
      s.projectiles = [{ id: 'fixture-head-shot', x: 0, z: 4, vx: 0, vz: 4, ttl: 5 }];
      if (kind === 'shield') s.buffs.shield = 12;
    }
    Simulation.restore(sim.snapshot());
    await saveRun(sim.snapshot());
  }, kind);
  await page.goto(baseUrl);
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
  await page.locator('.countdown-overlay').waitFor({ state: 'visible' });
  await page.locator('.countdown-overlay').waitFor({ state: 'hidden', timeout: 6000 });
}

try {
  await page.route('**/systems-fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Explicit systems fixture installer</title>' }));

  await loadFixture('automatic');
  await page.getByText('Half boost drain', { exact: true }).waitFor();
  assert.match(await page.locator('.tactical-hint').innerText(), /EMP charges arrive in Wave 2/);
  assert.match(await page.locator('.hud-resources .active-buffs').innerText(), /Overdrive[\s\S]*Half boost drain[\s\S]*[1-8]s/);
  await page.waitForTimeout(350);
  assert.match(await page.locator('.event-toast').innerText(), /OVERDRIVE/);
  await pause();
  await capture('automatic-bonus-paused');
  const automatic = await saveAndRead();
  assert.equal(automatic.totalCores, 1); assert.equal(automatic.player.length, 9);
  assert.ok(automatic.buffs.overdrive > 0);
  const pickup = automatic.events.find(event => event.kind === 'pickup');
  const core = automatic.events.find(event => event.kind === 'core');
  assert.equal(pickup.pickup, 'overdrive'); assert.equal(pickup.time, core.time); assert.ok(pickup.id < core.id);
  assert.ok(automatic.events.some(event => event.kind === 'shot' && event.id > pickup.id));
  pass('Automatic pickup effect/timer and Wave 1 tactical availability stay readable after same-tick core and later shot');

  // Freeze the resume countdown before it advances the saved simulation. The
  // guide must return to pause and Save & Exit must preserve this exact snapshot.
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.getByRole('heading', { name: 'PAUSED', exact: true }).waitFor();
  const hudBeforeGuide = await page.locator('.hud').innerText();
  await page.getByRole('button', { name: 'PICKUPS & TACTICS', exact: true }).click();
  await page.getByRole('dialog', { name: 'HOW TO PLAY', exact: true }).waitFor();
  assert.equal(await page.getByRole('tab', { name: 'Pickups', exact: true }).getAttribute('aria-selected'), 'true');
  assert.match(await page.getByRole('tabpanel', { name: 'Pickups', exact: true }).innerText(), /Automatic bonuses start as soon as you collect them/);
  await page.getByRole('button', { name: 'Show the four Practice-only pickups', exact: true }).click();
  for (const name of ['Magnet', 'Repair', 'Decoy', 'Tail Splice']) assert.equal(await page.getByRole('heading', { name, exact: true }).count(), 1);
  await page.getByRole('tab', { name: 'Tactics', exact: true }).click();
  assert.match(await page.getByRole('tabpanel', { name: 'Tactics', exact: true }).innerText(), /Introduced in Wave 2[\s\S]*Available in Practice/);
  await capture('paused-tactics-guide');
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Back to paused run', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('heading', { name: 'PAUSED', exact: true }).waitFor();
  assert.equal(await page.locator('.countdown-overlay').count(), 0);
  assert.equal(await page.locator('.hud').innerText(), hudBeforeGuide);
  const afterGuide = await saveAndRead();
  assert.deepEqual(afterGuide, automatic);
  pass('Paused guide explains all eight pickups and actual tactical availability; closes to pause with exact frozen run');

  await loadFixture('emp');
  await page.locator('.tactic.ready').waitFor();
  assert.match(await page.locator('.tactic.ready').innerText(), /EMP PULSE[\s\S]*1 CHARGE/);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => /EMP PULSE.*disabled for 3s/s.test(document.querySelector('.event-toast')?.textContent ?? ''));
  await page.locator('.tactic.ready').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('.tactic.ready').count(), 0);
  await pause();
  const emp = await saveAndRead();
  assert.deepEqual(emp.slots, [false, false]); assert.equal(emp.empInterrupts, 1);
  assert.equal(emp.drones[0].state, 'disabled'); assert.ok(emp.drones[0].disabled > 0);
  assert.equal(emp.player.integrity, 3);
  const pulse = emp.events.find(event => event.kind === 'emp');
  assert.ok(pulse.origin); assert.match(pulse.text, /1 system disabled/);
  evidence.push({ fixture: 'emp', integrity: emp.player.integrity, slots: emp.slots, empInterrupts: emp.empInterrupts, pulse });
  pass('Collecting an EMP square loads the real slot; Space consumes it and disables an in-range preparing Patrol');

  await loadFixture('body-shot');
  await page.waitForTimeout(400);
  assert.equal(await page.getByLabel('3 of 3 integrity', { exact: true }).count(), 1);
  assert.equal(await page.locator('.combat-readout').count(), 0);
  await pause();
  const body = await saveAndRead();
  assert.equal(body.player.integrity, 3); assert.equal(body.damageTaken, 0); assert.equal(body.projectiles.length, 1);
  pass('A projectile crossing trailing body segments leaves integrity unchanged and shows no false head-hit message');

  await loadFixture('head-shot');
  await page.locator('.combat-readout.damage').waitFor();
  assert.match(await page.locator('.combat-readout').innerText(), /HEAD HIT.*−1 INTEGRITY/);
  assert.equal(await page.getByLabel('2 of 3 integrity', { exact: true }).count(), 1);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => /EMP EMPTY.*Wave 2/s.test(document.querySelector('.event-toast')?.textContent ?? ''));
  assert.match(await page.locator('.combat-readout').innerText(), /HEAD HIT.*−1 INTEGRITY/);
  await pause();
  await capture('head-hit-feedback-paused');
  const head = await saveAndRead();
  assert.equal(head.player.integrity, 2); assert.equal(head.damageTaken, 1); assert.equal(head.projectiles.length, 0);
  evidence.push({ fixture: 'head-shot', integrity: head.player.integrity, damageTaken: head.damageTaken, events: head.events });
  pass('An actual head hit removes one integrity and shows damage; a subsequent empty-use result stays visible beside that feedback');

  await loadFixture('shield');
  await page.locator('.combat-readout.shield-hit').waitFor();
  assert.match(await page.locator('.combat-readout').innerText(), /SHIELD ABSORBED THE HIT/);
  assert.equal(await page.getByLabel('3 of 3 integrity', { exact: true }).count(), 1);
  await pause();
  const shield = await saveAndRead();
  assert.equal(shield.player.integrity, 3); assert.equal(shield.buffs.shield, 0);
  assert.equal(shield.damageTaken, 0); assert.equal(shield.projectiles.length, 0); assert.ok(shield.player.protection > 0);
  pass('Shield visibly absorbs one head hit without integrity loss, consumes its buff and grants temporary protection');

  assert.deepEqual(errors, []);
  pass('No uncaught browser or console errors in the bounded systems flows');
  const report = {
    date: new Date().toISOString(), browser: browser.version(),
    method: 'Installed Chrome, isolated Playwright context; Browser plugin unavailable; Low quality 1280×720',
    checks, captures, evidence, errors,
    limitations: ['Every encounter starts from an explicit validated snapshot fixture in isolated browser storage.', 'Uses the real App, fixed-step simulation, keyboard actions and persisted outcomes; does not establish ordinary campaign progression, physical Xbox behavior or complete pickup QA.', 'No access to or mutation of the owner browser profile, saves or records.'],
  };
  await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(`Systems verification failed: ${error.message}`);
  console.error(`Visible pause: ${await page.locator('.pause-panel').innerText().catch(() => 'none')}`);
  throw error;
} finally { await browser.close(); }

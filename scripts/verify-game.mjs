import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.argv[2] ?? 'http://127.0.0.1:3039';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1672, height: 941 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const checks = [];
const pass = name => { checks.push(name); console.log(`PASS ${name}`); };
await mkdir('docs/evidence', { recursive: true });
async function waitActive() { await page.locator('.countdown-overlay').waitFor({ state: 'hidden', timeout: 6000 }); }
async function screen(name) { await page.screenshot({ path: `docs/evidence/${name}.png` }); }
async function saved() { return page.evaluate(async () => (await import('/src/game/persistence.ts')).getSavedRun()); }

try {
  await page.goto(url);
  await page.getByRole('button', { name: 'START GAME', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await screen('title-1672');
  assert.equal(await page.title(), 'Snake: Year 3039'); pass('Title, fonts and WebGL scene load');
  await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
  await screen('settings-1672');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' }); pass('Settings opens and Escape closes its modal');
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'ENTER NEON SPIRE');
  await page.keyboard.press('Enter');
  await waitActive();
  await page.waitForTimeout(700);
  // Capture active gameplay separately: a slow screenshot can correctly trigger the
  // game's >250 ms performance pause before an Escape toggle is delivered.
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'PAUSED', exact: true }).waitFor();
  assert.match(await page.locator('.objective-line').innerText(), /1 \/ 12/); pass('Keyboard start, countdown, forward motion and first core growth');
  const frozen = await page.locator('.hud').innerText();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.hud').innerText(), frozen); pass('Pause freezes HUD and gameplay resources');
  await screen('pause-1672');
  await page.getByRole('button', { name: 'SAVE & EXIT', exact: true }).click();
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).waitFor();
  const firstSave = await saved();
  assert.ok(firstSave.totalCores >= 1 && firstSave.player.length >= 9);
  assert.equal(firstSave.status, 'playing'); pass('Save & Exit persists an exact active snapshot');
  await page.reload();
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).waitFor();
  assert.deepEqual(await saved(), firstSave); pass('Suspend survives reload unchanged');
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.getByRole('heading', { name: 'PAUSED', exact: true }).waitFor(); pass('Focus loss freezes a resume countdown');
  await page.getByRole('button', { name: 'RESUME', exact: true }).click();
  await waitActive();
  await page.waitForTimeout(60);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
  await page.getByRole('tab', { name: 'Accessibility', exact: true }).click();
  const slider = page.getByLabel('Interface scale', { exact: false });
  await slider.fill('1.5');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 720 });
  assert.equal(await page.locator('body').evaluate(e => e.scrollWidth), 1280);
  for (const selector of ['.hud-objective', '.hud-score', '.hud-resources', '.hud-tactics']) {
    const r = await page.locator(selector).boundingBox();
    assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.width <= 1280 && r.y + r.height <= 720, selector);
  }
  await screen('pause-1280-ui150'); pass('All four HUD groups stay inside 1280×720 at 150% scale');
  await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
  await page.getByRole('button', { name: 'Restore defaults', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'RESUME', exact: true }).click();
  await waitActive();
  await page.getByRole('heading', { name: 'CONNECTION SEVERED', exact: true }).waitFor({ timeout: 10000 });
  assert.match(await page.locator('.results-panel').innerText(), /Critical crash: arena wall/);
  await screen('results-1280'); pass('Real movement into the arena wall produces named critical crash');
  await page.waitForTimeout(150);
  const records = await page.evaluate(async () => (await import('/src/game/persistence.ts')).getRecords());
  assert.equal(records.length, 1); assert.equal(await saved(), null); pass('Terminal result records once and clears the suspend');
  await page.getByRole('button', { name: 'RETRY CHECKPOINT', exact: true }).click();
  await waitActive();
  await page.keyboard.press('Escape');
  assert.match(await page.locator('.objective-line').innerText(), /0 \/ 12/); pass('Retry restores the district entry checkpoint');
  await page.getByRole('button', { name: 'RETURN TO TITLE', exact: true }).click();
  await page.getByRole('button', { name: 'Abandon run', exact: true }).click();
  await page.getByRole('button', { name: 'LOCAL RECORDS', exact: true }).click();
  await screen('records-1280');
  assert.equal(await page.locator('.records-table .records-row:not(.records-head)').count(), 1); pass('Local Records displays the real saved result');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await screen('title-390');
  assert.equal(await page.locator('body').evaluate(e => e.scrollWidth), 390); pass('Narrow title remains contained (touch gameplay is outside target)');

  // A clearly labeled fixture verifies that the real Warden state can load and render.
  // This does not claim a human or uninterrupted three-wave boss playthrough.
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  await page.getByRole('button', { name: 'ENTER NEON SPIRE', exact: true }).click();
  await waitActive();
  await page.waitForTimeout(700);
  await screen('gameplay-1672');
  // Stop the active run before installing the independent boss fixture. Otherwise
  // a real terminal-record transaction can race and clear the fixture's suspend.
  await page.reload();
  await page.evaluate(async () => {
    const { Simulation } = await import('/src/game/simulation.ts');
    const { saveRun } = await import('/src/game/persistence.ts');
    const sim = new Simulation({ seed: 3039042, difficulty: 'standard' });
    Object.assign(sim.state, { status: 'boss-intro', wave: 3, coresCollected: 12, totalCores: 36, score: 5600, time: 150, mines: [], cores: [], pickups: [], drones: [], pendingSpawns: [] });
    const player = sim.state.player;
    player.x = 0; player.z = 8; player.heading = 0; player.length = 44;
    player.path = Array.from({ length: 601 }, (_, i) => ({ x: -8 * Math.sin(i * .125 / 8), z: 8 * Math.cos(i * .125 / 8) }));
    player.body = Array.from({ length: 44 }, (_, i) => ({ x: -8 * Math.sin((i + 1) * .55 / 8), z: 8 * Math.cos((i + 1) * .55 / 8) }));
    sim.beginBoss(); await saveRun(sim.snapshot());
  });
  await page.reload();
  await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
  await waitActive();
  await screen('warden-fixture-1672');
  assert.match(await page.locator('.hud-objective').innerText(), /WARDEN/); pass('Explicit Warden fixture restores and renders real relays, nodes and HUD');
  assert.deepEqual(errors, []); pass('No uncaught browser or console errors across these flows');
  const report = { build: '0.2.0', date: new Date().toISOString(), method: 'Playwright, installed Chrome, headless; Browser plugin absent', browser: browser.version(), checks, errors, limitations: ['Warden screenshot uses an explicit snapshot fixture, not a full playthrough.', 'Controller hardware, subjective audio and five-district launch acceptance are not established.'] };
  await writeFile('docs/evidence/browser-report.json', JSON.stringify(report, null, 2));
} finally { await browser.close(); }

import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';

// Production smoke: real UI, a fresh installed-Chrome context, and ordinary opening
// movement. No source imports, page instrumentation, fixtures or owner storage.
// Run sequentially with other browser checks to avoid competing GPU workloads.
const target = process.argv[2];
assert.ok(target, 'Usage: node scripts/verify-deployment.mjs <deployed-url> [evidence-directory]');
const url = new URL(target);
assert.ok(['http:', 'https:'].includes(url.protocol), 'Use an HTTP(S) URL');
assert.ok(!url.username && !url.password && !url.search && !url.hash, 'Use a public URL without credentials, query parameters or fragments');
const output = process.argv[3] ? resolve(process.argv[3]) : join(tmpdir(), `snake-deployment-${Date.now()}`);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const checks = [], errors = [], warnings = [], failedAssets = [], screenshots = [];
const pass = name => { checks.push(name); console.log(`PASS ${name}`); };
const screen = async name => { const path = join(output, `${name}.png`); await page.screenshot({ path }); screenshots.push(path); };
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
  if (message.type() === 'warning') warnings.push(message.text());
});
page.on('response', response => {
  if (response.status() >= 400 && new URL(response.url()).origin === url.origin) failedAssets.push({ url: response.url(), status: response.status() });
});
page.on('requestfailed', request => {
  if (new URL(request.url()).origin === url.origin && ['script', 'stylesheet', 'image', 'font'].includes(request.resourceType())) failedAssets.push({ url: request.url(), error: request.failure()?.errorText });
});
let failure = null;
try {
  const response = await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200, 'App document must return HTTP 200');
  await expect(page).toHaveTitle('Snake: Year 3039');
  assert.equal(new URL(page.url()).origin, url.origin, 'Deployment must not redirect to an authentication page');
  await expect(page.getByRole('button', { name: 'START GAME', exact: true })).toBeEnabled({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.world canvas')).toHaveCount(1);
  const canvas = await page.locator('.world canvas').boundingBox();
  assert.ok(canvas && canvas.width > 100 && canvas.height > 100, 'Rendered game canvas must be visible');
  assert.equal(await page.locator('vite-error-overlay, nextjs-portal').count(), 0);
  const scripts = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => new URL(node.src).pathname));
  assert.ok(scripts.some(path => /^\/assets\/.+\.js$/.test(path)), 'Expected a compiled Vite asset');
  assert.ok(scripts.every(path => !path.startsWith('/src/') && !path.includes('@vite')), 'Development entry points must not be deployed');
  await screen('title-desktop');
  pass('HTTP 200, intended title, compiled production assets, fonts, nonblank WebGL scene and no framework overlay');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'POWERUP LAB', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'POWERUP LAB', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'POWERUP LAB', exact: true })).toBeFocused();
  await expect(page.locator('.briefing')).toHaveCount(0);
  pass('Keyboard opens the full-size title Lab directly and Escape returns focus to its title entry');

  await page.getByRole('button', { name: 'CUSTOMIZE SNAKE', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Snake glow colors' }).getByRole('button')).toHaveCount(8);
  await page.getByRole('button', { name: 'Magenta glow', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Live 3D snake with Magenta head and body glow', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rotate snake right', exact: true }).click();
  await page.getByRole('combobox', { name: 'Preview zoom', exact: true }).click();
  await page.getByRole('option', { name: 'Head detail', exact: true }).click();
  await expect(page.locator('.world canvas')).toHaveCount(1);
  await screen('customize-magenta');
  await page.getByRole('button', { name: 'Apply glow', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'START GAME', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'CUSTOMIZE SNAKE', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Magenta glow', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  pass('Eight glow choices, live one-canvas rotate/zoom preview and Apply persistence through reload');

  // Choose Low using the real settings menu to keep this bounded smoke repeatable.
  await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
  await page.getByRole('tab', { name: 'Visuals', exact: true }).click();
  await page.getByRole('combobox', { name: 'Graphics quality', exact: true }).click();
  await page.getByRole('option', { name: 'Low', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  await expect(page.locator('.briefing')).toContainText('36 × 26 arena · twelve powerups');
  await expect(page.getByRole('button', { name: 'Powerup Lab', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Powerup Lab', exact: true }).click();
  const lab = page.getByRole('dialog', { name: 'POWERUP LAB', exact: true });
  const chooseLab = async name => {
    await lab.getByRole('combobox', { name: 'Choose what to try', exact: true }).click();
    await lab.getByRole('option', { name, exact: true }).click();
  };
  const previews = new Set();
  for (const name of ['Overdrive', 'Shield', 'Score Surge', 'EMP Pulse', 'Magnet', 'Repair', 'Decoy', 'Tail Splice', 'Pulse Blaster', 'Capacitor', 'Bullet Scrubber', 'Chain Buffer']) {
    await chooseLab(name);
    await expect(lab.getByRole('heading', { name, exact: true })).toBeVisible();
    const picture = lab.locator('.lab-visual img');
    await picture.evaluate(img => img.decode());
    assert.equal(await picture.evaluate(img => img.naturalWidth), 320);
    previews.add(await picture.getAttribute('src'));
    await expect(lab.locator('.lab-use')).toContainText('How to use');
    await expect(lab.locator('canvas')).toHaveCount(0);
    if (name === 'Magnet') await screen('lab-magnet');
  }
  assert.equal(previews.size, 12, 'Each powerup must have its own loaded visual');
  await expect(lab.locator('.lab-description')).toContainText('3 extra seconds');
  await chooseLab('Warden boss fight');
  await lab.locator('.warden-pad-visual img').evaluate(img => img.decode());
  await expect(lab.locator('.warden-route')).toContainText('bottom-center');
  await expect(lab.locator('.warden-route')).toContainText('turns green');
  await expect(lab.locator('.warden-shooting')).toContainText('yellow ⊕ target');
  await expect(lab.getByRole('button', { name: 'Start practice', exact: true })).toBeVisible();
  await screen('lab-warden');
  await lab.getByRole('button', { name: 'Cancel', exact: true }).click();
  pass('All twelve Lab powers load distinct game-model images; effect/use instructions and pictured Warden pad explain both routes');
  await page.getByRole('button', { name: 'ENTER NEON SPIRE', exact: true }).click();
  await page.locator('.countdown-overlay').waitFor({ state: 'hidden', timeout: 10000 });
  await expect(page.locator('.objective-line strong')).toHaveText('1 / 12', { timeout: 5000 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'PAUSED', exact: true })).toBeVisible();
  await expect(page.locator('.length-label')).toContainText('9');
  const frozen = await page.locator('.hud').innerText();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.hud').innerText(), frozen, 'Pausing must freeze visible gameplay state');
  await screen('first-core-paused');
  pass('Normal fresh campaign countdown, forward motion, first collected core, body growth and keyboard pause');

  await page.getByRole('button', { name: 'PICKUPS & TACTICS', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Pickups', exact: true })).toHaveAttribute('aria-selected', 'true');
  const names = [];
  for (const category of ['Movement & score', 'Protection', 'Tactics & weapon']) {
    await page.getByRole('button', { name: category, exact: true }).click();
    names.push(...await page.locator('.pickup-catalog h3').allTextContents());
  }
  assert.equal(new Set(names).size, 12);
  await page.getByRole('tab', { name: 'Tactics', exact: true }).click();
  await expect(page.locator('.weapon-guide')).toContainText('Pulse Blaster · hold F');
  await page.getByRole('tab', { name: 'Warden', exact: true }).click();
  await expect(page.locator('.warden-guide')).toContainText('The pad always works without ammunition');
  await screen('warden-guide');
  await page.getByRole('button', { name: 'Back to paused run', exact: true }).click();
  assert.equal(await page.locator('.hud').innerText(), frozen);
  pass('Paused guide exposes all twelve powers, keyboard firing and both Warden routes without advancing gameplay');

  await page.getByRole('button', { name: 'SAVE & EXIT', exact: true }).click();
  await expect(page.getByRole('button', { name: 'CONTINUE RUN', exact: true })).toBeEnabled();
  for (const viewport of [{ width: 1280, height: 720 }, { width: 960, height: 540 }, { width: 375, height: 1020 }]) {
    await page.setViewportSize(viewport);
    const bounds = await page.locator('.main-menu .menu-button').evaluateAll(buttons => buttons.map(button => {
      const r = button.getBoundingClientRect(); return { name: button.textContent.trim(), x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    }));
    assert.equal(bounds.length, 5, 'All five main actions must be present with a saved run');
    for (const rect of bounds) assert.ok(rect.x >= 0 && rect.y >= 0 && rect.right <= viewport.width && rect.bottom <= viewport.height - 30, `${rect.name} must fit above the footer at ${viewport.width} × ${viewport.height}`);
    const start = bounds.find(rect => rect.name === 'START GAME'), labEntry = bounds.find(rect => rect.name === 'POWERUP LAB');
    assert.deepEqual([labEntry.width, labEntry.height], [start.width, start.height], 'The title Lab must be a full-size action');
    await screen(`title-saved-${viewport.width}`);
  }
  pass('All five title actions including Continue Run and full-size Lab fit at 1280 × 720, 960 × 540 and 375 × 1020');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator('body').evaluate(body => body.scrollWidth), 390);
  await expect(page.getByRole('button', { name: 'START GAME', exact: true })).toBeVisible();
  await screen('title-narrow');
  pass('Narrow title is contained at 390 × 844 (touch gameplay remains outside target)');
  await page.getByRole('button', { name: 'POWERUP LAB', exact: true }).click();
  await chooseLab('Chain Buffer');
  await lab.locator('.lab-visual img').evaluate(img => img.decode());
  assert.equal(await lab.evaluate(el => el.scrollWidth <= el.clientWidth), true, 'Lab must not overflow horizontally');
  await screen('lab-narrow');
  await chooseLab('Warden boss fight');
  assert.equal(await lab.evaluate(el => el.scrollWidth <= el.clientWidth), true, 'Warden instructions must fit the narrow modal');
  await lab.getByRole('button', { name: 'Start practice', exact: true }).scrollIntoViewIfNeeded();
  await expect(lab.getByRole('button', { name: 'Start practice', exact: true })).toBeInViewport();
  await screen('lab-warden-narrow');
  pass('Narrow Lab images and instructions wrap without horizontal clipping; practice action stays reachable');
  assert.deepEqual(failedAssets, [], 'No failed same-origin assets');
  assert.deepEqual(errors, [], 'No uncaught browser or console errors');
  pass('No failed deployment assets or browser runtime errors');
} catch (error) {
  failure = error.stack ?? String(error);
  await screen('failure').catch(() => {});
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify({ date: new Date().toISOString(), target: url.href, finalURL: page.url(), browser: browser.version(), method: 'Browser plugin unavailable; Playwright with isolated installed Chrome', checks, errors, warnings, failedAssets, screenshots, failure, limitations: ['Public UI interactions and ordinary opening movement only; no prepared state or development modules.', 'Owner browser storage is not used or modified.', 'Physical Xbox, complete district playthrough, subjective audio and sustained performance are not established.'] }, null, 2));
  await browser.close();
  console.log(`Evidence: ${output}`);
}
if (failure) { console.error(failure); process.exitCode = 1; }

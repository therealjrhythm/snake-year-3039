import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

// Run with the local dev server active: node scripts/verify-platform.mjs [URL]
// This browser context owns its test storage and mocked standard gamepad; production exposes neither.
const url = process.argv[2] ?? 'http://127.0.0.1:3039';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

async function frames(count = 2) {
  await page.evaluate(count => new Promise(resolve => {
    let remaining = count;
    const frame = () => { if (--remaining <= 0) resolve(); else requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  }), count);
}

async function button(index, pressed) {
  await page.evaluate(({ index, pressed }) => { window.__platformPad.buttons[index] = { pressed, touched: pressed, value: pressed ? 1 : 0 }; }, { index, pressed });
  await frames();
}

async function tap(index) { await button(index, true); await button(index, false); }

try {
  await page.addInitScript(() => {
    localStorage.setItem('s39.settings.v1', JSON.stringify({ master: 0, music: 0, effects: 0, quality: 'low' }));
    window.__platformPad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__platformPad] });
  });
  await page.goto(url);
  await expect(page.getByRole('button', { name: 'START GAME', exact: true })).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('.title-bottom')).toContainText('KEYBOARD READY');
  await frames(4);
  await expect(page.locator('.title-bottom')).toContainText('KEYBOARD READY');

  // A opens the real React modal. Holding A must not activate its newly focused Close button.
  await page.getByRole('button', { name: 'SETTINGS', exact: true }).focus();
  await button(0, true);
  await expect(page.getByRole('dialog', { name: 'SETTINGS', exact: true })).toBeVisible();
  await frames(5);
  await expect(page.getByRole('dialog', { name: 'SETTINGS', exact: true })).toBeVisible();
  await button(0, false);
  await expect(page.locator('.title-bottom')).toContainText('GAMEPAD DETECTED');

  await page.getByRole('tab', { name: 'Audio', exact: true }).click();
  const master = page.getByRole('slider', { name: 'Master volume' });
  await master.focus();
  await button(15, true);
  await expect(master).toHaveValue('0.05');
  await expect(master.locator('..').locator('output')).toHaveText('5%');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('s39.settings.v1')).master), 0.05);

  // Close/reopen while holding Right: clear() must suppress the held input in the new modal.
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
  await page.getByRole('tab', { name: 'Audio', exact: true }).click();
  await master.focus();
  await frames(6);
  await expect(master).toHaveValue('0.05');
  await button(15, false);
  await tap(15);
  await expect(master).toHaveValue('0.1');
  await expect(master.locator('..').locator('output')).toHaveText('10%');

  await tap(5);
  await expect(page.getByRole('tab', { name: 'Visuals', exact: true })).toHaveAttribute('aria-selected', 'true');
  const quality = page.getByRole('combobox', { name: 'Graphics quality' });
  await quality.focus();
  await tap(15);
  await expect(quality).toContainText('Medium');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('s39.settings.v1')).quality), 'medium');
  await tap(15);
  await expect(quality).toContainText('High');
  await tap(15);
  await expect(quality).toContainText('High');
  await quality.focus();
  await page.keyboard.press('m');
  await expect(quality).toContainText('Medium');
  await frames(4);
  await expect(page.locator('.title-bottom')).toContainText('KEYBOARD READY');

  // Controller B returns to title; briefing difficulty is also a React-controlled select.
  await tap(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  const difficulty = page.getByRole('combobox', { name: 'RULES PROFILE' });
  await expect(difficulty).toBeVisible();
  await frames(3);
  await difficulty.focus();
  await expect(difficulty).toBeFocused();
  await tap(15);
  await expect(difficulty).toContainText('Assisted');
  await expect(difficulty).toBeFocused();
  await tap(14);
  await expect(difficulty).toContainText('Standard');

  const storage = await page.evaluate(async () => {
    const p = await import('/src/game/persistence.ts');
    await p.saveCheckpoint({ version: 1, runId: 'checkpoint-1', score: 20 });
    await p.saveRun({ version: 1, runId: 'suspend-1', score: 90 });
    await p.clearSavedRun();
    const checkpointAfterClear = await p.getCheckpoint();
    const cleared = await p.getSavedRun();
    await p.saveCheckpoint({ version: 1, runId: 'checkpoint-2', score: 0 });
    await p.saveRun({ version: 1, runId: 'suspend-2', score: 150 });
    let rejected = false;
    try { await p.commitRecord({ runId: 'invalid', score: -1 }); } catch { rejected = true; }
    const preservedOnInvalid = await p.getSavedRun();
    const record = { runId: 'record-1', score: 150, cores: 2, rivalKills: 0, wave: 1, elapsed: 12, completed: false, difficulty: 'standard', date: new Date().toISOString(), cause: 'test' };
    await p.commitRecord(record);
    await p.commitRecord(record);
    return { checkpointAfterClear, cleared, rejected, preservedOnInvalid, checkpointAfterRecord: await p.getCheckpoint(), suspendedAfterRecord: await p.getSavedRun(), records: await p.getRecords() };
  });
  assert.equal(storage.checkpointAfterClear.runId, 'checkpoint-1');
  assert.equal(storage.cleared, null);
  assert.equal(storage.rejected, true);
  assert.equal(storage.preservedOnInvalid.runId, 'suspend-2');
  assert.equal(storage.checkpointAfterRecord.runId, 'checkpoint-2');
  assert.equal(storage.suspendedAfterRecord, null);
  assert.equal(storage.records.length, 1);
  assert.deepEqual(errors, []);
  console.log('PASS: real React settings sliders, select controls, gamepad A/B and tabs, held input isolation, neutral-device ownership, checkpoint isolation and overwrite, record transaction/idempotency. No browser runtime errors.');
} finally {
  await context.close();
  await browser.close();
}

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
    const { CONTENT_VERSION, LEGACY_CONTENT_VERSION } = await import('/src/game/content.ts');
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
    const expandedRecord = { ...record, runId: 'expanded-record', score: 175, contentVersion: CONTENT_VERSION, mode: 'campaign', districtId: 'D1', seed: 3039 };
    await p.commitRecord(expandedRecord);
    const records = await p.getRecords();
    const legacy = records.find(item => item.runId === record.runId);
    const expanded = records.find(item => item.runId === expandedRecord.runId);
    return { checkpointAfterClear, cleared, rejected, preservedOnInvalid, checkpointAfterRecord: await p.getCheckpoint(), suspendedAfterRecord: await p.getSavedRun(), records,
      legacyPayloadPreserved: JSON.stringify(legacy) === JSON.stringify(record),
      expandedPayloadPreserved: JSON.stringify(expanded) === JSON.stringify(expandedRecord),
      versionSeparation: p.recordVersion(legacy) === LEGACY_CONTENT_VERSION && p.recordVersion(expanded) === CONTENT_VERSION && p.recordVersion(legacy) !== p.recordVersion(expanded),
      versionLabels: [p.recordVersionLabel(legacy), p.recordVersionLabel(expanded)] };
  });
  assert.equal(storage.checkpointAfterClear.runId, 'checkpoint-1');
  assert.equal(storage.cleared, null);
  assert.equal(storage.rejected, true);
  assert.equal(storage.preservedOnInvalid.runId, 'suspend-2');
  assert.equal(storage.checkpointAfterRecord.runId, 'checkpoint-2');
  assert.equal(storage.suspendedAfterRecord, null);
  assert.equal(storage.records.length, 2, 'Legacy and expanded records coexist, with duplicate run IDs remaining idempotent');
  assert.equal(storage.legacyPayloadPreserved, true, 'Reading an unversioned record must not rewrite its legacy payload');
  assert.equal(storage.expandedPayloadPreserved, true);
  assert.equal(storage.versionSeparation, true);
  assert.deepEqual(storage.versionLabels, ['Legacy 32 × 24', 'Expanded 36 × 26']);

  // Isolate the action mapper from the rendered game to exercise held-button
  // transitions deterministically. These are simulated controls, not hardware QA.
  await page.close();
  const inputPage = await context.newPage();
  inputPage.on('pageerror', error => errors.push(error.message));
  await inputPage.route('**/input-verification', route => route.fulfill({ contentType: 'text/html', body: '<section data-menu><button id="confirm" data-autofocus>Continue</button></section>' }));
  await inputPage.goto(new URL('/input-verification', url).href);
  const fire = await inputPage.evaluate(async () => {
    const { GameInputController } = await import('/src/game/input.ts');
    const pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    let confirms = 0;
    let pauses = 0;
    document.querySelector('#confirm').onclick = () => { confirms++; };
    const input = new GameInputController(() => { pauses++; input.setGameplay(false); });
    const button = (index, pressed) => { pad.buttons[index] = { pressed, touched: pressed, value: pressed ? 1 : 0 }; };
    const key = (code, down, repeat = false, target = window) => target.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code === 'KeyF' ? 'f' : 'Escape', repeat, bubbles: true }));
    const results = {};
    input.poll();
    button(0, true);
    results.menuAHasNoFire = !input.poll().fire;
    results.menuAConfirmsOnce = confirms === 1;
    input.clear(); // Screen enters countdown while A remains held.
    results.countdownHasNoFire = !input.poll().fire;
    input.setGameplay(true);
    results.startRequiresRelease = !input.poll().fire;
    button(0, false); input.poll();
    button(0, true);
    results.gameAIsHeldFire = input.poll().fire && input.poll().fire && confirms === 1;
    button(9, true); input.poll(); button(9, false);
    results.pauseClearsFire = pauses === 1 && !input.poll().fire;
    input.setGameplay(true);
    results.pauseResumeRequiresRelease = !input.poll().fire;
    button(0, false); input.poll(); button(0, true); input.poll();
    input.setGameplay(false);
    document.querySelector('section').remove();
    const customization = document.createElement('section');
    customization.setAttribute('data-menu', '');
    customization.innerHTML = '<button id="equip" data-autofocus>Equip</button>';
    document.body.append(customization);
    document.querySelector('#equip').onclick = () => { confirms++; };
    results.customizeHasNoFire = !input.poll().fire && confirms === 1;
    input.clear(); input.setGameplay(true);
    results.customizeReturnRequiresRelease = !input.poll().fire;
    button(0, false); input.poll();
    input.setGameplay(false);
    key('KeyF', true);
    results.menuFHasNoFire = !input.poll().fire;
    input.clear(); input.setGameplay(true);
    results.heldFAtStartSuppressed = !input.poll().fire;
    key('KeyF', false); key('KeyF', true);
    results.keyboardHeldFire = input.poll().fire && input.poll().fire;
    key('KeyF', true, true);
    results.keyRepeatKeepsHeldFire = input.poll().fire;
    key('Escape', true); key('Escape', false);
    input.setGameplay(true);
    results.heldFAfterPauseSuppressed = !input.poll().fire;
    key('KeyF', false); key('KeyF', true);
    results.releaseRestoresFire = input.poll().fire;
    window.dispatchEvent(new Event('blur'));
    results.blurClearsFire = !input.poll().fire;
    input.setGameplay(true);
    key('KeyF', false);
    const text = document.createElement('input'); text.type = 'text'; document.body.append(text);
    key('KeyF', true, false, text);
    results.typingDoesNotFire = !input.poll().fire;
    input.setGameplay(false);
    input.poll();
    const replaceMenu = () => {
      document.querySelector('[data-menu]').remove();
      const menu = document.createElement('section');
      menu.setAttribute('data-menu', '');
      menu.innerHTML = '<button id="first" data-autofocus style="display:block">First</button><button id="second" style="display:block">Second</button>';
      document.body.append(menu);
      return menu;
    };
    replaceMenu();
    button(13, true); // New press after the DOM changes, before its first poll.
    input.poll();
    results.freshDpadAfterMenuReplacement = document.activeElement?.id === 'second';
    button(13, false); input.poll();
    let replacementsConfirmed = 0;
    document.querySelector('#second').onclick = () => { replacementsConfirmed++; replaceMenu(); };
    button(0, true); input.poll(); input.poll();
    results.heldAStillSuppressedAfterReplacement = replacementsConfirmed === 1 && document.activeElement?.id === 'first';
    button(0, false); input.poll();
    replaceMenu();
    pad.axes = [0, 1]; input.poll();
    results.freshStickAfterMenuReplacement = document.activeElement?.id === 'second';
    replaceMenu(); input.poll();
    results.heldStickStillSuppressedAfterReplacement = document.activeElement?.id === 'first';
    pad.axes = [0, 0]; input.poll(); pad.axes = [0, 1]; input.poll();
    results.stickReleaseRestoresNavigation = document.activeElement?.id === 'second';
    input.dispose();
    results.disposedDoesNotFire = !input.poll().fire;
    return results;
  });
  for (const [name, passed] of Object.entries(fire)) assert.equal(passed, true, name);
  await inputPage.close();
  assert.deepEqual(errors, []);
  console.log(`PASS: real React settings sliders, select controls, gamepad A/B and tabs, held input isolation, neutral-device ownership, checkpoint isolation and overwrite, record transaction/idempotency and legacy/expanded record coexistence; ${Object.keys(fire).length} held-fire/menu/countdown/pause/customization/typing/blur assertions. No browser runtime errors.`);
} finally {
  await context.close();
  await browser.close();
}

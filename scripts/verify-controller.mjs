import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';

// Isolated standard-Xbox mapping simulation; this does not certify physical hardware.
// The full flow uses only the pad; a separate regression covers switching from mouse.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const url = process.argv[2] ?? 'http://127.0.0.1:3039';
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 1020 }]) {
    console.log(`Controller flow: ${viewport.width} × ${viewport.height}`);
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('s39.settings.v1', JSON.stringify({ quality: 'low', master: 0, music: 0, effects: 0 }));
      window.__controller = { index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__controller] });
    });
    const frames = (count = 3) => page.evaluate(count => new Promise(resolve => {
      const next = () => { if (--count === 0) resolve(); else requestAnimationFrame(next); };
      requestAnimationFrame(next);
    }), count);
    const hold = async (index, pressed) => {
      await page.evaluate(({ index, pressed }) => { window.__controller.buttons[index] = { pressed, value: Number(pressed) }; }, { index, pressed });
      await frames();
    };
    // Release inside the next render frame, not after a Playwright round-trip.
    // Slow screenshots/GPU startup must not turn a tap into a held repeat.
    const tap = index => page.evaluate(index => new Promise(resolve => {
      window.__controller.buttons[index] = { pressed: true, value: 1 };
      requestAnimationFrame(() => {
        window.__controller.buttons[index] = { pressed: false, value: 0 };
        requestAnimationFrame(resolve);
      });
    }), index);
    const selected = async label => {
      await expect(page.locator('[data-gamepad-focus]')).toHaveCount(1);
      await expect(page.locator('[data-gamepad-focus]')).toHaveText(label);
    };
    await page.goto(url);
    await expect(page.getByRole('button', { name: 'START GAME', exact: true })).toBeEnabled({ timeout: 30000 });
    await frames();
    await expect(page.locator('.title-bottom')).toContainText('KEYBOARD READY');
    await tap(13);
    await selected('SETTINGS');
    await hold(0, true);
    await expect(page.getByRole('dialog', { name: 'SETTINGS', exact: true })).toBeVisible();
    await frames(6);
    await selected('Controls');
    await hold(0, false);
    await tap(5);
    await selected('Audio');
    await tap(13);
    const master = page.getByRole('slider', { name: 'Master volume' });
    await expect(master).toHaveAttribute('data-gamepad-focus', 'true');
    await tap(15);
    await expect(master).toHaveValue('0.05');
    await tap(5);
    await selected('Visuals');
    await tap(13);
    const quality = page.getByRole('combobox', { name: 'Graphics quality' });
    await expect(quality).toHaveAttribute('data-gamepad-focus', 'true');
    await hold(0, true);
    await expect(page.getByRole('listbox', { name: 'Graphics quality' })).toBeVisible();
    await frames(4);
    await selected('Low'); // Holding A opens only; it cannot also choose an option.
    await hold(0, false);
    await tap(13);
    await selected('Medium');
    await tap(0);
    await expect(quality).toContainText('Medium');
    await expect(quality).toHaveAttribute('aria-expanded', 'false');
    await tap(0);
    await tap(13);
    await selected('High');
    await tap(1); // B cancels just the list; it must not close Settings.
    await expect(quality).toContainText('Medium');
    await expect(page.getByRole('dialog', { name: 'SETTINGS', exact: true })).toBeVisible();
    await tap(14); // Keep the test graphics load low.
    await tap(1);
    await selected('SETTINGS');
    console.log('  Settings, tabs and sliders passed');
    await tap(12);
    await selected('START GAME');
    await tap(0);
    await selected('ENTER NEON SPIRE');
    await tap(12);
    const difficulty = page.getByRole('combobox', { name: 'RULES PROFILE' });
    await expect(difficulty).toHaveAttribute('data-gamepad-focus', 'true');
    await tap(0);
    await expect(page.getByRole('listbox', { name: 'RULES PROFILE' })).toBeVisible();
    await tap(13);
    await selected('Assisted · 5 integrity · slower world');
    await tap(0);
    await expect(difficulty).toContainText('Assisted');
    await expect(difficulty).toHaveAttribute('aria-expanded', 'false');
    await tap(13);
    await tap(0);
    await expect(page.locator('.countdown-overlay')).toBeVisible();
    await expect(page.locator('.countdown-overlay')).toHaveCount(0, { timeout: 10000 });
    await tap(9);
    await selected('RESUME');
    await tap(13);
    await selected('SETTINGS');
    await tap(0);
    await tap(1);
    await selected('SETTINGS');
    await tap(13);
    await selected('RETURN TO TITLE');
    await tap(13);
    await selected('SAVE & EXIT');
    await tap(0);
    await selected('CONTINUE RUN');
    console.log('  Start, difficulty, pause and save passed');

    // Focus loss in embedded views must not erase the controller cursor or block A.
    await page.evaluate(() => {
      document.activeElement?.blur();
      HTMLElement.prototype.focus = function () {}; // Test-only browser focus refusal.
    });
    await tap(13);
    await selected('START GAME');
    await tap(13);
    await selected('SETTINGS');
    await tap(0);
    await selected('Controls');
    await tap(5);
    await selected('Audio');
    await tap(1);
    await selected('SETTINGS');
    await page.evaluate(() => { window.__controller.axes = [0, 0.85]; });
    await frames();
    await page.evaluate(() => { window.__controller.axes = [0, 0]; });
    await frames();
    await selected('HOW TO PLAY');
    await tap(0);
    await expect(page.getByRole('dialog', { name: 'HOW TO PLAY', exact: true })).toBeVisible();
    await tap(1);
    await selected('HOW TO PLAY');

    // Reproduce the reported invisible selection after pointer use. A reload also
    // restores the native focus() implementation after the focus-refusal fixture.
    await page.reload();
    await expect(page.getByRole('button', { name: 'CONTINUE RUN', exact: true })).toBeEnabled({ timeout: 30000 });
    await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
    await page.getByRole('button', { name: 'Close SETTINGS', exact: true }).click();
    await tap(13);
    await selected('HOW TO PLAY');
    const style = await page.locator('[data-gamepad-focus]').evaluate(control => {
      const css = getComputedStyle(control);
      return { shadow: css.boxShadow, outline: css.outlineStyle, rect: control.getBoundingClientRect().toJSON() };
    });
    assert.ok(style.shadow.includes('inset') || style.outline === 'solid', 'Controller selection must have a visible highlight after pointer input');
    assert.ok(style.rect.width > 0 && style.rect.height > 0);
    await page.screenshot({ path: join(tmpdir(), `s39-controller-focus-${viewport.width}.png`) });
    assert.deepEqual(errors, []);
    results.push({ viewport, result: 'PASS: controller-only title/settings/difficulty/pause/save, A hold suppression, tabs and selectors, focus-loss recovery, stick navigation, visible cursor', errors });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }

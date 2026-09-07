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
    const navigateTo = async label => {
      // Plan only the D-pad route from rendered control geometry; no focus or
      // application state is written. Every navigation step uses real pad polling.
      const path = await page.evaluate(label => {
        const root = [...document.querySelectorAll('[role="dialog"]')].at(-1) ?? document.querySelector('[data-menu]:not([inert])');
        const controls = [...root.querySelectorAll('button,input')].filter(el => !el.disabled && el.getClientRects().length);
        const start = controls.findIndex(el => el.hasAttribute('data-gamepad-focus'));
        const target = controls.findIndex(el => el.getAttribute('aria-label') === label || el.textContent.trim() === label);
        const queue = [[start, []]], seen = new Set();
        while (queue.length) {
          const [current, path] = queue.shift(); if (current === target) return path;
          if (seen.has(current)) continue; seen.add(current);
          const from = controls[current].getBoundingClientRect();
          for (const [button, x, y] of [[12, 0, -1], [13, 0, 1], [14, -1, 0], [15, 1, 0]]) {
            if (x && controls[current].getAttribute('role') === 'combobox') continue;
            const next = controls.map((el, index) => { const r = el.getBoundingClientRect(), dx = r.x + r.width / 2 - from.x - from.width / 2, dy = r.y + r.height / 2 - from.y - from.height / 2; return { index, along: dx * x + dy * y, score: dx * x + dy * y + Math.abs(dx * y - dy * x) * 2.5 }; }).filter(item => item.along > 4).sort((a, b) => a.score - b.score)[0];
            if (next) queue.push([next.index, [...path, button]]);
          }
        }
        throw new Error(`No controller route to ${label}`);
      }, label);
      for (const button of path) await tap(button);
      await expect(page.locator('[data-gamepad-focus]')).toHaveCount(1);
      assert.equal(await page.locator('[data-gamepad-focus]').evaluate(el => el.getAttribute('aria-label') ?? el.textContent.trim()), label);
      await frames();
    };
    const selected = async label => {
      await expect(page.locator('[data-gamepad-focus]')).toHaveCount(1);
      await expect(page.locator('[data-gamepad-focus]')).toHaveText(label);
      // Let a newly mounted menu observe neutral input before the next tap.
      await frames();
    };
    await page.goto(url);
    await expect(page.getByRole('button', { name: 'START GAME', exact: true })).toBeEnabled({ timeout: 30000 });
    await frames();
    await expect(page.locator('.title-bottom')).toContainText('KEYBOARD READY');
    await tap(13);
    await selected('POWERUP LAB');
    await tap(0);
    await expect(page.getByRole('dialog', { name: 'POWERUP LAB', exact: true })).toBeVisible();
    await tap(1);
    await selected('POWERUP LAB');
    await tap(13);
    await selected('CUSTOMIZE SNAKE');
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
    await selected('CUSTOMIZE SNAKE');
    await tap(12);
    await selected('POWERUP LAB');
    await tap(12);
    await selected('START GAME');
    await tap(0);
    await selected('ENTER NEON SPIRE');
    await tap(12);
    const difficulty = page.getByRole('combobox', { name: 'Difficulty' });
    await expect(difficulty).toHaveAttribute('data-gamepad-focus', 'true');
    await tap(0);
    await expect(page.getByRole('listbox', { name: 'Difficulty' })).toBeVisible();
    await tap(13);
    await expect(page.locator('[data-gamepad-focus]')).toContainText('Easier'); await frames();
    await tap(0);
    await expect(difficulty).toContainText('Easier');
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
    await selected('PICKUPS & TACTICS');
    await tap(0);
    await expect(page.getByRole('tab', { name: 'Pickups', exact: true })).toHaveAttribute('aria-selected', 'true');
    await tap(5);
    await selected('Tactics');
    await expect(page.getByRole('tabpanel', { name: 'Tactics', exact: true })).toContainText('Empty means no charge');
    await tap(1);
    await selected('PICKUPS & TACTICS');
    await tap(13);
    await selected('CUSTOMIZE SNAKE');
    await tap(0);
    await expect(page.getByRole('dialog', { name: 'Customize Snake', exact: true })).toBeVisible();
    await frames();
    await navigateTo('Gold glow'); await tap(0);
    await expect(page.getByRole('button', { name: 'Gold glow', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await navigateTo('Rotate snake right'); await tap(0);
    await navigateTo('Preview zoom'); await tap(0); await tap(13); await tap(0);
    await expect(page.getByRole('combobox', { name: 'Preview zoom', exact: true })).toContainText('Head detail');
    await navigateTo('Apply glow'); await tap(0);
    await selected('CUSTOMIZE SNAKE');
    assert.equal(await page.evaluate(async () => (await import('/src/game/appearance.ts')).readAppearance()), 'gold');
    await tap(0); await frames();
    await navigateTo('Restore Cyan'); await tap(0);
    await tap(1); // Cancel must retain the applied Gold, including with lost focus.
    assert.equal(await page.evaluate(async () => (await import('/src/game/appearance.ts')).readAppearance()), 'gold');
    await selected('CUSTOMIZE SNAKE');
    await tap(13);
    await selected('RETURN TO TITLE');
    await tap(13);
    await selected('SAVE & EXIT');
    await tap(0);
    await selected('CONTINUE RUN');
    console.log('  Start, difficulty, pause and save passed');

    await navigateTo('POWERUP LAB');
    const labButton = page.getByRole('button', { name: 'POWERUP LAB', exact: true });
    await expect(labButton).toBeInViewport();
    assert.deepEqual(await labButton.evaluate(el => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }), await page.getByRole('button', { name: 'START GAME', exact: true }).evaluate(el => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }), 'Lab must have the same full-size row as Start Game');
    await tap(0); await frames();
    await navigateTo('Choose what to try');
    // Closed selectors support left/right changes through the same pad polling.
    for (let i = 0; i < 3; i++) await tap(14); // EMP -> Overdrive
    for (const name of ['Overdrive', 'Shield', 'Score Surge', 'EMP Pulse', 'Magnet', 'Repair', 'Decoy', 'Tail Splice', 'Pulse Blaster', 'Capacitor', 'Bullet Scrubber', 'Chain Buffer', 'Defeat the Warden']) {
      await expect(page.locator('.lab-description h3')).toHaveText(name);
      if (name === 'Defeat the Warden') await expect(page.locator('.warden-combat-visual svg')).toBeVisible();
      else await page.locator('.lab-visual img').evaluate(img => img.decode());
      if (name === 'EMP Pulse' || name === 'Decoy') await expect(page.locator('.lab-use kbd')).toHaveText('X');
      if (name === 'Pulse Blaster') await expect(page.locator('.lab-use kbd')).toHaveText('A');
      if (name !== 'Defeat the Warden') await tap(15);
    }
    await expect(page.locator('.warden-route kbd')).toHaveText('A');
    await navigateTo('Start practice');
    await expect(page.locator('[data-gamepad-focus]')).toBeInViewport();
    await page.screenshot({ path: join(tmpdir(), `s39-controller-lab-${viewport.width}.png`) });
    await tap(1);
    await selected('POWERUP LAB');
    await expect(page.locator('.briefing')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'CONTINUE RUN', exact: true })).toBeEnabled();
    await frames(); await tap(9); // Acquire pad ownership without opening a title menu.
    await navigateTo('CONTINUE RUN'); await selected('CONTINUE RUN');
    console.log('  All illustrated Lab choices, Xbox glyphs, visible Start practice and B-back passed (mocked controller)');

    // Focus loss in embedded views must not erase the controller cursor or block A.
    await page.evaluate(() => {
      document.activeElement?.blur();
      HTMLElement.prototype.focus = function () {}; // Test-only browser focus refusal.
    });
    await tap(13);
    await selected('START GAME');
    await tap(13);
    await selected('POWERUP LAB');
    await tap(13);
    await selected('CUSTOMIZE SNAKE');
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
    results.push({ viewport, result: 'PASS: controller-only title/settings/difficulty/pause/save, full-size title Lab with B-back, all illustrated Lab choices and Xbox glyphs, A hold suppression, tabs and selectors, focus-loss recovery, stick navigation, visible cursor', errors });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }

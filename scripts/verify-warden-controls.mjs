import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// Isolated development fixtures exercise the real App's automatic final-core →
// Warden popup → countdown transition. No live simulation mutation or alternate
// collision rules. These mocked controls do not certify physical Xbox hardware
// or constitute an ordinary full-district playthrough. Run browser QA serially.
const target = new URL(process.argv[2] ?? 'http://127.0.0.1:3039');
assert.ok(['localhost', '127.0.0.1'].includes(target.hostname));
const output = process.argv[3] ?? '/tmp/snake-warden-controls';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], measurements = [], errors = [];
let mapper = {}, failure = null;
const pass = label => { checks.push(label); console.log(`PASS ${label}`); };
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route('**/input-fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><section data-menu><button data-autofocus>Continue</button></section>' }));
  await page.goto(new URL('/input-fixture', target).href);
  mapper = await page.evaluate(async () => {
    const { GameInputController } = await import('/src/game/input.ts');
    const pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
    const button = (index, down) => { pad.buttons[index] = { pressed: down, value: +down }; };
    const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
    const results = {};
    for (const kind of ['stick', 'dpad', 'keyboard', 'arrows']) {
      let pauses = 0;
      const input = new GameInputController(() => { pauses++; input.setGameplay(false); });
      const steer = () => {
        if (kind === 'stick') pad.axes = [0, 1];
        else if (kind === 'dpad') button(13, true);
        else key(kind === 'keyboard' ? 'KeyS' : 'ArrowDown', true);
      };
      input.poll(); steer();
      for (const index of [0, 2, 3, 7]) button(index, true);
      for (const code of ['KeyF', 'Space', 'KeyE', 'ShiftLeft']) key(code, true);
      input.clear();
      results[`${kind}CountdownFrozen`] = Object.values(input.poll()).every(value => !value);
      input.setGameplay(true);
      const frame = input.poll();
      results[`${kind}FirstFrameSteering`] = frame.x === 0 && frame.y === 1;
      results[`${kind}HeldActionsSuppressed`] = !frame.fire && !frame.use && !frame.swap && !frame.boost;
      input.setGameplay(false); input.poll(); input.clear(); input.setGameplay(true);
      results[`${kind}ResumeSteering`] = input.poll().y === 1;
      for (const index of [0, 2, 3, 7]) button(index, false);
      for (const code of ['KeyF', 'Space', 'KeyE', 'ShiftLeft']) key(code, false);
      input.poll();
      for (const index of [0, 2, 3, 7]) button(index, true);
      const fresh = input.poll();
      results[`${kind}FreshActionsWork`] = fresh.fire && fresh.use && fresh.swap && fresh.boost && pauses === 0;
      for (const index of [0, 2, 3, 7, 13]) button(index, false);
      for (const code of ['KeyS', 'ArrowDown']) key(code, false);
      pad.axes = [0, 0]; input.poll();
      results[`${kind}NeutralRemainsNeutral`] = input.poll().x === 0 && input.poll().y === 0;
      key('KeyD', true); window.dispatchEvent(new Event('blur')); input.setGameplay(true);
      results[`${kind}BlurDropsStaleKeys`] = input.poll().x === 0;
      key('KeyD', false); input.dispose();
    }
    return results;
  });
  for (const [label, passed] of Object.entries(mapper)) assert.equal(passed, true, label);
  pass(`${Object.keys(mapper).length} input checks: held steering resumes immediately; actions still require release; neutral and blur stay safe`);
  await context.close();

  for (const kind of ['stick', 'dpad', 'keyboard']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      window.__wardenPad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__wardenPad] });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/warden-fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Warden control fixture installer</title>' }));
    await page.goto(new URL('/warden-fixture', target).href);
    await page.evaluate(async () => {
      const { Simulation } = await import('/src/game/simulation.ts');
      const { saveRun } = await import('/src/game/persistence.ts');
      localStorage.setItem('s39.settings.v1', JSON.stringify({ quality: 'low', master: 0, reducedMotion: true }));
      const sim = new Simulation({ seed: 3039420 });
      Object.assign(sim.state, { wave: 3, coresCollected: 11, totalCores: 35, score: 3500, cores: [{ id: 'final-wave-core', x: 14.8, z: -10 }], pickups: [], mines: [], drones: [], rivals: [], projectiles: [], gates: [], pendingSpawns: [], coreRetry: 99999, optionalTimer: 99999 });
      Object.assign(sim.state.player, { x: 13.7, z: -10, heading: 0, length: 40 });
      sim.state.player.body = Array.from({ length: 40 }, (_, i) => ({ x: 13.7 - (i + 1) * .55, z: -10 }));
      sim.state.player.path = Array.from({ length: 510 }, (_, i) => ({ x: 13.7 - i * .15, z: -10 }));
      Simulation.restore(sim.snapshot());
      await saveRun(sim.snapshot());
    });
    await page.goto(target.href);
    await expect(page.getByRole('button', { name: 'CONTINUE RUN', exact: true })).toBeEnabled();
    await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => new URL(name).pathname === '/src/game/simulation.ts');
      const { Simulation } = await import(url);
      const step = Simulation.prototype.step;
      window.__wardenSteps = [];
      Simulation.prototype.step = function (...args) {
        window.__wardenObserved = this;
        const bossStep = this.state.status === 'boss';
        const before = this.state.time;
        const result = step.apply(this, args);
        if (bossStep && window.__wardenSteps.length < 120) window.__wardenSteps.push({ input: { ...args[1] }, before, time: this.state.time, heading: this.state.player.heading, x: this.state.player.x, z: this.state.player.z });
        return result;
      };
    });
    const read = () => page.evaluate(() => structuredClone(window.__wardenObserved.state));
    const button = (index, pressed) => page.evaluate(({ index, pressed }) => { window.__wardenPad.buttons[index] = { pressed, value: +pressed }; }, { index, pressed });
    const steer = async direction => {
      if (kind === 'keyboard') {
        await page.keyboard.up(direction === 'right' ? 's' : 'd');
        await page.keyboard.down(direction === 'right' ? 'd' : 's');
      } else await page.evaluate(({ kind, direction }) => {
        if (kind === 'stick') window.__wardenPad.axes = direction === 'right' ? [1, 0] : [0, 1];
        else {
          window.__wardenPad.buttons[15] = { pressed: direction === 'right', value: +(direction === 'right') };
          window.__wardenPad.buttons[13] = { pressed: direction !== 'right', value: +(direction !== 'right') };
        }
      }, { kind, direction });
    };
    await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'THE WARDEN', exact: true })).toBeVisible();
    const intro = await read();
    assert.equal(intro.status, 'boss-intro'); assert.equal(intro.totalCores, 36); assert.equal(intro.lives, 3);
    await steer('right');
    await page.waitForTimeout(300);
    assert.deepEqual(await read(), intro, 'Popup must freeze the real simulation');
    if (kind === 'keyboard') await page.keyboard.press('Enter');
    else await button(0, true); // Keep confirming A held through countdown.
    await expect(page.locator('.countdown-overlay')).toBeVisible();
    await steer('down'); // Pre-position for the turn, with no neutral stick poll.
    const countdown = await read();
    await page.waitForTimeout(350);
    assert.deepEqual(await read(), countdown, 'Countdown must freeze the real simulation');
    await page.locator('.countdown-overlay').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => window.__wardenSteps.length >= 40);
    const steps = await page.evaluate(() => window.__wardenSteps);
    assert.equal(steps[0].input.x, 0); assert.equal(steps[0].input.y, 1, `${kind}: first Warden step must receive held steering`);
    assert.ok(steps.every(step => !step.input.fire && !step.input.boost && !step.input.use && !step.input.swap));
    await button(0, false);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'PAUSED', exact: true })).toBeVisible();
    const turned = await read();
    assert.equal(turned.status, 'boss'); assert.equal(turned.lives, 3);
    assert.ok(turned.player.z > intro.player.z + 1.5, 'Snake turns inward and travels away from the wall');
    assert.ok(turned.player.x < 17.68, 'Turn obeys the real wall boundary');
    await page.screenshot({ path: `${output}/warden-${kind}-steering.png` });
    measurements.push({ kind, intro: { time: intro.time, x: intro.player.x, z: intro.player.z, length: intro.player.length }, firstStep: steps[0], turned: { time: turned.time, x: turned.player.x, z: turned.player.z, heading: turned.player.heading, lives: turned.lives } });
    pass(`${kind}: automatic final-core popup freezes play; held inward steering works on the first Warden step and avoids the wall without losing a life`);
    await page.evaluate(() => { window.__wardenSteps.length = 0; });
    if (kind === 'keyboard') await page.keyboard.press('Enter');
    else await button(0, true);
    await expect(page.locator('.countdown-overlay')).toBeVisible();
    await page.locator('.countdown-overlay').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => window.__wardenSteps.length >= 10);
    const resumed = await page.evaluate(() => window.__wardenSteps);
    assert.equal(resumed[0].input.y, 1, `${kind}: pause/resume also retains steering`);
    assert.ok(resumed.every(step => !step.input.fire));
    assert.equal((await read()).lives, 3);
    pass(`${kind}: ordinary pause/resume also accepts held steering while suppressing the confirming A`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} catch (error) {
  failure = error.stack ?? String(error);
  process.exitCode = 1;
  console.error(failure);
} finally {
  await writeFile(`${output}/warden-controls-report.json`, JSON.stringify({ checks, mapper, measurements, errors, failure, scope: 'Prepared final-core saved approaches, actual App popup/countdown/stepping; mocked standard gamepad and keyboard. Not physical Xbox or ordinary full-clear evidence.' }, null, 2) + '\n');
  await browser.close();
}

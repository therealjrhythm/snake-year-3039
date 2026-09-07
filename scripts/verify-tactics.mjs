import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// Arranged saved encounters exercise real App input, stepping and rendering.
// Standard mapping is simulated; this is not physical Xbox acceptance.
const target = new URL(process.argv[2] ?? 'http://127.0.0.1:3039');
assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname), 'Development fixtures require localhost.');
const output = process.argv[3] ?? '/tmp/snake-tactics';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], errors = [], measurements = [];
let activePage;
const pass = name => { checks.push(name); console.log(`PASS ${name}`); };
try {
  for (const quality of ['low', 'medium']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      window.__tacticalPad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__tacticalPad] });
    });
    const page = await context.newPage();
    activePage = page; page.setDefaultTimeout(6000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/tactics-fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Isolated tactical fixture installer</title>' }));
    await page.goto(new URL('/tactics-fixture', target).href);
    await page.evaluate(async quality => {
      const { Simulation } = await import('/src/game/simulation.ts');
      const { saveRun } = await import('/src/game/persistence.ts');
      localStorage.setItem('s39.settings.v1', JSON.stringify({ quality, master: 0, reducedMotion: false }));
      const sim = new Simulation({ seed: 3039417 });
      const s = sim.state;
      Object.assign(s, { wave: 2, coresCollected: 8, cores: [], pickups: [], mines: [], rivals: [], projectiles: [], gates: [], pendingSpawns: [], optionalTimer: 99999, coreRetry: 99999, slots: [true, true], selectedSlot: 0, events: [], event: null, eventCounter: 0 });
      s.player.x = -6; s.player.heading = 0;
      s.player.body = Array.from({ length: 8 }, (_, i) => ({ x: -6 - (i + 1) * .55, z: 6 }));
      s.player.path = Array.from({ length: 510 }, (_, i) => ({ x: -6 - i * .15, z: 6 }));
      s.drones = [{ id: 'decoy-test-patrol', x: -6, z: 3, hp: 2, state: 'recover', timer: 3, cooldown: 3, disabled: 0, anchor: { x: -6, z: 3 }, phase: 0 }];
      Simulation.restore(sim.snapshot());
      await saveRun(sim.snapshot());
    }, quality);
    await page.goto(target.href);
    await expect(page.getByRole('button', { name: 'CONTINUE RUN', exact: true })).toBeEnabled();
    await page.evaluate(async () => {
      const resources = performance.getEntriesByType('resource').map(entry => entry.name);
      const { Simulation } = await import(resources.findLast(name => new URL(name).pathname === '/src/game/simulation.ts'));
      const { GameRenderer } = await import(resources.findLast(name => new URL(name).pathname === '/src/game/renderer.ts'));
      const step = Simulation.prototype.step, render = GameRenderer.prototype.render;
      window.__tacticFrames = [];
      Simulation.prototype.step = function (...args) { window.__tacticSim = this; return step.apply(this, args); };
      GameRenderer.prototype.render = function (...args) {
        window.__tacticRenderer = this;
        const before = performance.now(), result = render.apply(this, args);
        if (window.__captureTacticFrames) window.__tacticFrames.push({ time: performance.now(), frameClock: args[2] * 1000, simulationTime: args[0].time, renderMs: performance.now() - before, decoys: args[0].decoys.length });
        return result;
      };
    });
    const button = async (index, pressed) => {
      await page.evaluate(({ index, pressed }) => { window.__tacticalPad.buttons[index] = { pressed, value: +pressed }; }, { index, pressed });
    };
    const press = async index => { await button(index, true); await page.waitForTimeout(60); await button(index, false); await page.waitForTimeout(40); };
    const state = () => page.evaluate(() => structuredClone(window.__tacticSim.state));
    await page.getByRole('button', { name: 'CONTINUE RUN', exact: true }).click();
    await page.locator('.countdown-overlay').waitFor({ state: 'hidden', timeout: 8000 });
    await page.waitForFunction(() => !!window.__tacticSim);
    const pulsing = await page.evaluate(() => [...document.querySelectorAll('.tactic.ready')].map(slot => {
      const animation = slot.getAnimations().find(animation => animation.animationName === 'arsenal-acquired');
      const timing = animation?.effect.getTiming(), originalTime = animation?.currentTime;
      if (!animation) return { animation: false };
      animation.pause(); animation.currentTime = 3200;
      const low = getComputedStyle(slot).filter;
      animation.currentTime = 3680;
      const high = getComputedStyle(slot).filter;
      animation.currentTime = originalTime; animation.play();
      return { animation: true, name: slot.getAttribute('aria-label'), iterations: timing.iterations === Infinity ? 'infinite' : timing.iterations, duration: timing.duration, originalTime, low, high };
    }));
    assert.equal(pulsing.length, 2);
    for (const pulse of pulsing) {
      assert.equal(pulse.iterations, 'infinite'); assert.ok(pulse.originalTime >= 2900);
      assert.notEqual(pulse.low, pulse.high, 'Ready glow must visibly pulse beyond the acquisition moment');
    }
    await page.evaluate(() => { window.__captureTacticFrames = true; });
    await press(3); // Y selects the loaded Decoy slot without pausing.
    assert.equal((await state()).selectedSlot, 1);
    let interrupted = null;
    if (quality === 'low') {
      // Deliberately create the suspected race: X arrives before an unseen long
      // frame. The protective pause must retain the charge and explain why.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
        window.__tacticalPad.buttons[2] = { pressed: true, value: 1 };
        const until = performance.now() + 320;
        while (performance.now() < until) { /* explicit isolated stall fixture */ }
        resolve();
      })));
      await expect(page.getByRole('heading', { name: 'PAUSED', exact: true })).toBeVisible();
      interrupted = await page.locator('.pause-panel').innerText();
      assert.match(interrupted, /Decoy was not deployed; its charge is still available/);
      assert.match(interrupted, /Resume, then press X again/);
      assert.deepEqual((await state()).slots, [true, true]); assert.equal((await state()).decoys.length, 0);
      await page.getByRole('button', { name: 'RESUME', exact: true }).click();
      await page.locator('.countdown-overlay').waitFor({ state: 'hidden', timeout: 8000 });
      assert.deepEqual((await state()).slots, [true, true]); assert.equal((await state()).decoys.length, 0, 'Held X cannot surprise-deploy through the resume countdown');
      await button(2, false); await page.waitForTimeout(50);
      pass('An interrupted X retains its charge, explains the protective pause and requires a fresh press after resume');
    }
    if (quality === 'medium') {
      // A shorter catch-up stall can deploy the Decoy before the same protective
      // pause. Report that distinct, spent-but-frozen outcome truthfully.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
        window.__tacticalPad.buttons[2] = { pressed: true, value: 1 };
        const until = performance.now() + 180;
        while (performance.now() < until) { /* explicit isolated stall fixture */ }
        resolve();
      })));
      await expect(page.getByRole('heading', { name: 'PAUSED', exact: true })).toBeVisible();
      interrupted = await page.locator('.pause-panel').innerText();
      assert.match(interrupted, /Your Decoy is deployed; its timer is frozen until you resume/);
      assert.deepEqual((await state()).slots, [true, false]); assert.equal((await state()).decoys.length, 1);
      const frozen = (await state()).decoys;
      await page.waitForTimeout(150); assert.deepEqual((await state()).decoys, frozen);
      await page.getByRole('button', { name: 'RESUME', exact: true }).click();
      await page.locator('.countdown-overlay').waitFor({ state: 'hidden', timeout: 8000 });
      assert.equal((await state()).events.filter(event => event.kind === 'decoy').length, 1);
      pass('A catch-up pause after X confirms the deployed Decoy and freezes its lifetime through resume');
    } else await button(2, true); // X stays held: only one lure may be deployed.
    await page.waitForFunction(() => window.__tacticSim.state.decoys.length === 1);
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.pause-panel').count(), 0, 'Using X must not open pause');
    const deployed = await state();
    assert.deepEqual(deployed.slots, [true, false]);
    assert.equal(deployed.events.filter(event => event.kind === 'decoy').length, 1);
    assert.ok(deployed.decoys[0].ttl > 3);
    assert.ok(deployed.player.x > deployed.decoys[0].x, 'Lure remains behind the moving snake');
    assert.match(await page.locator('.tactical-hint').innerText(), /Decoy active/);
    const spentPulse = await page.locator('.tactic').nth(1).evaluate(slot => ({ animation: getComputedStyle(slot).animationName, text: slot.textContent }));
    assert.equal(spentPulse.animation, 'none'); assert.match(spentPulse.text, /EMPTY/);
    await button(2, false);
    await page.waitForFunction(() => window.__tacticSim.state.drones.some(drone => drone.targetDecoy));
    const locked = await state();
    assert.equal(locked.drones[0].targetDecoy, locked.decoys[0].id);
    assert.deepEqual(locked.drones[0].target, { x: locked.decoys[0].x, z: locked.decoys[0].z });
    const drawn = await page.evaluate(() => {
      const group = window.__tacticRenderer.objects.get(`decoy:${window.__tacticSim.state.decoys[0].id}`);
      const label = group?.getObjectByName('decoy-identity');
      const camera = window.__tacticRenderer.camera;
      const viewPosition = label?.getWorldPosition(camera.position.clone()).applyMatrix4(camera.matrixWorldInverse);
      const labelPixels = label ? label.scale.y * innerHeight / (2 * Math.abs(viewPosition.z) * Math.tan(camera.fov * Math.PI / 360)) : 0;
      return { present: !!group, visible: group?.visible, position: group?.position.toArray(), label: label ? { visible: label.visible, pixels: labelPixels, scale: label.scale.toArray(), fog: label.material.fog, depthTest: label.material.depthTest } : null };
    });
    assert.equal(drawn.present, true); assert.equal(drawn.visible, true);
    assert.equal(drawn.label?.visible, true); assert.equal(drawn.label?.fog, false); assert.equal(drawn.label?.depthTest, false);
    assert.ok(drawn.label.pixels >= 23.9, 'Deployed Decoy identity stays at least 24px tall in the actual camera');
    await page.screenshot({ path: `${output}/decoy-active-${quality}.png` });
    await press(9); // Menu remains the deliberate pause control.
    await expect(page.getByRole('heading', { name: 'PAUSED', exact: true })).toBeVisible();
    const paused = await state();
    await page.screenshot({ path: `${output}/decoy-${quality}.png` });
    await page.waitForTimeout(200);
    assert.deepEqual(await state(), paused, 'Pause freezes the lure and its remaining lifetime');
    if (quality === 'low') {
      await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
      await page.getByRole('tab', { name: 'Accessibility', exact: true }).click();
      await page.getByRole('checkbox', { name: 'Reduce decorative motion', exact: true }).check();
      assert.equal(await page.locator('.tactic.ready').evaluate(slot => getComputedStyle(slot).animationName), 'none');
      await page.getByRole('checkbox', { name: 'Reduce decorative motion', exact: true }).uncheck();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('.tactic.ready').evaluate(slot => getComputedStyle(slot).animationName), 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      pass('Loaded HUD tactics keep pulsing after three seconds, stop on use and become steady under either reduced-motion setting');
    }
    await page.getByRole('button', { name: 'SAVE & EXIT', exact: true }).click();
    await expect(page.getByRole('button', { name: 'CONTINUE RUN', exact: true })).toBeVisible();
    const saved = await page.evaluate(async () => (await import('/src/game/persistence.ts')).getSavedRun());
    assert.deepEqual(saved.decoys, paused.decoys);
    const frames = await page.evaluate(() => window.__tacticFrames);
    measurements.push({ quality, deployed: deployed.decoys, locked: locked.drones[0].target, drawn, pulsing, interrupted, frames, pausedTtl: paused.decoys[0].ttl });
    pass(`${quality}: Xbox Y/X deploys one visible stationary Decoy, redirects a fresh Patrol lock and preserves it exactly on pause/save`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/report.json`, JSON.stringify({ checks, measurements, errors, limitations: ['Prepared encounter saves and a simulated standard gamepad in isolated installed Chrome.', 'Frame observations are bounded diagnostics, not sustained performance or physical Xbox qualification.'] }, null, 2));
} catch (error) {
  const failure = await activePage?.evaluate(() => ({ pause: document.querySelector('.pause-panel')?.textContent, status: window.__tacticSim?.state.status, time: window.__tacticSim?.state.time, decoys: window.__tacticSim?.state.decoys, drones: window.__tacticSim?.state.drones, frames: window.__tacticFrames })).catch(() => null);
  await writeFile(`${output}/failure.json`, JSON.stringify({ message: error.message, checks, measurements, failure }, null, 2));
  console.error(failure ? { ...failure, frames: 'See failure.json' } : failure);
  throw error;
} finally { await browser.close(); }

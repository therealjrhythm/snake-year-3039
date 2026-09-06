import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// Test-only integration of a recorded eight-direction pilot with the actual App,
// DOM keyboard handlers, normal frame clock, renderer, checkpoint and records.
// This uses synthetic DOM key events, not a human or physical keyboard. The input
// clock follows observed simulation time; frame batching may diverge from the pure
// 60 Hz trace. Neither that divergence nor protective pauses are hidden or bypassed.
const origin = process.argv[2] ?? 'http://127.0.0.1:3039';
const traceFile = process.argv[3] ?? 'docs/evidence/ordinary-standard-3039-keyboard.json';
const recorded = JSON.parse(await readFile(traceFile, 'utf8'));
assert.equal(recorded.inputMode, 'eight-direction keyboard');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const started = Date.now();
const errors = [];
const pauses = [];
let earnedCheckpointClicked = false;
const deadline = setTimeout(() => { console.error('Ordinary keyboard replay exceeded its five-minute bound.'); void browser.close(); }, 300_000);
try {
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(recorded => {
    localStorage.setItem('s39.settings.v1', JSON.stringify({ quality: 'low', master: 0, music: 0, effects: 0 }));
    window.__ordinaryTrace = recorded;
    window.__ordinaryProbe = { snapshot: null, firstState: null, eventCounts: {}, sounds: [], milestones: [], checkpoint: null, inputMismatches: [], inputMismatchCount: 0, seedInitializerCalls: 0, keyEvents: 0, largestStep: 0 };
    // Only the App launch function's seed initializer is controlled. Normal
    // cosmetic/audio randomness continues unchanged and the wrapper self-removes.
    const originalRandom = Math.random;
    Math.random = () => {
      const stack = new Error().stack ?? '';
      if (/\bat launch \(/.test(stack) && stack.includes('/src/App.tsx')) {
        Math.random = originalRandom;
        window.__ordinaryProbe.seedInitializerCalls++;
        return (recorded.seed + 0.25) / 0x7fffffff;
      }
      return originalRandom();
    };
  }, recorded);
  await page.route('**/src/App.tsx*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    const instrumentation = `
      {
        const __OrdinarySimulation = Simulation, __OrdinaryInput = GameInputController, __OrdinaryAudio = GameAudio;
        const probe = window.__ordinaryProbe;
        const commands = window.__ordinaryTrace.trace.filter(entry => entry.input);
        let cursor = 0;
        let lastEvent = 0;
        const held = new Set();
        const keyNames = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', KeyF: 'f', Space: ' ', KeyE: 'e', ShiftLeft: 'Shift' };
        const originalPoll = __OrdinaryInput.prototype.poll;
        const originalStep = __OrdinarySimulation.prototype.step;
        const originalSound = __OrdinaryAudio.prototype.event;
        const sendKeys = desired => {
          for (const code of [...held]) if (!desired.has(code)) { window.dispatchEvent(new KeyboardEvent('keyup', { key: keyNames[code], code, bubbles: true })); held.delete(code); probe.keyEvents++; }
          for (const code of desired) if (!held.has(code)) { window.dispatchEvent(new KeyboardEvent('keydown', { key: keyNames[code], code, bubbles: true })); held.add(code); probe.keyEvents++; }
        };
        __OrdinaryInput.prototype.poll = function (...args) {
          const desired = new Set();
          if (this.gameplay && !this.disposed) {
            const frame = Math.round((probe.snapshot?.time ?? 0) * 60);
            while (cursor + 1 < commands.length && commands[cursor + 1].frame <= frame) cursor++;
            const input = commands[cursor].input;
            if (input.x < -0.1) desired.add('KeyA'); else if (input.x > 0.1) desired.add('KeyD');
            if (input.y < -0.1) desired.add('KeyW'); else if (input.y > 0.1) desired.add('KeyS');
            if (input.use) desired.add('Space');
            if (input.swap) desired.add('KeyE');
            if (input.fire) desired.add('KeyF');
            if (input.boost) desired.add('ShiftLeft');
          }
          sendKeys(desired);
          return originalPoll.apply(this, args);
        };
        __OrdinarySimulation.prototype.step = function (dt, input) {
          const s = this.state;
          if (!probe.firstState) probe.firstState = { seed: s.seed, mode: s.mode, contentVersion: s.contentVersion, layoutId: s.layoutId, wave: s.wave, time: s.time, cores: s.totalCores, lab: s.lab, integrity: s.player.integrity, ammo: s.weapon.ammo };
          const frame = Math.round(s.time * 60);
          let expectedCursor = cursor;
          while (expectedCursor + 1 < commands.length && commands[expectedCursor + 1].frame <= frame) expectedCursor++;
          const expected = commands[expectedCursor].input;
          // Observe batching drift without changing the command supplied by App.
          // Tactical use/swap are intentionally edges in the keyboard mapper.
          if (['x', 'y', 'fire', 'boost'].some(key => input[key] !== expected[key])) {
            probe.inputMismatchCount++;
            if (probe.inputMismatches.length < 32) probe.inputMismatches.push({ frame, time: s.time, status: s.status, heading: s.player.heading, expected, received: input });
          }
          probe.largestStep = Math.max(probe.largestStep, dt);
          const result = originalStep.call(this, dt, input);
          if (s.status === 'boss-intro' && !probe.checkpoint) probe.checkpoint = { time: s.time, position: { x: s.player.x, z: s.player.z }, heading: s.player.heading };
          probe.snapshot = { seed: s.seed, time: s.time, wave: s.wave, status: s.status, cores: s.totalCores, integrity: s.player.integrity, score: s.score, rivalKills: s.rivalKills, cause: s.deathCause, pauseRequested: s.pauseRequested, bossNodes: s.boss?.nodes ?? null, bossCharge: s.boss?.charge ?? null, position: { x: s.player.x, z: s.player.z } };
          for (const event of s.events) if (event.id > lastEvent) {
            lastEvent = event.id;
            probe.eventCounts[event.kind] = (probe.eventCounts[event.kind] ?? 0) + 1;
            if (['wave', 'transition', 'boss-intro', 'boss', 'relay', 'boss-node', 'boss-defeated', 'complete', 'damage', 'crash'].includes(event.kind)) probe.milestones.push({ time: event.time, kind: event.kind, relay: event.relay, origin: event.origin, text: event.text });
          }
          return result;
        };
        __OrdinaryAudio.prototype.event = function (event) {
          if (typeof event === 'object' && ['relay', 'charge-ready', 'boss-node', 'pickup'].includes(event.kind)) probe.sounds.push({ kind: event.kind, relay: event.relay, pickup: event.pickup, origin: event.origin });
          return originalSound.call(this, event);
        };
      }
    `;
    await route.fulfill({ response, body: `${instrumentation}\n${source}` });
  });
  await page.goto(origin);
  await expect(page.getByRole('button', { name: 'START GAME', exact: true })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  await page.getByRole('button', { name: 'ENTER NEON SPIRE', exact: true }).click();
  await page.waitForFunction(() => window.__ordinaryProbe.firstState !== null, undefined, { timeout: 10_000 });
  assert.equal(await page.evaluate(() => window.__ordinaryProbe.firstState.seed), recorded.seed, 'The normal launch must use the trace seed before keyboard replay can be evaluated');
  let lastProgress = -20;
  while (Date.now() - started < 295_000) {
    const state = await page.evaluate(() => window.__ordinaryProbe.snapshot);
    if (state && ['dead', 'complete'].includes(state.status)) break;
    if (state && state.time - lastProgress >= 20) { console.log(`Ordinary keyboard: ${state.time.toFixed(1)}s, wave ${state.wave}, ${state.cores} cores, ${state.status}, integrity ${state.integrity}`); lastProgress = state.time; }
    const boss = page.getByRole('button', { name: 'BREAK THE CIRCUIT', exact: true });
    if (await boss.isVisible()) {
      assert.equal(state.status, 'boss-intro');
      assert.equal(state.cores, 36, 'The actual campaign must earn every wave before Warden');
      await boss.click(); earnedCheckpointClicked = true;
    }
    const resume = page.getByRole('button', { name: 'RESUME', exact: true });
    if (await resume.isVisible()) {
      pauses.push({ time: state?.time ?? 0, label: await page.locator('.pause-panel .hud-label').innerText(), reason: await page.locator('.pause-panel > p').first().innerText() });
      // Resuming uses the real three-second countdown. No pause latch is cleared directly.
      await resume.click();
    }
    await page.waitForTimeout(300);
  }
  const probe = await page.evaluate(() => window.__ordinaryProbe);
  assert.equal(probe.seedInitializerCalls, 1, 'Only the normal campaign seed initializer may be controlled');
  assert.deepEqual(probe.firstState, { seed: recorded.seed, mode: 'campaign', contentVersion: recorded.contentVersion, layoutId: 'neon-spire-v2', wave: 1, time: 0, cores: 0, lab: null, integrity: 3, ammo: 0 });
  assert.ok(probe.keyEvents > 0, 'The normal input handlers must receive actual DOM keyboard events');
  assert.ok(probe.largestStep <= 1 / 60 + 1e-10, 'The App must keep its native fixed-step integration');
  await page.screenshot({ path: 'docs/evidence/ordinary-keyboard-browser-terminal.png' });
  await page.waitForTimeout(100);
  const records = await page.evaluate(async () => (await import('/src/game/persistence.ts')).getRecords());
  const report = { passed: probe.snapshot?.status === 'complete' && errors.length === 0, browser: browser.version(), sourceTrace: traceFile, elapsedWallSeconds: (Date.now() - started) / 1000, rendered: true, freshCampaign: true, stateEdited: false, inputDelivery: 'Synthetic DOM keyboard events received by normal GameInputController; normal App clock and renderer remain active.', earnedCheckpointClicked, pauses, ...probe, records, errors, limitation: 'Automated replay, not human playability or physical keyboard/controller acceptance. Real display-frame batching can diverge from the pure input trace; terminal status is reported without repair or replay restart.' };
  await writeFile('docs/evidence/ordinary-keyboard-browser-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ passed: report.passed, terminal: probe.snapshot, pauses: pauses.length, keyEvents: probe.keyEvents, report: 'docs/evidence/ordinary-keyboard-browser-report.json' }, null, 2));
  assert.deepEqual(errors, []);
  assert.equal(probe.snapshot?.status, 'complete', 'Actual browser keyboard replay did not extract; inspect its honest terminal report');
  assert.equal(records.length, 1);
  assert.equal(records[0].completed, true);
  assert.equal(records[0].seed, recorded.seed);
  assert.equal(earnedCheckpointClicked, true);
  assert.equal(probe.eventCounts.relay, 9);
  assert.equal(probe.eventCounts['boss-node'], 3);
  assert.deepEqual(probe.sounds.filter(event => event.kind === 'relay').map(event => event.relay), [1, 2, 3, 1, 2, 3, 1, 2, 3]);
} finally {
  clearTimeout(deadline);
  await context.close().catch(() => undefined);
  await browser.close();
}

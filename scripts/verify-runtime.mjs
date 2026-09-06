import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Browser plugin unavailable; isolated installed Chrome with strict autoplay.
// State observation below forwards the real simulation method without changing rules.
const origin = process.argv[2] ?? 'http://127.0.0.1:3039';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=document-user-activation-required'] });
const deadline = setTimeout(() => { console.error('Runtime verification exceeded 60 seconds.'); void browser.close(); }, 60_000);
const checks = [];
const errors = [];
const pass = name => { checks.push(name); console.log(`PASS ${name}`); };
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    window.__runtimeAudioContexts = [];
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) { super(...args); window.__runtimeAudioContexts.push(this); }
    };
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(origin, { waitUntil: 'networkidle' });
  const cdp = await context.newCDPSession(page);
  const withoutGesture = async expression => {
    const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: false });
    assert.equal(result.exceptionDetails, undefined, 'Non-gesture browser inspection must not throw');
    return result.result.value;
  };
  const waitWithoutGesture = async expression => {
    for (let attempt = 0; attempt < 80; attempt++) {
      if (await withoutGesture(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`State did not become ready: ${expression}`);
  };
  // No Playwright evaluate/keyboard/mouse action before this observation: those
  // can grant user activation and accidentally bypass the reported audio failure.
  await waitWithoutGesture("[...document.querySelectorAll('button')].some(button => button.textContent.includes('START GAME') && !button.disabled)");
  const beforeGesture = await withoutGesture("({ callout: document.querySelector('.audio-unlock')?.textContent.trim(), header: document.querySelector('[aria-label=\"Toggle sound\"]')?.textContent.trim(), contexts: window.__runtimeAudioContexts.length })");
  assert.match(beforeGesture.callout, /Click to enable sound/);
  assert.equal(beforeGesture.header, 'ENABLE');
  assert.equal(beforeGesture.contexts, 0);
  const audioOverlapsFooter = await withoutGesture("(() => { const audio = document.querySelector('.audio-unlock').getBoundingClientRect(); const footer = document.querySelector('.title-bottom > span:last-child').getBoundingClientRect(); return audio.left < footer.right && audio.right > footer.left && audio.top < footer.bottom && audio.bottom > footer.top; })()");
  assert.equal(audioOverlapsFooter, false, 'The sound enable control must leave device readiness visible');
  pass('Sound enable control and device-readiness footer occupy separate visible areas');
  await withoutGesture("document.querySelector('.audio-unlock').click(); true");
  const blocked = await withoutGesture("({ state: window.__runtimeAudioContexts.at(-1)?.state, callout: !!document.querySelector('.audio-unlock'), header: document.querySelector('[aria-label=\"Toggle sound\"]')?.textContent.trim() })");
  assert.deepEqual(blocked, { state: 'suspended', callout: true, header: 'ENABLE' });
  pass('Actual App shows truthful Enable sound before a gesture and remains blocked after a synthetic click');
  await page.screenshot({ path: '/tmp/s39-runtime-audio-locked.png' });

  // Regression: pointerdown unlock must not reinterpret this header click as mute.
  await page.getByRole('button', { name: 'Toggle sound', exact: true }).click();
  await page.locator('.audio-unlock').waitFor({ state: 'hidden' });
  assert.equal((await page.getByRole('button', { name: 'Toggle sound', exact: true }).innerText()).trim(), 'ON');
  assert.equal(await withoutGesture("window.__runtimeAudioContexts.at(-1).state"), 'running');
  pass('Real header Enable click unlocks audio, hides the callout and stays ON');

  await withoutGesture("window.__runtimeAudioContexts.at(-1).suspend().then(() => true)");
  await waitWithoutGesture("!!document.querySelector('.audio-unlock') && document.querySelector('[aria-label=\"Toggle sound\"]').textContent.trim() === 'ENABLE'");
  await page.getByRole('button', { name: 'Enable audio', exact: true }).click();
  await page.locator('.audio-unlock').waitFor({ state: 'hidden' });
  assert.equal(await withoutGesture("window.__runtimeAudioContexts.at(-1).state"), 'running');
  pass('Native audio suspension updates the actual App callout and a real click recovers it');

  await page.evaluate(async () => {
    // Vite may stamp the module URL after an edit; observe the exact module used
    // by this page instead of accidentally importing a second class instance.
    const source = performance.getEntriesByType('resource').find(entry => /\/src\/game\/simulation\.ts(?:\?|$)/.test(entry.name));
    if (!source) throw new Error('The running simulation module was not observed');
    const { Simulation } = await import(source.name);
    const snapshot = Simulation.prototype.snapshot;
    Simulation.prototype.snapshot = function (...args) {
      window.__runtimeSimulation = this;
      return snapshot.apply(this, args);
    };
  });
  const state = () => page.evaluate(() => structuredClone(window.__runtimeSimulation.state));
  const waitActive = async () => {
    await page.locator('.countdown-overlay').waitFor({ state: 'hidden', timeout: 7000 });
    assert.equal(await page.locator('.pause-panel').count(), 0);
    assert.equal(await page.locator('.results-panel').count(), 0);
    assert.equal((await state()).status, 'playing');
  };
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  await page.getByRole('button', { name: 'ENTER NEON SPIRE', exact: true }).click();
  await waitActive();
  const beforeDuplicateResize = await state();
  await page.evaluate(() => {
    for (let index = 0; index < 3; index++) window.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.pause-panel').count(), 0);
  assert.ok((await state()).time > beforeDuplicateResize.time);
  pass('Duplicate resize events at unchanged dimensions keep the real run moving');

  await page.setViewportSize({ width: 1120, height: 720 });
  await page.getByText('AUTOMATIC PAUSE · VIEWPORT', { exact: true }).waitFor();
  const viewportPause = await state();
  await page.waitForTimeout(250);
  assert.deepEqual(await state(), viewportPause);
  await page.screenshot({ path: '/tmp/s39-runtime-viewport-pause.png' });
  pass('A real viewport change shows AUTOMATIC PAUSE · VIEWPORT and freezes the complete simulation state');

  await page.getByRole('button', { name: 'RESUME', exact: true }).click();
  await waitActive();
  await page.evaluate(() => {
    const start = performance.now();
    while (performance.now() - start < 325) { /* Deliberate main-thread stall exercises the actual frame guard. */ }
  });
  await page.getByText('AUTOMATIC PAUSE · PERFORMANCE', { exact: true }).waitFor();
  const performancePause = await state();
  await page.waitForTimeout(250);
  assert.deepEqual(await state(), performancePause);
  await page.screenshot({ path: '/tmp/s39-runtime-performance-pause.png' });
  pass('A forced 325 ms frame shows AUTOMATIC PAUSE · PERFORMANCE and freezes the complete simulation state');

  await page.getByRole('button', { name: 'Use Low graphics & resume', exact: false }).click();
  await page.locator('.countdown-overlay').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('s39.settings.v1')).quality), 'low');
  const resumedFromPause = await state();
  assert.equal(resumedFromPause.time, performancePause.time, 'Recovery countdown must not advance encounter time');
  await waitActive();
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'PAUSED', exact: true }).waitFor();
  pass('Use Low graphics & resume saves Low, starts an explicit countdown and resumes the same run');

  assert.deepEqual(errors, []);
  pass('No browser or console errors in the audio and automatic-pause recovery flow');
  const report = { passed: true, date: new Date().toISOString(), browser: browser.version(), checks, beforeGesture, blocked, errors, evidence: ['/tmp/s39-runtime-audio-locked.png', '/tmp/s39-runtime-viewport-pause.png', '/tmp/s39-runtime-performance-pause.png'], limitations: ['Native context creation is observed; simulation snapshot calls are forwarded unchanged to capture the real state.', 'The long frame is deliberately induced to verify recovery, not an observed performance frequency or hardware qualification.', 'No complete district playthrough or physical controller acceptance is claimed.'] };
  await writeFile('/tmp/s39-runtime-report.json', `${JSON.stringify(report, null, 2)}\n`);
} finally {
  clearTimeout(deadline);
  await browser.close();
}

import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// The Browser plugin is unavailable. Installed Chrome supplies real Web Audio graphs;
// offline time below is controlled for measurement, not an owner listening review.
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=document-user-activation-required'] });
const deadline = setTimeout(() => {
  console.error('Audio verification exceeded 60 seconds; closing its isolated browser.');
  void browser.close();
}, 60_000);
try {
  const errors = [];
  const origin = process.argv[2] ?? 'http://127.0.0.1:3039';
  const autoplayPage = await browser.newPage();
  autoplayPage.on('pageerror', error => errors.push(error.message));
  await autoplayPage.route('**/audio-autoplay-verification', route => route.fulfill({ contentType: 'text/html', body: `<button id="unlock">Enable audio</button><script type="module">
    import { GameAudio } from '/src/game/audio.ts';
    window.audioTest = new GameAudio();
    window.firstUnlock = window.audioTest.unlock();
    window.firstContext = window.audioTest.context;
    document.querySelector('#unlock').onclick = () => { window.gestureUnlock = window.audioTest.unlock(); };
  </script>` }));
  await autoplayPage.goto(`${origin}/audio-autoplay-verification`);
  // Playwright evaluate carries a user-gesture flag. Inspect this pre-gesture
  // document through CDP without that flag so the autoplay boundary is real.
  const cdp = await autoplayPage.context().newCDPSession(autoplayPage);
  const blocked = (await cdp.send('Runtime.evaluate', { expression: '({ status: window.audioTest.getStatus(), state: window.audioTest.context.state })', returnByValue: true, userGesture: false })).result.value;
  assert.equal(blocked.status, 'locked', 'A synthetic/controller start must not claim that audio is enabled');
  assert.equal(blocked.state, 'suspended', 'Strict autoplay policy must block the initial non-gesture request');
  await autoplayPage.locator('#unlock').click();
  const overlappingUnlocks = await autoplayPage.evaluate(async () => ({ first: await window.firstUnlock, gesture: await window.gestureUnlock, sameContext: window.audioTest.context === window.firstContext, status: window.audioTest.getStatus() }));
  assert.deepEqual(overlappingUnlocks, { first: true, gesture: true, sameContext: true, status: 'running' }, 'The next trusted gesture must recover an already-pending unlock without duplicating contexts');
  await autoplayPage.evaluate(() => window.audioTest.dispose());
  await autoplayPage.close();
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  // A minimal same-origin harness avoids rendering the game during audio measurements.
  await page.route('**/audio-verification', route => route.fulfill({ contentType: 'text/html', body: '<button id="unlock">Enable audio</button>' }));
  await page.goto(`${origin}/audio-verification`);
  const render = await page.evaluate(async () => {
    const { GameAudio } = await import('/src/game/audio.ts');
    const NativeAudioContext = window.AudioContext;
    const offline = new OfflineAudioContext(2, 14 * 44100, 44100);
    let cursor = 0;
    let sourcesCreated = 0;
    let sourcesEnded = 0;
    const scheduledStops = new WeakMap();
    const proxy = new Proxy(offline, {
      get(target, key) {
        if (key === 'currentTime') return cursor;
        if (key === 'state') return 'running';
        if (key === 'close') return () => Promise.resolve();
        if (key === 'createOscillator' || key === 'createBufferSource') return () => {
          const source = target[key]();
          const stop = source.stop.bind(source);
          source.stop = time => { scheduledStops.set(source, time ?? cursor); stop(time); };
          sourcesCreated++;
          source.addEventListener('ended', () => sourcesEnded++);
          return source;
        };
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    window.AudioContext = function () { return proxy; };
    const audio = new GameAudio();
    // Full music volume is the more demanding clipping case; effects remain independent.
    audio.setLevels(1, 1, 1);
    await audio.unlock();
    clearInterval(audio.timer);
    audio.timer = null;
    const arrangements = new Set();
    for (let tick = 0; tick < 280; tick++) {
      cursor = tick * 0.05;
      // Native ended events arrive during rendering, after this scheduling pass.
      // Advance only the voice registry here so a later simulated pause does not
      // extend every historically scheduled oscillator to the pause timestamp.
      for (const source of audio.musicSources) {
        if (scheduledStops.get(source) <= cursor) audio.musicSources.delete(source);
      }
      if (tick === 60) audio.setIntensity('playing');
      if (tick === 120) audio.setIntensity('boss');
      if (tick === 180) audio.setLevels(1, 0, 1);
      if (tick === 194) audio.event('core');
      if (tick === 200) audio.setPaused(true);
      if (tick === 210) { audio.setLevels(1, 1, 1); audio.setPaused(false); }
      if (tick === 240) audio.setPaused(true);
      audio.schedule();
      arrangements.add(audio.arrangement);
    }
    window.AudioContext = NativeAudioContext;
    const buffer = await offline.startRendering();
    const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
    const measure = (start, end) => {
      let energy = 0;
      let difference = 0;
      let peak = 0;
      let nonFinite = 0;
      const first = Math.floor(start * buffer.sampleRate);
      const last = Math.floor(end * buffer.sampleRate);
      for (let index = first; index < last; index++) {
        const left = channels[0][index];
        const right = channels[1][index];
        if (!Number.isFinite(left) || !Number.isFinite(right)) nonFinite++;
        energy += (left * left + right * right) / 2;
        difference += (left - right) ** 2;
        peak = Math.max(peak, Math.abs(left), Math.abs(right));
      }
      return { rms: Math.sqrt(energy / (last - first)), stereoRms: Math.sqrt(difference / (last - first)), peak, nonFinite };
    };
    const result = {
      all: measure(0, 14), title: measure(1, 2.8), playing: measure(4.5, 5.9), boss: measure(7, 8.8),
      muted: measure(9.5, 9.65), effectWhileMuted: measure(9.71, 9.95),
      paused: measure(10.25, 10.45), resumed: measure(11, 11.9),
      arrangements: [...arrangements], sourcesCreated, sourcesEnded,
      remainingMusicSources: audio.musicSources.size,
    };
    audio.dispose();
    return result;
  });
  assert.equal(render.all.nonFinite, 0, 'Every rendered music sample must be finite');
  assert.ok(render.all.peak < 0.98, `Full-volume peak must leave headroom: ${render.all.peak}`);
  for (const mode of ['title', 'playing', 'boss', 'resumed']) {
    assert.ok(render[mode].rms > 0.003, `${mode} music must produce measurable audio`);
    assert.ok(render[mode].stereoRms > 0.001, `${mode} must retain stereo space`);
  }
  assert.deepEqual(render.arrangements, ['title', 'playing', 'boss']);
  assert.ok(render.muted.rms < 0.00001, 'Music mute must silence dry voices and echo tails');
  assert.ok(render.paused.rms < 0.00001, 'Pause must fade the entire music bus');
  assert.ok(render.effectWhileMuted.rms > 0.01, 'Music mute must preserve pickup sound effects');
  assert.equal(render.sourcesCreated, render.sourcesEnded, 'Every scheduled source must end');
  assert.equal(render.remainingMusicSources, 0, 'All music voices must disconnect after ending');

  await page.evaluate(async () => {
    const { GameAudio } = await import('/src/game/audio.ts');
    window.audioStatuses = [];
    window.audioTest = new GameAudio(status => window.audioStatuses.push(status));
    document.querySelector('#unlock').onclick = () => window.audioTest.unlock();
  });
  await page.locator('#unlock').click();
  await page.waitForFunction(() => window.audioTest.context?.state === 'running');
  // The output device can start after resume() changes state. Test using its real clock.
  await page.waitForFunction(() => window.audioTest.context?.currentTime > 0.25, undefined, { timeout: 10_000 });
  const lifecycle = await page.evaluate(async () => {
    const audio = window.audioTest;
    const context = audio.context;
    const timer = audio.timer;
    await audio.unlock();
    const repeatedUnlockIsStable = audio.context === context && audio.timer === timer;
    audio.setPaused(true);
    const pauseTime = context.currentTime;
    await new Promise(resolve => setTimeout(resolve, 600));
    const voicesAfterPause = audio.musicSources.size;
    audio.setPaused(false);
    // The title deliberately has rests: observe the next voice, not one arbitrary instant.
    for (let attempt = 0; audio.musicSources.size === 0 && attempt < 40; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    const voicesAfterResume = audio.musicSources.size;
    await context.suspend();
    await new Promise(resolve => setTimeout(resolve, 50));
    const suspended = { status: audio.getStatus(), timerStopped: audio.timer === null };
    audio.setPaused(true);
    audio.setVisible(false);
    audio.setVisible(true);
    for (let attempt = 0; audio.getStatus() !== 'running' && attempt < 40; attempt++) await new Promise(resolve => setTimeout(resolve, 50));
    const returned = { status: audio.getStatus(), gameStillPaused: audio.paused, schedulerStillStopped: audio.timer === null };
    audio.setPaused(false);
    const schedulingAfterReturn = audio.timer !== null;
    await context.close();
    await new Promise(resolve => setTimeout(resolve, 50));
    const closedStatus = audio.getStatus();
    const rebuilt = await audio.unlock();
    const replacement = audio.context;
    const closedRecovery = { previousStatus: closedStatus, result: rebuilt, replacedContext: replacement !== context, status: audio.getStatus() };
    const timerAfterDispose = (() => { audio.dispose(); return audio.timer; })();
    await new Promise(resolve => setTimeout(resolve, 100));
    await audio.unlock();
    return { repeatedUnlockIsStable, pauseTime, voicesAfterPause, voicesAfterResume, suspended, returned, schedulingAfterReturn, closedRecovery, statuses: window.audioStatuses, timerAfterDispose, stateAfterDispose: replacement.state, disposedRemainsClosed: audio.context === null };
  });
  assert.equal(lifecycle.repeatedUnlockIsStable, true);
  assert.equal(lifecycle.voicesAfterPause, 0, 'Hidden/paused tabs must stop active music sources');
  assert.ok(lifecycle.voicesAfterResume > 0, 'A real running context must resume scheduling');
  assert.deepEqual(lifecycle.suspended, { status: 'suspended', timerStopped: true });
  assert.deepEqual(lifecycle.returned, { status: 'running', gameStillPaused: true, schedulerStillStopped: true }, 'Visible return must recover sound readiness without resuming gameplay');
  assert.equal(lifecycle.schedulingAfterReturn, true);
  assert.deepEqual(lifecycle.closedRecovery, { previousStatus: 'unavailable', result: true, replacedContext: true, status: 'running' });
  assert.equal(lifecycle.timerAfterDispose, null);
  assert.equal(lifecycle.stateAfterDispose, 'closed');
  assert.equal(lifecycle.disposedRemainsClosed, true);
  const delayedRecovery = await page.evaluate(async () => {
    const { GameAudio } = await import('/src/game/audio.ts');
    const NativeAudioContext = window.AudioContext;
    const context = new NativeAudioContext();
    await context.suspend();
    const nativeResume = context.resume.bind(context);
    let release;
    context.resume = () => new Promise(resolve => { release = resolve; });
    window.AudioContext = function () { return context; };
    const audio = new GameAudio();
    const started = performance.now();
    const blockedResult = await audio.unlock();
    const bounded = performance.now() - started < 2500;
    const blockedStatus = audio.getStatus();
    context.resume = nativeResume;
    const recovered = await audio.unlock();
    release();
    const recoveredStatus = audio.getStatus();
    await context.suspend();
    context.resume = () => new Promise(resolve => { release = resolve; });
    const pending = audio.unlock();
    audio.dispose();
    release();
    const disposedResult = await pending;
    window.AudioContext = NativeAudioContext;
    return { blockedResult, bounded, blockedStatus, recovered, recoveredStatus, disposedResult, disposedContext: audio.context, disposedTimer: audio.timer };
  });
  assert.deepEqual(delayedRecovery, { blockedResult: false, bounded: true, blockedStatus: 'locked', recovered: true, recoveredStatus: 'running', disposedResult: false, disposedContext: null, disposedTimer: null }, 'Blocked or late browser resume promises must remain retryable and cannot resurrect disposed audio');
  assert.deepEqual(errors, [], 'No uncaught browser audio errors');
  const report = { passed: true, browser: browser.version(), render, blocked, overlappingUnlocks, lifecycle, delayedRecovery, limitation: 'Native offline rendering, strict browser autoplay and real context suspension/closure, plus a controlled delayed resume promise; not a subjective listening review or every device/browser.' };
  await writeFile('/tmp/s39-audio-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  clearTimeout(deadline);
  await browser.close();
}

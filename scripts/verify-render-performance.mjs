import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Frozen renderer workload, not an identified-machine/full-game benchmark.
// --baseline records the previous implementation without enforcing the new budgets.
const baseline = process.argv.includes('--baseline');
const baseUrl = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://127.0.0.1:3039';
const outputDir = path.resolve('/tmp/snake-render-performance', baseline ? 'before' : 'after');
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const watchdog = setTimeout(() => { void browser.close(); }, 60000);
const page = await browser.newPage({ viewport: { width: 3622, height: 2300 }, deviceScaleFactor: 2 });
const errors = [], sizes = [], checks = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.route('**/render-fixture', route => route.fulfill({ contentType: 'text/html', body: '<html><head><style>html,body,#arena{margin:0;width:100%;height:100%;overflow:hidden;background:#06111d}</style></head><body><div id="arena"></div></body></html>' }));
  await page.goto(new URL('/render-fixture', baseUrl).href);
  await page.evaluate(async () => {
    const { GameRenderer } = await import('/src/game/renderer.ts');
    const { Simulation } = await import('/src/game/simulation.ts');
    const sim = new Simulation({ seed: 3039042, difficulty: 'standard' });
    const s = sim.state;
    s.wave = 3; s.pendingSpawns = [];
    s.player.x = 0; s.player.z = 7; s.player.heading = 0; s.player.length = 44;
    s.player.body = Array.from({ length: 44 }, (_, i) => ({ x: -7 * Math.sin((i + 1) * 0.55 / 7), z: 7 * Math.cos((i + 1) * 0.55 / 7) }));
    s.mines = [-10, 0, 10].map((x, i) => ({ id: `mine-${i}`, x, z: -6, armed: true, armTime: 0 }));
    s.drones = [-10, 10].map((x, i) => ({ id: `drone-${i}`, x, z: 4, state: 'patrol', disabled: 0, timer: 0, cooldown: 2, anchor: { x, z: 4 }, phase: i }));
    s.projectiles = Array.from({ length: 8 }, (_, i) => ({ id: `shot-${i}`, x: -7 + i * 2, z: -8, vx: 0, vz: 4, ttl: 5 }));
    const head = { x: 9, z: 0 }, body = Array.from({ length: 12 }, (_, i) => ({ x: 9 + (i + 1) * 0.5, z: Math.sin(i * 0.2) * 0.9 }));
    s.rivals = [{ id: 'hunter', ...head, heading: Math.PI, body, path: [head, ...body], length: 12, lastTurn: 1, state: 'hunting', warning: 0, desiredHeading: Math.PI, planning: 0, speed: 3.2 }];
    let ready;
    const loaded = new Promise(resolve => { ready = resolve; });
    const renderer = new GameRenderer(document.getElementById('arena'), () => { throw new Error('WebGL context lost'); }, ready);
    window.__renderFixture = { sim, renderer, before: JSON.stringify(s) };
    await loaded;
  });
  const initial = await page.evaluate(() => {
    const f = window.__renderFixture;
    return { canvas: [f.renderer.renderer.domElement.width, f.renderer.renderer.domElement.height], composer: [f.renderer.composer.renderTarget1.width, f.renderer.composer.renderTarget1.height] };
  });
  console.log('Initial large-view buffers:', JSON.stringify(initial));
  const timings = await page.evaluate(async () => {
    const f = window.__renderFixture, samples = [], gaps = [];
    let last = 0;
    for (let i = 0; i < 28; i++) {
      const frame = await new Promise(requestAnimationFrame);
      const start = performance.now();
      f.renderer.render(f.sim.state, false, frame / 1000);
      // Completion timing intentionally includes GPU work; this is a bounded diagnostic.
      f.renderer.renderer.getContext().finish();
      if (i >= 8) { samples.push(performance.now() - start); gaps.push(frame - last); }
      last = frame;
    }
    const stats = values => { const sorted = [...values].sort((a, b) => a - b); return { median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.floor(sorted.length * 0.95)], max: sorted.at(-1) }; };
    return { renderCompletionMs: stats(samples), frameIntervalMs: stats(gaps), sampleCount: samples.length, unchanged: f.before === JSON.stringify(f.sim.state) };
  });
  console.log('Bounded large-view timing:', JSON.stringify(timings));
  assert.equal(timings.unchanged, true);
  for (const [width, height, quality] of [[3622, 2300, 'medium'], [3622, 2300, 'high'], [3622, 2300, 'low'], [1440, 900, 'medium'], [375, 844, 'medium']]) {
    await page.setViewportSize({ width, height });
    const measured = await page.evaluate(quality => {
      const f = window.__renderFixture;
      f.renderer.setSettings({ quality, bloom: 0.45, reducedMotion: true });
      f.renderer.resize();
      const canvas = f.renderer.renderer.domElement;
      return { canvas: [canvas.width, canvas.height], composer: [f.renderer.composer.renderTarget1.width, f.renderer.composer.renderTarget1.height], viewport: [canvas.clientWidth, canvas.clientHeight], dpr: devicePixelRatio, renderDpr: f.renderer.renderer.getPixelRatio(), redundantResize: f.renderer.resize() };
    }, quality);
    sizes.push({ width, height, quality, ...measured });
    if (!baseline) {
      const budget = { low: 1280 * 720, medium: 1920 * 1080, high: 2560 * 1440 }[quality];
      assert.ok(measured.canvas[0] * measured.canvas[1] <= budget, 'Drawing-buffer pixels must be bounded');
      assert.deepEqual(measured.composer, measured.canvas, 'Postprocessing and drawing-buffer resolution must agree after quality changes');
      assert.deepEqual(measured.viewport, [width, height], 'CSS viewport and camera area must remain full size');
      assert.equal(measured.redundantResize, false, 'Unchanged resize must be a no-op');
    }
  }
  checks.push('Large/regular/narrow DPR2 dimensions recorded; simulation unchanged by timed rendering');
  if (!baseline) checks.push('All quality budgets enforced; composer matches canvas; CSS size preserved; repeated resize is a no-op');
  await page.setViewportSize({ width: 3622, height: 2300 });
  await page.evaluate(() => { const f = window.__renderFixture; f.renderer.setSettings({ quality: 'medium', bloom: 0.45, reducedMotion: true }); f.renderer.resize(); f.renderer.render(f.sim.state, false, 0); });
  await page.screenshot({ path: path.join(outputDir, 'large-medium.png'), scale: 'css' });
  let empEffect;
  if (!baseline) {
    await page.setViewportSize({ width: 1440, height: 900 });
    empEffect = await page.evaluate(async () => {
      const { Simulation } = await import('/src/game/simulation.ts');
      const { PICKUPS } = await import('/src/game/content.ts');
      const sim = new Simulation({ seed: 3039042, difficulty: 'standard' });
      sim.state.slots[0] = true;
      sim.state.drones = [{ id: 'emp-target', x: 3, z: 6, state: 'patrol', disabled: 0, timer: 0, cooldown: 2, anchor: { x: 3, z: 6 }, phase: 0 }];
      // The real simulation consumes EMP before the player continues moving.
      sim.step(1 / 60, { x: 0, y: 0, boost: false, use: true, swap: false });
      for (let i = 0; i < 17; i++) sim.step(1 / 60, { x: 0, y: 0, boost: false, use: false, swap: false });
      const event = sim.state.events.find(item => item.kind === 'emp');
      if (!event?.origin) throw new Error('Real EMP event lacked its action origin');
      sim.state.pickups = Object.keys(PICKUPS).map((kind, i) => ({ id: `display-${kind}`, kind, x: -11 + i % 4 * 7, z: i < 4 ? -7 : 7, ttl: 15 }));
      const renderer = window.__renderFixture.renderer;
      renderer.resize(); renderer.setSettings({ quality: 'medium', bloom: 0.45, reducedMotion: false });
      const before = JSON.stringify(sim.state);
      renderer.render(sim.state, false, 100);
      const pulse = renderer.objects.get(`emp-pulse:${event.id}`);
      if (!pulse) throw new Error('EMP effect did not render');
      const wave = pulse.getObjectByName('wave');
      const first = [pulse.position.x, pulse.position.z, wave.scale.x, wave.material.opacity];
      renderer.render(sim.state, false, 200);
      const second = [pulse.position.x, pulse.position.z, wave.scale.x, wave.material.opacity];
      return { origin: event.origin, currentPlayer: { x: sim.state.player.x, z: sim.state.player.z }, effectOrigin: { x: pulse.position.x, z: pulse.position.z }, radius: pulse.getObjectByName('boundary').geometry.parameters.radius, pauseFrozen: JSON.stringify(first) === JSON.stringify(second), simulationUnchanged: before === JSON.stringify(sim.state), pickupCount: [...renderer.objects.keys()].filter(key => key.startsWith('pickup:')).length };
    });
    assert.deepEqual(empEffect.effectOrigin, empEffect.origin, 'EMP visual must remain at the true action origin');
    assert.notDeepEqual(empEffect.currentPlayer, empEffect.origin, 'Fixture must exercise movement after EMP activation');
    assert.equal(empEffect.radius, 4);
    assert.equal(empEffect.pauseFrozen, true);
    assert.equal(empEffect.simulationUnchanged, true);
    assert.equal(empEffect.pickupCount, 8);
    await page.screenshot({ path: path.join(outputDir, 'emp-and-pickups.png'), scale: 'css' });
    checks.push('Real EMP action renders exact four-unit origin after movement; paused simulation freezes pulse; all eight canonical pickups rendered');
  }
  await page.evaluate(() => window.__renderFixture.renderer.dispose());
  assert.equal(await page.locator('#arena canvas').count(), 0);
  assert.deepEqual(errors, []);
  checks.push('Captured large Medium fixture and disposed renderer without browser errors');
  const report = { date: new Date().toISOString(), baseline, browser: browser.version(), initial, timings, sizes, empEffect, checks, errors, limitation: 'Isolated headless Chrome, deliberately fixed render state without app HUD. GPU completion is explicitly synchronized for this diagnostic. Timing is an observation on this run, not supported-machine performance or normal-play acceptance. EMP uses a real action in an arranged state; the pickup layout is for visual review.' };
  await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { clearTimeout(watchdog); await browser.close(); }

import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Presentation-only, deliberately arranged state coverage. This is not a valid
// campaign encounter, ordinary playthrough, collision test, or device qualification.
const baseUrl = process.argv[2] || 'http://127.0.0.1:3039';
const outputDir = path.resolve(process.argv[3] || '/tmp/snake-enemy-visibility');
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
const errors = [], captures = [], checks = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

try {
  await page.route('**/enemy-fixture', route => route.fulfill({
    contentType: 'text/html',
    body: '<html><head><style>html,body,#arena{margin:0;width:100%;height:100%;overflow:hidden;background:#06111d}</style></head><body><div id="arena"></div></body></html>',
  }));
  await page.goto(new URL('/enemy-fixture', baseUrl).href);
  await page.evaluate(async () => {
    const { GameRenderer } = await import('/src/game/renderer.ts');
    const { Simulation } = await import('/src/game/simulation.ts');
    const sim = new Simulation({ seed: 3039042, difficulty: 'standard' });
    const state = sim.state;
    state.wave = 3; state.time = 60; state.pendingSpawns = [];
    state.cores = [{ id: 'core-a', x: -1, z: 3 }, { id: 'core-b', x: 6, z: 7 }, { id: 'core-c', x: -11, z: 0 }];
    state.mines = [{ id: 'armed', x: -10, z: 5, armed: true, armTime: 0 }, { id: 'arming', x: 10, z: -7, armed: false, armTime: 0.5 }];
    const drone = (id, x, z, state) => ({ id, x, z, state, disabled: state === 'disabled' ? 2 : 0, timer: 0.7, cooldown: 2, anchor: { x, z }, phase: 0 });
    state.drones = [drone('patrol', -10, -5, 'patrol'), { ...drone('locking', 10, 4, 'prepare'), target: { x: 8, z: 7 } }, drone('offline', 3, -5, 'disabled'), drone('entry', -3, -7, 'warning')];
    state.projectiles = [{ id: 'bolt', x: 4, z: 4, vx: -3, vz: 2, ttl: 3 }];
    const head = { x: 9, z: 0 };
    const body = Array.from({ length: 12 }, (_, i) => ({ x: 9 + (i + 1) * 0.5, z: Math.sin(i * 0.2) * 0.9 }));
    state.rivals = [{ id: 'hunter', ...head, heading: Math.PI, body, path: [head, ...body], length: 12, lastTurn: 1, state: 'hunting', warning: 0, desiredHeading: Math.PI, planning: 0, speed: 3.2 }];
    state.gates = [{ id: 'warn', x: -0.5, z: -4, length: 6.5, axis: 'x', state: 'warning', timer: 0.5, disabled: 0, boss: false }];
    let ready;
    const loaded = new Promise(resolve => { ready = resolve; });
    const renderer = new GameRenderer(document.getElementById('arena'), () => { throw new Error('WebGL context lost'); }, ready);
    window.__enemyFixture = { sim, renderer, before: JSON.stringify(state) };
    await loaded;
  });
  for (const [quality, width, height] of [['medium', 1672, 941], ['low', 1672, 941], ['low', 1280, 720], ['low', 375, 844]]) {
    await page.setViewportSize({ width, height });
    const unchanged = await page.evaluate(quality => {
      const fixture = window.__enemyFixture;
      fixture.renderer.resize();
      fixture.renderer.setSettings({ quality, bloom: quality === 'low' ? 0 : 0.45, reducedMotion: true });
      fixture.renderer.render(fixture.sim.state, false, 0);
      return fixture.before === JSON.stringify(fixture.sim.state);
    }, quality);
    assert.equal(unchanged, true, 'Rendering must not mutate simulation state');
    const file = path.join(outputDir, `enemies-${quality}-${width}x${height}.png`);
    await page.screenshot({ path: file });
    captures.push({ quality, bloom: quality === 'low' ? 0 : 0.45, width, height, file });
    checks.push(`${quality} ${width}x${height}: real renderer captured; simulation unchanged`);
  }
  await page.evaluate(() => window.__enemyFixture.renderer.dispose());
  assert.equal(await page.locator('#arena canvas').count(), 0);
  assert.deepEqual(errors, []);
  checks.push('Renderer disposed cleanly; no uncaught browser/console errors');
  const report = { date: new Date().toISOString(), browser: browser.version(), method: 'Isolated installed Chrome via Playwright; Browser plugin unavailable', checks, captures, errors, limitation: 'Explicit frozen renderer fixture without the app HUD. Covers selected visual states, not normal gameplay, complete state-transition QA, physical Xbox, owner acceptance or supported-platform qualification.' };
  await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }

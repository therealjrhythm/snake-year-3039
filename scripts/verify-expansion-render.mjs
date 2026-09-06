import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Deliberately arranged, frozen simulation with the real renderer, HUD and
// customization component. This is presentation QA, not ordinary play or hardware acceptance.
const baseUrl = process.argv[2] || 'http://127.0.0.1:3039';
const outputDir = path.resolve(process.argv[3] || '/tmp/snake-expansion-render');
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const watchdog = setTimeout(() => { void browser.close(); }, 90000);
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, permissions: ['local-network-access'] });
const errors = [], checks = [], captures = [], camera = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.route('**/expansion-render-fixture', route => route.fulfill({ contentType: 'text/html', body: '<html><head><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}</style><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true; import "/src/style.css"; import "/node_modules/@fontsource/orbitron/latin-700.css"; import "/node_modules/@fontsource/orbitron/latin-900.css"; import "/node_modules/@fontsource/rajdhani/latin-400.css"; import "/node_modules/@fontsource/rajdhani/latin-500.css"; import "/node_modules/@fontsource/rajdhani/latin-600.css"; import "/node_modules/@fontsource/rajdhani/latin-700.css";</script></head><body><div id="app" class="app"><div id="arena" class="world"></div><div id="ui"></div></div></body></html>' }));
  await page.goto(new URL('/expansion-render-fixture', baseUrl).href);
  await page.evaluate(async () => {
    const [{ GameRenderer }, { Simulation }, { getLayout }, { PICKUPS }, appearance, { Hud }, { CustomizeSnake }, ReactModule, ReactDOMModule, THREE] = await Promise.all([
      import('/src/game/renderer.ts'), import('/src/game/simulation.ts'), import('/src/game/layouts.ts'), import('/src/game/content.ts'), import('/src/game/appearance.ts'), import('/src/components/Hud.tsx'), import('/src/components/CustomizeSnake.tsx'), import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/node_modules/.vite/deps/three.js'),
    ]);
    const React = ReactModule.default ?? ReactModule, ReactDOM = ReactDOMModule.default ?? ReactDOMModule;
    const sim = new Simulation({ seed: 3039401, difficulty: 'standard' });
    const state = sim.state, layout = getLayout(state);
    state.wave = 3; state.time = 90; state.pendingSpawns = []; state.pickups = []; state.events = [];
    state.player.x = 0; state.player.z = 6; state.player.heading = 0;
    state.player.body = Array.from({ length: 20 }, (_, i) => ({ x: -5 * Math.sin((i + 1) * .55 / 5), z: 6 - 5 * (1 - Math.cos((i + 1) * .55 / 5)) })); state.player.length = 20;
    state.mines = [{ id: 'mine', x: -12, z: 5, armed: true, armTime: 0 }];
    state.drones = [{ id: 'drone', x: 12, z: -3, state: 'patrol', hp: 2, disabled: 0, timer: 0, cooldown: 2, anchor: { x: 12, z: -3 }, phase: 0 }];
    const head = { x: 12, z: 6 }, body = Array.from({ length: 10 }, (_, i) => ({ x: 12 + Math.sin((i + 1) * .15) * 2, z: 6 - (i + 1) * .5 }));
    state.rivals = [{ id: 'hunter', ...head, heading: Math.PI, body, path: [head, ...body], length: 10, lastTurn: 1, state: 'hunting', warning: 0, desiredHeading: Math.PI, planning: 0, speed: 3.2 }];
    state.projectiles = [{ id: 'enemy-bolt', x: 4, z: 4, vx: -3, vz: 2, ttl: 3 }];
    state.playerProjectiles = [{ id: 'friendly-bolt', x: -2, z: 0, vx: 0, vz: -18, ttl: .4, range: 8 }]; state.weapon.ammo = 8;
    let ready; const loaded = new Promise(resolve => { ready = resolve; });
    const renderer = new GameRenderer(document.getElementById('arena'), () => { throw new Error('WebGL context lost'); }, ready);
    const root = ReactDOM.createRoot(document.getElementById('ui'));
    const f = { sim, renderer, layout, getLayout, PICKUPS, appearance, root, React, Hud, CustomizeSnake, THREE, tick: 0 };
    f.draw = () => { const before = JSON.stringify(state); renderer.render(state, false, ++f.tick); if (before !== JSON.stringify(state)) throw new Error('Renderer mutated simulation'); };
    // Resolve from React's actual commit. Frame counts and a separately bundled
    // flushSync do not reliably establish that the HUD DOM has been mounted.
    f.mount = element => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Fixture React commit exceeded5s')), 5000);
      root.render(React.createElement('div', { style: { display: 'contents' }, ref(node) { if (node) { clearTimeout(timeout); resolve(); } } }, element));
    });
    f.hud = async () => { await f.mount(React.createElement(Hud, { state, device: 'gamepad', onPause() {}, best: 900, practice: false })); await document.fonts.ready; };
    f.measure = (mode = 'wave') => {
      for (const selector of ['.hud-objective', '.hud-score', '.hud-resources', '.hud-tactics']) if (!document.querySelector(selector)) throw new Error(`Missing ${selector}; fixture DOM: ${document.getElementById('ui').innerHTML}`);
      const r = f.renderer, s = f.sim.state;
      const l = f.getLayout(s), points = [-1, 1].flatMap(x => [-1, 1].map(z => new f.THREE.Vector3(x * (l.halfWidth + .65), 0, z * (l.halfDepth + .65))));
      if (mode === 'boss') points.push(new f.THREE.Vector3(-4.65, 4.3, l.boss.anchor.z - .5), new f.THREE.Vector3(4.65, 4.3, l.boss.anchor.z - .5));
      const projected = points.map(p => { p.project(r.camera); return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 }; });
      const top = Math.max(...['.hud-objective', '.hud-score'].map(selector => document.querySelector(selector).getBoundingClientRect().bottom));
      const bottom = Math.min(...['.hud-resources', '.hud-tactics'].map(selector => document.querySelector(selector).getBoundingClientRect().top));
      const ordered = projected.slice(0, 4).sort((a, b) => Math.atan2(a.y - projected.slice(0, 4).reduce((sum, p) => sum + p.y, 0) / 4, a.x - projected.slice(0, 4).reduce((sum, p) => sum + p.x, 0) / 4) - Math.atan2(b.y - projected.slice(0, 4).reduce((sum, p) => sum + p.y, 0) / 4, b.x - projected.slice(0, 4).reduce((sum, p) => sum + p.x, 0) / 4));
      const inside = (p, polygon) => { let hit = false; for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) if ((polygon[i].y > p.y) !== (polygon[j].y > p.y) && p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x) hit = !hit; return hit; };
      const crossed = (a,b,c,d) => { const direction = (p,q,r) => (q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x); return direction(a,b,c)*direction(a,b,d)<0 && direction(c,d,a)*direction(c,d,b)<0; };
      const blocked = ['.hud-objective', '.hud-score', '.hud-resources', '.hud-tactics'].filter(selector => { const b = document.querySelector(selector).getBoundingClientRect(), rectangle = [{x:b.left,y:b.top},{x:b.right,y:b.top},{x:b.right,y:b.bottom},{x:b.left,y:b.bottom}]; return ordered.some(p => inside(p,rectangle)) || rectangle.some(p => inside(p,ordered)) || ordered.some((p,i) => rectangle.some((q,j) => crossed(p,ordered[(i+1)%4],q,rectangle[(j+1)%4]))); });
      return { blocked, bounds: { left: Math.min(...projected.map(p => p.x)), right: Math.max(...projected.map(p => p.x)), top: Math.min(...projected.map(p => p.y)), bottom: Math.max(...projected.map(p => p.y)) }, safe: { top, bottom }, distance: r.camera.position.length(), floor: [r.reflector.scale.x, r.reflector.scale.y] };
    };
    f.boss = () => { state.status = 'boss'; state.boss = { id: 'B1', nodes: 3, charge: 0, phase: 'safe', phaseTime: 3, relays: layout.boss.relayCandidates.map((p, i) => ({ id: `relay-${i + 1}`, ...p, number: i + 1 })), pad: { ...layout.boss.pad }, cycle: 0, relayRetry: 0, relayBlockedTime: 0, stage: 'collecting-relays', receptor: { ...layout.boss.receptor }, receptorHits: 0, relayFeedbackCooldown: 0 }; };
    window.__expansion = f; await loaded;
  });
  for (const [width, height] of [[1280, 720], [1440, 900], [1680, 720]]) for (const uiScale of [.8, 1.5]) for (const mode of ['wave', 'boss']) {
    await page.setViewportSize({ width, height });
    const measured = await page.evaluate(async ({ uiScale, mode }) => {
      const f = window.__expansion, r = f.renderer, s = f.sim.state;
      document.getElementById('app').style.setProperty('--ui-scale', String(uiScale));
      if (mode === 'boss') f.boss(); else { s.status = 'playing'; s.boss = null; }
      await f.hud(); r.resize(); r.setSettings({ quality: 'low', bloom: 0, reducedMotion: true, uiScale }); f.draw();
      return f.measure(mode);
    }, { uiScale, mode });
    assert.deepEqual(measured.floor, [36, 26]);
    assert.ok(measured.bounds.left >= 0 && measured.bounds.right <= width, `Floor fits width ${width}/${uiScale}/${mode}`);
    assert.deepEqual(measured.blocked, [], `Arena avoids actual HUD panels ${JSON.stringify({ width, height, uiScale, mode, measured })}`);
    assert.ok(measured.bounds.top >= 0 && measured.bounds.bottom <= height, 'Arena fits viewport height');
    camera.push({ width, height, uiScale, mode, ...measured });
    if (width === 1280 && uiScale === 1.5 || width === 1680 && uiScale === .8 && mode === 'boss') {
      const file = path.join(outputDir, `${mode}-${width}x${height}-ui${uiScale * 100}.png`); await page.screenshot({ path: file }); captures.push(file);
    }
  }
  checks.push('Real HUD and 36×26 floor/Warden fit at 16:9, 16:10 and 21:9, UI80/150');
  const glow = [];
  for (const [width, height] of [[1280, 720], [1440, 900], [1680, 720]]) for (const uiScale of [.8, 1.5]) {
    await page.setViewportSize({ width, height });
    const rows = await page.evaluate(async ({ width, height, uiScale }) => {
      const f = window.__expansion, r = f.renderer, rows = [];
      document.getElementById('app').style.setProperty('--ui-scale', String(uiScale));
      f.sim.state.status = 'playing'; f.sim.state.boss = null;
      await f.hud(); r.resize();
      for (const quality of ['low', 'medium']) for (const [index, preset] of f.appearance.GLOW_PRESETS.entries()) {
        r.setSettings({ quality, bloom: quality === 'low' ? 0 : .45, reducedMotion: true, uiScale }); r.setAppearance(preset.id); f.draw();
        rows.push({ width, height, uiScale, quality, glow: preset.id, selected: preset.color, body: `#${r.player.signature.emissive.getHexString()}`, head: `#${r.player.headSignature.emissive.getHexString()}`, hostile: `#${r.rivalModels.get('hunter').signature.emissive.getHexString()}` });
        if (width === 1280 && uiScale === 1.5) {
          // Copy the just-rendered player region immediately, before WebGL clears
          // its drawing buffer. These are native scene crops, not a second model.
          if (!f.glowSheet) { f.glowSheet = document.createElement('canvas'); f.glowSheet.width = 1280; f.glowSheet.height = 760; }
          const ctx = f.glowSheet.getContext('2d'), cell = (quality === 'low' ? 0 : 8) + index, x = cell % 4 * 320, y = Math.floor(cell / 4) * 190;
          const projected = [f.sim.state.player, ...f.sim.state.player.body].map(p => { const v = new f.THREE.Vector3(p.x, .7, p.z).project(r.camera); return { x: (v.x + 1) * width / 2, y: (1 - v.y) * height / 2 }; });
          const left = Math.max(0, Math.min(...projected.map(p => p.x)) - 28), top = Math.max(0, Math.min(...projected.map(p => p.y)) - 28), cropWidth = Math.min(width - left, Math.max(...projected.map(p => p.x)) - left + 28), cropHeight = Math.min(height - top, Math.max(...projected.map(p => p.y)) - top + 28);
          const scale = Math.min(1, 304 / cropWidth, 152 / cropHeight), source = r.renderer.domElement, ratio = source.width / width;
          ctx.fillStyle = '#06111d'; ctx.fillRect(x, y, 320, 190); ctx.fillStyle = '#d5edf8'; ctx.font = '15px sans-serif'; ctx.fillText(`${preset.name} · ${quality.toUpperCase()}`, x + 12, y + 23);
          ctx.drawImage(source, left * ratio, top * ratio, cropWidth * ratio, cropHeight * ratio, x + (320 - cropWidth * scale) / 2, y + 35 + (152 - cropHeight * scale) / 2, cropWidth * scale, cropHeight * scale);
          ctx.strokeStyle = '#23485b'; ctx.strokeRect(x + .5, y + .5, 319, 189);
        }
      }
      return rows;
    }, { width, height, uiScale });
    glow.push(...rows);
  }
  assert.equal(glow.length, 96); for (const row of glow) { assert.equal(row.body, row.selected); assert.equal(row.head, '#20dfff'); assert.equal(row.hostile, '#ff426f'); }
  const glowSheet = path.join(outputDir, 'glow-contact-sheet-1280-ui150.png');
  const glowSheetData = await page.evaluate(() => window.__expansion.glowSheet.toDataURL('image/png').split(',')[1]);
  await writeFile(glowSheet, Buffer.from(glowSheetData, 'base64')); captures.push(glowSheet);
  checks.push('96 glow rows: eight colors × three landscape ratios × UI80/150 × Low/Medium preserve fixed cyan head and hostile red faction; contact sheet is actual scene crops at1280 UI150');
  await page.setViewportSize({ width: 1280, height: 720 });
  const sixBuffs = await page.evaluate(async () => {
    const f = window.__expansion, r = f.renderer, s = f.sim.state;
    document.getElementById('app').style.setProperty('--ui-scale', '1.5');
    s.buffs = { overdrive: 7.2, shield: 11.2, surge: 14.2, magnet: 9.2, scrubber: 7.2, 'chain-buffer': 9.2 };
    s.status = 'playing'; s.boss = null; s.pickups = [];
    await f.hud(); r.resize(); r.setAppearance('cyan'); r.setSettings({ quality: 'medium', bloom: .45, reducedMotion: true, uiScale: 1.5 }); f.draw();
    const rect = element => { const b = element.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height }; };
    const panels = ['.hud-objective', '.hud-score', '.hud-resources', '.hud-tactics'].map(selector => ({ selector, ...rect(document.querySelector(selector)) }));
    const overlapping = panels.flatMap((a, i) => panels.slice(i + 1).filter(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top).map(b => [a.selector, b.selector]));
    const resources = document.querySelector('.hud-resources'), bounds = rect(resources);
    const bonuses = [...document.querySelectorAll('.active-buffs>div')].map(element => {
      const duration = element.querySelector('b'), name = element.querySelector('strong'), description = element.querySelector('small');
      return { name: name.textContent, duration: duration.textContent, fontSize: parseFloat(getComputedStyle(duration).fontSize), rect: rect(element), durationRect: rect(duration), description: description.textContent, clipped: element.scrollWidth > element.clientWidth + 1 || duration.scrollWidth > duration.clientWidth + 1, nameFont: parseFloat(getComputedStyle(name).fontSize) };
    });
    return { viewport: [innerWidth, innerHeight], uiScale: 1.5, panels, overlapping, resources: bounds, bonuses, camera: f.measure() };
  });
  const sixBuffFile = path.join(outputDir, 'six-buffs-1280x720-ui150.png'); await page.screenshot({ path: sixBuffFile }); captures.push(sixBuffFile);
  assert.equal(sixBuffs.bonuses.length, 6); assert.deepEqual(sixBuffs.overlapping, []); assert.deepEqual(sixBuffs.camera.blocked, []);
  for (const panel of sixBuffs.panels) assert.ok(panel.left >= 0 && panel.top >= 0 && panel.right <= 1280 && panel.bottom <= 720, `HUD panel fits: ${panel.selector}`);
  assert.deepEqual(sixBuffs.bonuses.map(value => value.duration), ['8s', '12s', '15s', '10s', '8s', '10s']);
  for (const bonus of sixBuffs.bonuses) { assert.ok(bonus.fontSize >= 16, `Readable duration for ${bonus.name}`); assert.equal(bonus.clipped, false); assert.ok(bonus.rect.top >= sixBuffs.resources.top && bonus.rect.bottom <= sixBuffs.resources.bottom && bonus.durationRect.right <= sixBuffs.resources.right, `Bonus fits resources: ${bonus.name}`); }
  checks.push('Six simultaneous timed buffs at1280×720 UI150: all names/effects/durations present, durations at least16px, no clipping, HUD overlap or covered travel lanes');
  await page.evaluate(() => { const s = window.__expansion.sim.state; for (const key of Object.keys(s.buffs)) s.buffs[key] = 0; });
  await page.setViewportSize({ width: 1280, height: 720 });
  const identities = await page.evaluate(async () => {
    const f = window.__expansion, r = f.renderer, s = f.sim.state;
    document.getElementById('app').style.setProperty('--ui-scale', '1'); s.status = 'playing'; s.boss = null;
    s.pickups = Object.keys(f.PICKUPS).map((kind, i) => ({ id: kind, kind, x: -13 + (i % 4) * 8.6, z: -9 + Math.floor(i / 4) * 8, ttl: 15 }));
    await f.hud(); r.setAppearance('cyan'); r.resize(); f.draw();
    return s.pickups.map(p => { const g = r.objects.get(`pickup:${p.id}`), shape = g.getObjectByName(`pickup-shape-${p.kind}`); return { kind: p.kind, name: g.name, shape: shape.children.map(mesh => [mesh.geometry.type, mesh.geometry.parameters, mesh.position.toArray(), mesh.scale.toArray(), mesh.rotation.toArray()]) }; });
  });
  assert.equal(identities.length, 12); assert.equal(new Set(identities.map(value => JSON.stringify(value.shape))).size, 12);
  const pickupFile = path.join(outputDir, 'twelve-pickups-1280.png'); await page.screenshot({ path: pickupFile }); captures.push(pickupFile); checks.push('Twelve canonical pickups have distinct geometric identities');
  const boss = await page.evaluate(async () => {
    const f = window.__expansion, r = f.renderer, s = f.sim.state; s.pickups = []; f.boss(); await f.hud(); f.draw();
    const rows = [];
    const measure = () => ({ stage: s.boss.stage, pad: r.objects.get('pad:pad')?.userData.state, next: [...r.objects].filter(([key, group]) => key.startsWith('relay:') && group.userData.next).map(([key]) => key), nodes: r.bossNodes.filter(node => node.visible).length, receptor: r.objects.get('receptor:warden-receptor')?.userData.exposed });
    rows.push(measure()); s.boss.charge = 1; s.boss.relays.shift(); f.draw(); rows.push(measure());
    s.boss.charge = 3; s.boss.relays = []; s.boss.stage = 'charge-ready'; f.draw(); rows.push(measure());
    s.boss.phase = 'recovery'; s.boss.stage = 'exposed'; f.draw(); rows.push(measure());
    s.events = [{ id: 301, kind: 'boss-node', text: 'Fixture', time: 89.8, origin: { ...s.boss.pad }, target: { ...f.layout.boss.anchor }, amount: 2 }, { id: 302, kind: 'scrubber', text: 'Fixture', time: 89.8, origin: { x: 0, z: 3 } }, { id: 303, kind: 'drone-destroyed', text: 'Fixture', time: 89.8, origin: { x: 12, z: -3 } }];
    s.boss.nodes = 2; s.drones = []; await f.hud(); f.draw();
    const wave = r.objects.get('scrubber-pulse:302').getObjectByName('wave'), frozen = [wave.scale.x, wave.material.opacity]; f.draw();
    const effects = { beam: !!r.objects.get('warden-energy:301'), radius: r.objects.get('scrubber-pulse:302').getObjectByName('boundary').geometry.parameters.radius, freeze: JSON.stringify(frozen) === JSON.stringify([wave.scale.x, wave.material.opacity]), destroyedDroneRemoved: !r.objects.has('drone:drone'), playerBolt: !!r.objects.get('player-projectile:friendly-bolt') };
    return { rows, effects };
  });
  assert.deepEqual(boss.rows.map(row => row.pad), ['inactive', 'inactive', 'waiting', 'ready']);
  assert.deepEqual(boss.rows.slice(0, 2).map(row => row.next), [['relay:relay-1'], ['relay:relay-2']]);
  assert.equal(boss.rows[0].nodes, 3); assert.equal(boss.rows[3].receptor, true);
  assert.deepEqual(boss.effects, { beam: true, radius: 3, freeze: true, destroyedDroneRemoved: true, playerBolt: true });
  const bossFile = path.join(outputDir, 'warden-energy-1280.png'); await page.screenshot({ path: bossFile }); captures.push(bossFile);
  const extraction = await page.evaluate(() => { const f = window.__expansion; f.sim.state.status = 'extraction'; f.sim.state.boss.nodes = 0; f.draw(); return { sentinel: f.renderer.sentinel.visible, pad: f.renderer.objects.has('pad:pad'), receptor: f.renderer.objects.has('receptor:warden-receptor'), relay: [...f.renderer.objects.keys()].some(key => key.startsWith('relay:')), exit: f.renderer.objects.has('exit:exit') }; });
  assert.deepEqual(extraction, { sentinel: false, pad: false, receptor: false, relay: false, exit: true });
  checks.push('Ordered relays, truthful pad, receptor exposure, node beam, exact3u Scrubber, paused effects, projectile ownership and extraction cleanup');
  const preview = await page.evaluate(async () => {
    const f = window.__expansion, r = f.renderer; const canvas = r.renderer.domElement, before = JSON.stringify(f.sim.state);
    await f.mount(f.React.createElement(f.CustomizeSnake, { initial: 'gold', onPreview(glow, rotation, zoom) { r.setAppearance(glow); r.setPreview({ rotation, zoom }); }, onApply() {}, onClose() {} }));
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); f.draw();
    return { sameCanvas: canvas === r.renderer.domElement, count: document.querySelectorAll('canvas').length, previewVisible: r.titleSnake.group.visible, gameplayHidden: !r.player.group.visible, unchanged: before === JSON.stringify(f.sim.state), swatches: document.querySelectorAll('.glow-swatch').length };
  });
  assert.deepEqual(preview, { sameCanvas: true, count: 1, previewVisible: true, gameplayHidden: true, unchanged: true, swatches: 8 });
  const previewFile = path.join(outputDir, 'customize-gold-1280.png'); await page.screenshot({ path: previewFile }); captures.push(previewFile);
  await page.getByRole('button', { name: 'Rotate snake right' }).click();
  await page.getByRole('combobox', { name: 'Preview zoom' }).click(); await page.getByRole('option', { name: 'Head detail' }).click();
  await page.evaluate(() => window.__expansion.draw());
  const detailFile = path.join(outputDir, 'customize-head-1280.png'); await page.screenshot({ path: detailFile }); captures.push(detailFile);
  const restored = await page.evaluate(async () => { const f = window.__expansion, r = f.renderer; r.setPreview(null); r.setAppearance('cyan'); await f.hud(); f.draw(); return { previewHidden: !r.titleSnake.group.visible, playerVisible: r.player.group.visible, body: r.player.signature.emissive.getHexString(), head: r.player.headSignature.emissive.getHexString() }; });
  assert.deepEqual(restored, { previewHidden: true, playerVisible: true, body: '20dfff', head: '20dfff' });
  const legacy = await page.evaluate(() => { const f = window.__expansion; f.sim.state.layoutId = 'neon-spire-v1'; f.sim.state.contentVersion = '0.1.0-neon-spire'; f.sim.state.obstacles = f.getLayout('neon-spire-v1').obstacles; f.draw(); return { floor: [f.renderer.reflector.scale.x, f.renderer.reflector.scale.y], gate: f.renderer.gateDoor.position.z, obstacles: f.renderer.lastObstacleKey }; });
  assert.deepEqual(legacy.floor, [32, 24]); assert.equal(legacy.gate, -12);
  checks.push('Actual 3D customizer reuses canvas; rotate/zoom work; restoration and legacy32×24 floor/exit checked');
  await page.evaluate(() => { window.__expansion.root.unmount(); window.__expansion.renderer.dispose(); }); assert.equal(await page.locator('canvas').count(), 0); assert.deepEqual(errors, []);
  const report = { date: new Date().toISOString(), browser: browser.version(), checks, camera, glow, sixBuffs, identities: identities.map(value => ({ kind: value.kind, name: value.name })), boss, preview, restored, legacy, captures, errors, limitation: 'Frozen, explicitly arranged fixture using actual HUD, customization and renderer. State checks are not campaign completion, collision/balance validation, physical Xbox acceptance, owner visual approval, listening review or a full-machine performance benchmark.' };
  await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const diagnostics = { message: String(error), errors, html: await page.locator('body').innerHTML().catch(() => '<unavailable>') };
  await writeFile(path.join(outputDir, 'failure.json'), JSON.stringify(diagnostics, null, 2));
  console.error(JSON.stringify(diagnostics, null, 2)); throw error;
} finally { clearTimeout(watchdog); await browser.close(); }

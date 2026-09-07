import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Offline art export from the actual GameRenderer geometry, materials and glyphs.
// One installed-Chrome WebGL context is reused for all transparent render targets;
// the Lab displays the resulting PNGs without opening another WebGL context.
// Browser plugin not available: use the project's isolated Playwright workflow.
const baseUrl = process.argv[2] || 'http://127.0.0.1:3039';
const outputDir = path.resolve(process.argv[3] || 'public/images/powerups');
const evidenceDir = path.resolve(process.argv[4] || '/tmp/snake-powerup-previews');
await mkdir(outputDir, { recursive: true });
await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 900 }, permissions: ['local-network-access'] });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const timeout = setTimeout(() => { void browser.close(); }, 60000);

try {
  await page.route('**/powerup-preview-export', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><title>Snake Powerup Preview Export</title><style>html,body{margin:0;background:#071523;color:#dff7ff;font-family:sans-serif}#arena{position:absolute;width:960px;height:720px;left:-2000px}#sheet{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px}.card{text-align:center;border:1px solid #24465a;background:linear-gradient(145deg,#0c2333,#081725);padding:8px}.card img{display:block;width:190px;height:190px;margin:auto}.card strong{font-size:15px}</style></head><body><div id="arena"></div><main id="sheet"></main></body></html>' }));
  await page.goto(new URL('/powerup-preview-export', baseUrl).href);
  assert.equal(await page.title(), 'Snake Powerup Preview Export');
  const exported = await page.evaluate(async () => {
    const [{ GameRenderer }, { Simulation }, { PICKUPS }, THREE] = await Promise.all([
      import('/src/game/renderer.ts'), import('/src/game/simulation.ts'), import('/src/game/content.ts'), import('/node_modules/.vite/deps/three.js'),
    ]);
    let ready;
    const loaded = new Promise(resolve => { ready = resolve; });
    const game = new GameRenderer(document.getElementById('arena'), () => { throw new Error('Export WebGL context lost'); }, ready);
    await loaded;
    game.setSettings({ quality: 'low', bloom: 0, reducedMotion: true, uiScale: 1 });
    const sim = Simulation.createLab('warden');
    sim.state.boss.charge = 3; sim.state.boss.phase = 'recovery'; sim.state.boss.stage = 'exposed';
    const frozen = JSON.stringify(sim.state);
    game.render(sim.state, false, 0);
    if (JSON.stringify(sim.state) !== frozen) throw new Error('Rendering changed the prepared state');

    const scene = new THREE.Scene();
    scene.environment = game.scene.environment;
    scene.environmentIntensity = game.scene.environmentIntensity;
    for (const child of game.scene.children) if (child.isLight) scene.add(child.clone());
    // A front three-quarter view shows the real floating shape, floor ring and glyph.
    const camera = new THREE.OrthographicCamera(-1.05, 1.05, 1.05, -1.05, 0.1, 30);
    camera.position.set(2.2, 3.0, 7.0); camera.lookAt(0, 0.72, 0); camera.updateMatrixWorld();
    const target = new THREE.WebGLRenderTarget(640, 640, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, samples: 4 });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const renderer = game.renderer;
    const oldColor = renderer.getClearColor(new THREE.Color()), oldAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    const results = [];
    const take = (id, name, group, isPad = false) => {
      group.position.set(0, 0, 0); group.rotation.set(0, 0, 0); scene.add(group);
      camera.left = camera.bottom = isPad ? -1.25 : -1.05;
      camera.right = camera.top = isPad ? 1.25 : 1.05;
      camera.position.set(isPad ? 0 : 2.2, isPad ? 5.0 : 3.0, 7.0);
      camera.lookAt(0, isPad ? 0.35 : 0.72, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera);
      const pixels = new Uint8Array(640 * 640 * 4);
      renderer.readRenderTargetPixels(target, 0, 0, 640, 640, pixels);
      const source = document.createElement('canvas'); source.width = source.height = 640;
      const context = source.getContext('2d'), frame = context.createImageData(640, 640);
      for (let y = 0; y < 640; y++) frame.data.set(pixels.subarray((639 - y) * 640 * 4, (640 - y) * 640 * 4), y * 640 * 4);
      context.putImageData(frame, 0, 0);
      const output = document.createElement('canvas'); output.width = output.height = 320;
      const outContext = output.getContext('2d'); outContext.drawImage(source, 0, 0, 320, 320);
      const rgba = outContext.getImageData(0, 0, 320, 320).data;
      let transparent = 0, opaque = 0;
      const bounds = { left: 320, top: 320, right: -1, bottom: -1 };
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i + 3] === 0) transparent++;
        if (rgba[i + 3] > 0) {
          opaque++; const x = i / 4 % 320, y = Math.floor(i / 4 / 320);
          bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
          bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
        }
      }
      results.push({ id, name, width: 320, height: 320, transparent, opaque, bounds, data: output.toDataURL('image/png') });
      scene.remove(group);
      if (!isPad) game.disposeObject(group);
    };
    for (const [kind, definition] of Object.entries(PICKUPS)) take(kind, definition.name, game.pickup(kind));
    const pad = game.objects.get('pad:pad');
    if (!pad || pad.userData.state !== 'ready') throw new Error('Canonical green pad is not ready');
    // Restore the renderer's original sprite size after its gameplay camera fit.
    pad.getObjectByName('ready').scale.setScalar(0.7);
    take('warden-pad', 'Warden · green floor pad', pad, true);
    game.dynamic.add(pad);
    renderer.setRenderTarget(null); renderer.setClearColor(oldColor, oldAlpha); target.dispose(); game.dispose();
    const sheet = document.getElementById('sheet');
    for (const result of results) {
      const card = document.createElement('article'); card.className = 'card';
      const img = document.createElement('img'); img.src = result.data; img.alt = result.name;
      const heading = document.createElement('strong'); heading.textContent = result.name;
      card.append(img, heading); sheet.append(card);
    }
    await Promise.all([...document.images].map(img => img.decode()));
    return results;
  });
  assert.equal(exported.length, 13);
  const report = [];
  for (const result of exported) {
    assert.ok(result.transparent > 320 * 320 / 2, `${result.id}: transparent background`);
    assert.ok(result.opaque > 1000, `${result.id}: visible model`);
    assert.ok(result.bounds.left > 5 && result.bounds.top > 5 && result.bounds.right < 315 && result.bounds.bottom < 315, `${result.id}: no clipped edges`);
    const file = path.join(outputDir, `${result.id}.png`), png = Buffer.from(result.data.split(',')[1], 'base64');
    await writeFile(file, png);
    const { data, ...metadata } = result;
    report.push({ ...metadata, file, bytes: png.length });
  }
  assert.deepEqual(errors, []);
  await page.screenshot({ path: path.join(evidenceDir, 'contact-sheet.png'), fullPage: true });
  await writeFile(path.join(evidenceDir, 'report.json'), JSON.stringify({ browser: browser.version(), assets: report, errors, limitation: 'Static isolated views of canonical models, materials and symbols. No bloom or gameplay background; not a new game renderer or physical input test.' }, null, 2));
  console.log(JSON.stringify({ outputDir, evidenceDir, assets: report.length, bytes: report.reduce((sum, value) => sum + value.bytes, 0), errors }, null, 2));
} finally { clearTimeout(timeout); await browser.close(); }

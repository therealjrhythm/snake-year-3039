import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Simulation } from './simulation';

type WorldState = Simulation['state'];
type Point = { x: number; z: number };
export type GraphicsSettings = { quality: 'low' | 'medium' | 'high'; bloom: number; reducedMotion: boolean; uiScale?: number };
const CYAN = 0x20dfff, PINK = 0xea39f5, RED = 0xff426f;
const dummy = new THREE.Object3D();
const cube = new THREE.BoxGeometry(1, 1, 1);
const sphere = new THREE.IcosahedronGeometry(1, 1);

function metal(color = 0x182b3d, roughness = 0.27) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness });
}
function light(color: number, power = 2) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: power, metalness: 0.35, roughness: 0.3 });
}
function box(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const mesh = new THREE.Mesh(cube, material);
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
}
function ring(parent: THREE.Object3D, material: THREE.Material, radius: number, tube: number, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 5, 28), material);
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}

class SerpentModel {
  group = new THREE.Group();
  head = new THREE.Group();
  armor: THREE.InstancedMesh;
  seams: THREE.InstancedMesh;
  plates: THREE.InstancedMesh;
  highlights: THREE.InstancedMesh;
  flanks: THREE.InstancedMesh;
  ports: THREE.InstancedMesh;
  signature: THREE.MeshStandardMaterial;
  constructor(color: number, capacity = 128) {
    const shell = metal(0x102030, 0.29), dark = metal(0x070d16, 0.39), edge = metal(0x34495c, 0.23);
    this.signature = light(color, 1.1);
    const shellGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.44, 8); shellGeo.rotateZ(Math.PI / 2);
    const seamGeo = new THREE.CylinderGeometry(0.276, 0.276, 0.50, 8); seamGeo.rotateZ(Math.PI / 2);
    this.armor = new THREE.InstancedMesh(shellGeo, shell, capacity);
    this.seams = new THREE.InstancedMesh(seamGeo, this.signature, capacity);
    this.plates = new THREE.InstancedMesh(cube, edge, capacity);
    this.highlights = new THREE.InstancedMesh(cube, this.signature, capacity);
    this.flanks = new THREE.InstancedMesh(cube, shell, capacity * 2);
    this.ports = new THREE.InstancedMesh(cube, light(color === RED ? RED : PINK, 0.7), capacity * 2);
    for (const mesh of [this.armor, this.seams, this.plates, this.highlights, this.flanks, this.ports]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; this.group.add(mesh);
    }
    this.group.add(this.head);
    const cranium = new THREE.Mesh(new THREE.DodecahedronGeometry(0.43, 0), shell);
    cranium.scale.set(1.38, 0.73, 0.95); this.head.add(cranium);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.30, 0.44, 4), edge);
    snout.rotation.z = -Math.PI / 2; snout.position.x = 0.4; snout.scale.z = 0.95; this.head.add(snout);
    box(this.head, dark, 0.25, -0.17, 0, 0.73, 0.13, 0.48);
    box(this.head, this.signature, 0.40, -0.095, 0, 0.45, 0.038, 0.4);
    for (const sign of [-1, 1]) {
      const eye = box(this.head, this.signature, 0.22, 0.11, sign * 0.263, 0.3, 0.08, 0.045); eye.rotation.y = sign * 0.33;
      const brow = box(this.head, edge, 0.13, 0.18, sign * 0.27, 0.39, 0.075, 0.10); brow.rotation.y = sign * 0.35;
      const guard = box(this.head, dark, -0.22, 0.02, sign * 0.30, 0.25, 0.35, 0.09); guard.rotation.x = sign * 0.2;
    }
    box(this.head, edge, -0.13, 0.28, 0, 0.43, 0.08, 0.17);
    box(this.head, this.signature, -0.12, 0.33, 0, 0.28, 0.02, 0.06);
    for (const sign of [-1, 1]) {
      const cheek = box(this.head, shell, 0, -0.015, sign * 0.285, 0.42, 0.21, 0.15); cheek.rotation.x = sign * 0.32; cheek.rotation.y = sign * -0.2;
      const seam = box(this.head, this.signature, 0.13, 0.03, sign * 0.364, 0.26, 0.028, 0.028); seam.rotation.y = sign * 0.15;
    }
  }
  update(head: Point, heading: number, body: Point[], opacity = 1) {
    this.group.visible = opacity > 0;
    this.head.position.set(head.x, 0.37, head.z); this.head.rotation.y = -heading;
    const count = Math.min(body.length, this.armor.instanceMatrix.count);
    for (const mesh of [this.armor, this.seams, this.plates, this.highlights]) mesh.count = count;
    this.flanks.count = count * 2; this.ports.count = count * 2;
    for (let i = 0; i < count; i++) {
      const p = body[i], previous = i === 0 ? head : body[i - 1];
      const angle = Math.atan2(previous.z - p.z, previous.x - p.x);
      const taper = i > count - 4 ? 0.55 + (count - i) * 0.11 : 1;
      dummy.position.set(p.x, 0.33, p.z); dummy.rotation.set(0, -angle, 0); dummy.scale.set(1, taper, taper); dummy.updateMatrix();
      this.armor.setMatrixAt(i, dummy.matrix); this.seams.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0.33 + 0.27 * taper; dummy.scale.set(0.30, 0.06, 0.20 * taper); dummy.updateMatrix(); this.plates.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.036; dummy.scale.set(0.09, 0.018, 0.075); dummy.updateMatrix(); this.highlights.setMatrixAt(i, dummy.matrix);
      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? -1 : 1;
        dummy.position.set(p.x - Math.sin(angle) * sign * 0.23 * taper, 0.40, p.z + Math.cos(angle) * sign * 0.23 * taper);
        dummy.rotation.set(0, -angle, 0); dummy.scale.set(0.29, 0.25 * taper, 0.17 * taper); dummy.updateMatrix(); this.flanks.setMatrixAt(i * 2 + side, dummy.matrix);
        dummy.position.y = 0.49; dummy.scale.set(0.13, 0.025, 0.19 * taper); dummy.updateMatrix(); this.ports.setMatrixAt(i * 2 + side, dummy.matrix);
      }
    }
    for (const mesh of [this.armor, this.seams, this.plates, this.highlights, this.flanks, this.ports]) mesh.instanceMatrix.needsUpdate = true;
  }
}

export class GameRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(43, 1, 0.1, 250);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private player = new SerpentModel(CYAN);
  private titleSnake = new SerpentModel(CYAN, 70);
  private rivalModels = new Map<string, SerpentModel>();
  private objects = new Map<string, THREE.Group>();
  private obstacles = new THREE.Group();
  private dynamic = new THREE.Group();
  private sentinel = new THREE.Group();
  private bossNodes: THREE.Mesh[] = [];
  private gateDoor: THREE.Mesh;
  private staticCyan = light(CYAN, 0.8);
  private staticPink = light(PINK, 0.8);
  private hostile = light(RED, 1.0);
  private dark = metal();
  private silver = metal(0x607887);
  private lastObstacleKey = '';
  private width = 0;
  private height = 0;
  private titleMode = true;
  private settings: GraphicsSettings = { quality: 'medium', bloom: 0.45, reducedMotion: false };
  private sky: THREE.Texture | null = null;
  private environment: THREE.WebGLRenderTarget;
  private reflector: Reflector;
  private particles: THREE.Points;
  private disposed = false;

  constructor(private container: HTMLElement, onContextLoss: () => void, onReady: () => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x06111d);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.88;
    this.renderer.domElement.setAttribute('aria-label', 'Live 3D Neon Spire arena');
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); onContextLoss(); });
    container.appendChild(this.renderer.domElement);
    this.scene.fog = new THREE.FogExp2(0x071325, 0.012);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04); this.scene.environment = this.environment.texture; this.scene.environmentIntensity = 0.35; room.dispose(); pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0x91bbff, 0x07101e, 0.85));
    const key = new THREE.DirectionalLight(0xbbeaff, 1.8); key.position.set(-6, 12, 5); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xee57ff, 1.5); rim.position.set(9, 6, -6); this.scene.add(rim);
    const glow = new THREE.PointLight(CYAN, 35, 20, 2); glow.position.set(4, 4, 6); this.scene.add(glow);
    const pinkGlow = new THREE.PointLight(PINK, 45, 20, 2); pinkGlow.position.set(-7, 4, -5); this.scene.add(pinkGlow);

    this.reflector = new Reflector(new THREE.PlaneGeometry(32, 24), { clipBias: 0.003, textureWidth: 1024, textureHeight: 768, color: 0x173045 });
    this.reflector.rotation.x = -Math.PI / 2; this.reflector.position.y = -0.015; this.scene.add(this.reflector);
    // Seeded fine surface breakup: reflections remain live, with a wet metal layer above them.
    const surface = document.createElement('canvas'); surface.width = surface.height = 512;
    const ctx = surface.getContext('2d')!; const pixels = ctx.createImageData(512, 512);
    let noiseSeed = 3039;
    for (let i = 0; i < pixels.data.length; i += 4) { noiseSeed = (noiseSeed * 1664525 + 1013904223) >>> 0; const n = (noiseSeed / 4294967296) * 75 + 55; pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = n; pixels.data[i + 3] = 255; }
    ctx.putImageData(pixels, 0, 0); ctx.strokeStyle = '#aab1b7'; ctx.lineWidth = 0.5;
    for (let i = 0; i < 200; i++) { const x = (i * 133.7) % 512, y = (i * 281.3) % 512; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 + i % 16, y + 0.4); ctx.stroke(); }
    const surfaceTexture = new THREE.CanvasTexture(surface); surfaceTexture.wrapS = surfaceTexture.wrapT = THREE.RepeatWrapping; surfaceTexture.repeat.set(6, 5);
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(32, 24), new THREE.MeshStandardMaterial({ color: 0x102331, roughness: 0.45, metalness: 0.65, transparent: true, opacity: 0.43, bumpMap: surfaceTexture, bumpScale: 0.035, roughnessMap: surfaceTexture, depthWrite: false }));
    wet.rotation.x = -Math.PI / 2; wet.position.y = -0.009; this.scene.add(wet);
    box(this.scene, metal(0x040a12, 0.4), 0, -0.35, 0, 33.3, 0.6, 25.3);
    this.buildGrid(); this.buildCity();
    this.gateDoor = box(this.scene, this.staticPink, 0, 0.30, -12, 3.5, 0.55, 0.13);
    this.buildBoundary(); this.buildBoss();
    this.scene.add(this.player.group, this.titleSnake.group, this.dynamic, this.obstacles);
    const dust = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i++) { dust[i * 3] = Math.sin(i * 734.3) * 27; dust[i * 3 + 1] = 1 + (i % 30) * 0.3; dust[i * 3 + 2] = Math.cos(i * 143.8) * 24; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    this.particles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x63b7ce, size: 0.035, transparent: true, opacity: 0.36, depthWrite: false })); this.scene.add(this.particles);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(800, 600), 0.35, 0.25, 1.1); this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.resize();
    new THREE.TextureLoader().load('/assets/neon-spire-skyline.png', (texture) => {
      if (this.disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      this.sky = texture; this.scene.background = texture; this.fitBackground(); onReady();
    }, undefined, () => onReady());
  }

  private buildGrid() {
    const fine: number[] = [], strong: number[] = [];
    for (let x = -16; x <= 16; x++) (x % 4 === 0 ? strong : fine).push(x, 0.004, -12, x, 0.004, 12);
    for (let z = -12; z <= 12; z++) (z % 4 === 0 ? strong : fine).push(-16, 0.004, z, 16, 0.004, z);
    for (const [vertices, color, opacity] of [[fine, 0x226c90, 0.42], [strong, 0x299cca, 0.65]] as const) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      this.scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
    }
    // Inlaid routing strips and recessed metallic seams give the floor scale.
    for (const x of [-15.3, 15.3]) for (let z = -11; z < 12; z += 2) {
      box(this.scene, this.staticCyan, x, 0.012, z, 0.07, 0.018, 1.3);
      box(this.scene, this.silver, x + (x < 0 ? 0.15 : -0.15), 0.008, z, 0.03, 0.01, 0.7);
    }
    for (const z of [-11.3, 11.3]) for (let x = -14; x < 16; x += 3) box(this.scene, this.staticPink, x, 0.012, z, 1.1, 0.018, 0.05);
  }

  private buildBoundary() {
    for (const x of [-16.3, 16.3]) {
      box(this.scene, this.dark, x, 0.23, 0, 0.55, 0.5, 24.6);
      box(this.scene, this.staticCyan, x, 0.5, 0, 0.06, 0.025, 24.6);
    }
    box(this.scene, this.dark, 0, 0.18, 12.3, 33, 0.4, 0.55);
    box(this.scene, this.staticCyan, 0, 0.4, 12.3, 33, 0.025, 0.04);
    for (const x of [-9.25, 9.25]) {
      box(this.scene, this.dark, x, 0.23, -12.3, 14.5, 0.5, 0.55);
      box(this.scene, this.staticPink, x, 0.51, -12.3, 14.5, 0.025, 0.05);
    }
    for (const x of [-2.1, 2.1]) { box(this.scene, this.dark, x, 0.85, -12.4, 0.5, 1.7, 0.65); box(this.scene, this.staticPink, x, 1, -12.02, 0.15, 1.4, 0.05); }
    box(this.scene, this.dark, 0, 1.85, -12.4, 4.7, 0.36, 0.7);
    box(this.scene, this.staticPink, 0, 1.67, -12.03, 4.1, 0.05, 0.05);
    for (let x = -15; x < 16; x += 3) for (const z of [-12.5, 12.5]) {
      if (z < 0 && Math.abs(x) < 3) continue;
      box(this.scene, this.dark, x, 0.45, z, 0.5, 0.85, 0.65);
      box(this.scene, this.staticCyan, x, 0.77, z + (z < 0 ? 0.35 : -0.35), 0.3, 0.08, 0.025);
    }
  }

  private buildCity() {
    const buildings = new THREE.InstancedMesh(cube, metal(0x0b1727, 0.6), 200);
    const windows = new THREE.InstancedMesh(cube, light(0x2b85b8, 0.35), 3200);
    const accents = new THREE.InstancedMesh(cube, this.staticPink, 220);
    let w = 0, a = 0;
    for (let i = 0; i < 100; i++) {
      const rand = (n: number) => { const r = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return r - Math.floor(r); };
      const side = i % 3;
      const x = side === 0 ? -28 - rand(2) * 22 : side === 1 ? 28 + rand(2) * 22 : (rand(1) - 0.5) * 85;
      const z = side === 2 ? -30 - rand(2) * 35 : -24 + rand(3) * 20;
      const h = 6 + rand(4) * (side === 2 ? 29 : 17), width = 1.2 + rand(5) * 2.7;
      dummy.position.set(x, h / 2 - 12, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(width, h, width); dummy.updateMatrix(); buildings.setMatrixAt(i * 2, dummy.matrix);
      dummy.position.set(x - width * 0.15, h - 12 + h * 0.09, z); dummy.scale.set(width * 0.62, h * 0.18, width * 0.65); dummy.updateMatrix(); buildings.setMatrixAt(i * 2 + 1, dummy.matrix);
      for (let j = 0; j < 30; j++) {
        dummy.position.set(x - width * 0.31 + (j % 3) * width * 0.30, h * 0.085 * (Math.floor(j / 3) + 1) - 12, z + width * 0.502);
        dummy.scale.set(width * 0.07, 0.12 + rand(j + 6) * 0.2, 0.03); dummy.updateMatrix(); windows.setMatrixAt(w++, dummy.matrix);
      }
      dummy.position.set(x + width * 0.35, h * 0.5 - 12, z + width * 0.51); dummy.scale.set(0.025, h * 0.5, 0.035); dummy.updateMatrix(); accents.setMatrixAt(a++, dummy.matrix);
      if (i % 3 === 0) { dummy.position.set(x, h - 10, z); dummy.scale.set(0.05, 4, 0.05); dummy.updateMatrix(); accents.setMatrixAt(a++, dummy.matrix); }
    }
    windows.count = w; accents.count = a; this.scene.add(buildings, windows, accents);
    // Two gantries are scenery outside the collidable floor, never surprise obstacles.
    for (const x of [-21, 21]) {
      box(this.scene, this.dark, x, 0.3, -9, 4.7, 1.2, 7);
      box(this.scene, this.staticPink, x, 1.0, -9, 3.8, 0.08, 6);
    }
  }

  private buildBoss() {
    this.sentinel.position.set(0, 1.7, -14.3);
    const frame = ring(this.sentinel, this.dark, 2.15, 0.32); frame.scale.y = 0.7;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), this.hostile); this.sentinel.add(core);
    ring(this.sentinel, this.staticPink, 1.4, 0.045);
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3 + Math.PI / 2;
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), this.hostile); node.position.set(Math.cos(angle) * 2.1, Math.sin(angle) * 1.5, 0.35); this.sentinel.add(node); this.bossNodes.push(node);
    }
    for (const sign of [-1, 1]) { box(this.sentinel, this.dark, sign * 3, -0.5, 0, 2.0, 0.5, 1); box(this.sentinel, this.hostile, sign * 3, -0.21, 0, 1.8, 0.03, 0.4); }
    this.scene.add(this.sentinel);
  }

  setSettings(settings: GraphicsSettings) {
    const qualityChanged = settings.quality !== this.settings.quality;
    this.settings = settings; this.bloom.strength = settings.bloom; this.fitCamera();
    if (qualityChanged) { this.renderer.setPixelRatio(Math.min(devicePixelRatio, settings.quality === 'low' ? 1 : settings.quality === 'high' ? 2 : 1.5)); this.resize(); }
    this.particles.visible = settings.quality !== 'low' && !settings.reducedMotion;
  }
  private fitBackground() {
    if (!this.sky) return;
    const aspect = this.width / this.height, imageAspect = 1672 / 941;
    this.sky.repeat.set(aspect < imageAspect ? aspect / imageAspect : 1, aspect > imageAspect ? imageAspect / aspect : 1);
    this.sky.offset.set((1 - this.sky.repeat.x) / 2, (1 - this.sky.repeat.y) / 2);
  }
  resize() {
    this.width = this.container.clientWidth; this.height = this.container.clientHeight;
    this.renderer.setSize(this.width, this.height); this.composer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height; this.fitCamera(); this.fitBackground();
  }
  private fitCamera() {
    if (this.titleMode) {
      this.camera.fov = 43; this.camera.position.set(15.8, 9.4, 19.5); this.camera.lookAt(0, 0.3, -1.2);
    } else {
      this.camera.fov = 42;
      const aspect = Math.max(0.6, this.width / this.height);
      const distance = Math.max(46.5 + Math.max(0, (this.settings.uiScale ?? 1) - 1) * 18, 29 / aspect * 2.05);
      this.camera.position.set(0, distance * 0.866, distance * 0.5 + 2.3); this.camera.lookAt(0, 0, 2.3);
    }
    this.camera.updateProjectionMatrix();
  }
  private syncObjects(kind: string, entities: { id: string; x: number; z: number }[], make: (entity: any) => THREE.Group, update?: (group: THREE.Group, entity: any) => void) {
    const ids = new Set(entities.map(e => `${kind}:${e.id}`));
    for (const [key, group] of this.objects) if (key.startsWith(`${kind}:`) && !ids.has(key)) { this.dynamic.remove(group); this.disposeObject(group); this.objects.delete(key); }
    for (const entity of entities) {
      const key = `${kind}:${entity.id}`;
      let group = this.objects.get(key);
      if (!group) { group = make(entity); this.objects.set(key, group); this.dynamic.add(group); }
      group.position.x = entity.x; group.position.z = entity.z; update?.(group, entity);
    }
  }
  private energy(color: number, relay = '') {
    const g = new THREE.Group(), mat = light(color, 1.2);
    const inner = new THREE.Mesh(new THREE.OctahedronGeometry(0.20), mat); inner.position.y = 0.45; g.add(inner);
    const hoop = ring(g, mat, 0.32, 0.02, 0, 0.45); hoop.rotation.x = Math.PI / 2.7;
    const outer = ring(g, mat, 0.31, 0.018, 0, 0.45); outer.rotation.y = Math.PI / 2;
    const base = ring(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }), 0.32, 0.026, 0, 0.02); base.rotation.x = -Math.PI / 2;
    if (relay) { const label = this.label(relay, '#caffff'); label.position.y = 1.05; label.scale.set(0.65, 0.65, 1); g.add(label); }
    return g;
  }
  private label(text: string, color: string) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#081726'; ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.strokeRect(4, 4, 120, 120);
    ctx.font = 'bold 66px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, 64, 69);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  }
  private pickup(kind: string) {
    const options: Record<string, [number, string]> = { overdrive: [0x32eda0, '»'], shield: [0x29aaff, '◇'], surge: [PINK, '2×'], emp: [CYAN, '◎'], magnet: [0x8957ff, '∩'], repair: [0xffd799, '+'], decoy: [0x8957ff, '⋈'], splice: [0xffb348, '−4'] };
    const [color, symbol] = options[kind] ?? [CYAN, '?'];
    const g = new THREE.Group(), mat = light(color, 1.7);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.57, 0.57), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.16, metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.55 })); body.position.y = 0.48; g.add(body);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color })); edge.position.y = 0.48; g.add(edge);
    const label = this.label(symbol, `#${color.toString(16).padStart(6, '0')}`); label.position.y = 0.48; label.scale.set(0.42, 0.42, 1); g.add(label);
    const base = ring(g, mat, 0.38, 0.018, 0, 0.03); base.rotation.x = -Math.PI / 2;
    return g;
  }
  private mine() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.30, 1), this.dark); body.position.y = 0.35; g.add(body);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), this.silver); spike.position.set(Math.cos(a) * 0.34, 0.35, Math.sin(a) * 0.34); spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a), 0, Math.sin(a))); g.add(spike);
    }
    const core = new THREE.Mesh(sphere, this.hostile); core.scale.setScalar(0.13); core.position.y = 0.64; g.add(core);
    const warning = ring(g, this.hostile, 0.48, 0.018, 0, 0.015); warning.rotation.x = -Math.PI / 2;
    return g;
  }
  private drone() {
    const g = new THREE.Group();
    box(g, this.dark, 0, 0.73, 0, 0.76, 0.26, 0.53);
    const eye = new THREE.Mesh(sphere, this.hostile); eye.position.set(0, 0.74, 0.29); eye.scale.set(0.18, 0.09, 0.07); g.add(eye);
    for (const x of [-0.48, 0.48]) { box(g, this.silver, x, 0.69, 0, 0.35, 0.11, 0.24); const rotor = ring(g, this.staticPink, 0.19, 0.022, x, 0.78); rotor.rotation.x = -Math.PI / 2; }
    return g;
  }
  private emitter(length: number, axis: 'x' | 'z', boss: boolean) {
    const g = new THREE.Group(); g.userData.axis = axis;
    if (boss) for (const sign of [-1, 1]) { const mark = ring(g, this.hostile, 0.23, 0.025, sign * length / 2, 0.025); mark.rotation.x = -Math.PI / 2; }
    const beam = box(g, this.hostile, 0, 0.35, 0, length, 0.055, 0.055); beam.name = 'beam';
    const floor = box(g, new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.16 }), 0, 0.018, 0, length, 0.01, 0.4); floor.name = 'warning';
    if (axis === 'z') g.rotation.y = Math.PI / 2; return g;
  }
  render(state: WorldState | null, cinematic: boolean, now: number) {
    if (this.titleMode !== cinematic) { this.titleMode = cinematic; this.fitCamera(); }
    const t = this.settings.reducedMotion ? 0 : now;
    this.titleSnake.group.visible = cinematic; this.player.group.visible = !cinematic;
    if (cinematic) {
      const body: Point[] = [];
      for (let i = 1; i <= 42; i++) { const s = i * 0.55; body.push({ x: 8.3 - s * 0.65, z: 5.5 + Math.sin(s * 0.33 + t * 0.12) * 2.9 }); }
      const head = { x: 8.3, z: 5.5 + Math.sin(t * 0.12) * 2.9 };
      const heading = Math.atan2(head.z - body[0].z, head.x - body[0].x);
      this.titleSnake.update(head, heading, body);
      this.titleSnake.group.scale.setScalar(1.43); this.titleSnake.group.position.set(0, 0.05, -2.2); this.titleSnake.head.scale.setScalar(1.18);
    }
    this.particles.rotation.y = t * 0.004;
    if (state) {
      this.player.update(state.player, state.player.heading, state.player.body);
      this.player.signature.emissiveIntensity = state.buffs.shield > 0 ? 1.8 : 1.1;
      const key = JSON.stringify(state.obstacles);
      if (key !== this.lastObstacleKey) {
        this.lastObstacleKey = key; this.obstacles.clear();
        for (const o of state.obstacles) {
          if (o.width < 0.6 && o.depth < 0.6) {
            box(this.obstacles, this.dark, o.x, 0.4, o.z, o.width, 0.8, o.depth);
            box(this.obstacles, this.hostile, o.x, 0.63, o.z, o.width * 0.55, 0.07, o.depth * 1.02); continue;
          }
          box(this.obstacles, this.dark, o.x, 0.55, o.z, o.width, 1.1, o.depth);
          box(this.obstacles, this.silver, o.x, 1.12, o.z, o.width * 0.91, 0.13, o.depth * 0.91);
          for (const sign of [-1, 1]) { box(this.obstacles, this.staticPink, o.x + sign * (o.width / 2 + 0.012), 0.83, o.z, 0.025, 0.08, o.depth * 0.7); box(this.obstacles, this.staticCyan, o.x, 0.3, o.z + sign * (o.depth / 2 + 0.012), o.width * 0.72, 0.06, 0.025); }
          for (let j = -1; j <= 1; j++) box(this.obstacles, this.dark, o.x + j * 0.5, 1.20, o.z, 0.22, 0.1, o.depth * 0.78);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) { box(this.obstacles, this.silver, o.x + sx * (o.width * 0.5 - 0.14), 0.55, o.z + sz * (o.depth * 0.5 - 0.14), 0.28, 1.2, 0.28); box(this.obstacles, this.dark, o.x + sx * (o.width * 0.5 - 0.14), 0.60, o.z + sz * o.depth * 0.5, 0.12, 0.65, 0.06); }
          box(this.obstacles, this.dark, o.x, 0.70, o.z + o.depth / 2 + 0.01, 1.4, 0.5, 0.055);
          for (let j = 0; j < 4; j++) box(this.obstacles, this.staticCyan, o.x - 0.44 + j * 0.28, 0.73, o.z + o.depth / 2 + 0.045, 0.07, 0.24, 0.02);
        }
      }
      this.syncObjects('core', state.cores, () => this.energy(CYAN), (g, e) => { g.rotation.y = t * 1.2 + e.x; g.position.y = Math.sin(t * 2 + e.x) * 0.06; });
      this.syncObjects('pickup', state.pickups, e => this.pickup(e.kind), (g, e) => { g.position.y = Math.sin(t * 1.5 + e.z) * 0.05; });
      this.syncObjects('mine', state.mines, () => this.mine(), (g, e) => { g.scale.setScalar(e.armed ? 1 : 0.75); });
      this.syncObjects('drone', state.drones, () => this.drone(), (g, e) => { g.position.y = Math.sin(t * 2.5 + e.x) * 0.08; g.rotation.y = e.target ? Math.atan2(e.target.x - e.x, e.target.z - e.z) : t * 0.2; g.visible = e.state !== 'warning'; g.scale.setScalar(e.disabled > 0 ? 0.82 : 1); });
      this.syncObjects('drone-warning', state.drones.filter(d => String(d.state) === 'warning'), () => { const g = new THREE.Group(); const r = ring(g, light(0xffbc79, 0.7), 0.7, 0.03, 0, 0.02); r.rotation.x = -Math.PI / 2; const l = this.label('!', '#ffbc79'); l.position.y = 0.8; l.scale.setScalar(0.6); g.add(l); return g; });
      this.syncObjects('lock', state.drones.filter(d => d.state === 'prepare' && d.target).map(d => ({ id: d.id, x: d.target!.x, z: d.target!.z })), () => { const g = new THREE.Group(); const r = ring(g, this.hostile, 0.54, 0.027, 0, 0.035); r.rotation.x = -Math.PI / 2; box(g, this.hostile, 0, 0.03, 0, 0.85, 0.018, 0.03); box(g, this.hostile, 0, 0.03, 0, 0.03, 0.018, 0.85); return g; });
      this.syncObjects('decoy', state.decoys, () => { const g = new THREE.Group(); const glow = ring(g, light(0x8957ff, 0.8), 0.65, 0.03, 0, 0.02); glow.rotation.x = -Math.PI / 2; const l = this.label('⋈', '#ac9dff'); l.position.y = 0.6; l.scale.setScalar(0.5); g.add(l); return g; });
      this.syncObjects('projectile', state.projectiles, () => { const g = new THREE.Group(); const p = new THREE.Mesh(sphere, this.hostile); p.scale.setScalar(0.12); p.position.y = 0.34; g.add(p); return g; });
      this.syncObjects('gate', state.gates, e => this.emitter(e.length, e.axis, e.boss), (g, e) => { g.rotation.y = e.axis === 'z' ? Math.PI / 2 : 0; g.getObjectByName('beam')!.visible = e.state === 'active'; g.getObjectByName('warning')!.visible = e.state === 'warning' || e.state === 'active'; });
      const liveRivals = new Set(state.rivals.map(r => r.id));
      for (const [id, rival] of this.rivalModels) if (!liveRivals.has(id)) { this.scene.remove(rival.group); this.disposeObject(rival.group); this.rivalModels.delete(id); }
      for (const rival of state.rivals) {
        let model = this.rivalModels.get(rival.id);
        if (!model) { model = new SerpentModel(RED, 24); this.scene.add(model.group); this.rivalModels.set(rival.id, model); }
        model.update(rival, rival.heading, rival.body);
        model.signature.emissiveIntensity = rival.state === 'warning' ? 0.3 : 1.1;
        model.group.visible = rival.state !== 'warning';
      }
      this.syncObjects('rival-warning', state.rivals.filter(r => r.state === 'warning'), () => { const g = new THREE.Group(); const label = this.label('»', '#ff8399'); label.scale.setScalar(0.7); label.position.y = 0.8; g.add(label); const r = ring(g, this.hostile, 0.8, 0.025, 0, 0.02); r.rotation.x = -Math.PI / 2; return g; });
      this.sentinel.visible = state.boss !== null;
      this.gateDoor.visible = state.status !== 'extraction' && state.status !== 'complete';
      this.syncObjects('relay', state.boss?.relays ?? [], e => this.energy(0xffcf78, String(e.number)), g => { g.rotation.y = 0; });
      this.syncObjects('pad', state.boss ? [{ id: 'pad', ...state.boss.pad }] : [], () => {
        const g = new THREE.Group(); const r = ring(g, light(0x32eda0, 1.8), 0.85, 0.09, 0, 0.04); r.rotation.x = -Math.PI / 2; const l = this.label('»', '#32eda0'); l.position.y = 0.7; l.scale.setScalar(0.7); g.add(l); return g;
      }, g => { g.visible = !!state.boss; g.scale.setScalar(state.boss?.phase === 'recovery' ? 1 : 0.68); });
      for (let i = 0; i < 3; i++) this.bossNodes[i].visible = i < (state.boss?.nodes ?? 0);
      if (state.boss) this.sentinel.rotation.z = Math.sin(t * 0.5) * 0.025;
    }
    if (this.settings.quality === 'low' || this.settings.bloom === 0) this.renderer.render(this.scene, this.camera); else this.composer.render();
  }
  setAnimationLoop(callback: ((time: number) => void) | null) { this.renderer.setAnimationLoop(callback); }
  private disposeObject(object: THREE.Object3D) {
    object.traverse(child => { if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Sprite) {
      if ('geometry' in child && child.geometry !== cube && child.geometry !== sphere) child.geometry.dispose();
      for (const mat of Array.isArray(child.material) ? child.material : [child.material]) {
        if (![this.staticCyan, this.staticPink, this.hostile, this.dark, this.silver].includes(mat as THREE.MeshStandardMaterial)) {
          const maps = new Set<THREE.Texture>();
          for (const key of ['map', 'bumpMap', 'roughnessMap', 'normalMap'] as const) if (key in mat) { const texture = (mat as unknown as Record<string, unknown>)[key]; if (texture instanceof THREE.Texture) maps.add(texture); }
          maps.forEach(texture => texture.dispose()); mat.dispose();
        }
      }
    } });
  }
  dispose() {
    this.disposed = true; this.renderer.setAnimationLoop(null); this.disposeObject(this.scene); this.reflector.getRenderTarget().dispose();
    this.environment.dispose(); this.sky?.dispose(); this.bloom.dispose(); this.composer.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}

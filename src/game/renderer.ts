import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PICKUPS } from './content';
import { getLayout } from './layouts';
import { GLOW_PRESETS } from './appearance';
import type { GlowId, PreviewZoom } from './appearance';
import type { Simulation } from './simulation';
import type { PickupKind } from './types';

type WorldState = Simulation['state'];
type Point = { x: number; z: number };
export type GraphicsSettings = { quality: 'low' | 'medium' | 'high'; bloom: number; reducedMotion: boolean; uiScale?: number };
const RENDER_BUDGET = {
  low: { pixels: 1280 * 720, maxDpr: 1 },
  medium: { pixels: 1920 * 1080, maxDpr: 1.5 },
  high: { pixels: 2560 * 1440, maxDpr: 2 },
};
const CYAN = 0x20dfff, PINK = 0xea39f5, RED = 0xff426f;
const dummy = new THREE.Object3D();
const markerOrigin = new THREE.Vector3(), markerForward = new THREE.Vector3();
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

type ScreenPoint = { x: number; y: number };
function screenHull(points: ScreenPoint[]): ScreenPoint[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a: ScreenPoint, b: ScreenPoint, c: ScreenPoint) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const side = (values: ScreenPoint[]) => { const hull: ScreenPoint[] = []; for (const p of values) { while (hull.length >= 2 && cross(hull.at(-2)!, hull.at(-1)!, p) <= 0) hull.pop(); hull.push(p); } return hull; };
  return side(sorted).slice(0, -1).concat(side(sorted.reverse()).slice(0, -1));
}
function overlapsPanel(shape: ScreenPoint[], rect: { left: number; right: number; top: number; bottom: number }): boolean {
  const panel = [{ x: rect.left, y: rect.top }, { x: rect.right, y: rect.top }, { x: rect.right, y: rect.bottom }, { x: rect.left, y: rect.bottom }];
  const axes = [{ x: 1, y: 0 }, { x: 0, y: 1 }, ...shape.map((p, i) => ({ x: -(shape[(i + 1) % shape.length].y - p.y), y: shape[(i + 1) % shape.length].x - p.x }))];
  return axes.every(axis => {
    const a = shape.map(p => p.x * axis.x + p.y * axis.y), b = panel.map(p => p.x * axis.x + p.y * axis.y);
    return Math.max(...a) > Math.min(...b) && Math.max(...b) > Math.min(...a);
  });
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
  private hostile: boolean;
  private bodyPorts: THREE.MeshStandardMaterial;
  readonly headSignature: THREE.MeshStandardMaterial;
  constructor(faction: 'player' | 'hostile', capacity = 128) {
    this.hostile = faction === 'hostile';
    const color = this.hostile ? RED : CYAN;
    const shell = this.hostile ? new THREE.MeshStandardMaterial({ color: 0x782338, emissive: 0x871c36, emissiveIntensity: 0.32, metalness: 0.55, roughness: 0.36, fog: false }) : metal(0x102030, 0.29);
    const dark = metal(0x070d16, 0.39), edge = this.hostile ? light(0xb44256, 0.35) : metal(0x34495c, 0.23);
    this.signature = light(color, this.hostile ? 1.65 : 1.1);
    this.headSignature = light(color, this.hostile ? 1.65 : 1.25);
    this.bodyPorts = light(this.hostile ? RED : CYAN, 0.7);
    // Selected light colors must remain identifiable in Low without bloom;
    // fog still applies to armor, floor and the surrounding city.
    this.signature.fog = false; this.bodyPorts.fog = false; this.headSignature.fog = false;
    if (this.hostile) edge.fog = false;
    const shellGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.44, 8); shellGeo.rotateZ(Math.PI / 2);
    const seamGeo = new THREE.CylinderGeometry(0.276, 0.276, 0.50, 8); seamGeo.rotateZ(Math.PI / 2);
    this.armor = new THREE.InstancedMesh(shellGeo, shell, capacity);
    this.seams = new THREE.InstancedMesh(seamGeo, this.signature, capacity);
    this.plates = new THREE.InstancedMesh(cube, edge, capacity);
    this.highlights = new THREE.InstancedMesh(cube, this.signature, capacity);
    this.flanks = new THREE.InstancedMesh(cube, shell, capacity * 2);
    this.ports = new THREE.InstancedMesh(cube, this.bodyPorts, capacity * 2);
    for (const mesh of [this.armor, this.seams, this.plates, this.highlights, this.flanks, this.ports]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; this.group.add(mesh);
    }
    this.group.add(this.head);
    const cranium = new THREE.Mesh(new THREE.DodecahedronGeometry(0.43, 0), shell);
    cranium.scale.set(1.38, 0.73, 0.95); this.head.add(cranium);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.30, 0.44, 4), edge);
    snout.rotation.z = -Math.PI / 2; snout.position.x = 0.4; snout.scale.z = 0.95; this.head.add(snout);
    box(this.head, dark, 0.25, -0.17, 0, 0.73, 0.13, 0.48);
    box(this.head, this.headSignature, 0.40, -0.095, 0, 0.45, 0.038, 0.4);
    for (const sign of [-1, 1]) {
      const eye = box(this.head, this.headSignature, 0.22, 0.11, sign * 0.263, 0.3, 0.08, 0.045); eye.rotation.y = sign * 0.33;
      const brow = box(this.head, edge, 0.13, 0.18, sign * 0.27, 0.39, 0.075, 0.10); brow.rotation.y = sign * 0.35;
      const guard = box(this.head, dark, -0.22, 0.02, sign * 0.30, 0.25, 0.35, 0.09); guard.rotation.x = sign * 0.2;
    }
    box(this.head, edge, -0.13, 0.28, 0, 0.43, 0.08, 0.17);
    box(this.head, this.headSignature, -0.12, 0.33, 0, 0.28, 0.02, 0.06);
    for (const sign of [-1, 1]) {
      const cheek = box(this.head, shell, 0, -0.015, sign * 0.285, 0.42, 0.21, 0.15); cheek.rotation.x = sign * 0.32; cheek.rotation.y = sign * -0.2;
      const seam = box(this.head, this.headSignature, 0.13, 0.03, sign * 0.364, 0.26, 0.028, 0.028); seam.rotation.y = sign * 0.15;
    }
  }
  setGlow(color: number) {
    if (this.hostile) return;
    for (const material of [this.signature, this.bodyPorts]) { material.color.setHex(color); material.emissive.setHex(color); }
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
      dummy.position.y += 0.036; dummy.scale.set(this.hostile ? 0.25 : 0.09, 0.018, this.hostile ? 0.10 : 0.075); dummy.updateMatrix(); this.highlights.setMatrixAt(i, dummy.matrix);
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
  private player = new SerpentModel('player');
  private titleSnake = new SerpentModel('player', 70);
  private rivalModels = new Map<string, SerpentModel>();
  private objects = new Map<string, THREE.Group>();
  private layout = getLayout();
  private arena = new THREE.Group();
  private city = new THREE.Group();
  private wet: THREE.Mesh;
  private platform: THREE.Mesh;
  private preview: { rotation: number; zoom: PreviewZoom } | null = null;
  private previewBody: Point[] = Array.from({ length: 26 }, (_, i) => { const d = (i + 1) * 0.55; return { x: 5.2 - d * 0.82, z: Math.sin(d * 0.42) * 1.55 }; });
  private previewRectKey = '';
  private cameraCheckTime = -Infinity;
  private obstacles = new THREE.Group();
  private dynamic = new THREE.Group();
  private sentinel = new THREE.Group();
  private bossNodes: THREE.Mesh[] = [];
  private gateDoor: THREE.Mesh;
  private staticCyan = light(CYAN, 0.8);
  private staticPink = light(PINK, 0.8);
  private hostile = light(RED, 1.0);
  // Hostile cues retain contrast at Low/bloom off and when a narrow view moves the camera back.
  private threatSignal = new THREE.MeshBasicMaterial({ color: RED, toneMapped: false, fog: false });
  private threatEdge = new THREE.MeshBasicMaterial({ color: 0xffd5df, toneMapped: false, fog: false });
  private warningSignal = new THREE.MeshBasicMaterial({ color: 0xffbc79, toneMapped: false, fog: false });
  private readySignal = new THREE.MeshBasicMaterial({ color: 0x82ffd0, toneMapped: false, fog: false });
  private disabledSignal = new THREE.MeshBasicMaterial({ color: 0x8796a6, toneMapped: false, fog: false });
  private threatShell = new THREE.MeshStandardMaterial({ color: 0x782338, emissive: 0x871c36, emissiveIntensity: 0.26, metalness: 0.5, roughness: 0.38, fog: false });
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
    this.renderer.setClearColor(0x06111d);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.88;
    this.hostile.fog = false;
    this.renderer.domElement.setAttribute('aria-label', 'Live 3D Neon Spire arena');
    this.renderer.domElement.style.width = this.renderer.domElement.style.height = '100%';
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

    this.reflector = new Reflector(new THREE.PlaneGeometry(1, 1), { clipBias: 0.003, textureWidth: 1024, textureHeight: 768, color: 0x173045 });
    this.reflector.rotation.x = -Math.PI / 2; this.reflector.position.y = -0.015; this.scene.add(this.reflector);
    // Seeded fine surface breakup: reflections remain live, with a wet metal layer above them.
    const surface = document.createElement('canvas'); surface.width = surface.height = 512;
    const ctx = surface.getContext('2d')!; const pixels = ctx.createImageData(512, 512);
    let noiseSeed = 3039;
    for (let i = 0; i < pixels.data.length; i += 4) { noiseSeed = (noiseSeed * 1664525 + 1013904223) >>> 0; const n = (noiseSeed / 4294967296) * 75 + 55; pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = n; pixels.data[i + 3] = 255; }
    ctx.putImageData(pixels, 0, 0); ctx.strokeStyle = '#aab1b7'; ctx.lineWidth = 0.5;
    for (let i = 0; i < 200; i++) { const x = (i * 133.7) % 512, y = (i * 281.3) % 512; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 + i % 16, y + 0.4); ctx.stroke(); }
    const surfaceTexture = new THREE.CanvasTexture(surface); surfaceTexture.wrapS = surfaceTexture.wrapT = THREE.RepeatWrapping; surfaceTexture.repeat.set(6, 5);
    this.wet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x102331, roughness: 0.45, metalness: 0.65, transparent: true, opacity: 0.43, bumpMap: surfaceTexture, bumpScale: 0.035, roughnessMap: surfaceTexture, depthWrite: false }));
    this.wet.rotation.x = -Math.PI / 2; this.wet.position.y = -0.009; this.scene.add(this.wet);
    this.platform = box(this.scene, metal(0x040a12, 0.4), 0, -0.35, 0, 1, 0.6, 1);
    this.scene.add(this.arena, this.city);
    this.gateDoor = box(this.scene, this.staticPink, 0, 0.30, this.layout.exit.center.z, 3.5, 0.55, 0.13);
    this.buildCity(); this.buildBoss(); this.applyLayout();
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

  private applyLayout() {
    const { width, depth, halfWidth, halfDepth, boss, exit } = this.layout;
    this.reflector.scale.set(width, depth, 1); this.wet.scale.set(width, depth, 1);
    this.platform.scale.set(width + 1.3, 0.6, depth + 1.3);
    this.disposeObject(this.arena); this.arena.clear();
    const fine: number[] = [], strong: number[] = [];
    for (let x = -halfWidth; x <= halfWidth; x++) (x % 4 === 0 ? strong : fine).push(x, 0.004, -halfDepth, x, 0.004, halfDepth);
    for (let z = -halfDepth; z <= halfDepth; z++) (z % 4 === 0 ? strong : fine).push(-halfWidth, 0.004, z, halfWidth, 0.004, z);
    for (const [vertices, color, opacity] of [[fine, 0x226c90, 0.42], [strong, 0x299cca, 0.65]] as const) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      this.arena.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
    }
    for (const x of [-halfWidth + 0.7, halfWidth - 0.7]) for (let z = -halfDepth + 1; z < halfDepth; z += 2) {
      box(this.arena, this.staticCyan, x, 0.012, z, 0.07, 0.018, 1.3);
      box(this.arena, this.silver, x + (x < 0 ? 0.15 : -0.15), 0.008, z, 0.03, 0.01, 0.7);
    }
    for (const z of [-halfDepth + 0.7, halfDepth - 0.7]) for (let x = -halfWidth + 2; x < halfWidth; x += 3) box(this.arena, this.staticPink, x, 0.012, z, 1.1, 0.018, 0.05);
    for (const x of [-halfWidth - 0.3, halfWidth + 0.3]) {
      box(this.arena, this.dark, x, 0.23, 0, 0.55, 0.5, depth + 0.6);
      box(this.arena, this.staticCyan, x, 0.5, 0, 0.06, 0.025, depth + 0.6);
    }
    box(this.arena, this.dark, 0, 0.18, halfDepth + 0.3, width + 1, 0.4, 0.55);
    box(this.arena, this.staticCyan, 0, 0.4, halfDepth + 0.3, width + 1, 0.025, 0.04);
    const northLength = halfWidth + 0.5 - exit.halfWidth;
    for (const sign of [-1, 1]) {
      const x = sign * (exit.halfWidth + northLength / 2);
      box(this.arena, this.dark, x, 0.23, -halfDepth - 0.3, northLength, 0.5, 0.55);
      box(this.arena, this.staticPink, x, 0.51, -halfDepth - 0.3, northLength, 0.025, 0.05);
      box(this.arena, this.dark, sign * (exit.halfWidth + 0.1), 0.85, -halfDepth - 0.4, 0.5, 1.7, 0.65);
      box(this.arena, this.staticPink, sign * (exit.halfWidth + 0.1), 1, -halfDepth - 0.02, 0.15, 1.4, 0.05);
    }
    box(this.arena, this.dark, 0, 1.85, -halfDepth - 0.4, exit.halfWidth * 2 + 0.7, 0.36, 0.7);
    box(this.arena, this.staticPink, 0, 1.67, -halfDepth - 0.03, exit.halfWidth * 2 + 0.1, 0.05, 0.05);
    for (let x = -halfWidth + 1; x < halfWidth; x += 3) for (const z of [-halfDepth - 0.5, halfDepth + 0.5]) {
      if (z < 0 && Math.abs(x) < 3) continue;
      box(this.arena, this.dark, x, 0.45, z, 0.5, 0.85, 0.65);
      box(this.arena, this.staticCyan, x, 0.77, z + (z < 0 ? 0.35 : -0.35), 0.3, 0.08, 0.025);
    }
    this.gateDoor.position.set(exit.center.x, 0.3, exit.center.z);
    this.sentinel.position.set(boss.anchor.x, 2.1, boss.anchor.z);
    this.fitCamera();
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
    windows.count = w; accents.count = a; this.city.add(buildings, windows, accents);
    // Two gantries are scenery outside the collidable floor, never surprise obstacles.
    for (const x of [-21, 21]) {
      box(this.city, this.dark, x, 0.3, -9, 4.7, 1.2, 7);
      box(this.city, this.staticPink, x, 1.0, -9, 3.8, 0.08, 6);
    }
  }

  private buildBoss() {
    // The sentinel is a large machine beyond the north wall. Its separate,
    // floor-mounted receptor is the only shootable target during exposure.
    const frame = ring(this.sentinel, this.dark, 2.35, 0.38); frame.scale.y = 0.83;
    const edge = ring(this.sentinel, this.threatSignal, 2.35, 0.055, 0, 0, 0.3); edge.scale.y = 0.83;
    box(this.sentinel, this.dark, 0, -0.15, 0, 5.4, 1.1, 1.5);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.82), this.threatShell); core.scale.set(1.15, 0.9, 0.7); this.sentinel.add(core);
    box(this.sentinel, this.threatEdge, 0, 0.06, 0.65, 1.1, 0.095, 0.06);
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 2.15;
      box(this.sentinel, this.dark, x, 1.25, 0, 1.25, 1.1, 0.8);
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.46), this.threatSignal);
      node.position.set(x, 1.36, 0.5); node.name = `warden-node-${i + 1}`; this.sentinel.add(node); this.bossNodes.push(node);
      const collar = ring(this.sentinel, this.silver, 0.58, 0.055, x, 1.36, 0.47); collar.scale.z = 0.6;
    }
    for (const sign of [-1, 1]) {
      const wing = box(this.sentinel, this.dark, sign * 3.45, -0.4, 0, 2.2, 0.8, 1.25); wing.rotation.z = -sign * 0.2;
      box(this.sentinel, this.threatSignal, sign * 3.5, -0.13, 0.66, 1.9, 0.07, 0.035);
      for (let n = 0; n < 4; n++) box(this.sentinel, this.silver, sign * (2.8 + n * 0.4), -0.5, 0.7, 0.12, 0.4, 0.07);
    }
    this.scene.add(this.sentinel); this.sentinel.visible = false;
  }

  setAppearance(glow: GlowId) {
    const preset = GLOW_PRESETS.find(value => value.id === glow) ?? GLOW_PRESETS[0];
    const color = new THREE.Color(preset.color).getHex();
    this.player.setGlow(color); this.titleSnake.setGlow(color);
  }
  setPreview(preview: { rotation: number; zoom: PreviewZoom } | null) {
    this.preview = preview; this.previewRectKey = ''; this.fitCamera();
  }

  setSettings(settings: GraphicsSettings) {
    const qualityChanged = settings.quality !== this.settings.quality;
    this.settings = settings; this.bloom.strength = settings.bloom; this.fitCamera();
    if (qualityChanged) this.resize();
    this.particles.visible = settings.quality !== 'low' && !settings.reducedMotion;
  }
  private fitBackground() {
    if (!this.sky) return;
    const aspect = this.width / this.height, imageAspect = 1672 / 941;
    this.sky.repeat.set(aspect < imageAspect ? aspect / imageAspect : 1, aspect > imageAspect ? imageAspect / aspect : 1);
    this.sky.offset.set((1 - this.sky.repeat.x) / 2, (1 - this.sky.repeat.y) / 2);
  }
  resize() {
    const width = this.container.clientWidth, height = this.container.clientHeight;
    if (width < 1 || height < 1) return false;
    const budget = RENDER_BUDGET[this.settings.quality];
    const pixelRatio = Math.min(devicePixelRatio || 1, budget.maxDpr, Math.sqrt(budget.pixels / (width * height)));
    if (width === this.width && height === this.height && pixelRatio === this.renderer.getPixelRatio()) return false;
    this.width = width; this.height = height;
    // Bound scene work by physical pixels, while the camera and semantic HUD keep
    // the full CSS viewport. Set size/DPR together to avoid a transient huge buffer.
    this.renderer.setDrawingBufferSize(width, height, pixelRatio);
    // The composer uses physical dimensions at its default DPR of 1. It must not
    // retain the original device DPR after a quality change or supersample twice.
    this.composer.setSize(this.renderer.domElement.width, this.renderer.domElement.height);
    this.camera.aspect = this.width / this.height; this.fitCamera(); this.fitBackground();
    return true;
  }
  private fitCamera() {
    const width = Math.max(1, this.width), height = Math.max(1, this.height);
    this.camera.clearViewOffset();
    if (this.preview) {
      const rect = this.container.parentElement?.querySelector('[data-snake-preview]')?.getBoundingClientRect();
      const host = this.container.getBoundingClientRect();
      const region = rect && rect.width > 0 ? { x: rect.left - host.left, y: rect.top - host.top, width: rect.width, height: rect.height } : { x: 0, y: height * 0.2, width: width * 0.55, height: height * 0.65 };
      const close = this.preview.zoom === 'close';
      this.camera.fov = 38;
      const distance = (close ? 7.8 : 19) * Math.max(1, 420 / Math.max(180, region.width));
      const center = close ? 4.2 : -0.2, x = center * Math.cos(this.preview.rotation), z = -center * Math.sin(this.preview.rotation);
      this.camera.position.set(x + distance * 0.3, distance * 0.60, z + distance * 0.80);
      this.camera.lookAt(x, 0.25, z);
      this.camera.setViewOffset(width, height, width / 2 - (region.x + region.width / 2), height / 2 - (region.y + region.height / 2), width, height);
      // Fitting uses the preview's actual CSS region, never a second WebGL context.
      this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(38 / 2)) * height / Math.max(180, region.height)));
    } else if (this.titleMode) {
      this.camera.fov = 43; this.camera.position.set(15.8, 9.4, 19.5); this.camera.lookAt(0, 0.3, -1.2);
    } else {
      this.camera.fov = 42;
      const host = this.container.getBoundingClientRect();
      const app = this.container.parentElement;
      const panels = ['.hud-objective', '.hud-score', '.hud-resources', '.hud-tactics'].map(selector => app?.querySelector(selector)?.getBoundingClientRect()).filter((rect): rect is DOMRect => !!rect && rect.height > 0).map(rect => ({ left: rect.left - host.left - 12, right: rect.right - host.left + 12, top: rect.top - host.top - 12, bottom: rect.bottom - host.top + 12 }));
      const { halfWidth: x, halfDepth: z, boss } = this.layout;
      const floor = [-1, 1].flatMap(sx => [-1, 1].flatMap(sz => [0, 0.8].map(y => new THREE.Vector3(sx * (x + 0.7), y, sz * (z + 0.7)))));
      const sentinel = [-1, 1].flatMap(sx => [0.7, 4.3].map(y => new THREE.Vector3(sx * 4.65, y, boss.anchor.z - 0.5)));
      const offsets = [0, -0.05, 0.05, -0.10, 0.10, -0.15, 0.15].flatMap(dx => [0, -0.04, 0.04, -0.08, 0.08, -0.12, 0.12].map(dy => ({ x: dx * width, y: dy * height }))).sort((a, b) => Math.hypot(a.x / width, a.y / height) - Math.hypot(b.x / width, b.y / height));
      this.camera.updateProjectionMatrix();
      let low = 20, high = 240, chosen = { x: 0, y: 0 };
      for (let iteration = 0; iteration < 15; iteration++) {
        const distance = (low + high) / 2;
        this.camera.position.set(0, distance * 0.8660254, distance * 0.5); this.camera.lookAt(0, 0, 0); this.camera.updateMatrixWorld();
        const shapes = [floor, sentinel].map(shape => screenHull(shape.map(point => { const p = point.clone().project(this.camera); return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2 }; })));
        const fit = offsets.find(offset => shapes.every(shape => {
          const placed = shape.map(p => ({ x: p.x + offset.x, y: p.y + offset.y }));
          return placed.every(p => p.x >= 10 && p.x <= width - 10 && p.y >= 10 && p.y <= height - 35) && panels.every(panel => !overlapsPanel(placed, panel));
        }));
        if (fit) { high = distance; chosen = fit; } else low = distance;
      }
      this.camera.position.set(0, high * 0.8660254, high * 0.5); this.camera.lookAt(0, 0, 0);
      // Fit around actual corner panels instead of discarding two full screen
      // rows. This keeps the arena larger while every travel lane stays visible.
      this.camera.setViewOffset(width, height, -chosen.x, -chosen.y, width, height);
    }
    this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
  }
  private checkCameraRegion(now: number) {
    if (now - this.cameraCheckTime < 0.3) return;
    this.cameraCheckTime = now;
    const selectors = this.preview ? ['[data-snake-preview]'] : ['.hud-objective', '.hud-score', '.hud-resources', '.hud-tactics'];
    const key = selectors.map(selector => {
      const rect = this.container.parentElement?.querySelector(selector)?.getBoundingClientRect();
      return rect ? [rect.x, rect.y, rect.width, rect.height].map(value => Math.round(value)).join(',') : '';
    }).join('|');
    if (key !== this.previewRectKey) { this.previewRectKey = key; this.fitCamera(); }
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
    if (relay) { const label = this.label(relay, '#ffe3a4'); label.name = 'relay-identity'; label.position.y = 1.15; label.scale.set(0.65, 0.65, 1); label.material.fog = false; label.material.toneMapped = false; g.add(label); }
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
  private pickup(kind: PickupKind) {
    const definition = PICKUPS[kind], color = new THREE.Color(definition.color).getHex();
    const g = new THREE.Group(), mat = light(color, 1.3), body = new THREE.Group();
    g.name = definition.name; body.name = `pickup-shape-${kind}`; body.position.y = 0.5; g.add(body);
    // Distinct silhouettes supplement the canonical color and symbol. Each is a
    // small floating collectible, with no apparent solid obstacle around it.
    if (kind === 'overdrive') {
      for (const x of [-0.18, 0.18]) for (const sign of [-1, 1]) { const bar = box(body, mat, x, sign * 0.14, 0, 0.30, 0.10, 0.16); bar.rotation.z = -sign * Math.PI / 4; }
    } else if (kind === 'shield') {
      const shield = new THREE.Mesh(new THREE.OctahedronGeometry(0.37), mat); shield.scale.set(1, 1.2, 0.5); body.add(shield);
      const guard = ring(body, mat, 0.34, 0.045); guard.scale.set(1, 1.2, 0.45);
    } else if (kind === 'surge') {
      for (const x of [-0.20, 0.20]) { const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), mat); crystal.position.x = x; crystal.rotation.z = Math.PI / 6; body.add(crystal); }
    } else if (kind === 'emp') {
      ring(body, mat, 0.30, 0.055); ring(body, mat, 0.13, 0.035);
      const cross = ring(body, mat, 0.30, 0.025); cross.rotation.y = Math.PI / 2;
    } else if (kind === 'magnet') {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.085, 6, 20, Math.PI), mat); body.add(arc);
      for (const x of [-0.25, 0.25]) box(body, mat, x, -0.12, 0, 0.17, 0.25, 0.17);
    } else if (kind === 'repair') {
      box(body, mat, 0, 0, 0, 0.65, 0.20, 0.20); box(body, mat, 0, 0, 0, 0.20, 0.65, 0.20);
    } else if (kind === 'decoy') {
      for (const sign of [-1, 1]) { const prism = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.36, 4), mat); prism.position.x = sign * 0.18; prism.rotation.z = -sign * Math.PI / 2; body.add(prism); }
    } else if (kind === 'splice') {
      for (let i = 0; i < 4; i++) { const link = box(body, mat, -0.27 + i * 0.18, 0, 0, 0.10, 0.40 - i * 0.055, 0.17); link.rotation.z = -Math.PI / 7; }
    } else if (kind === 'blaster') {
      box(body, mat, 0, 0, 0, 0.60, 0.20, 0.20); box(body, mat, -0.1, -0.18, 0, 0.18, 0.25, 0.16);
      const muzzle = ring(body, mat, 0.15, 0.045, 0.30, 0); muzzle.rotation.y = Math.PI / 2;
    } else if (kind === 'capacitor') {
      const battery = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.52, 8), mat); body.add(battery);
      box(body, mat, 0, 0.32, 0, 0.20, 0.12, 0.20); ring(body, mat, 0.27, 0.035).rotation.x = Math.PI / 2;
    } else if (kind === 'scrubber') {
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22), mat); body.add(orb);
      for (const angle of [-Math.PI / 4, Math.PI / 4]) { const sweep = ring(body, mat, 0.35, 0.035); sweep.rotation.y = angle; sweep.rotation.z = angle; }
    } else {
      for (const x of [-0.19, 0.19]) { const link = ring(body, mat, 0.22, 0.06, x); link.rotation.y = x < 0 ? -Math.PI / 5 : Math.PI / 5; }
    }
    const label = this.label(definition.symbol, definition.color); label.name = 'pickup-identity'; label.position.y = 1.22; label.scale.set(0.65, 0.65, 1);
    label.material.fog = false; label.material.toneMapped = false; g.add(label);
    const base = ring(g, mat, 0.38, 0.018, 0, 0.03); base.rotation.x = -Math.PI / 2;
    return g;
  }
  private mine() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.30, 1), this.threatShell); body.position.y = 0.35; g.add(body);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), this.threatEdge); spike.position.set(Math.cos(a) * 0.34, 0.35, Math.sin(a) * 0.34); spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a), 0, Math.sin(a))); g.add(spike);
    }
    const core = new THREE.Mesh(sphere, this.threatSignal); core.scale.setScalar(0.13); core.position.y = 0.64; core.name = 'signal'; g.add(core);
    const crown = ring(g, this.threatSignal, 0.22, 0.035, 0, 0.55); crown.rotation.x = -Math.PI / 2; crown.name = 'crown';
    // This floor ring marks the actual 0.45-unit mine radius; arming never shrinks it.
    const footprint = ring(g, this.threatSignal, 0.45, 0.028, 0, 0.018); footprint.rotation.x = -Math.PI / 2; footprint.name = 'footprint';
    g.add(this.threatCue('×', '#ff7895', 'compact-cue'), this.threatCue('!', '#ffbc79', 'arming-cue'));
    return g;
  }
  private drone() {
    const g = new THREE.Group();
    box(g, this.threatShell, 0, 0.73, 0, 0.76, 0.26, 0.53).name = 'shell';
    const eye = new THREE.Mesh(sphere, this.threatEdge); eye.position.set(0, 0.74, 0.29); eye.scale.set(0.18, 0.09, 0.07); g.add(eye);
    for (const x of [-0.48, 0.48]) { box(g, this.silver, x, 0.69, 0, 0.35, 0.11, 0.24); const rotor = ring(g, this.threatSignal, 0.19, 0.04, x, 0.78); rotor.rotation.x = -Math.PI / 2; rotor.name = 'signal'; }
    for (const x of [-0.25, 0.25]) box(g, this.threatSignal, x, 0.868, 0, 0.055, 0.014, 0.46).name = 'signal';
    // Brackets are a holographic contact cue, not larger solid armor.
    const bracket = new THREE.Group(); bracket.name = 'brackets';
    for (const x of [-0.43, 0.43]) for (const z of [-0.27, 0.27]) {
      box(bracket, this.threatSignal, x, 0.024, z, 0.035, 0.012, 0.18).name = 'signal';
      box(bracket, this.threatSignal, x - Math.sign(x) * 0.055, 0.024, z + Math.sign(z) * 0.072, 0.14, 0.012, 0.035).name = 'signal';
    }
    g.add(bracket, this.threatCue('▼', '#ff7895', 'compact-cue'), this.threatCue('Ⅱ', '#b6c3cf', 'disabled-cue'));
    return g;
  }
  private threatCue(text: string, color: string, name: string) {
    const cue = this.label(text, color); cue.name = name; cue.position.y = 1.35;
    cue.material.fog = false; cue.material.toneMapped = false;
    return cue;
  }
  private needsThreatCue() {
    return 0.75 * this.height / (2 * this.camera.position.length() * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) < 12;
  }
  private headCue() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath(); ctx.moveTo(14, 12); ctx.lineTo(52, 32); ctx.lineTo(14, 52); ctx.lineTo(23, 32); ctx.closePath();
    ctx.fillStyle = '#20dfff'; ctx.fill(); ctx.strokeStyle = '#c7fbff'; ctx.lineWidth = 3; ctx.stroke();
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const cue = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, fog: false, toneMapped: false })); cue.name = 'head-marker'; cue.position.y = 1.2;
    const group = new THREE.Group(); group.add(cue); return group;
  }
  private fitThreatCue(cue: THREE.Object3D, visible: boolean, pixels = 14) {
    cue.visible = visible;
    if (!visible) return;
    cue.getWorldPosition(markerOrigin).applyMatrix4(this.camera.matrixWorldInverse);
    // A small, separate marker stays readable in narrow previews without changing a collider's silhouette.
    const pixelWorldSize = pixels * 2 * Math.abs(markerOrigin.z) * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / this.height;
    cue.scale.setScalar(Math.max(0.55, pixelWorldSize));
  }
  private emitter(length: number, axis: 'x' | 'z', boss: boolean) {
    const g = new THREE.Group(); g.userData.axis = axis;
    if (boss) for (const sign of [-1, 1]) { const mark = ring(g, this.hostile, 0.23, 0.025, sign * length / 2, 0.025); mark.rotation.x = -Math.PI / 2; }
    const beam = box(g, this.hostile, 0, 0.35, 0, length, 0.055, 0.055); beam.name = 'beam';
    const floor = box(g, new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.28, toneMapped: false, fog: false }), 0, 0.018, 0, length, 0.01, 0.4); floor.name = 'warning';
    if (axis === 'z') g.rotation.y = Math.PI / 2; return g;
  }
  render(state: WorldState | null, cinematic: boolean, now: number) {
    if (state && getLayout(state).id !== this.layout.id) { this.layout = getLayout(state); this.applyLayout(); }
    this.checkCameraRegion(now);
    if (this.titleMode !== cinematic) { this.titleMode = cinematic; this.fitCamera(); }
    const t = this.settings.reducedMotion ? 0 : now;
    this.titleSnake.group.visible = cinematic || !!this.preview; this.player.group.visible = !cinematic && !this.preview;
    this.dynamic.visible = this.obstacles.visible = this.city.visible = !this.preview;
    this.arena.visible = this.reflector.visible = this.wet.visible = this.platform.visible = !this.preview;
    if (this.preview) {
      this.titleSnake.update({ x: 5.2, z: 0 }, -0.38, this.previewBody);
      this.titleSnake.group.scale.setScalar(1); this.titleSnake.group.position.set(0, 0.1, 0);
      this.titleSnake.group.rotation.y = this.preview.rotation; this.titleSnake.head.scale.setScalar(1);
      this.sentinel.visible = this.gateDoor.visible = false;
      for (const model of this.rivalModels.values()) model.group.visible = false;
    } else if (cinematic) {
      this.gateDoor.visible = true;
      this.titleSnake.group.rotation.y = 0;
      const body: Point[] = [];
      for (let i = 1; i <= 42; i++) { const s = i * 0.55; body.push({ x: 8.3 - s * 0.65, z: 5.5 + Math.sin(s * 0.33 + t * 0.12) * 2.9 }); }
      const head = { x: 8.3, z: 5.5 + Math.sin(t * 0.12) * 2.9 };
      const heading = Math.atan2(head.z - body[0].z, head.x - body[0].x);
      this.titleSnake.update(head, heading, body);
      this.titleSnake.group.scale.setScalar(1.43); this.titleSnake.group.position.set(0, 0.05, -2.2); this.titleSnake.head.scale.setScalar(1.18);
    }
    this.particles.rotation.y = t * 0.004;
    if (state && !this.preview) {
      this.player.update(state.player, state.player.heading, state.player.body);
      this.player.signature.emissiveIntensity = state.buffs.shield > 0 ? 1.8 : 1.1;
      this.syncObjects('player-marker', [{ id: 'head', x: state.player.x, z: state.player.z }], () => this.headCue(), g => {
        const cue = g.getObjectByName('head-marker') as THREE.Sprite;
        this.fitThreatCue(cue, !cinematic && this.needsThreatCue(), 15);
        markerOrigin.set(state.player.x, 1.2, state.player.z).project(this.camera);
        markerForward.set(state.player.x + Math.cos(state.player.heading), 1.2, state.player.z + Math.sin(state.player.heading)).project(this.camera);
        cue.material.rotation = Math.atan2((markerForward.y - markerOrigin.y) * this.height, (markerForward.x - markerOrigin.x) * this.width);
      });
      const key = JSON.stringify(state.obstacles);
      if (key !== this.lastObstacleKey) {
        this.lastObstacleKey = key; this.disposeObject(this.obstacles); this.obstacles.clear();
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
      this.syncObjects('pickup', state.pickups, e => this.pickup(e.kind), (g, e) => { g.position.y = Math.sin(t * 1.5 + e.z) * 0.05; this.fitThreatCue(g.getObjectByName('pickup-identity')!, true); });
      this.syncObjects('mine', state.mines, () => this.mine(), (g, e) => {
        for (const name of ['signal', 'crown', 'footprint']) (g.getObjectByName(name) as THREE.Mesh).material = e.armed ? this.threatSignal : this.warningSignal;
        this.fitThreatCue(g.getObjectByName('compact-cue')!, this.needsThreatCue() && e.armed);
        this.fitThreatCue(g.getObjectByName('arming-cue')!, !e.armed);
      });
      this.syncObjects('drone', state.drones, () => this.drone(), (g, e) => {
        g.position.y = e.disabled > 0 ? 0 : Math.sin(t * 2.5 + e.x) * 0.08;
        g.rotation.y = e.target ? Math.atan2(e.target.x - e.x, e.target.z - e.z) : t * 0.2;
        g.visible = e.state !== 'warning';
        g.traverse(child => { if (child instanceof THREE.Mesh && child.name === 'signal') child.material = e.disabled > 0 ? this.disabledSignal : this.threatSignal; });
        (g.getObjectByName('shell') as THREE.Mesh).material = e.disabled > 0 ? this.silver : this.threatShell;
        this.fitThreatCue(g.getObjectByName('compact-cue')!, this.needsThreatCue() && e.disabled <= 0);
        this.fitThreatCue(g.getObjectByName('disabled-cue')!, e.disabled > 0);
      });
      this.syncObjects('drone-warning', state.drones.filter(d => String(d.state) === 'warning'), () => { const g = new THREE.Group(); const r = ring(g, this.warningSignal, 0.7, 0.035, 0, 0.02); r.rotation.x = -Math.PI / 2; g.add(this.threatCue('!', '#ffbc79', 'cue')); return g; }, g => this.fitThreatCue(g.getObjectByName('cue')!, true));
      this.syncObjects('lock', state.drones.filter(d => d.state === 'prepare' && d.target).map(d => ({ id: d.id, x: d.target!.x, z: d.target!.z })), () => { const g = new THREE.Group(); const r = ring(g, this.hostile, 0.54, 0.027, 0, 0.035); r.rotation.x = -Math.PI / 2; box(g, this.hostile, 0, 0.03, 0, 0.85, 0.018, 0.03); box(g, this.hostile, 0, 0.03, 0, 0.03, 0.018, 0.85); return g; });
      this.syncObjects('decoy', state.decoys, () => { const g = new THREE.Group(); const glow = ring(g, light(0x8957ff, 0.8), 0.65, 0.03, 0, 0.02); glow.rotation.x = -Math.PI / 2; const l = this.label('⋈', '#ac9dff'); l.position.y = 0.6; l.scale.setScalar(0.5); g.add(l); return g; });
      this.syncObjects('emp-pulse', state.events.filter(event => event.kind === 'emp' && event.origin && state.time - event.time < 0.55).map(event => ({ id: String(event.id), ...event.origin!, time: event.time })), () => {
        const g = new THREE.Group();
        for (const name of ['boundary', 'wave']) {
          const material = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, fog: false });
          const pulse = ring(g, material, name === 'boundary' ? 4 : 1, name === 'boundary' ? 0.025 : 0.035, 0, 0.045);
          pulse.rotation.x = -Math.PI / 2; pulse.name = name;
        }
        return g;
      }, (g, event) => {
        const age = Math.max(0, state.time - event.time), fade = Math.max(0, 1 - age / 0.55);
        const boundary = g.getObjectByName('boundary') as THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
        const wave = g.getObjectByName('wave') as THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
        boundary.material.opacity = fade * 0.4;
        wave.material.opacity = fade * 0.7;
        // Fixed origin and exact four-unit boundary come from the action event;
        // the expanding inner light is presentation only and freezes with pause.
        wave.scale.setScalar(this.settings.reducedMotion ? 4 : 0.12 + 3.88 * Math.min(1, age / 0.32));
      });
      this.syncObjects('projectile', state.projectiles, () => {
        const g = new THREE.Group(); const p = new THREE.Mesh(sphere, this.threatEdge); p.scale.setScalar(0.14); p.position.y = 0.34; g.add(p);
        const corona = ring(g, this.threatSignal, 0.14, 0.025, 0, 0.34); corona.rotation.x = -Math.PI / 2;
        // A tapered light streak points along the committed velocity; only the leading core is physical.
        const trail = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.55, 5), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false, fog: false }));
        trail.rotation.x = -Math.PI / 2; trail.position.set(0, 0.34, -0.36); g.add(trail); return g;
      }, (g, e) => { g.rotation.y = Math.atan2(e.vx, e.vz); });
      this.syncObjects('player-projectile', state.playerProjectiles ?? [], () => {
        const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xfff4a8, toneMapped: false, fog: false });
        const core = new THREE.Mesh(sphere, mat); core.scale.setScalar(0.12); core.position.y = 0.34; g.add(core);
        box(g, mat, 0, 0.34, -0.2, 0.05, 0.045, 0.36);
        const tail = box(g, new THREE.MeshBasicMaterial({ color: 0xffdd54, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false, fog: false }), 0, 0.34, -0.43, 0.08, 0.025, 0.36); tail.name = 'light-trail';
        return g;
      }, (g, shot) => { g.rotation.y = Math.atan2(shot.vx, shot.vz); });
      this.renderCombatEvents(state);
      this.syncObjects('gate', state.gates.filter(gate => !gate.boss || !['extraction', 'complete'].includes(state.status)), e => this.emitter(e.length, e.axis, e.boss), (g, e) => { g.rotation.y = e.axis === 'z' ? Math.PI / 2 : 0; g.getObjectByName('beam')!.visible = e.state === 'active'; g.getObjectByName('warning')!.visible = e.state === 'warning' || e.state === 'active'; });
      const liveRivals = new Set(state.rivals.map(r => r.id));
      for (const [id, rival] of this.rivalModels) if (!liveRivals.has(id)) { this.scene.remove(rival.group); this.disposeObject(rival.group); this.rivalModels.delete(id); }
      for (const rival of state.rivals) {
        let model = this.rivalModels.get(rival.id);
        if (!model) { model = new SerpentModel('hostile', 24); this.scene.add(model.group); this.rivalModels.set(rival.id, model); }
        model.update(rival, rival.heading, rival.body);
        model.signature.emissiveIntensity = rival.state === 'warning' ? 0.3 : 1.65;
        model.group.visible = rival.state !== 'warning';
      }
      this.syncObjects('rival-warning', state.rivals.filter(r => r.state === 'warning'), () => { const g = new THREE.Group(); g.add(this.threatCue('»', '#ffbc79', 'cue')); const r = ring(g, this.warningSignal, 0.8, 0.035, 0, 0.02); r.rotation.x = -Math.PI / 2; return g; }, g => this.fitThreatCue(g.getObjectByName('cue')!, true));
      this.syncObjects('rival-cue', state.rivals.filter(r => r.state !== 'warning'), () => { const g = new THREE.Group(); g.add(this.threatCue('»', '#ff7895', 'cue')); return g; }, g => this.fitThreatCue(g.getObjectByName('cue')!, this.needsThreatCue()));
      const bossActive = !!state.boss && !['extraction', 'complete'].includes(state.status) && state.boss.nodes > 0;
      const boss = state.boss, exposed = bossActive && boss?.charge === 3 && boss.phase === 'recovery';
      this.sentinel.visible = bossActive;
      this.gateDoor.visible = state.status !== 'extraction' && state.status !== 'complete';
      this.syncObjects('relay', bossActive ? boss?.relays ?? [] : [], e => {
        const g = this.energy(0xffcf78, String(e.number));
        const focus = ring(g, new THREE.MeshBasicMaterial({ color: 0xffe3a4, toneMapped: false, fog: false }), 0.48, 0.035, 0, 0.04); focus.rotation.x = -Math.PI / 2; focus.name = 'next-relay';
        return g;
      }, (g, relay) => {
        const next = relay.number === (boss?.charge ?? 0) + 1; g.userData.next = next;
        g.getObjectByName('next-relay')!.visible = next;
        g.traverse(child => { if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
          for (const material of Array.isArray(child.material) ? child.material : [child.material]) { material.transparent = true; material.opacity = next ? 1 : 0.60; if (material instanceof THREE.MeshStandardMaterial) material.emissiveIntensity = next ? 1.4 : 0.25; }
        } });
        this.fitThreatCue(g.getObjectByName('relay-identity')!, true, next ? 20 : 16);
        g.rotation.y = 0;
      });
      this.syncObjects('pad', bossActive && boss ? [{ id: 'pad', ...boss.pad }] : [], () => {
        const g = new THREE.Group();
        const rim = ring(g, this.disabledSignal, 1, 0.055, 0, 0.04); rim.rotation.x = -Math.PI / 2; rim.name = 'pad-ring';
        for (const [name, symbol, color] of [['inactive', '·', '#a1b2c0'], ['waiting', 'Ⅱ', '#ffcf78'], ['ready', '»', '#82ffd0']]) {
          const label = this.label(symbol, color); label.position.y = 0.75; label.name = name; label.scale.setScalar(0.7); label.material.fog = false; label.material.toneMapped = false; g.add(label);
        }
        return g;
      }, g => {
        const phase = exposed ? 'ready' : boss!.charge === 3 ? 'waiting' : 'inactive'; g.userData.state = phase;
        (g.getObjectByName('pad-ring') as THREE.Mesh).material = phase === 'ready' ? this.readySignal : phase === 'waiting' ? this.warningSignal : this.disabledSignal;
        for (const name of ['inactive', 'waiting', 'ready']) { const label = g.getObjectByName(name)!; this.fitThreatCue(label, name === phase); }
      });
      this.syncObjects('receptor', bossActive && boss && this.layout.id === 'neon-spire-v2' ? [{ id: 'warden-receptor', ...boss.receptor }] : [], () => {
        const g = new THREE.Group();
        const footprint = ring(g, this.disabledSignal, 0.65, 0.055, 0, 0.04); footprint.rotation.x = -Math.PI / 2; footprint.name = 'receptor-ring';
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.33), new THREE.MeshBasicMaterial({ color: 0xffd178, transparent: true, opacity: 0.65, depthWrite: false, toneMapped: false, fog: false })); crystal.position.y = 0.48; crystal.name = 'receptor-core'; g.add(crystal);
        const target = this.label('⊕', '#fff080'); target.position.y = 1.25; target.name = 'receptor-target'; target.material.fog = false; target.material.toneMapped = false; g.add(target);
        for (let i = 0; i < 3; i++) box(g, this.disabledSignal, (i - 1) * 0.3, 0.045, 0.87, 0.20, 0.025, 0.10).name = `hit-${i}`;
        return g;
      }, g => {
        g.userData.exposed = !!exposed;
        (g.getObjectByName('receptor-ring') as THREE.Mesh).material = exposed ? this.warningSignal : this.disabledSignal;
        (g.getObjectByName('receptor-core') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity = exposed ? 0.8 : 0.18;
        this.fitThreatCue(g.getObjectByName('receptor-target')!, !!exposed);
        for (let i = 0; i < 3; i++) (g.getObjectByName(`hit-${i}`) as THREE.Mesh).material = i < (boss?.receptorHits ?? 0) ? this.threatEdge : this.disabledSignal;
      });
      this.syncObjects('exit', state.status === 'extraction' || state.status === 'complete' ? [{ id: 'exit', ...this.layout.exit.center }] : [], () => {
        const g = new THREE.Group();
        for (const z of [0.5, 1.3, 2.1]) for (const sign of [-1, 1]) { const arrow = box(g, this.staticCyan, sign * 0.2, 0.03, z, 0.55, 0.025, 0.10); arrow.rotation.y = sign * Math.PI / 4; }
        const label = this.label('↑', '#82ffd0'); label.position.y = 0.9; label.name = 'exit-mark'; g.add(label); return g;
      }, g => this.fitThreatCue(g.getObjectByName('exit-mark')!, true));
      for (let i = 0; i < 3; i++) this.bossNodes[i].visible = i < (boss?.nodes ?? 0);
      this.sentinel.rotation.z = 0;

    }
    if (this.settings.quality === 'low' || this.settings.bloom === 0) this.renderer.render(this.scene, this.camera); else this.composer.render();
  }
  private renderCombatEvents(state: WorldState) {
    const recent = state.events.filter(event => event.origin && state.time >= event.time && state.time - event.time < 0.6);
    this.syncObjects('scrubber-pulse', recent.filter(event => event.kind === 'scrubber').map(event => ({ id: String(event.id), ...event.origin!, time: event.time })), () => {
      const g = new THREE.Group();
      for (const name of ['boundary', 'wave']) {
        const material = new THREE.MeshBasicMaterial({ color: 0xf1f8ff, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, fog: false });
        const pulse = ring(g, material, name === 'boundary' ? 3 : 1, 0.03, 0, 0.055); pulse.rotation.x = -Math.PI / 2; pulse.name = name;
      }
      return g;
    }, (g, event) => {
      const age = state.time - event.time, fade = 1 - age / 0.6;
      const wave = g.getObjectByName('wave') as THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
      wave.scale.setScalar(this.settings.reducedMotion ? 3 : 0.1 + 2.9 * Math.min(1, age / 0.3)); wave.material.opacity = fade * 0.65;
      (g.getObjectByName('boundary') as THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>).material.opacity = fade * 0.3;
    });
    this.syncObjects('combat-impact', recent.filter(event => ['drone-hit', 'drone-destroyed', 'armor-hit', 'receptor-hit'].includes(event.kind)).map(event => ({ ...event, id: String(event.id), ...event.origin! })), event => {
      const g = new THREE.Group(), color = event.kind === 'armor-hit' ? 0xffbc79 : event.kind === 'drone-destroyed' ? 0xff7895 : 0xfff4b8;
      for (let i = 0; i < 6; i++) {
        const shard = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, toneMapped: false, fog: false })); shard.scale.setScalar(0.06); g.add(shard);
      }
      return g;
    }, (g, event) => {
      const age = state.time - event.time, radius = this.settings.reducedMotion ? 0.28 : 0.15 + age * 1.0;
      g.children.forEach((child, i) => { const angle = i * Math.PI / 3; child.position.set(Math.cos(angle) * radius, 0.6 + Math.sin(angle) * radius * 0.6, Math.sin(angle) * radius); (child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity = Math.max(0, 1 - age / 0.6); });
    });
    this.syncObjects('warden-energy', recent.filter(event => event.kind === 'boss-node' && event.target).map(event => ({ ...event, id: String(event.id), ...event.origin! })), event => {
      const g = new THREE.Group();
      const destination = new THREE.Vector3(event.target.x + ((event.amount ?? 2) - 1) * 2.15 - event.x, 3.46, event.target.z + 0.5 - event.z);
      const source = new THREE.Vector3(0, 0.15, 0), direction = destination.clone().sub(source);
      const material = new THREE.MeshBasicMaterial({ color: 0xffeda9, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, fog: false });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, direction.length(), 6), material); beam.position.copy(source.add(destination).multiplyScalar(0.5)); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); beam.name = 'energy-transfer'; g.add(beam);
      for (let i = 0; i < 8; i++) { const shard = new THREE.Mesh(sphere, material.clone()); shard.scale.setScalar(0.12); shard.name = `node-shard-${i}`; shard.userData.origin = destination.clone(); g.add(shard); }
      return g;
    }, (g, event) => {
      const age = state.time - event.time, fade = Math.max(0, 1 - age / 0.6);
      g.children.forEach((child, i) => {
        (child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity = fade * (i === 0 ? 0.65 : 1);
        if (i > 0) { const angle = i * Math.PI / 4, radius = this.settings.reducedMotion ? 0.35 : 0.12 + age * 2; child.position.copy(child.userData.origin as THREE.Vector3).add(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.3)); }
      });
    });
  }
  setAnimationLoop(callback: ((time: number) => void) | null) { this.renderer.setAnimationLoop(callback); }
  private disposeObject(object: THREE.Object3D) {
    object.traverse(child => { if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Sprite) {
      if ('geometry' in child && child.geometry !== cube && child.geometry !== sphere) child.geometry.dispose();
      for (const mat of Array.isArray(child.material) ? child.material : [child.material]) {
        if (![this.staticCyan, this.staticPink, this.hostile, this.dark, this.silver, this.threatSignal, this.threatEdge, this.warningSignal, this.readySignal, this.disabledSignal, this.threatShell].includes(mat as THREE.MeshStandardMaterial)) {
          const maps = new Set<THREE.Texture>();
          for (const key of ['map', 'bumpMap', 'roughnessMap', 'normalMap'] as const) if (key in mat) { const texture = (mat as unknown as Record<string, unknown>)[key]; if (texture instanceof THREE.Texture) maps.add(texture); }
          maps.forEach(texture => texture.dispose()); mat.dispose();
        }
      }
    } });
  }
  dispose() {
    this.disposed = true; this.renderer.setAnimationLoop(null); this.disposeObject(this.scene); this.reflector.getRenderTarget().dispose();
    for (const material of [this.staticCyan, this.staticPink, this.hostile, this.dark, this.silver, this.threatSignal, this.threatEdge, this.warningSignal, this.readySignal, this.disabledSignal, this.threatShell]) material.dispose();
    this.environment.dispose(); this.sky?.dispose(); this.bloom.dispose(); this.composer.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}

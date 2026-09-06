import type { Gate, LayoutId, Obstacle, SimulationState, Vec2 } from './types';

export interface ArenaLayout {
  id: LayoutId; width: number; depth: number; halfWidth: number; halfDepth: number;
  obstacles: Obstacle[]; coreCandidates: Vec2[]; initialCores: Vec2[]; initialOverdrive: Vec2;
  playerStart: Vec2 & { heading: number }; mineSpawns: Vec2[]; droneSpawns: Vec2[];
  rivalSpawn: Vec2 & { heading: number }; regularGate: Pick<Gate, 'x' | 'z' | 'length' | 'axis'>;
  boss: { anchor: Vec2; pad: Vec2; receptor: Vec2; relayCandidates: Vec2[]; sectors: Pick<Gate, 'x' | 'z' | 'length' | 'axis'>[]; supportSpawn: Vec2 };
  exit: { center: Vec2; halfWidth: number; completionZ: number };
}

const legacyCandidates: Vec2[] = [
  { x: 0, z: -8 }, { x: 0, z: -4 }, { x: 0, z: 4 }, { x: 0, z: 8 },
  ...[-12, -9, -3, 3, 9, 12].flatMap(x => [-8, -5, 5, 8].map(z => ({ x, z }))),
  ...[-12, -10, 10, 12].flatMap(x => [-2, 2].map(z => ({ x, z }))),
];
const expandedCandidates: Vec2[] = [
  { x: 0, z: -9 }, { x: 0, z: -4 }, { x: 0, z: 4 }, { x: 0, z: 9 },
  ...[-14, -11, -4, 4, 11, 14].flatMap(x => [-9, -6, 6, 9].map(z => ({ x, z }))),
  ...[-14, -12, 12, 14].flatMap(x => [-2, 2].map(z => ({ x, z }))),
];
export const LAYOUTS: Record<LayoutId, ArenaLayout> = {
  'neon-spire-v1': {
    id: 'neon-spire-v1', width: 32, depth: 24, halfWidth: 16, halfDepth: 12,
    obstacles: [{ x: -6, z: 0, width: 3, depth: 4, kind: 'machinery' }, { x: 6, z: 0, width: 3, depth: 4, kind: 'machinery' }, { x: -3.75, z: -4.8, width: 0.26, depth: 0.35, kind: 'emitter' }, { x: 3.75, z: -4.8, width: 0.26, depth: 0.35, kind: 'emitter' }],
    coreCandidates: legacyCandidates, initialCores: [{ x: 0, z: 2.5 }, { x: 10, z: 5 }, { x: -10, z: -5 }], initialOverdrive: { x: 0, z: -1 }, playerStart: { x: 0, z: 6, heading: -Math.PI / 2 },
    mineSpawns: [{ x: -10, z: 5 }, { x: 10, z: -7 }, { x: -3, z: -6 }], droneSpawns: [{ x: 10, z: -5 }, { x: -10, z: 5 }], rivalSpawn: { x: -13, z: 3, heading: -Math.PI / 2 },
    regularGate: { x: 0, z: -4.8, length: 7.5, axis: 'x' },
    boss: { anchor: { x: 0, z: -14.3 }, pad: { x: 0, z: 8.5 }, receptor: { x: 0, z: -10.5 }, relayCandidates: [{ x: -10, z: -6 }, { x: 10, z: -6 }, { x: 10, z: 6 }], sectors: [{ x: -6, z: -5, length: 9, axis: 'x' }, { x: 6, z: 4.8, length: 9, axis: 'x' }], supportSpawn: { x: 11, z: -7 } },
    exit: { center: { x: 0, z: -12 }, halfWidth: 2, completionZ: -12.3 },
  },
  'neon-spire-v2': {
    id: 'neon-spire-v2', width: 36, depth: 26, halfWidth: 18, halfDepth: 13,
    obstacles: [{ x: -7, z: 0, width: 3, depth: 4, kind: 'machinery' }, { x: 7, z: 0, width: 3, depth: 4, kind: 'machinery' }, { x: -4.25, z: -5.25, width: 0.26, depth: 0.35, kind: 'emitter' }, { x: 4.25, z: -5.25, width: 0.26, depth: 0.35, kind: 'emitter' }],
    coreCandidates: expandedCandidates, initialCores: [{ x: 0, z: 2.5 }, { x: 12, z: 6 }, { x: -12, z: -6 }], initialOverdrive: { x: 0, z: -1 }, playerStart: { x: 0, z: 6, heading: -Math.PI / 2 },
    mineSpawns: [{ x: -12, z: 6 }, { x: 12, z: -8 }, { x: -3, z: -7 }], droneSpawns: [{ x: 12, z: -6 }, { x: -12, z: 6 }], rivalSpawn: { x: -15, z: 3, heading: -Math.PI / 2 },
    regularGate: { x: 0, z: -5.25, length: 8.5, axis: 'x' },
    boss: { anchor: { x: 0, z: -15.3 }, pad: { x: 0, z: 9.5 }, receptor: { x: 0, z: -11 }, relayCandidates: [{ x: -12, z: -7 }, { x: 12, z: -7 }, { x: 12, z: 7 }], sectors: [{ x: -7, z: -5.5, length: 10, axis: 'x' }, { x: 7, z: 5.5, length: 10, axis: 'x' }], supportSpawn: { x: 13, z: -8 } },
    exit: { center: { x: 0, z: -13 }, halfWidth: 2, completionZ: -13.3 },
  },
};

export function getLayout(state: Pick<SimulationState, 'contentVersion'> & Partial<Pick<SimulationState, 'layoutId'>>): ArenaLayout;
export function getLayout(id?: LayoutId): ArenaLayout;
export function getLayout(source?: LayoutId | (Pick<SimulationState, 'contentVersion'> & Partial<Pick<SimulationState, 'layoutId'>>)): ArenaLayout {
  const id = typeof source === 'string' ? source : source?.layoutId ?? (source?.contentVersion === '0.1.0-neon-spire' ? 'neon-spire-v1' : 'neon-spire-v2');
  return LAYOUTS[id];
}

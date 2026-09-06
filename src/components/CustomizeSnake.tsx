import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Check, RotateCcw, RotateCw } from 'lucide-react';
import { DEFAULT_GLOW, GLOW_PRESETS } from '../game/appearance';
import type { GlowId, PreviewZoom } from '../game/appearance';
import { Modal } from './Modal';
import { MenuSelect } from './MenuSelect';
import './customize-snake.css';

export function CustomizeSnake({ initial, onPreview, onApply, onClose }: {
  initial: GlowId;
  onPreview: (glow: GlowId, rotation: number, zoom: PreviewZoom) => void;
  onApply: (glow: GlowId) => void;
  onClose: () => void;
}) {
  const [glow, setGlow] = useState(initial);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState<PreviewZoom>('full');
  useEffect(() => { onPreview(glow, rotation, zoom); }, [glow, rotation, zoom, onPreview]);
  const selected = GLOW_PRESETS.find(preset => preset.id === glow)!;
  return <Modal title="Customize Snake" subtitle="Body glow" onClose={onClose} className="customize-dialog">
    <div className="customize-layout">
      <div className="snake-preview" data-snake-preview role="img" aria-label={`Live 3D snake with ${selected.name} body glow and a cyan head marker`}>
        <div className="preview-name"><span>LIVE PREVIEW</span><strong>{selected.name}</strong></div>
        <p>The cyan head marker stays visible.</p>
      </div>
      <div className="customize-controls">
        <h3>Choose your glow</h3>
        <div className="glow-swatches" role="group" aria-label="Body glow colors">
          {GLOW_PRESETS.map(preset => <button type="button" key={preset.id}
            className="glow-swatch" style={{ '--glow': preset.color } as CSSProperties}
            aria-label={`${preset.name} glow`} aria-pressed={glow === preset.id}
            data-autofocus={preset.id === initial || undefined} onClick={() => setGlow(preset.id)}>
            <i aria-hidden="true" /><span>{preset.name}</span>{glow === preset.id ? <Check size={16} aria-hidden="true" /> : null}
          </button>)}
        </div>
        <div className="preview-controls">
          <div className="preview-rotate" role="group" aria-label="Rotate snake preview">
            <button type="button" aria-label="Rotate snake left" onClick={() => setRotation(value => value - Math.PI / 8)}><RotateCcw size={18} />Rotate left</button>
            <button type="button" aria-label="Rotate snake right" onClick={() => setRotation(value => value + Math.PI / 8)}><RotateCw size={18} />Rotate right</button>
          </div>
          <MenuSelect label="Preview zoom" value={zoom} options={[{ value: 'full', label: 'Full snake' }, { value: 'close', label: 'Head detail' }]} onChange={setZoom} />
        </div>
        <p className="glow-note">All eight colors are available. Your choice changes the body lights only.</p>
        <button type="button" className="text-button restore-glow" onClick={() => setGlow(DEFAULT_GLOW)}>Restore Cyan</button>
        <div className="customize-actions">
          <button type="button" className="menu-button primary" onClick={() => onApply(glow)}>Apply glow <Check size={18} /></button>
          <button type="button" className="text-button" data-menu-back onClick={onClose}>Cancel</button>
        </div>
        <div className="controller-menu-hints"><span><kbd>A</kbd>Select / apply</span><span><kbd>B</kbd>Cancel</span></div>
      </div>
    </div>
  </Modal>;
}

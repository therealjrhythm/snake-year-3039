import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PICKUPS } from '../game/content';
import type { LabKind, PickupKind } from '../game/types';
import { Modal } from './Modal';
import { MenuSelect } from './MenuSelect';
import { WardenInstructions } from './WardenInstructions';

const options = [...(Object.keys(PICKUPS) as PickupKind[]).map(value => ({ value, label: PICKUPS[value].name })), { value: 'warden' as const, label: 'Warden boss fight' }];

export function PowerupLab({ initial = 'emp', device, onTry, onClose }: { initial?: LabKind; device: 'keyboard' | 'gamepad'; onTry: (kind: LabKind) => void; onClose: () => void }) {
  const [kind, setKind] = useState<LabKind>(initial);
  const fire = device === 'gamepad' ? 'A' : 'F';
  const use = device === 'gamepad' ? 'X' : 'Space';
  const boost = device === 'gamepad' ? 'RT' : 'Shift';
  const pickup = kind === 'warden' ? null : PICKUPS[kind];
  return <Modal title="POWERUP LAB" subtitle="PRACTICE · NO RECORDS OR REWARDS" onClose={onClose} className="lab-dialog">
    <p className="guide-intro">Try a powerup or practice the Warden boss fight.</p>
    <div className="setting-row"><span>Choose what to try</span><MenuSelect label="Choose what to try" value={kind} onChange={setKind} options={options} /></div>
    <div className="lab-description">
      {pickup ? <div className="lab-power" style={{ '--pickup-color': pickup.color } as React.CSSProperties}>
        <figure className="lab-visual">
          <img key={kind} src={`/images/powerups/${kind}.png`} width="320" height="320" alt={`${pickup.name} powerup as it appears in the arena, marked ${pickup.symbol}`} />
          <figcaption>Look for <b>{pickup.symbol}</b> in the arena</figcaption>
        </figure>
        <div className="lab-power-copy">
          <h3>{pickup.name}</h3>
          <p>{pickup.description}</p>
          <p className="lab-use"><strong>How to use</strong><br />{pickup.activation === 'tactical' ? <>Collect it, then press <kbd>{use}</kbd> to use it.{kind === 'decoy' ? ' Use it before an enemy aims.' : ' Get close to a drone or laser first.'}</> : pickup.activation === 'weapon' ? <>Collect it, then hold <kbd>{fire}</kbd> to shoot forward.</> : <>Activates as soon as you collect it.{kind === 'overdrive' ? <> Hold <kbd>{boost}</kbd> to boost.</> : null}</>}</p>
        </div>
      </div> : <><h3>Defeat the Warden</h3><WardenInstructions fire={fire} /></>}
    </div>
    <p className="lab-note">Pause to refill or choose another powerup. Your campaign save stays safe.</p>
    <div className="dialog-footer"><button className="text-button" onClick={onClose}>Cancel</button><button className="small-button" onClick={() => onTry(kind)}>Start practice <ArrowRight size={17} /></button></div>
  </Modal>;
}

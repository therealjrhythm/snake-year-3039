import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PICKUPS } from '../game/content';
import type { LabKind, PickupKind } from '../game/types';
import { Modal } from './Modal';
import { MenuSelect } from './MenuSelect';

export function PowerupLab({ initial = 'emp', onTry, onClose }: { initial?: LabKind; onTry: (kind: LabKind) => void; onClose: () => void }) {
  const [kind, setKind] = useState<LabKind>(initial);
  return <Modal title="POWERUP LAB" subtitle="PRACTICE · NO RECORDS OR REWARDS" onClose={onClose} className="lab-dialog">
    <p className="guide-intro">Choose a system to try in a prepared arena. Pause to refill and reset the encounter, or choose another power. Your suspended campaign stays saved.</p>
    <div className="setting-row"><span>Test system</span><MenuSelect label="Test system" value={kind} onChange={setKind} options={[...(Object.keys(PICKUPS) as PickupKind[]).map(value => ({ value, label: PICKUPS[value].name })), { value: 'warden', label: 'Warden · movement or blaster' }]} /></div>
    <div className="lab-description"><strong>{kind === 'warden' ? 'Warden rehearsal' : PICKUPS[kind].name}</strong><p>{kind === 'warden' ? 'Collect relays 1 → 2 → 3, then cross the pad during recovery or fire three shots at the exposed receptor. Clear all three armor nodes and leave through the north exit.' : PICKUPS[kind].description}</p><p>{kind === 'warden' ? 'You begin with twelve optional blaster shots and an EMP charge.' : 'Pick up the marked power ahead.'} The encounter uses normal movement, collisions and effect timers.</p></div>
    <div className="dialog-footer"><button className="text-button" onClick={onClose}>Cancel</button><button className="small-button" onClick={() => onTry(kind)}>Try system <ArrowRight size={17} /></button></div>
  </Modal>;
}

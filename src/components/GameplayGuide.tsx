import { useState } from 'react';
import { ArrowRight, Gamepad2, Radio, Shield, Zap } from 'lucide-react';
import { PICKUPS } from '../game/content';
import type { PickupKind } from '../game/types';
import { Modal } from './Modal';

export function GameplayGuide({ device, paused, onClose, onEnter }: {
  device: 'keyboard' | 'gamepad'; paused: boolean; onClose: () => void; onEnter: () => void;
}) {
  const [tab, setTab] = useState(paused ? 'Pickups' : 'Basics');
  const [practicePickups, setPracticePickups] = useState(false);
  const use = device === 'gamepad' ? 'X' : 'Space';
  const swap = device === 'gamepad' ? 'Y' : 'E';
  const boost = device === 'gamepad' ? 'RT' : 'Shift';
  const kinds: PickupKind[] = practicePickups ? ['magnet', 'repair', 'decoy', 'splice'] : ['overdrive', 'surge', 'shield', 'emp'];
  return <Modal title="HOW TO PLAY" subtitle="KNOW YOUR SYSTEMS" onClose={onClose} className="guide-dialog">
    <div className="settings-tabs guide-tabs" role="tablist" aria-label="Gameplay guide">
      {['Basics', 'Pickups', 'Tactics'].map(name => <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name}</button>)}
    </div>
    <div className="guide-content" role="tabpanel" aria-label={tab}>
      {tab === 'Basics' ? <div className="guide-grid">
        {[{ icon: ArrowRight, title: 'Keep moving', text: `Steer with ${device === 'gamepad' ? 'the left stick or D-pad' : 'WASD or arrows'}. Releasing keeps your heading. Hold ${boost} to boost; release it to recharge.` },
          { icon: Zap, title: 'Cores versus squares', text: 'Cyan energy cores grow your body and advance the wave. Colored squares are optional bonuses: most activate immediately; tactical charges are stored.' },
          { icon: Shield, title: 'Protect your head', text: 'A shot, mine or laser hitting your HEAD costs one integrity. Attacks passing through trailing segments do not hurt. A shield absorbs one attack; then you have 1.25s protection.' },
          { icon: Radio, title: 'Use your body', text: 'Walls, your own body and rival bodies cause a critical head crash, even with a shield. Cut ahead of a Hunter so its head hits your trailing body.' }].map(({ icon: Icon, title, text }, i) => <article key={title}><div><span>0{i + 1}</span><Icon size={24} /></div><h3>{title}</h3><p>{text}</p></article>)}
      </div> : null}
      {tab === 'Pickups' ? <>
        <p className="guide-intro">Squares do not count toward the core quota. <strong>Automatic bonuses start as soon as you collect them.</strong> Their effects and remaining time appear beside your integrity.</p>
        <div className="pickup-catalog">{kinds.map(kind => {
          const item = PICKUPS[kind];
          const stored = kind === 'emp' || kind === 'decoy';
          return <article key={kind} style={{ '--pickup-color': item.color } as React.CSSProperties}>
            <span className="pickup-symbol" aria-hidden="true">{item.symbol}</span><div><h3>{item.name}</h3><small>{stored ? `Stored · press ${use}` : 'Automatic'} · {practicePickups ? 'Practice' : kind === 'emp' || kind === 'shield' ? 'Wave 2 onward' : 'Wave 1 onward'}</small><p>{item.description}{kind === 'overdrive' ? ` Hold ${boost} to feel the benefit.` : ''}{kind === 'surge' ? ' Adds points, not damage or speed.' : ''}</p></div>
          </article>;
        })}</div>
        <button className="text-button" onClick={() => setPracticePickups(value => !value)}>{practicePickups ? 'Show Neon Spire pickups' : 'Show the four Practice-only pickups'} <ArrowRight size={16} /></button>
      </> : null}
      {tab === 'Tactics' ? <>
        <p className="guide-intro"><strong>Empty means no charge is loaded.</strong> Collect the matching square, then press <kbd>{use}</kbd> to use the selected slot. Press <kbd>{swap}</kbd> to switch. Each charge is used once.</p>
        <div className="guide-grid tactical-guide">
          <article><div><Radio size={28} /><span>◎</span></div><h3>EMP Pulse</h3><p>Introduced in Wave 2. Collect a cyan ◎ square, approach a drone or laser emitter, then use it. The pulse disables eligible systems within 4 arena units for 3 seconds.</p><p>It does not damage Hunters or clear bullets already in flight. Using it out of range still spends the charge.</p></article>
          <article><div><Gamepad2 size={28} /><span>⋈</span></div><h3>Decoy</h3><p>Available in Practice in this build. Collect a purple ⋈ square and use it to leave a hologram for 4 seconds. It diverts future drone locks and absorbs one diverted shot.</p><p>It cannot redirect a shot that was already aimed at you.</p></article>
        </div>
      </> : null}
    </div>
    <div className="dialog-footer"><span className="guide-tab-hint">{device === 'gamepad' ? 'LB / RB · guide tabs' : 'Arrow keys · navigate'}</span><button className="small-button" onClick={paused ? onClose : onEnter}>{paused ? 'Back to paused run' : 'Ready to enter'} <ArrowRight size={17} /></button></div>
  </Modal>;
}

import { useState } from 'react';
import { ArrowRight, Radio, Shield, Zap } from 'lucide-react';
import { PICKUPS, LEGACY_CONTENT_VERSION } from '../game/content';
import type { PickupKind, SimulationState } from '../game/types';
import { Modal } from './Modal';

const groups: { name: string; kinds: PickupKind[] }[] = [
  { name: 'Movement & score', kinds: ['overdrive', 'surge', 'magnet', 'capacitor'] },
  { name: 'Protection', kinds: ['shield', 'repair', 'scrubber', 'chain-buffer'] },
  { name: 'Tactics & weapon', kinds: ['emp', 'decoy', 'splice', 'blaster'] },
];
export function GameplayGuide({ device, paused, state, onClose, onEnter }: {
  device: 'keyboard' | 'gamepad'; paused: boolean; state?: SimulationState | null; onClose: () => void; onEnter: () => void;
}) {
  const [tab, setTab] = useState(paused && state?.boss ? 'Warden' : paused ? 'Pickups' : 'Basics');
  const [group, setGroup] = useState(0);
  const use = device === 'gamepad' ? 'X' : 'Space';
  const swap = device === 'gamepad' ? 'Y' : 'E';
  const boost = device === 'gamepad' ? 'RT' : 'Shift';
  const fire = device === 'gamepad' ? 'A' : 'F';
  const legacy = state?.contentVersion === LEGACY_CONTENT_VERSION;
  return <Modal title="HOW TO PLAY" subtitle="KNOW YOUR SYSTEMS" onClose={onClose} className="guide-dialog">
    {legacy ? <p className="legacy-note">Legacy save · original 32 × 24 rules. The four new powers and blaster route require a new expanded run. Magnet, Repair, Decoy and Tail Splice remain Practice-only in this save.</p> : null}
    <div className="settings-tabs guide-tabs" role="tablist" aria-label="Gameplay guide">
      {['Basics', 'Pickups', 'Tactics', 'Warden'].map(name => <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name}</button>)}
    </div>
    <div className="guide-content" role="tabpanel" aria-label={tab}>
      {tab === 'Basics' ? <div className="guide-grid">
        {[{ icon: ArrowRight, title: 'Keep moving', text: `Steer with ${device === 'gamepad' ? 'the left stick or D-pad' : 'WASD or arrows'}. Releasing keeps your heading. Hold ${boost} to boost; release it to recharge.` },
          { icon: Zap, title: 'Cores and powerups', text: `Cyan energy cores grow your body and advance the wave. Shaped, colored powerups are optional bonuses: most activate immediately; EMP and Decoy are stored.${legacy ? '' : ' The blaster loads ammunition.'}` },
          { icon: Shield, title: 'Protect your head', text: 'A shot, mine or laser hitting your HEAD costs one integrity. Attacks passing through trailing segments do not hurt. A shield absorbs one attack; then you have 1.25s protection. Walls and body crashes remain fatal.' },
          { icon: Radio, title: 'Three waves, then Warden', text: 'Collect twelve cores per wave. Wave 3 introduces the Hunter: cut ahead so its head hits your trailing body, or evade it. After the third quota, Warden begins. Break its three armor nodes and exit north.' }].map(({ icon: Icon, title, text }, i) => <article key={title}><div><span>0{i + 1}</span><Icon size={24} /></div><h3>{title}</h3><p>{text}</p></article>)}
      </div> : null}
      {tab === 'Pickups' ? <>
        <p className="guide-intro">Powerups do not count toward your quota. <strong>Automatic bonuses start on contact.</strong> Effects and timers appear beside integrity; {legacy ? 'charges appear' : 'charges and ammunition appear'} in Tactical Systems.</p>
        <div className="catalog-groups" aria-label="Powerup categories">{groups.map((item, index) => <button className="small-button" key={item.name} aria-pressed={group === index} onClick={() => setGroup(index)}>{item.name}</button>)}</div>
        <div className="pickup-catalog">{groups[group].kinds.map(kind => {
          const item = PICKUPS[kind];
          const activation = item.activation === 'tactical' ? `Stored · press ${use}` : item.activation === 'weapon' ? `Equipped · hold ${fire}` : 'Automatic';
          return <article key={kind} style={{ '--pickup-color': item.color } as React.CSSProperties}>
            <span className="pickup-symbol" aria-hidden="true">{item.symbol}</span><div><h3>{item.name}</h3><small>{activation} · {legacy ? item.legacyIntroduction : item.introduction}</small><p>{item.description}{kind === 'overdrive' ? ` Hold ${boost} to feel the benefit.` : ''}{kind === 'surge' ? ' Adds points, not damage or speed.' : ''}{kind === 'chain-buffer' ? ' Damage still resets the chain.' : ''}</p></div>
          </article>;
        })}</div>
        <p className="fine-print">{legacy ? 'Legacy supply uses weighted random offers; Campaign Decoy is unavailable. ' : 'Repeat tactical offers rotate EMP → Decoy → automatic bonus when safe ground space allows. '}One charge fits each slot. Ground pickups expire after 15 seconds; unneeded bonuses stay on the ground. Try every power in the Practice Powerup Lab.</p>
      </> : null}
      {tab === 'Tactics' ? <>
        <p className="guide-intro"><strong>Empty means no charge is loaded.</strong> Collect ◎ or ⋈, then press <kbd>{use}</kbd> to use the selected slot. Press <kbd>{swap}</kbd> to switch. Each charge is used once.</p>
        <div className="guide-grid tactical-guide">
          <article><h3>EMP Pulse</h3><p>{legacy ? 'Legacy Campaign introduces EMP in Wave 2; later offers are random. ' : 'From Wave 2, with repeat supply opportunities. '}Approach a drone or emitter before using it: eligible systems within 4 units are disabled for 3 seconds. It does not damage Hunters or remove bullets already in flight.</p></article>
          <article><h3>Decoy</h3><p>{legacy ? 'Available in legacy Practice only; this Campaign does not supply it. ' : 'From six cores in Wave 2. '}Leave a 4-second hologram before an enemy aims. It diverts future eligible targeting and absorbs a diverted shot. It cannot turn a bullet already in flight.</p></article>
          <article className="weapon-guide"><h3>Pulse Blaster · {legacy ? 'expanded runs' : `hold ${fire}`}</h3><p>{legacy ? 'Unavailable in this legacy run. Start a new expanded run or enter the Practice Powerup Lab to try the blaster.' : 'Collect ⊕ to load up to twelve shots. Forward aim assist finds a visible target within ten units and a 60° cone; otherwise shots travel straight ahead. Drones take two hits. Solid machinery blocks shots; armored rival serpents still require movement combat. Ammunition carries into Warden.'}</p></article>
        </div>
      </> : null}
      {tab === 'Warden' ? <div className="warden-guide">
        {state?.status === 'extraction' ? <p className="guide-intro"><strong>All armor nodes are broken.</strong> Steer through the open north exit. Relays and discharge pads are no longer needed.</p> : <>
          {state?.boss ? <p className="boss-guide-state">NOW: Relay charge {state.boss.charge} / 3 · Armor nodes remaining {state.boss.nodes} / 3</p> : null}
          <ol><li><strong>Charge:</strong> collect numbered relays 1 → 2 → 3. The next one glows brightest. Touching a later relay does no damage and does not advance charge.</li><li><strong>Wait safely:</strong> avoid the warned laser sector. Three relays bank a charge, but the armor opens only during recovery.</li><li><strong>Break one node:</strong> cross the green discharge pad{legacy ? '.' : ` OR hold ${fire} and land three blaster shots on the exposed inner-edge receptor. The pad always works without ammunition.`}</li><li><strong>Repeat and exit:</strong> collect three new relays for each remaining node. Once all three nodes break, steer through the open north exit.</li></ol>
          <p className="guide-intro">A missed recovery window keeps your relay charge. {legacy ? 'A successful pad discharge spends all three relays and breaks exactly one node.' : 'Partial blaster hits reset when armor closes. Either successful route spends all three relays and breaks exactly one node.'}</p>
        </>}
      </div> : null}
    </div>
    <div className="dialog-footer"><span className="guide-tab-hint">{device === 'gamepad' ? 'LB / RB · guide tabs' : 'Arrow keys · navigate'}</span><button className="small-button" onClick={paused ? onClose : onEnter}>{paused ? 'Back to paused run' : 'Ready to enter'} <ArrowRight size={17} /></button></div>
  </Modal>;
}

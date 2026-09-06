import { useState } from 'react';
import { Keyboard, Gamepad2, Volume2, Monitor, Accessibility, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { MenuSelect } from './MenuSelect';

export type SettingsValue = {
  master: number; music: number; effects: number; quality: 'low' | 'medium' | 'high'; bloom: number;
  reducedMotion: boolean; highContrast: boolean; uiScale: number; deadZone: number;
};
export const DEFAULT_SETTINGS: SettingsValue = { master: 0.6, music: 0.5, effects: 0.7, quality: 'medium', bloom: 0.45, reducedMotion: false, highContrast: false, uiScale: 1, deadZone: 0.18 };
export function readSettings(): SettingsValue {
  try {
    const raw = JSON.parse(localStorage.getItem('s39.settings.v1') || '{}');
    const clean = { ...DEFAULT_SETTINGS };
    for (const key of ['master', 'music', 'effects', 'bloom'] as const) if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) clean[key] = Math.max(0, Math.min(1, raw[key]));
    if (['low', 'medium', 'high'].includes(raw.quality)) clean.quality = raw.quality;
    if (typeof raw.reducedMotion === 'boolean') clean.reducedMotion = raw.reducedMotion;
    if (typeof raw.highContrast === 'boolean') clean.highContrast = raw.highContrast;
    if (typeof raw.uiScale === 'number') clean.uiScale = Math.max(0.8, Math.min(1.5, raw.uiScale));
    if (typeof raw.deadZone === 'number') clean.deadZone = Math.max(0.10, Math.min(0.35, raw.deadZone));
    return clean;
  } catch { return { ...DEFAULT_SETTINGS }; }
}
const tabs = [{ name: 'Controls', icon: Keyboard }, { name: 'Audio', icon: Volume2 }, { name: 'Visuals', icon: Monitor }, { name: 'Accessibility', icon: Accessibility }] as const;
function Range({ label, value, min = 0, max = 1, step = 0.05, onChange, format }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (n: number) => void; format?: (n: number) => string }) {
  return <label className="setting-row"><span>{label}</span><span className="range-control"><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /><output>{format ? format(value) : `${Math.round(value * 100)}%`}</output></span></label>;
}
export function Settings({ value, onChange, onClose }: { value: SettingsValue; onChange: (v: SettingsValue) => void; onClose: () => void }) {
  const [tab, setTab] = useState('Controls');
  const update = <K extends keyof SettingsValue>(key: K, v: SettingsValue[K]) => onChange({ ...value, [key]: v });
  return <Modal title="SETTINGS" subtitle="CUSTOMIZE YOUR EXPERIENCE" onClose={onClose} className="settings-dialog">
    <div className="settings-tabs" role="tablist" aria-label="Settings categories">{tabs.map(({ name, icon: Icon }) => <button role="tab" aria-selected={tab === name} key={name} onClick={() => setTab(name)}><Icon size={16} />{name}</button>)}</div>
    <div className="settings-content" role="tabpanel" aria-label={tab}>
      {tab === 'Controls' ? <><h3>PLAY YOUR WAY</h3><div className="controls-columns"><div><h4><Keyboard size={20} /> Keyboard</h4>{[['Move', 'W A S D / ↑ ↓ ← →'], ['Boost', 'Shift'], ['Use tactical', 'Space'], ['Switch slot', 'E'], ['Pause / back', 'Esc']].map(([label, key]) => <div className="binding" key={label}><span>{label}</span><kbd>{key}</kbd></div>)}</div><div><h4><Gamepad2 size={21} /> Xbox gamepad</h4>{[['Move', 'Left stick / D-pad'], ['Boost', 'RT'], ['Use tactical', 'X'], ['Switch slot', 'Y'], ['Pause / back', 'Menu / B']].map(([label, key]) => <div className="binding" key={label}><span>{label}</span><kbd>{key}</kbd></div>)}</div></div><Range label="Stick dead zone" value={value.deadZone} min={0.10} max={0.35} step={0.01} onChange={n => update('deadZone', n)} /><p className="settings-note">Menus: left stick or D-pad to navigate, A to select, B to go back. A opens choice lists; select an option with the D-pad and A, or cancel with B. Left/right also adjusts values. LB/RB switches tabs.</p></> : null}
      {tab === 'Audio' ? <><h3>THE SOUND OF THE CITY</h3><Range label="Master volume" value={value.master} onChange={n => update('master', n)} /><Range label="Music" value={value.music} onChange={n => update('music', n)} /><Range label="Sound effects" value={value.effects} onChange={n => update('effects', n)} /><p className="settings-note">An original synthesizer score responds to the arena. Audio begins after your first keyboard or mouse interaction.</p></> : null}
      {tab === 'Visuals' ? <><h3>REFLECTED IN NEON</h3><div className="setting-row"><span>Graphics quality</span><MenuSelect label="Graphics quality" value={value.quality} onChange={quality => update('quality', quality)} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} /></div><Range label="Bloom strength" value={value.bloom} onChange={n => update('bloom', n)} /><p className="settings-note">Quality changes render resolution and atmosphere. Collision geometry and warnings stay consistent.</p></> : null}
      {tab === 'Accessibility' ? <><h3>MAKE IT YOURS</h3><Range label="Interface scale" value={value.uiScale} min={0.8} max={1.5} step={0.1} onChange={n => update('uiScale', n)} /><label className="setting-row"><span>Reduce decorative motion</span><input type="checkbox" checked={value.reducedMotion} onChange={e => update('reducedMotion', e.target.checked)} /></label><label className="setting-row"><span>High-contrast interface</span><input type="checkbox" checked={value.highContrast} onChange={e => update('highContrast', e.target.checked)} /></label><p className="settings-note">Assisted rules are available before starting: slower simulation and five integrity markers. Shields still cannot prevent a critical crash.</p></> : null}
    </div>
    <div className="dialog-footer"><button className="text-button" onClick={() => onChange({ ...DEFAULT_SETTINGS })}>Restore defaults</button><button className="small-button" onClick={onClose}>Done <ArrowRight size={16} /></button></div>
  </Modal>;
}

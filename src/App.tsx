import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, AudioLines, ChevronRight, Cpu, Palette, FlaskConical, Gamepad2, HelpCircle, Keyboard, Maximize, Play, Radio, RotateCcw, Save, Settings2, Trophy, Volume2, X } from 'lucide-react';
import { Simulation, FIXED_DT } from './game/simulation';
import { GameRenderer } from './game/renderer';
import { GameInputController } from './game/input';
import { GameAudio } from './game/audio';
import type { AudioStatus } from './game/audio';
import { getSavedRun, saveRun, clearSavedRun, getRecords, commitRecord, getCheckpoint, saveCheckpoint, recordVersion, recordVersionLabel } from './game/persistence';
import type { LocalRecord } from './game/persistence';
import type { Difficulty, GameMode, LabKind, SimulationState } from './game/types';
import { Settings, readSettings } from './components/Settings';
import type { SettingsValue } from './components/Settings';
import { Hud } from './components/Hud';
import { Modal } from './components/Modal';
import { MenuSelect } from './components/MenuSelect';
import { GameplayGuide } from './components/GameplayGuide';
import { CustomizeSnake } from './components/CustomizeSnake';
import { PowerupLab } from './components/PowerupLab';
import { useMenuMotion } from './components/menuMotion';
import { readAppearance, writeAppearance } from './game/appearance';
import type { GlowId } from './game/appearance';
import { CONTENT_VERSION, EXPANDED_CONTENT_VERSION, LEGACY_CONTENT_VERSION } from './game/content';

type Screen = 'title' | 'briefing' | 'countdown' | 'playing' | 'paused' | 'boss-intro' | 'lost-life' | 'results';
type Overlay = 'settings' | 'guide' | 'records' | 'credits' | 'abandon' | 'customize' | 'lab' | null;
const VERSION = '0.3.1';
const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; description: string }[] = [
  { value: 'standard', label: 'Normal', description: '3 health. Regular speed and attack warnings.' },
  { value: 'assisted', label: 'Easier', description: '5 health. The whole game moves 25% slower, with longer attack warnings.' },
  { value: 'expert', label: 'Harder', description: '3 health. Enemy shots are 15% faster, with shorter attack warnings.' },
];

export default function App() {
  const appRoot = useRef<HTMLElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const runtime = useRef<{ renderer: GameRenderer; input: GameInputController; audio: GameAudio } | null>(null);
  const simulation = useRef<Simulation | null>(null);
  const checkpoint = useRef<unknown>(null);
  const savedRun = useRef<unknown>(null);
  const [hasSave, setHasSave] = useState(false);
  const [saveVersion, setSaveVersion] = useState(CONTENT_VERSION);
  const [appearance, setAppearance] = useState(readAppearance);
  const appearanceRef = useRef(appearance);
  const [recordFilter, setRecordFilter] = useState('current');
  const [screen, setScreen] = useState<Screen>('title');
  const screenRef = useRef<Screen>('title');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const overlayRef = useRef<Overlay>(null);
  const overlayOpener = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [graphicsError, setGraphicsError] = useState('');
  const [notice, setNotice] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [pauseCause, setPauseCause] = useState('manual');
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('locked');
  const soundAction = useRef<'enable' | 'toggle' | null>(null);
  const [countdown, setCountdown] = useState(3);
  const countdownEnd = useRef(0);
  const [hud, setHud] = useState<SimulationState | null>(null);
  const [device, setDevice] = useState<'keyboard' | 'gamepad'>('keyboard');
  const [settings, setSettings] = useState(readSettings);
  const settingsRef = useRef(settings);
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const savePending = useRef(false);
  const [eventText, setEventText] = useState('');
  const eventUntil = useRef(0);
  const eventPriority = useRef(0);
  const clockState = useRef({ accumulator: 0, hudAt: 0, lastEvent: 0, pendingUse: false, pendingSwap: false });
  const resetFeedback = (sim: Simulation, freshStart = false) => { clockState.current.lastEvent = freshStart ? 0 : sim.state.eventCounter; setEventText(''); eventUntil.current = 0; eventPriority.current = 0; };
  const pauseHandler = useRef<(reason: string) => void>(() => {});
  const tickHandler = useRef<(now: number, elapsed: number) => void>(() => {});
  const terminalRuns = useRef(new Set<string>());
  useMenuMotion(appRoot, settings.reducedMotion);

  const changeScreen = useCallback((next: Screen) => {
    screenRef.current = next; setScreen(next);
    runtime.current?.input.clear(); runtime.current?.input.setGameplay(next === 'playing');
    simulation.current?.clearInput();
    runtime.current?.audio.setPaused(next !== 'playing' && next !== 'title' && next !== 'briefing');
  }, []);
  const changeOverlay = useCallback((next: Overlay) => {
    if (savePending.current) return;
    if (overlayRef.current === 'customize' && next !== 'customize') { runtime.current?.renderer.setPreview(null); runtime.current?.renderer.setAppearance(appearanceRef.current); }
    if (next && !overlayRef.current) overlayOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlayRef.current = next; setOverlay(next); runtime.current?.input.clear();
    if (!next) {
      const previous = overlayOpener.current; overlayOpener.current = null;
      // Capture before the opener becomes inert; restore after React removes inert.
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if ((!active || active === document.body || active === previous) && !overlayRef.current && previous?.isConnected && previous.getClientRects().length && !previous.closest('[inert]') && !document.querySelector('[role="dialog"][aria-modal="true"]')) previous.focus();
      });
    }
  }, []);
  const refreshHud = () => { if (simulation.current) setHud(structuredClone(simulation.current.state)); };

  useEffect(() => {
    let alive = true;
    getSavedRun().then(value => {
      if (!alive || !value) return;
      try { const saved = Simulation.restore(value); setSaveVersion(saved.state.contentVersion); savedRun.current = value; setHasSave(true); }
      catch { setNotice('A saved run is incompatible or damaged. Your local records are still available.'); }
    }).catch(() => { if (alive) setNotice('Storage is unavailable. You can play, but progress may be lost.'); });
    getRecords().then(value => { if (alive) setRecords(value); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!mount.current) return;
    let renderer: GameRenderer;
    const audio = new GameAudio(setAudioStatus);
    setAudioStatus(audio.getStatus());
    const input = new GameInputController(reason => pauseHandler.current(reason));
    input.setGameplay(screenRef.current === 'playing');
    audio.setPaused(!['playing', 'title', 'briefing'].includes(screenRef.current));
    audio.setIntensity(['title', 'briefing'].includes(screenRef.current) ? 'title' : simulation.current?.state.boss ? 'boss' : 'playing');
    try {
      renderer = new GameRenderer(mount.current, () => { pauseHandler.current('Graphics connection lost. Reload to recover your saved run.'); setGraphicsError('The graphics context was lost. Reload the game to rebuild the scene.'); }, () => setReady(true));
    } catch {
      input.dispose(); audio.dispose(); setGraphicsError('WebGL 2 could not start. Enable hardware acceleration and open the game in a supported desktop browser.'); return;
    }
    runtime.current = { renderer, input, audio };
    renderer.setSettings(settingsRef.current); renderer.setAppearance(appearanceRef.current); input.deadZone = settingsRef.current.deadZone;
    audio.setLevels(settingsRef.current.master, settingsRef.current.music, settingsRef.current.effects);
    const preview = new Simulation({ seed: 3039 });
    let last = 0;
    renderer.setAnimationLoop(time => {
      const now = time / 1000;
      const elapsed = last ? now - last : 0; last = now;
      tickHandler.current(now, elapsed);
      renderer.render(simulation.current?.state ?? preview.state, screenRef.current === 'title' || screenRef.current === 'briefing', now);
    });
    const unlock = () => { void audio.unlock(); };
    const resize = () => { if (renderer.resize() && (screenRef.current === 'playing' || screenRef.current === 'countdown')) pauseHandler.current('The viewport changed. The arena has been refitted.'); };
    const freezeCountdown = () => { if (screenRef.current === 'countdown') pauseHandler.current('focus-lost'); };
    const hidden = () => { audio.setVisible(!document.hidden); if (document.hidden) freezeCountdown(); };
    audio.setVisible(!document.hidden);
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock); window.addEventListener('resize', resize); window.addEventListener('blur', freezeCountdown); document.addEventListener('visibilitychange', hidden);
    return () => { runtime.current = null; window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); window.removeEventListener('resize', resize); window.removeEventListener('blur', freezeCountdown); document.removeEventListener('visibilitychange', hidden); renderer.dispose(); input.dispose(); audio.dispose(); };
  }, []);

  const pause = (reason = 'pause', interruptedTactical?: 'EMP' | 'Decoy') => {
    if (savePending.current) return;
    if (overlayRef.current) { if (['pause', 'back'].includes(reason)) changeOverlay(null); return; }
    const current = screenRef.current;
    if (current === 'playing' || current === 'countdown') {
      const cause = reason === 'pause' ? 'manual' : reason === 'focus-lost' ? 'focus' : reason === 'controller-disconnected' ? 'controller' : reason.includes('viewport') ? 'viewport' : /frame|pac(?:e|ing)|performance/i.test(reason) ? 'performance' : 'recovery';
      setPauseCause(cause);
      const retainedTactical = interruptedTactical ? ` ${interruptedTactical} was not deployed; its charge is still available. Resume, then press ${runtime.current?.input.device === 'gamepad' ? 'X' : 'Space'} again.`
        : simulation.current?.state.decoys.some(decoy => decoy.ttl > 0) ? ' Your Decoy is deployed; its timer is frozen until you resume.' : '';
      setPauseReason(cause === 'focus' ? 'The game lost focus. Resume when you are ready.' : cause === 'controller' ? 'Your controller disconnected. Reconnect or choose keyboard, then resume.' : cause === 'manual' ? 'Take a breath. The city can wait.' : cause === 'performance' ? `A long frame interrupted play. The game paused to prevent an unseen crash.${retainedTactical}` : reason);
      changeScreen('paused'); refreshHud();
    }
    else if (current === 'paused' && ['pause', 'back'].includes(reason)) resume();
    else if (['briefing', 'results'].includes(current) && ['pause', 'back'].includes(reason)) { simulation.current = null; changeScreen('title'); runtime.current?.audio.setIntensity('title'); }
  };
  pauseHandler.current = pause;
  const startCountdown = () => { simulation.current?.resume(); setCountdown(3); countdownEnd.current = performance.now() / 1000 + 3; changeScreen('countdown'); refreshHud(); };
  const resume = () => { if (simulation.current && !savePending.current) startCountdown(); };
  const start = (mode: GameMode) => {
    const launch = () => {
      const sim = new Simulation({ difficulty, mode, seed: Math.floor(Math.random() * 0x7fffffff) });
      simulation.current = sim; checkpoint.current = sim.snapshot(); resetFeedback(sim, true);
      if (mode === 'campaign') void saveCheckpoint(checkpoint.current).catch(() => setNotice('The checkpoint is available this session, but could not be saved to disk.'));
      runtime.current?.audio.setIntensity('playing'); changeOverlay(null); startCountdown();
    };
    if (hasSave) { void clearSavedRun().then(() => { savedRun.current = null; setHasSave(false); launch(); }).catch(() => setNotice('Could not clear the old suspended run. Try again before starting.')); }
    else launch();
  };
  const startLab = (kind: LabKind) => {
    const sim = Simulation.createLab(kind); simulation.current = sim; checkpoint.current = null; resetFeedback(sim, true);
    runtime.current?.audio.setIntensity(kind === 'warden' ? 'boss' : 'playing'); changeOverlay(null); startCountdown();
  };
  const refillLab = () => {
    const sim = simulation.current; if (!sim?.state.lab) return;
    sim.refillLab(); resetFeedback(sim, true); startCountdown();
  };
  const leaveLab = () => { simulation.current = null; changeOverlay(null); changeScreen('title'); runtime.current?.audio.setIntensity('title'); };
  const replaySeed = () => {
    const old = simulation.current?.state; if (!old) return;
    if (old.lab) { const sim = Simulation.createLab(old.lab, old.seed); simulation.current = sim; resetFeedback(sim, true); startCountdown(); return; }
    const sim = new Simulation({ difficulty: old.difficulty, mode: old.mode, seed: old.seed, layoutId: old.layoutId, contentVersion: old.contentVersion });
    simulation.current = sim; checkpoint.current = sim.snapshot(); resetFeedback(sim, true);
    if (sim.state.mode === 'campaign') void saveCheckpoint(checkpoint.current).catch(() => setNotice('Checkpoint kept in this session; disk storage failed.'));
    runtime.current?.audio.setIntensity('playing'); startCountdown();
  };
  const applyAppearance = (glow: GlowId) => {
    setAppearance(glow); appearanceRef.current = glow; const result = writeAppearance(glow);
    if (result.error) setNotice(result.error); changeOverlay(null);
  };
  const retry = (fromCheckpoint: boolean) => {
    const old = simulation.current;
    if (fromCheckpoint && checkpoint.current) {
      simulation.current = Simulation.restore(checkpoint.current);
      simulation.current.state.runId = crypto.randomUUID(); resetFeedback(simulation.current);
      if (simulation.current.state.status === 'boss-intro') simulation.current.beginBoss();
      runtime.current?.audio.setIntensity(simulation.current.state.boss ? 'boss' : 'playing'); startCountdown();
    } else start(old?.state.mode ?? 'campaign');
  };
  const retryLife = () => {
    const sim = simulation.current;
    if (!sim || savePending.current || !sim.retryCurrentWave()) return;
    checkpoint.current = sim.state.retryCheckpoint; resetFeedback(sim);
    runtime.current?.audio.setIntensity(sim.state.boss ? 'boss' : 'playing'); startCountdown();
  };
  const saveAndExit = async () => {
    const sim = simulation.current; if (!sim || savePending.current) return;
    savePending.current = true; setBusy(true);
    try { const snapshot = sim.snapshot(); await saveRun(snapshot); savedRun.current = snapshot; setHasSave(true); setSaveVersion(sim.state.contentVersion); simulation.current = null; changeScreen('title'); runtime.current?.audio.setIntensity('title'); }
    catch { setNotice('The run could not be saved. Your game is still paused; resume or retry saving.'); }
    finally { savePending.current = false; setBusy(false); }
  };
  const continueRun = () => {
    try {
      simulation.current = Simulation.restore(savedRun.current); checkpoint.current = null; resetFeedback(simulation.current);
      void getCheckpoint().then(value => { if (value) { try { const restored = Simulation.restore(value); if (restored.state.seed === simulation.current?.state.seed && restored.state.contentVersion === simulation.current?.state.contentVersion) checkpoint.current = value; } catch { /* The exact suspend still remains usable. */ } } }).catch(() => {});
      setDifficulty(simulation.current.state.difficulty);
      runtime.current?.audio.setIntensity(simulation.current.state.boss ? 'boss' : 'playing');
      if (['dead', 'complete'].includes(simulation.current.state.status)) endRun(simulation.current); else startCountdown();
    } catch { setNotice('This saved run could not be restored. You can start a fresh district.'); }
  };
  const endRun = (sim: Simulation) => {
    const state = sim.state; refreshHud();
    if (sim.canRetry) {
      changeScreen('lost-life');
      if (state.mode === 'campaign') {
        // Save the spent life, including its exact retry entry, before a reload.
        const snapshot = sim.snapshot();
        void saveRun(snapshot).then(() => {
          if (simulation.current?.state.runId !== state.runId || terminalRuns.current.has(state.runId)) return;
          savedRun.current = snapshot; setHasSave(true); setSaveVersion(state.contentVersion);
        }).catch(() => setNotice('Life progress is kept this session. Saving to this browser failed.'));
      }
      return;
    }
    changeScreen('results');
    if (state.mode === 'practice' || terminalRuns.current.has(state.runId)) return;
    terminalRuns.current.add(state.runId);
    const record: LocalRecord = { runId: state.runId, score: state.score, cores: state.totalCores, rivalKills: state.rivalKills, wave: state.wave, elapsed: state.time, completed: state.status === 'complete', difficulty: state.difficulty, date: new Date().toISOString(), cause: state.deathCause, contentVersion: state.contentVersion, districtId: 'D1', mode: state.mode, seed: state.seed };
    void commitRecord(record).then(() => { savedRun.current = null; setHasSave(false); return getRecords(); }).then(setRecords).catch(() => { terminalRuns.current.delete(state.runId); setNotice('Result storage failed. This score remains visible, but was not saved.'); });
  };
  tickHandler.current = (now, elapsed) => {
    const active = runtime.current; if (!active) return;
    const input = active.input.poll(); if (active.input.device !== device) setDevice(active.input.device);
    const clock = clockState.current;
    if (eventText && now > eventUntil.current) setEventText('');
    if (screenRef.current === 'countdown') {
      const remaining = Math.ceil(countdownEnd.current - now);
      if (remaining <= 0) { clock.accumulator = 0; clock.pendingUse = false; clock.pendingSwap = false; changeScreen('playing'); }
      else if (remaining !== countdown) setCountdown(remaining);
      return;
    }
    if (screenRef.current !== 'playing' || overlayRef.current) { clock.accumulator = 0; return; }
    const sim = simulation.current; if (!sim) return;
    if (elapsed > 0.25) {
      // An input edge can arrive on the interrupted frame before any fixed
      // step runs. Keep its unspent charge and explain the required fresh press;
      // never replay the action automatically across a pause or countdown.
      const slot = input.swap || clock.pendingSwap ? 1 - sim.state.selectedSlot : sim.state.selectedSlot;
      const interruptedTactical = (input.use || clock.pendingUse) && sim.state.slots[slot] ? slot === 0 ? 'EMP' : 'Decoy' : undefined;
      pause('A long frame interrupted play. Resume when the game is ready.', interruptedTactical); return;
    }
    clock.accumulator += elapsed; clock.pendingUse ||= input.use; clock.pendingSwap ||= input.swap;
    let steps = 0;
    while (clock.accumulator >= FIXED_DT && steps < 5) {
      sim.step(FIXED_DT, { ...input, use: clock.pendingUse, swap: clock.pendingSwap });
      clock.pendingUse = false; clock.pendingSwap = false; clock.accumulator -= FIXED_DT; steps++;
      if (['dead', 'complete', 'boss-intro'].includes(sim.state.status)) break;
    }
    // Several collisions and threats can emit during one rendered frame. Keep
    // every sound category, and let direct feedback outlast routine warnings.
    const freshEvents = sim.state.events.filter(event => event.id > clock.lastEvent);
    const sounded = new Set<string>();
    for (const event of freshEvents) {
      clock.lastEvent = event.id;
      const soundKey = `${event.kind}:${event.relay ?? event.pickup ?? ''}`;
      if (!sounded.has(soundKey)) { active.audio.event(event); sounded.add(soundKey); }
      const priority = ['damage', 'shield-hit', 'crash', 'emp', 'decoy', 'empty', 'charge-ready', 'boss-node', 'boss-defeated'].includes(event.kind) ? 4
        : ['pickup', 'decoy-hit'].includes(event.kind) ? 3
          : ['core', 'shot', 'lock', 'mine-arm', 'select', 'player-shot', 'drone-hit', 'receptor-hit'].includes(event.kind) ? 0 : 2;
      if (priority > 0 && (now >= eventUntil.current || priority >= eventPriority.current)) {
        setEventText(event.text); eventUntil.current = now + (priority >= 3 ? 4 : 2.5); eventPriority.current = priority;
      }
    }
    if (sim.state.status === 'dead' || sim.state.status === 'complete') { endRun(sim); return; }
    if (sim.state.status === 'boss-intro') { checkpoint.current = sim.snapshot(); if (sim.state.mode === 'campaign') void saveCheckpoint(checkpoint.current).catch(() => setNotice('Boss checkpoint kept in memory; persistent storage failed.')); refreshHud(); changeScreen('boss-intro'); return; }
    if (clock.accumulator >= FIXED_DT || sim.state.pauseRequested) { pause(sim.state.pauseRequested ?? 'Frame pacing needs to recover. Resume when ready.'); sim.state.pauseRequested = null; return; }
    if (now - clock.hudAt > 0.09) { clock.hudAt = now; refreshHud(); }
  };
  const updateSettings = (value: SettingsValue) => {
    setSettings(value); settingsRef.current = value; runtime.current?.renderer.setSettings(value);
    runtime.current?.audio.setLevels(value.master, value.music, value.effects); if (runtime.current) runtime.current.input.deadZone = value.deadZone;
    try { localStorage.setItem('s39.settings.v1', JSON.stringify(value)); } catch { setNotice('Settings are applied for this session. Storage is unavailable.'); }
  };
  const abandon = async () => {
    try { await clearSavedRun(); savedRun.current = null; setHasSave(false); simulation.current = null; changeOverlay(null); changeScreen('title'); runtime.current?.audio.setIntensity('title'); }
    catch { setNotice('Could not clear the suspended run. Your current run is still paused.'); }
  };
  const fullscreen = () => { void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => setNotice('Fullscreen was unavailable. You can keep playing in this window.')); };
  const best = records.filter(r => r.difficulty === (hud?.difficulty ?? difficulty) && recordVersion(r) === (simulation.current?.state.contentVersion ?? CONTENT_VERSION) && (r.mode ?? 'campaign') === (simulation.current?.state.mode ?? 'campaign') && (r.districtId ?? 'D1') === 'D1').reduce((n, r) => Math.max(n, r.score), 0);
  const visibleRecords = records.filter(record => recordFilter === 'all' || recordVersion(record) === (recordFilter === 'current' ? CONTENT_VERSION : recordFilter === 'expanded' ? EXPANDED_CONTENT_VERSION : LEGACY_CONTENT_VERSION));
  const showHud = hud && !['title', 'briefing'].includes(screen);
  const audioNeedsGesture = settings.master > 0 && audioStatus !== 'running';
  const soundLabel = settings.master === 0 ? 'OFF' : audioStatus === 'running' ? 'ON' : 'ENABLE';
  useEffect(() => {
    const frame = requestAnimationFrame(() => { if (!overlayRef.current) runtime.current?.input.focusMenu(); });
    return () => cancelAnimationFrame(frame);
  }, [screen, ready]);

  return <main ref={appRoot} className={`app ${settings.highContrast ? 'high-contrast' : ''} ${settings.reducedMotion ? 'reduced-motion' : ''}`} style={{ '--ui-scale': settings.uiScale } as React.CSSProperties}>
    <div ref={mount} className={`world ${screen === 'title' || screen === 'briefing' ? 'cinematic' : ''}`} />
    <div className="screen-vignette" aria-hidden="true" />
    {screen === 'title' || screen === 'briefing' ? <><header className="title-header" inert={overlay !== null}><span className="system-mark"><Cpu size={19} /> S–39 <i /> AUTONOMOUS SYSTEMS</span><div><button className="icon-button" aria-label="Toggle sound" onPointerDown={() => { soundAction.current = audioNeedsGesture ? 'enable' : 'toggle'; }} onPointerCancel={() => { soundAction.current = null; }} onKeyDown={event => { if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) soundAction.current = audioNeedsGesture ? 'enable' : 'toggle'; }} onClick={() => { const action = soundAction.current ?? (audioNeedsGesture ? 'enable' : 'toggle'); soundAction.current = null; if (action === 'enable') void runtime.current?.audio.unlock(); else updateSettings({ ...settings, master: settings.master > 0 ? 0 : 0.6 }); }}><Volume2 size={18} /><span>{soundLabel}</span></button><button className="icon-button" onClick={fullscreen} aria-label="Toggle fullscreen"><Maximize size={18} /></button></div></header><div className="title-bottom"><span>NEON SPIRE <i /> DEVELOPMENT BUILD {VERSION}</span><span>{device === 'keyboard' ? <Keyboard size={15} /> : <Gamepad2 size={17} />}{device === 'keyboard' ? 'KEYBOARD READY' : 'GAMEPAD DETECTED'}<span className="tiny-dot" /></span></div></> : null}
    {screen === 'title' ? <div className="title-layout" data-menu inert={overlay !== null}><div className="game-logo" aria-label="Snake: Year 3039"><h1>SNAKE</h1><div>YEAR <b>3039</b></div></div><div className="title-tagline"><p>Collect energy. Outsmart the system.</p><span>Turn your own path into a weapon.</span></div><nav className="main-menu" aria-label="Main menu">{hasSave ? <button className="menu-button primary" onClick={continueRun} disabled={!ready} data-autofocus><Play size={21} fill="currentColor" />CONTINUE RUN<ChevronRight size={19} /></button> : null}<button className={`menu-button ${hasSave ? '' : 'primary'}`} onClick={() => changeScreen('briefing')} disabled={!ready} data-autofocus={!hasSave || undefined}><Play size={21} fill="currentColor" />{ready ? 'START GAME' : 'INITIALIZING SCENE'}<ChevronRight size={19} /></button><button className="menu-button" onClick={() => changeOverlay('lab')} disabled={!ready}><FlaskConical size={22} />POWERUP LAB<ChevronRight size={19} /></button><button className="menu-button" onClick={() => changeOverlay('customize')} disabled={!ready}><Palette size={22} />CUSTOMIZE SNAKE<ChevronRight size={19} /></button><button className="menu-button" onClick={() => changeOverlay('settings')}><Settings2 size={23} />SETTINGS<ChevronRight size={19} /></button><button className="menu-button" onClick={() => changeOverlay('guide')}><HelpCircle size={22} />HOW TO PLAY<ChevronRight size={19} /></button></nav>{hasSave && saveVersion !== CONTENT_VERSION ? <p className="saved-rules-note">Continue keeps earlier rules. Start Game adds three lives and the laser boss.</p> : null}<nav className="secondary-menu" aria-label="Records and credits"><button onClick={() => changeOverlay('records')}><Trophy size={17} />LOCAL RECORDS</button><button onClick={() => changeOverlay('credits')}>CREDITS</button></nav>{device === 'gamepad' ? <div className="controller-menu-hints"><span>↕ Navigate</span><span><kbd>A</kbd> Select</span><span><kbd>B</kbd> Back</span></div> : null}</div> : null}
    {screen === 'title' ? <div className="scene-caption"><span className="caption-line" /><p>THE CITY IS A CIRCUIT.</p><strong>Make your own path.</strong><span>01 / NEON SPIRE</span></div> : null}
    {screen === 'briefing' ? <div className="briefing panel" data-menu inert={overlay !== null}><button className="text-button" onClick={() => changeScreen('title')}><ArrowLeft size={16} />BACK</button><div className="briefing-number">01</div><span className="hud-label">CAMPAIGN / FIRST DISTRICT</span><h2>NEON SPIRE</h2><p>The city closed its energy network.<br />You were built to open it.</p><div className="briefing-stats"><div><strong>03</strong><span>COLLECTION WAVES</span></div><div><strong>36</strong><span>ENERGY CORES</span></div><div><Radio size={29} /><span>WARDEN FINALE</span></div></div><div className="difficulty-label"><span>DIFFICULTY</span><MenuSelect label="Difficulty" value={difficulty} onChange={setDifficulty} options={DIFFICULTY_OPTIONS} /><p className="difficulty-description" aria-live="polite">{DIFFICULTY_OPTIONS.find(option => option.value === difficulty)?.description}</p></div><p className="briefing-tip">36 × 26 arena · twelve powerups. Three collection waves, then Warden. You move continuously. Steer with {device === 'keyboard' ? 'WASD or arrows' : 'the left stick or D-pad'}. Health protects you from enemy attacks. Hitting a wall or your own body ends a life on every difficulty.</p>{hasSave ? <p className="replace-note">Starting a new run replaces your suspended run{saveVersion === LEGACY_CONTENT_VERSION ? ' (legacy 32 × 24 rules)' : ''}. The Powerup Lab keeps it.</p> : null}<button className="menu-button primary" onClick={() => start('campaign')} data-autofocus><Play size={20} fill="currentColor" />ENTER NEON SPIRE<ArrowRight size={20} /></button><button className="menu-button practice-button" onClick={() => start('practice')}><RotateCcw size={20} />PRACTICE WITHOUT RECORDS<ArrowRight size={20} /></button></div> : null}
    {showHud ? <div inert={screen !== 'playing' || overlay !== null}><Hud state={hud} device={device} onPause={() => pause()} best={best} practice={hud.mode === 'practice'} /></div> : null}
    {screen === 'playing' && eventText ? <div className="event-toast" role="status">{eventText}</div> : null}
    {screen === 'countdown' ? <div className="countdown-overlay"><span>SYSTEMS READY</span><strong key={countdown}>{countdown}</strong><p>{hud?.boss ? 'WARDEN / BREAK THE CONTROL NODES' : 'NEON SPIRE / FIND YOUR CURRENT'}</p></div> : null}
    {screen === 'paused' ? <div className="center-overlay"><section className="pause-panel panel" data-menu inert={overlay !== null || busy}><div className="hud-label">{pauseCause === 'manual' ? 'SIMULATION SUSPENDED' : `AUTOMATIC PAUSE · ${pauseCause.toUpperCase()}`}</div><h2>PAUSED</h2><p>{pauseReason}</p><button className="menu-button primary" onClick={resume} data-autofocus><Play size={18} />RESUME<ArrowRight size={18} /></button><button className="menu-button" onClick={() => changeOverlay('settings')}><Settings2 size={18} />SETTINGS</button><button className="menu-button" onClick={() => changeOverlay('guide')}><HelpCircle size={18} />PICKUPS &amp; TACTICS</button><button className="menu-button" onClick={() => changeOverlay('customize')}><Palette size={18} />CUSTOMIZE SNAKE</button>{hud?.lab ? <><button className="menu-button" onClick={refillLab}><RotateCcw size={18} />REFILL &amp; RESET LAB</button><button className="menu-button" onClick={() => changeOverlay('lab')}><FlaskConical size={18} />CHOOSE LAB SYSTEM</button><button className="menu-button" onClick={leaveLab}><X size={18} />LEAVE LAB</button></> : <><button className="menu-button" onClick={() => changeOverlay('abandon')}><X size={18} />RETURN TO TITLE</button><button className="menu-button" onClick={saveAndExit} disabled={busy}><Save size={18} />{busy ? 'SAVING RUN…' : 'SAVE & EXIT'}</button></>}{pauseCause === 'performance' && settings.quality !== 'low' ? <button className="text-button performance-recovery" onClick={() => { updateSettings({ ...settings, quality: 'low' }); resume(); }}>Use Low graphics &amp; resume <ArrowRight size={16} /></button> : null}<p className="fine-print">Movement and ability timers are frozen.{pauseCause === 'performance' && settings.quality === 'low' ? ' Close heavy browser tabs before resuming if this repeats.' : ''}</p></section></div> : null}
    {screen === 'boss-intro' ? <div className="center-overlay"><section className="boss-intro-panel panel" data-menu><span className="hud-label">PERIMETER AUTHORITY / CONTROL LINK DETECTED</span><h2>THE WARDEN</h2><p>Break three armor pieces to open the exit.</p><ol><li>Collect the glowing spheres 1 → 2 → 3 in order.</li>{hud?.contentVersion === CONTENT_VERSION ? <><li>Face the glowing ⊕ target at the top-center. Hold <kbd>{device === 'gamepad' ? 'A' : 'F'}</kbd> to fire your snake’s laser. Three hits break one armor piece.</li><li>Orange lines warn where Warden will shoot. Keep moving to dodge the red shots. Your boss laser needs no ammunition.</li></> : <><li>Find the round floor pad at the bottom-center. Avoid the lasers and wait until the pad turns green.</li><li>{hud?.contentVersion === LEGACY_CONTENT_VERSION ? 'Steer through the green pad to break one armor piece.' : `Steer through the green pad, or hold ${device === 'gamepad' ? 'A' : 'F'} to land three blaster hits on the yellow ⊕ target below Warden.`}</li></>}</ol><p>Repeat with new numbers for each armor piece.<br />Once all three break, leave through the gate at the top-center.</p><button className="menu-button primary" data-autofocus onClick={() => { simulation.current?.beginBoss(); runtime.current?.audio.setIntensity('boss'); startCountdown(); }}><Play size={20} />BREAK THE CIRCUIT<ArrowRight size={19} /></button></section></div> : null}
    {screen === 'lost-life' && hud ? <div className="center-overlay"><section className="life-panel panel" data-menu inert={overlay !== null || busy}><span className="hud-label">LIFE LOST · {hud.lives} {hud.lives === 1 ? 'LIFE' : 'LIVES'} REMAINING</span><h2>GET BACK IN THE FIGHT</h2><p>{hud.deathCause}. Restart {hud.boss ? 'the Warden fight' : `Wave ${hud.wave}`} with the score and equipment you had when it began.</p><button className="menu-button primary" onClick={retryLife} data-autofocus><RotateCcw size={19} />{hud.boss ? 'RETRY WARDEN' : `RETRY WAVE ${hud.wave}`}<ArrowRight size={18} /></button>{hud.mode === 'campaign' ? <button className="menu-button" onClick={saveAndExit} disabled={busy}><Save size={18} />{busy ? 'SAVING RUN…' : 'SAVE & EXIT'}</button> : <button className="menu-button" onClick={leaveLab}><ArrowLeft size={18} />RETURN TO TITLE</button>}<p className="fine-print">Three lives per attempt. Your run ends when all three are used.</p></section></div> : null}
    {screen === 'results' && hud ? <div className="center-overlay"><section className="results-panel panel" data-menu inert={overlay !== null}><span className="hud-label">{hud.mode === 'practice' ? 'PRACTICE COMPLETE / NO RECORDS AWARDED' : hud.status === 'complete' ? 'DISTRICT 01 / EXTRACTION COMPLETE' : 'S–39 / SIGNAL LOST'}</span><h2>{hud.status === 'complete' ? 'NEON SPIRE LIBERATED' : 'CONNECTION SEVERED'}</h2><p>{hud.status === 'complete' ? 'The first circuit is open. You found your own way.' : hud.contentVersion === CONTENT_VERSION ? `All three lives used. ${hud.deathCause}. ${hud.lab ? 'Restart this Lab challenge to try again.' : 'Start a new attempt from Wave 1.'}` : hud.deathCause}</p><div className="result-score"><span>RUN SCORE</span><strong>{hud.score.toLocaleString('en-US')}</strong></div><div className="result-stats"><span><b>{hud.totalCores}</b>CORES</span><span><b>{hud.rivalKills}</b>BODY-BLOCKS</span><span><b>{Math.floor(hud.time / 60)}:{String(Math.floor(hud.time % 60)).padStart(2, '0')}</b>ACTIVE TIME</span></div>{checkpoint.current && hud.status !== 'complete' && hud.contentVersion !== CONTENT_VERSION ? <button className="menu-button primary" onClick={() => retry(true)} data-autofocus><RotateCcw size={18} />RETRY CHECKPOINT<ArrowRight size={18} /></button> : null}<button className="menu-button" onClick={replaySeed}><RotateCcw size={18} />REPLAY THIS SEED</button><button className={`menu-button ${hud.status === 'complete' ? 'primary' : ''}`} onClick={() => hud.lab ? startLab(hud.lab) : retry(false)}><RotateCcw size={18} />{hud.lab ? 'RESTART LAB' : 'RESTART DISTRICT'}</button><button className="text-button result-return" onClick={() => { simulation.current = null; changeScreen('title'); runtime.current?.audio.setIntensity('title'); }}><ArrowLeft size={16} />RETURN TO TITLE</button>{hud.status === 'complete' ? <p className="fine-print">Neon Spire development checkpoint complete. The remaining city is still in production.</p> : null}</section></div> : null}
    {overlay === 'settings' ? <Settings value={settings} onChange={updateSettings} onClose={() => changeOverlay(null)} /> : null}
    {overlay === 'customize' ? <CustomizeSnake initial={appearance} onPreview={(glow, rotation, zoom) => { runtime.current?.renderer.setAppearance(glow); runtime.current?.renderer.setPreview({ rotation, zoom }); }} onApply={applyAppearance} onClose={() => changeOverlay(null)} /> : null}
    {overlay === 'lab' ? <PowerupLab device={device} initial={hud?.lab ?? 'emp'} onTry={startLab} onClose={() => changeOverlay(null)} /> : null}
    {overlay === 'guide' ? <GameplayGuide state={screen === 'paused' ? hud : null} device={device} paused={screen === 'paused'} onClose={() => changeOverlay(null)} onEnter={() => { changeOverlay(null); changeScreen('briefing'); }} /> : null}
    {overlay === 'records' ? <Modal title="LOCAL RECORDS" subtitle="YOUR SIGNAL. YOUR MACHINE." onClose={() => changeOverlay(null)} className="records-dialog"><MenuSelect label="Record collection" value={recordFilter} onChange={setRecordFilter} options={[{ value: 'current', label: 'Laser & three lives · 0.3' }, { value: 'expanded', label: 'Earlier expanded arena · 0.2' }, { value: 'legacy', label: 'Legacy arena · 0.1' }, { value: 'all', label: 'All retained records' }]} />{visibleRecords.length ? <div className="records-table"><div className="records-row records-head"><span>RULES / RESULT</span><span>SCORE</span><span>CORES</span></div>{visibleRecords.slice().sort((a, b) => b.score - a.score).slice(0, 12).map(record => <div className="records-row" key={record.runId}><div><strong>{record.difficulty.toUpperCase()}</strong><small>{recordVersionLabel(record)} · {record.completed ? 'Neon Spire cleared' : `Wave ${record.wave}`} · {new Date(record.date).toLocaleDateString()}</small></div><b>{record.score.toLocaleString('en-US')}</b><span>{record.cores}</span></div>)}</div> : <div className="empty-records"><Trophy size={40} /><h3>{records.length ? 'No attempts in this collection yet.' : 'Your first signal starts here.'}</h3><p>{records.length ? 'Choose an earlier collection to see retained records.' : 'Completed and lost district attempts appear here.'}<br />Practice never changes your records.</p><button className="small-button" onClick={() => { changeOverlay(null); changeScreen('briefing'); }}>Start a run <ArrowRight size={16} /></button></div>}<p className="fine-print">Local, unverified records. Best scores are separate for each content version and rules profile. Earlier records remain available in their original collections.</p></Modal> : null}
    {overlay === 'credits' ? <Modal title="CREDITS" subtitle="SNAKE: YEAR 3039" onClose={() => changeOverlay(null)}><div className="credits-copy"><h3>A game for J Rhythm</h3><p>Created from the full-game product brief and approved visual references supplied by J Rhythm.</p><h3>Built for the browser</h3><p>Three.js · React · Vite · GSAP<br />Orbitron and Rajdhani, SIL Open Font License<br />Lucide icons, ISC License</p><h3>An original signal</h3><p>Real-time armored models and arena geometry. Original synthesized music and sound effects. Distant skyline created with OpenAI ImageGen.</p><p className="fine-print">Development build {VERSION}. Full-game scope and production provenance are maintained in the project documentation.</p></div></Modal> : null}
    {overlay === 'abandon' ? <Modal title="LEAVE THIS RUN?" onClose={() => changeOverlay(null)}><p className="confirm-copy">Returning to the title abandons this attempt. Use Save & Exit from pause to keep your exact position.</p><div className="dialog-footer"><button className="small-button" onClick={() => changeOverlay(null)}>Keep playing</button><button className="small-button danger" onClick={() => void abandon()}>Abandon run <ArrowRight size={16} /></button></div></Modal> : null}
    {notice ? <div className="system-notice" role="status"><span>{notice}</span><button className="icon-button" aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={16} /></button></div> : null}
    {graphicsError ? <div className="center-overlay error-overlay"><section className="panel" data-menu><Cpu size={38} /><h2>GRAPHICS RECOVERY</h2><p>{graphicsError}</p><button className="small-button" onClick={() => location.reload()}>Reload game <RotateCcw size={17} /></button></section></div> : null}
    {audioNeedsGesture ? <button className="audio-unlock" aria-label="Enable audio" onClick={() => void runtime.current?.audio.unlock()} inert={overlay !== null} title="Your browser requires a mouse click or keyboard press to enable sound"><AudioLines size={17} /><span>{audioStatus === 'unavailable' ? 'Sound unavailable · retry' : 'Click to enable sound'}</span></button> : null}
  </main>;
}

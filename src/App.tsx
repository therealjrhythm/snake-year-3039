import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, AudioLines, ChevronRight, Cpu, Gamepad2, HelpCircle, Keyboard, Maximize, Play, Radio, RotateCcw, Save, Settings2, Trophy, Volume2, X } from 'lucide-react';
import { Simulation, FIXED_DT } from './game/simulation';
import { GameRenderer } from './game/renderer';
import { GameInputController } from './game/input';
import { GameAudio } from './game/audio';
import type { AudioStatus } from './game/audio';
import { getSavedRun, saveRun, clearSavedRun, getRecords, commitRecord, getCheckpoint, saveCheckpoint } from './game/persistence';
import type { LocalRecord } from './game/persistence';
import type { Difficulty, GameMode, SimulationState } from './game/types';
import { Settings, readSettings } from './components/Settings';
import type { SettingsValue } from './components/Settings';
import { Hud } from './components/Hud';
import { Modal } from './components/Modal';
import { MenuSelect } from './components/MenuSelect';
import { GameplayGuide } from './components/GameplayGuide';

type Screen = 'title' | 'briefing' | 'countdown' | 'playing' | 'paused' | 'boss-intro' | 'results';
type Overlay = 'settings' | 'guide' | 'records' | 'credits' | 'abandon' | null;
const VERSION = '0.1.0';

export default function App() {
  const mount = useRef<HTMLDivElement>(null);
  const runtime = useRef<{ renderer: GameRenderer; input: GameInputController; audio: GameAudio } | null>(null);
  const simulation = useRef<Simulation | null>(null);
  const checkpoint = useRef<unknown>(null);
  const savedRun = useRef<unknown>(null);
  const [hasSave, setHasSave] = useState(false);
  const [screen, setScreen] = useState<Screen>('title');
  const screenRef = useRef<Screen>('title');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const overlayRef = useRef<Overlay>(null);
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
  const [eventText, setEventText] = useState('');
  const eventUntil = useRef(0);
  const eventPriority = useRef(0);
  const clockState = useRef({ accumulator: 0, hudAt: 0, lastEvent: 0, pendingUse: false, pendingSwap: false });
  const resetFeedback = (sim: Simulation) => { clockState.current.lastEvent = sim.state.eventCounter; setEventText(''); eventUntil.current = 0; eventPriority.current = 0; };
  const pauseHandler = useRef<(reason: string) => void>(() => {});
  const tickHandler = useRef<(now: number, elapsed: number) => void>(() => {});
  const terminalRuns = useRef(new Set<string>());

  const changeScreen = useCallback((next: Screen) => {
    screenRef.current = next; setScreen(next);
    runtime.current?.input.clear(); runtime.current?.input.setGameplay(next === 'playing');
    simulation.current?.clearInput();
    runtime.current?.audio.setPaused(next !== 'playing' && next !== 'title' && next !== 'briefing');
  }, []);
  const changeOverlay = useCallback((next: Overlay) => { overlayRef.current = next; setOverlay(next); runtime.current?.input.clear(); }, []);
  const refreshHud = () => { if (simulation.current) setHud(structuredClone(simulation.current.state)); };

  useEffect(() => {
    let alive = true;
    getSavedRun().then(value => {
      if (!alive || !value) return;
      try { Simulation.restore(value); savedRun.current = value; setHasSave(true); }
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
    renderer.setSettings(settingsRef.current); input.deadZone = settingsRef.current.deadZone;
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

  const pause = (reason = 'pause') => {
    if (overlayRef.current) { if (['pause', 'back'].includes(reason)) changeOverlay(null); return; }
    const current = screenRef.current;
    if (current === 'playing' || current === 'countdown') {
      const cause = reason === 'pause' ? 'manual' : reason === 'focus-lost' ? 'focus' : reason === 'controller-disconnected' ? 'controller' : reason.includes('viewport') ? 'viewport' : /frame|pace|Performance/.test(reason) ? 'performance' : 'recovery';
      setPauseCause(cause);
      setPauseReason(cause === 'focus' ? 'The game lost focus. Resume when you are ready.' : cause === 'controller' ? 'Your controller disconnected. Reconnect or choose keyboard, then resume.' : cause === 'manual' ? 'Take a breath. The city can wait.' : cause === 'performance' ? 'A long frame interrupted play. The game paused to prevent an unseen crash.' : reason);
      changeScreen('paused'); refreshHud();
    }
    else if (current === 'paused' && ['pause', 'back'].includes(reason)) resume();
    else if (['briefing', 'results'].includes(current) && ['pause', 'back'].includes(reason)) { simulation.current = null; changeScreen('title'); }
  };
  pauseHandler.current = pause;
  const startCountdown = () => { simulation.current?.resume(); setCountdown(3); countdownEnd.current = performance.now() / 1000 + 3; changeScreen('countdown'); refreshHud(); };
  const resume = () => { if (simulation.current) startCountdown(); };
  const start = (mode: GameMode) => {
    const launch = () => {
      const sim = new Simulation({ difficulty, mode, seed: Math.floor(Math.random() * 0x7fffffff) });
      simulation.current = sim; checkpoint.current = sim.snapshot(); resetFeedback(sim);
      if (mode === 'campaign') void saveCheckpoint(checkpoint.current).catch(() => setNotice('The checkpoint is available this session, but could not be saved to disk.'));
      runtime.current?.audio.setIntensity('playing'); changeOverlay(null); startCountdown();
    };
    if (hasSave) { void clearSavedRun().then(() => { savedRun.current = null; setHasSave(false); launch(); }).catch(() => setNotice('Could not clear the old suspended run. Try again before starting.')); }
    else launch();
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
  const saveAndExit = async () => {
    const sim = simulation.current; if (!sim) return;
    setBusy(true);
    try { const snapshot = sim.snapshot(); await saveRun(snapshot); savedRun.current = snapshot; setHasSave(true); simulation.current = null; changeScreen('title'); runtime.current?.audio.setIntensity('title'); }
    catch { setNotice('The run could not be saved. Your game is still paused; resume or retry saving.'); }
    finally { setBusy(false); }
  };
  const continueRun = () => {
    try {
      simulation.current = Simulation.restore(savedRun.current); checkpoint.current = null; resetFeedback(simulation.current);
      void getCheckpoint().then(value => { if (value) { try { const restored = Simulation.restore(value); if (restored.state.seed === simulation.current?.state.seed) checkpoint.current = value; } catch { /* The exact suspend still remains usable. */ } } }).catch(() => {});
      setDifficulty(simulation.current.state.difficulty);
      runtime.current?.audio.setIntensity(simulation.current.state.boss ? 'boss' : 'playing'); startCountdown();
    } catch { setNotice('This saved run could not be restored. You can start a fresh district.'); }
  };
  const endRun = (sim: Simulation) => {
    const state = sim.state; refreshHud(); changeScreen('results');
    if (state.mode === 'practice' || terminalRuns.current.has(state.runId)) return;
    terminalRuns.current.add(state.runId);
    const record: LocalRecord = { runId: state.runId, score: state.score, cores: state.totalCores, rivalKills: state.rivalKills, wave: state.wave, elapsed: state.time, completed: state.status === 'complete', difficulty: state.difficulty, date: new Date().toISOString(), cause: state.deathCause };
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
    if (elapsed > 0.25) { pause('A long frame interrupted play. Resume when the game is ready.'); return; }
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
      if (!sounded.has(event.kind)) { active.audio.event(event.kind); sounded.add(event.kind); }
      const priority = ['damage', 'shield-hit', 'crash', 'emp', 'decoy', 'empty'].includes(event.kind) ? 4
        : ['pickup', 'decoy-hit'].includes(event.kind) ? 3
          : ['core', 'shot', 'lock', 'mine-arm', 'select'].includes(event.kind) ? 0 : 2;
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
  const best = records.filter(r => r.difficulty === (hud?.difficulty ?? difficulty)).reduce((n, r) => Math.max(n, r.score), 0);
  const showHud = hud && !['title', 'briefing'].includes(screen);
  const audioNeedsGesture = settings.master > 0 && audioStatus !== 'running';
  const soundLabel = settings.master === 0 ? 'OFF' : audioStatus === 'running' ? 'ON' : 'ENABLE';
  useEffect(() => {
    const frame = requestAnimationFrame(() => { if (!overlayRef.current) runtime.current?.input.focusMenu(); });
    return () => cancelAnimationFrame(frame);
  }, [screen, ready]);

  return <main className={`app ${settings.highContrast ? 'high-contrast' : ''} ${settings.reducedMotion ? 'reduced-motion' : ''}`} style={{ '--ui-scale': settings.uiScale } as React.CSSProperties}>
    <div ref={mount} className={`world ${screen === 'title' || screen === 'briefing' ? 'cinematic' : ''}`} />
    <div className="screen-vignette" aria-hidden="true" />
    {screen === 'title' || screen === 'briefing' ? <><header className="title-header" inert={overlay !== null}><span className="system-mark"><Cpu size={19} /> S–39 <i /> AUTONOMOUS SYSTEMS</span><div><button className="icon-button" aria-label="Toggle sound" onPointerDown={() => { soundAction.current = audioNeedsGesture ? 'enable' : 'toggle'; }} onPointerCancel={() => { soundAction.current = null; }} onKeyDown={event => { if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) soundAction.current = audioNeedsGesture ? 'enable' : 'toggle'; }} onClick={() => { const action = soundAction.current ?? (audioNeedsGesture ? 'enable' : 'toggle'); soundAction.current = null; if (action === 'enable') void runtime.current?.audio.unlock(); else updateSettings({ ...settings, master: settings.master > 0 ? 0 : 0.6 }); }}><Volume2 size={18} /><span>{soundLabel}</span></button><button className="icon-button" onClick={fullscreen} aria-label="Toggle fullscreen"><Maximize size={18} /></button></div></header><div className="title-bottom"><span>NEON SPIRE <i /> DEVELOPMENT BUILD {VERSION}</span><span>{device === 'keyboard' ? <Keyboard size={15} /> : <Gamepad2 size={17} />}{device === 'keyboard' ? 'KEYBOARD READY' : 'GAMEPAD DETECTED'}<span className="tiny-dot" /></span></div></> : null}
    {screen === 'title' ? <div className="title-layout" data-menu inert={overlay !== null}><div className="game-logo" aria-label="Snake: Year 3039"><h1>SNAKE</h1><div>YEAR <b>3039</b></div></div><div className="title-tagline"><p>Collect energy. Outsmart the system.</p><span>Turn your own path into a weapon.</span></div><nav className="main-menu" aria-label="Main menu">{hasSave ? <button className="menu-button primary" onClick={continueRun} disabled={!ready} data-autofocus><Play size={21} fill="currentColor" />CONTINUE RUN<ChevronRight size={19} /></button> : null}<button className={`menu-button ${hasSave ? '' : 'primary'}`} onClick={() => changeScreen('briefing')} disabled={!ready} data-autofocus={!hasSave || undefined}><Play size={21} fill="currentColor" />{ready ? 'START GAME' : 'INITIALIZING SCENE'}<ChevronRight size={19} /></button><button className="menu-button" onClick={() => changeOverlay('settings')}><Settings2 size={23} />SETTINGS<ChevronRight size={19} /></button><button className="menu-button" onClick={() => changeOverlay('guide')}><HelpCircle size={22} />HOW TO PLAY<ChevronRight size={19} /></button></nav><div className="secondary-menu"><button onClick={() => changeOverlay('records')}><Trophy size={15} />LOCAL RECORDS</button><span>/</span><button onClick={() => changeOverlay('credits')}>CREDITS</button></div>{device === 'gamepad' ? <div className="controller-menu-hints"><span>↕ Navigate</span><span><kbd>A</kbd> Select</span><span><kbd>B</kbd> Back</span></div> : null}</div> : null}
    {screen === 'title' ? <div className="scene-caption"><span className="caption-line" /><p>THE CITY IS A CIRCUIT.</p><strong>Make your own path.</strong><span>01 / NEON SPIRE</span></div> : null}
    {screen === 'briefing' ? <div className="briefing panel" data-menu inert={overlay !== null}><button className="text-button" onClick={() => changeScreen('title')}><ArrowLeft size={16} />BACK</button><div className="briefing-number">01</div><span className="hud-label">CAMPAIGN / FIRST DISTRICT</span><h2>NEON SPIRE</h2><p>The city closed its energy network.<br />You were built to open it.</p><div className="briefing-stats"><div><strong>03</strong><span>COLLECTION WAVES</span></div><div><strong>36</strong><span>ENERGY CORES</span></div><div><Radio size={29} /><span>WARDEN FINALE</span></div></div><div className="difficulty-label"><span>RULES PROFILE</span><MenuSelect label="RULES PROFILE" value={difficulty} onChange={setDifficulty} options={[{ value: 'standard', label: 'Standard · 3 integrity' }, { value: 'assisted', label: 'Assisted · 5 integrity · slower world' }, { value: 'expert', label: 'Expert · faster hostile projectiles' }]} /></div><p className="briefing-tip">You move continuously. Steer with {device === 'keyboard' ? 'WASD or arrows' : 'the left stick or D-pad'}. Your shield stops attacks; walls and your own body still cause a critical crash.</p>{hasSave ? <p className="replace-note">Starting a new run replaces your suspended run.</p> : null}<button className="menu-button primary" onClick={() => start('campaign')} data-autofocus><Play size={20} fill="currentColor" />ENTER NEON SPIRE<ArrowRight size={20} /></button><button className="text-button practice-button" onClick={() => start('practice')}>Practice without records <ArrowRight size={15} /></button></div> : null}
    {showHud ? <div inert={screen !== 'playing' || overlay !== null}><Hud state={hud} device={device} onPause={() => pause()} best={best} practice={hud.mode === 'practice'} /></div> : null}
    {screen === 'playing' && eventText ? <div className="event-toast" role="status">{eventText}</div> : null}
    {screen === 'countdown' ? <div className="countdown-overlay"><span>SYSTEMS READY</span><strong key={countdown}>{countdown}</strong><p>{hud?.boss ? 'WARDEN / BREAK THE CONTROL NODES' : 'NEON SPIRE / FIND YOUR CURRENT'}</p></div> : null}
    {screen === 'paused' ? <div className="center-overlay"><section className="pause-panel panel" data-menu inert={overlay !== null}><div className="hud-label">{pauseCause === 'manual' ? 'SIMULATION SUSPENDED' : `AUTOMATIC PAUSE · ${pauseCause.toUpperCase()}`}</div><h2>PAUSED</h2><p>{pauseReason}</p><button className="menu-button primary" onClick={resume} data-autofocus><Play size={18} />RESUME<ArrowRight size={18} /></button><button className="menu-button" onClick={() => changeOverlay('settings')}><Settings2 size={18} />SETTINGS</button><button className="menu-button" onClick={() => changeOverlay('guide')}><HelpCircle size={18} />PICKUPS &amp; TACTICS</button><button className="menu-button" onClick={() => changeOverlay('abandon')}><X size={18} />RETURN TO TITLE</button><button className="menu-button" onClick={saveAndExit} disabled={busy}><Save size={18} />{busy ? 'SAVING RUN…' : 'SAVE & EXIT'}</button>{pauseCause === 'performance' && settings.quality !== 'low' ? <button className="text-button performance-recovery" onClick={() => { updateSettings({ ...settings, quality: 'low' }); resume(); }}>Use Low graphics &amp; resume <ArrowRight size={16} /></button> : null}<p className="fine-print">Movement and ability timers are frozen.{pauseCause === 'performance' && settings.quality === 'low' ? ' Close heavy browser tabs before resuming if this repeats.' : ''}</p></section></div> : null}
    {screen === 'boss-intro' ? <div className="center-overlay"><section className="boss-intro-panel panel" data-menu><span className="hud-label">PERIMETER AUTHORITY / CONTROL LINK DETECTED</span><h2>THE WARDEN</h2><p>Three nodes hold Neon Spire captive.</p><ol><li>Collect the three numbered relay orbs.</li><li>Avoid the marked laser sector.</li><li>Cross the green discharge pad during recovery.</li></ol><p>Stored relay charge survives a missed window.<br />Break every node, then steer through the north exit.</p><button className="menu-button primary" data-autofocus onClick={() => { simulation.current?.beginBoss(); runtime.current?.audio.setIntensity('boss'); startCountdown(); }}><Play size={20} />BREAK THE CIRCUIT<ArrowRight size={19} /></button></section></div> : null}
    {screen === 'results' && hud ? <div className="center-overlay"><section className="results-panel panel" data-menu inert={overlay !== null}><span className="hud-label">{hud.mode === 'practice' ? 'PRACTICE COMPLETE / NO RECORDS AWARDED' : hud.status === 'complete' ? 'DISTRICT 01 / EXTRACTION COMPLETE' : 'S–39 / SIGNAL LOST'}</span><h2>{hud.status === 'complete' ? 'NEON SPIRE LIBERATED' : 'CONNECTION SEVERED'}</h2><p>{hud.status === 'complete' ? 'The first circuit is open. You found your own way.' : hud.deathCause}</p><div className="result-score"><span>RUN SCORE</span><strong>{hud.score.toLocaleString('en-US')}</strong></div><div className="result-stats"><span><b>{hud.totalCores}</b>CORES</span><span><b>{hud.rivalKills}</b>BODY-BLOCKS</span><span><b>{Math.floor(hud.time / 60)}:{String(Math.floor(hud.time % 60)).padStart(2, '0')}</b>ACTIVE TIME</span></div>{checkpoint.current && hud.status !== 'complete' ? <button className="menu-button primary" onClick={() => retry(true)} data-autofocus><RotateCcw size={18} />RETRY CHECKPOINT<ArrowRight size={18} /></button> : null}<button className={`menu-button ${hud.status === 'complete' ? 'primary' : ''}`} onClick={() => retry(false)}><RotateCcw size={18} />RESTART DISTRICT</button><button className="text-button result-return" onClick={() => { simulation.current = null; changeScreen('title'); runtime.current?.audio.setIntensity('title'); }}><ArrowLeft size={16} />RETURN TO TITLE</button>{hud.status === 'complete' ? <p className="fine-print">Neon Spire development checkpoint complete. The remaining city is still in production.</p> : null}</section></div> : null}
    {overlay === 'settings' ? <Settings value={settings} onChange={updateSettings} onClose={() => changeOverlay(null)} /> : null}
    {overlay === 'guide' ? <GameplayGuide device={device} paused={screen === 'paused'} onClose={() => changeOverlay(null)} onEnter={() => { changeOverlay(null); changeScreen('briefing'); }} /> : null}
    {overlay === 'records' ? <Modal title="LOCAL RECORDS" subtitle="YOUR SIGNAL. YOUR MACHINE." onClose={() => changeOverlay(null)} className="records-dialog">{records.length ? <div className="records-table"><div className="records-row records-head"><span>RULES / RESULT</span><span>SCORE</span><span>CORES</span></div>{records.slice().sort((a, b) => b.score - a.score).slice(0, 12).map(record => <div className="records-row" key={record.runId}><div><strong>{record.difficulty.toUpperCase()}</strong><small>{record.completed ? 'Neon Spire cleared' : `Wave ${record.wave}`} · {new Date(record.date).toLocaleDateString()}</small></div><b>{record.score.toLocaleString('en-US')}</b><span>{record.cores}</span></div>)}</div> : <div className="empty-records"><Trophy size={40} /><h3>Your first signal starts here.</h3><p>Completed and lost district attempts appear here.<br />Practice never changes your records.</p><button className="small-button" onClick={() => { changeOverlay(null); changeScreen('briefing'); }}>Start a run <ArrowRight size={16} /></button></div>}<p className="fine-print">Local, unverified records. Standard, Expert and Assisted are identified separately.</p></Modal> : null}
    {overlay === 'credits' ? <Modal title="CREDITS" subtitle="SNAKE: YEAR 3039" onClose={() => changeOverlay(null)}><div className="credits-copy"><h3>A game for J Rhythm</h3><p>Created from the full-game product brief and approved visual references supplied by J Rhythm.</p><h3>Built for the browser</h3><p>Three.js · React · Vite<br />Orbitron and Rajdhani, SIL Open Font License<br />Lucide icons, ISC License</p><h3>An original signal</h3><p>Real-time armored models and arena geometry. Original synthesized music and sound effects. Distant skyline created with OpenAI ImageGen.</p><p className="fine-print">Development build {VERSION}. Full-game scope and production provenance are maintained in the project documentation.</p></div></Modal> : null}
    {overlay === 'abandon' ? <Modal title="LEAVE THIS RUN?" onClose={() => changeOverlay(null)}><p className="confirm-copy">Returning to the title abandons this attempt. Use Save & Exit from pause to keep your exact position.</p><div className="dialog-footer"><button className="small-button" onClick={() => changeOverlay(null)}>Keep playing</button><button className="small-button danger" onClick={() => void abandon()}>Abandon run <ArrowRight size={16} /></button></div></Modal> : null}
    {notice ? <div className="system-notice" role="status"><span>{notice}</span><button className="icon-button" aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={16} /></button></div> : null}
    {graphicsError ? <div className="center-overlay error-overlay"><section className="panel" data-menu><Cpu size={38} /><h2>GRAPHICS RECOVERY</h2><p>{graphicsError}</p><button className="small-button" onClick={() => location.reload()}>Reload game <RotateCcw size={17} /></button></section></div> : null}
    {audioNeedsGesture ? <button className="audio-unlock" aria-label="Enable audio" onClick={() => void runtime.current?.audio.unlock()} inert={overlay !== null} title="Your browser requires a mouse click or keyboard press to enable sound"><AudioLines size={17} /><span>{audioStatus === 'unavailable' ? 'Sound unavailable · retry' : 'Click to enable sound'}</span></button> : null}
  </main>;
}

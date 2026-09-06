import type { GameEvent, GameEventKind, PickupKind } from './types';

type Intensity = 'title' | 'playing' | 'boss';
export type AudioStatus = 'locked' | 'running' | 'suspended' | 'unavailable';
const legacyEvents = { collect: 'core', powerup: 'pickup', death: 'crash', victory: 'complete', shield: 'shield-hit', use: 'shield-hit', swap: 'select', ui: 'select' } as const;
type LegacyAudioKind = keyof typeof legacyEvents;
/** A new simulation event must deliberately choose a cue or documented silence. */
export const AUDIO_EVENT_POLICY = {
  start: 'silent', // The starting wave owns the introduction cue.
  wave: 'audible', transition: 'audible', core: 'audible', pickup: 'audible',
  'boost-empty': 'audible', select: 'audible', empty: 'audible', emp: 'audible', decoy: 'audible', 'decoy-hit': 'audible',
  'mine-arm': 'audible', 'gate-warning': 'audible', lock: 'audible', shot: 'audible',
  'rival-warning': 'audible', rival: 'audible', 'rival-crash': 'audible', 'rival-defeated': 'audible',
  'boss-intro': 'audible', boss: 'audible', 'boss-warning': 'audible', 'boss-recovery': 'audible',
  relay: 'audible', 'relay-wrong': 'audible', 'charge-ready': 'audible', 'boss-node': 'audible', 'boss-defeated': 'audible',
  complete: 'audible', damage: 'audible', 'shield-hit': 'audible', crash: 'audible',
  'player-shot': 'audible', 'weapon-empty': 'audible', 'drone-hit': 'audible', 'drone-destroyed': 'audible', 'armor-hit': 'audible', 'receptor-hit': 'audible',
  scrubber: 'audible', 'chain-buffer': 'audible', 'power-expired': 'audible', 'lab-ready': 'audible',
} as const satisfies Record<GameEventKind, 'audible' | 'silent'>;
const clamp = (value: number): number => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const midi = (note: number): number => 440 * 2 ** ((note - 69) / 12);

/** Original procedural score and effects; all sound begins only after unlock in a user gesture. */
export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private musicSend: GainNode | null = null;
  private musicNodes: AudioNode[] = [];
  private musicSources = new Set<AudioScheduledSourceNode>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private levels = { master: 0.65, music: 0.55, effects: 0.8 };
  private paused = false;
  private intensity: Intensity = 'title';
  private arrangement: Intensity = 'title';
  private nextStep = 0;
  private step = 0;
  private disposed = false;
  private visible = !document.hidden;
  private hasRun = false;
  private status: AudioStatus = 'locked';
  private onStatusChange?: (status: AudioStatus) => void;
  private graphReady = false;

  constructor(onStatusChange?: (status: AudioStatus) => void) {
    this.onStatusChange = onStatusChange;
  }

  getStatus(): AudioStatus { return this.status; }

  /** Call directly in a real pointer/key gesture; a gamepad click may still be blocked. */
  async unlock(): Promise<boolean> {
    if (this.disposed || !this.visible) return false;
    let context = this.context;
    try {
      if (!context || context.state === 'closed') {
        if (context) this.releaseGraph();
        const AudioConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioConstructor) { this.publishStatus('unavailable'); return false; }
        context = new AudioConstructor();
        this.context = context;
        this.master = context.createGain();
        this.music = context.createGain();
        this.effects = context.createGain();
        // Honor saved mute levels from the very first sample, before any event
        // can arrive in the same gesture that creates this graph.
        this.master.gain.value = this.levels.master;
        this.music.gain.value = this.paused || !this.visible ? 0 : this.levels.music * 0.28;
        this.effects.gain.value = this.levels.effects * 0.65;
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.knee.value = 12;
        limiter.ratio.value = 8;
        this.music.connect(this.master);
        this.createMusicSpace();
        this.effects.connect(this.master);
        this.master.connect(limiter);
        limiter.connect(context.destination);
        this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.graphReady = true;
        context.addEventListener('statechange', this.syncState);
        this.applyLevels();
      }
      if (context.state !== 'running') {
        // A blocked resume can remain pending indefinitely. Always make a fresh
        // resume call in the current gesture, even if an earlier call is pending.
        // Coalescing those calls would discard the gesture that can unlock audio.
        const resume = context.resume();
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([resume, new Promise<void>(resolve => { timeout = setTimeout(resolve, 1500); })]);
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      }
      if (this.disposed || this.context !== context) return false;
      this.syncState();
      return context.state === 'running';
    } catch {
      if (!this.disposed && this.context === context) {
        if (context && this.graphReady) this.syncState();
        else { this.releaseGraph(); this.publishStatus('unavailable'); }
      }
      return false;
    }
  }

  /** Visibility and gameplay pause are separate: returning never resumes the run. */
  setVisible(visible: boolean): void {
    if (this.visible === visible || this.disposed) return;
    this.visible = visible;
    if (!visible) { this.stopScheduler(); this.stopMusic(0.12); }
    this.applyLevels();
    if (visible) {
      this.syncState();
      if (this.hasRun && this.context?.state !== 'running') void this.unlock();
    }
  }

  setLevels(master: number, music: number, effects: number): void {
    this.levels = { master: clamp(master), music: clamp(music), effects: clamp(effects) };
    this.applyLevels();
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) { this.stopScheduler(); this.stopMusic(0.12); }
    this.applyLevels();
    if (!paused) this.syncState();
  }

  setIntensity(intensity: Intensity): void { this.intensity = intensity; }

  event(event: GameEvent | GameEventKind | LegacyAudioKind): void {
    const details = typeof event === 'string' ? undefined : event;
    const rawKind = typeof event === 'string' ? event : event.kind;
    const kind: GameEventKind = rawKind in legacyEvents ? legacyEvents[rawKind as LegacyAudioKind] : rawKind as GameEventKind;
    const context = this.context;
    const effects = this.effects;
    if (!context || !effects || context.state !== 'running' || this.disposed) return;
    const t = context.currentTime;
    try {
      switch (kind) {
        case 'start':
          break;
        case 'core':
          this.tone(880, t, 0.13, 0.23, 'sine', effects, 1320);
          this.tone(1760, t + 0.055, 0.18, 0.11, 'sine', effects);
          break;
        case 'pickup':
          if (details?.pickup === 'blaster') {
            this.tone(260, t, 0.25, 0.18, 'sawtooth', effects, 780, 2200);
            this.tone(1560, t + 0.12, 0.22, 0.12, 'sine', effects);
            break;
          }
          if (details?.pickup === 'capacitor') {
            this.tone(330, t, 0.36, 0.18, 'sine', effects, 1320);
            this.tone(1980, t + 0.2, 0.19, 0.08, 'sine', effects);
            break;
          }
          if (details?.pickup === 'scrubber') {
            this.hiss(t, 0.28, 0.12, 4200, effects);
            this.tone(1480, t, 0.3, 0.13, 'sine', effects, 740);
            break;
          }
          if (details?.pickup === 'chain-buffer') {
            [76, 83, 88].forEach((note, i) => this.tone(midi(note), t + i * 0.06, 0.28, 0.12, 'sine', effects));
            break;
          }
          [64, 71, 76].forEach((note, i) => this.tone(midi(note), t + i * 0.075, 0.23, 0.2, 'triangle', effects));
          break;
        case 'damage':
          this.tone(150, t, 0.2, 0.24, 'sawtooth', effects, 48);
          this.hiss(t, 0.13, 0.2, 1200, effects);
          break;
        case 'crash':
          this.tone(92, t, 0.65, 0.36, 'sawtooth', effects, 24);
          this.hiss(t, 0.7, 0.4, 1700, effects);
          break;
        case 'emp':
          this.tone(1280, t, 0.55, 0.23, 'sine', effects, 45);
          this.hiss(t, 0.48, 0.3, 2800, effects);
          break;
        case 'wave':
          [52, 59, 64, 71].forEach((note, i) => this.tone(midi(note), t + i * 0.09, 0.3, 0.2, 'triangle', effects));
          break;
        case 'boss':
          [0, 0.22, 0.44].forEach(offset => {
            this.tone(82.41, t + offset, 0.27, 0.22, 'sawtooth', effects);
            this.tone(87.31, t + offset, 0.27, 0.17, 'sawtooth', effects);
          });
          break;
        case 'complete':
          [52, 59, 64, 68, 71, 76].forEach((note, i) => this.tone(midi(note), t + i * 0.11, 0.6, 0.19, 'triangle', effects));
          break;
        case 'shield-hit':
          this.tone(330, t, 0.35, 0.18, 'sine', effects, 990);
          break;
        case 'select':
          this.tone(620, t, 0.065, 0.12, 'triangle', effects, 780);
          break;
        case 'relay': {
          const relay = Math.max(1, Math.min(3, Math.round(details?.relay ?? 1)));
          const note = [72, 76, 79][relay - 1]!;
          this.tone(midi(note), t, 0.23, 0.19, 'sine', effects);
          this.tone(midi(note + 12), t + 0.055, 0.2, 0.07, 'sine', effects);
          break;
        }
        case 'relay-wrong':
          this.tone(294, t, 0.12, 0.1, 'triangle', effects, 247);
          break;
        case 'charge-ready':
          [72, 76, 79, 84].forEach((note, i) => this.tone(midi(note), t + i * 0.045, 0.32, 0.12, 'sine', effects));
          break;
        case 'boss-warning':
          [0, 0.18].forEach(offset => this.tone(440, t + offset, 0.14, 0.13, 'triangle', effects, 330));
          break;
        case 'boss-recovery':
          [67, 74, 79].forEach((note, i) => this.tone(midi(note), t + i * 0.07, 0.25, 0.13, 'sine', effects));
          break;
        case 'boss-node':
          this.tone(2200, t, 0.42, 0.21, 'sine', effects, 90);
          this.hiss(t, 0.28, 0.2, 1600, effects);
          this.tone(164.81, t + 0.08, 0.45, 0.19, 'triangle', effects);
          break;
        case 'boss-defeated':
          this.hiss(t, 0.5, 0.16, 2200, effects);
          [52, 64, 67, 71, 76].forEach((note, i) => this.tone(midi(note), t + i * 0.09, 0.55, 0.15, 'triangle', effects));
          break;
        case 'boss-intro':
          [40, 47, 52].forEach((note, i) => this.tone(midi(note), t + i * 0.12, 0.45, 0.15, 'sawtooth', effects, undefined, 900));
          break;
        case 'transition': case 'lab-ready':
          [64, 71].forEach((note, i) => this.tone(midi(note), t + i * 0.09, 0.25, 0.12, 'triangle', effects));
          break;
        case 'boost-empty':
          this.tone(440, t, 0.19, 0.1, 'triangle', effects, 220);
          break;
        case 'empty':
          this.tone(196, t, 0.09, 0.09, 'triangle', effects);
          this.tone(164.81, t + 0.1, 0.1, 0.07, 'triangle', effects);
          break;
        case 'decoy':
          this.tone(660, t, 0.32, 0.17, 'sine', effects, 330);
          this.tone(1320, t + 0.07, 0.35, 0.1, 'sine', effects, 990);
          break;
        case 'decoy-hit':
          this.hiss(t, 0.16, 0.12, 3500, effects);
          this.tone(990, t, 0.17, 0.11, 'sine', effects, 220);
          break;
        case 'mine-arm':
          this.tone(1600, t, 0.09, 0.075, 'triangle', effects);
          break;
        case 'gate-warning':
          [0, 0.14].forEach(offset => this.tone(740, t + offset, 0.09, 0.08, 'triangle', effects));
          break;
        case 'lock':
          this.tone(900, t, 0.13, 0.08, 'sine', effects, 1180);
          break;
        case 'shot':
          this.tone(560, t, 0.11, 0.045, 'triangle', effects, 180);
          break;
        case 'rival-warning':
          [0, 0.19].forEach(offset => this.tone(220, t + offset, 0.15, 0.12, 'sawtooth', effects, 330, 1100));
          break;
        case 'rival':
          this.tone(110, t, 0.4, 0.13, 'sawtooth', effects, 220, 1300);
          break;
        case 'rival-crash':
          this.tone(130, t, 0.3, 0.13, 'sawtooth', effects, 50);
          this.hiss(t, 0.18, 0.13, 2100, effects);
          break;
        case 'rival-defeated':
          this.hiss(t, 0.25, 0.2, 1800, effects);
          [55, 62, 67].forEach((note, i) => this.tone(midi(note), t + i * 0.075, 0.37, 0.16, 'triangle', effects));
          break;
        case 'player-shot':
          this.tone(1040, t, 0.105, 0.11, 'sawtooth', effects, 260, 1800);
          this.hiss(t, 0.028, 0.045, 5000, effects);
          break;
        case 'weapon-empty':
          this.tone(220, t, 0.075, 0.08, 'triangle', effects, 150);
          break;
        case 'drone-hit':
          this.tone(530, t, 0.12, 0.15, 'triangle', effects, 265);
          this.hiss(t, 0.06, 0.1, 2400, effects);
          break;
        case 'drone-destroyed':
          this.tone(190, t, 0.33, 0.2, 'sawtooth', effects, 48);
          this.hiss(t, 0.23, 0.18, 2200, effects);
          this.tone(1200, t + 0.04, 0.24, 0.09, 'sine', effects, 300);
          break;
        case 'armor-hit':
          this.tone(392, t, 0.11, 0.13, 'sine', effects);
          this.tone(997, t, 0.08, 0.08, 'sine', effects);
          break;
        case 'receptor-hit':
          this.tone(784, t, 0.18, 0.16, 'sine', effects, 1176);
          break;
        case 'scrubber':
          this.hiss(t, 0.29, 0.17, 4500, effects);
          this.tone(2800, t, 0.32, 0.13, 'sine', effects, 460);
          break;
        case 'chain-buffer':
          [700, 1050, 1400].forEach((frequency, i) => this.tone(frequency, t + i * 0.05, 0.23, 0.13, 'sine', effects));
          break;
        case 'power-expired': {
          const notes: Record<PickupKind, number> = { overdrive: 64, shield: 67, surge: 72, emp: 62, magnet: 69, repair: 65, decoy: 71, splice: 60, blaster: 70, capacitor: 76, scrubber: 74, 'chain-buffer': 79 };
          const note = notes[details?.pickup ?? 'overdrive'];
          this.tone(midi(note), t, 0.14, 0.09, 'sine', effects);
          this.tone(midi(note - 7), t + 0.09, 0.2, 0.075, 'sine', effects);
          break;
        }
        default: {
          const unmapped: never = kind;
          return unmapped;
        }
      }
    } catch { /* Device loss is nonfatal. */ }
  }

  dispose(): void {
    this.disposed = true;
    this.onStatusChange = undefined;
    this.releaseGraph();
    this.status = 'unavailable';
  }

  private publishStatus(status: AudioStatus): void {
    if (this.status === status || this.disposed) return;
    this.status = status;
    this.onStatusChange?.(status);
  }

  private syncState = (): void => {
    if (this.disposed || !this.context) return;
    const context = this.context;
    if (context.state === 'running') {
      this.hasRun = true;
      this.publishStatus('running');
      this.applyLevels();
      if (!this.paused && this.visible && !this.timer) {
        this.nextStep = context.currentTime + 0.035;
        this.timer = setInterval(this.schedule, 60);
        this.schedule();
      }
    } else {
      this.stopScheduler();
      this.stopMusic(0);
      this.publishStatus(context.state === 'closed' ? 'unavailable' : this.hasRun ? 'suspended' : 'locked');
    }
  };

  private stopScheduler(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private stopMusic(fade: number): void {
    if (!this.context) return;
    for (const source of this.musicSources) {
      try { source.stop(this.context.currentTime + fade); } catch { /* Already ended. */ }
    }
  }

  private releaseGraph(): void {
    this.stopScheduler();
    this.stopMusic(0);
    this.musicSources.clear();
    for (const node of this.musicNodes) node.disconnect();
    this.musicNodes = [];
    this.musicSend = null;
    this.graphReady = false;
    this.context?.removeEventListener('statechange', this.syncState);
    void this.context?.close().catch(() => undefined);
    this.context = null;
    this.master = null;
    this.music = null;
    this.effects = null;
    this.noise = null;
  }

  private applyLevels(): void {
    const context = this.context;
    if (!context || context.state === 'closed') return;
    try {
      this.master?.gain.setTargetAtTime(this.levels.master, context.currentTime, 0.025);
      this.music?.gain.setTargetAtTime(this.paused || !this.visible ? 0 : this.levels.music * 0.28, context.currentTime, 0.04);
      this.effects?.gain.setTargetAtTime(this.levels.effects * 0.65, context.currentTime, 0.025);
    } catch { /* Safe before or after audio-device changes. */ }
  }

  private schedule = (): void => {
    const context = this.context;
    const music = this.music;
    if (!context || !music || context.state !== 'running' || this.paused || !this.visible || this.disposed) return;
    if (this.nextStep < context.currentTime) this.nextStep = context.currentTime + 0.025;
    try {
      for (let count = 0; this.nextStep < context.currentTime + 0.16 && count < 8; count++) {
        const t = this.nextStep;
        const beat = this.step % 16;
        // Layer/tempo changes land on a bar boundary; waves do not restart the motif.
        if (beat === 0) this.arrangement = this.intensity;
        const boss = this.arrangement === 'boss';
        const title = this.arrangement === 'title';
        const stepLength = 60 / (boss ? 126 : 112) / 4;
        const bar = Math.floor(this.step / 16) % 8;
        const chord = Math.floor(bar / 2);
        const root = [40, 36, 43, 38][chord]!;
        const third = [15, 16, 16, 14][chord]!;

        if (beat === 0) {
          this.synthPad(root, [12, third, 19, 26], t, stepLength * 16 + 0.3, title ? 0.037 : 0.024);
        }
        // Rounded, off-beat bass leaves room for the game's impact and pickup cues.
        if (title ? beat === 0 || beat === 10 : [0, 3, 6, 8, 10, 14].includes(beat)) {
          const octave = !title && beat === 14 ? 12 : 0;
          this.synthBass(root + octave, t, stepLength * (title ? 4.5 : beat === 0 ? 2.3 : 1.45), boss ? 0.31 : 0.25, boss);
        }
        const pulse = title ? [2, 8, 14].includes(beat) : beat % 2 === 0 || boss && [7, 15].includes(beat);
        if (pulse) {
          const motif = [24, 31, 38, third + 24, 31, 26, 36, 31];
          const note = root + motif[(Math.floor(beat / 2) + (bar % 2) * 3) % motif.length]!;
          this.fmPulse(note, t, stepLength * (title ? 4 : 2.1), title ? 0.074 : 0.083, Math.sin(this.step * 0.73) * 0.5, boss);
        }
        if (!title) {
          if (beat === 0 || beat === 8 || boss && [6, 10].includes(beat)) this.musicKick(t, boss ? 0.44 : 0.38);
          if (beat === 4 || beat === 12) this.musicNoise(t, 0.16, 0.13, 1550, 'bandpass', 0);
          if (beat % 2 === 1) this.musicNoise(t, beat === 11 ? 0.12 : 0.037, beat % 4 === 3 ? 0.037 : 0.023, 7500, 'highpass', beat % 4 === 3 ? 0.4 : -0.4);
          if (boss && beat === 15) this.musicNoise(t + stepLength * 0.5, 0.03, 0.027, 9200, 'highpass', -0.3);
        }
        // A distant, filtered air sweep gives the eight-bar phrase a sense of scale.
        if (bar % 4 === 3 && beat === 8) {
          this.musicNoise(t, stepLength * 8, 0.028, 1800, 'bandpass', bar === 3 ? -0.6 : 0.6, true);
        }
        this.step++;
        this.nextStep += stepLength;
      }
    } catch { /* A suspended/disconnected audio device must not affect simulation. */ }
  };

  /** Short stereo echoes are shared by musical voices only, never the effects bus. */
  private createMusicSpace(): void {
    const context = this.context;
    if (!context || !this.music) return;
    const send = context.createGain();
    send.gain.value = 0.27;
    const left = context.createDelay(1);
    const right = context.createDelay(1);
    left.delayTime.value = 60 / 112 * 0.75;
    right.delayTime.value = 60 / 112 * 0.5;
    const damping = context.createBiquadFilter();
    damping.type = 'lowpass';
    damping.frequency.value = 3200;
    const feedback = context.createGain();
    feedback.gain.value = 0.32;
    const panLeft = context.createStereoPanner();
    const panRight = context.createStereoPanner();
    panLeft.pan.value = -0.68;
    panRight.pan.value = 0.68;
    send.connect(left);
    left.connect(panLeft).connect(this.music);
    left.connect(right);
    right.connect(panRight).connect(this.music);
    right.connect(damping).connect(feedback).connect(left);
    this.musicSend = send;
    this.musicNodes = [send, left, right, damping, feedback, panLeft, panRight];
  }

  private connectMusic(output: AudioNode, echo = false): void {
    if (this.music) output.connect(this.music);
    if (echo && this.musicSend) output.connect(this.musicSend);
  }

  /** Every voice owns a finite lifetime and disconnects its complete local graph. */
  private playVoice(sources: AudioScheduledSourceNode[], nodes: AudioNode[], time: number, duration: number): void {
    let remaining = sources.length;
    for (const source of sources) {
      this.musicSources.add(source);
      source.onended = () => {
        source.disconnect();
        this.musicSources.delete(source);
        if (--remaining === 0) for (const node of nodes) node.disconnect();
      };
      source.start(time);
      source.stop(time + duration + 0.025);
    }
  }

  private synthPad(root: number, intervals: number[], time: number, duration: number, volume: number): void {
    const context = this.context;
    if (!context) return;
    intervals.forEach((interval, index) => {
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.65;
      filter.frequency.setValueAtTime(480 + index * 100, time);
      filter.frequency.linearRampToValueAtTime(1150 + index * 170, time + duration * 0.5);
      filter.frequency.linearRampToValueAtTime(540, time + duration);
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0.0001, time);
      envelope.gain.linearRampToValueAtTime(volume, time + 0.32);
      envelope.gain.setValueAtTime(volume * 0.8, time + duration * 0.62);
      envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      const pan = context.createStereoPanner();
      pan.pan.value = index % 2 ? 0.58 : -0.58;
      const oscillators = [-7, 7].map(detune => {
        const oscillator = context.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = midi(root + interval);
        oscillator.detune.value = detune;
        oscillator.connect(filter);
        return oscillator;
      });
      filter.connect(envelope).connect(pan);
      this.connectMusic(pan, true);
      this.playVoice(oscillators, [filter, envelope, pan], time, duration);
    });
  }

  private synthBass(note: number, time: number, duration: number, volume: number, pressure: boolean): void {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = midi(note);
    const sub = context.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = midi(note - 12);
    const subGain = context.createGain();
    subGain.gain.value = 0.44;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.8;
    filter.frequency.setValueAtTime(pressure ? 1700 : 950, time);
    filter.frequency.exponentialRampToValueAtTime(130, time + duration);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(filter).connect(envelope);
    sub.connect(subGain).connect(envelope);
    this.connectMusic(envelope);
    this.playVoice([oscillator, sub], [filter, subGain, envelope], time, duration);
  }

  private fmPulse(note: number, time: number, duration: number, volume: number, position: number, pressure: boolean): void {
    const context = this.context;
    if (!context) return;
    const frequency = midi(note);
    const carrier = context.createOscillator();
    const modulator = context.createOscillator();
    const modulation = context.createGain();
    carrier.type = 'sine';
    carrier.frequency.value = frequency;
    modulator.type = 'sine';
    modulator.frequency.value = frequency * (pressure ? 3 : 2);
    modulation.gain.setValueAtTime(frequency * (pressure ? 0.72 : 0.42), time);
    modulation.gain.exponentialRampToValueAtTime(frequency * 0.015, time + duration);
    modulator.connect(modulation).connect(carrier.frequency);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(volume, time + 0.007);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    const pan = context.createStereoPanner();
    pan.pan.value = position;
    carrier.connect(envelope).connect(pan);
    this.connectMusic(pan, true);
    this.playVoice([carrier, modulator], [modulation, envelope, pan], time, duration);
  }

  private musicKick(time: number, volume: number): void {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(145, time);
    oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.16);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(volume, time + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
    oscillator.connect(envelope);
    this.connectMusic(envelope);
    this.playVoice([oscillator], [envelope], time, 0.28);
  }

  private musicNoise(time: number, duration: number, volume: number, cutoff: number, type: BiquadFilterType, position: number, sweep = false): void {
    const context = this.context;
    if (!context || !this.noise) return;
    const source = context.createBufferSource();
    source.buffer = this.noise;
    source.loop = sweep;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.Q.value = sweep ? 2.4 : 0.8;
    filter.frequency.setValueAtTime(cutoff, time);
    if (sweep) filter.frequency.exponentialRampToValueAtTime(5300, time + duration);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(volume, time + (sweep ? duration * 0.7 : 0.003));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    const pan = context.createStereoPanner();
    pan.pan.value = position;
    source.connect(filter).connect(envelope).connect(pan);
    this.connectMusic(pan, sweep);
    this.playVoice([source], [filter, envelope, pan], time, duration);
  }

  private tone(frequency: number, time: number, duration: number, volume: number, waveform: OscillatorType, destination: AudioNode, endFrequency?: number, cutoff?: number): void {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), time + Math.min(0.012, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    let filter: BiquadFilterNode | null = null;
    if (cutoff) {
      filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      oscillator.connect(filter);
      filter.connect(envelope);
    } else oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); filter?.disconnect(); };
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }

  private hiss(time: number, duration: number, volume: number, cutoff: number, destination: AudioNode): void {
    const context = this.context;
    if (!context || !this.noise) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = this.noise;
    filter.type = 'highpass';
    filter.frequency.value = cutoff;
    envelope.gain.setValueAtTime(Math.max(volume, 0.001), time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    source.start(time);
    source.stop(time + duration);
  }
}

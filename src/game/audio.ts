type Intensity = 'title' | 'playing' | 'boss';
const clamp = (value: number): number => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const midi = (note: number): number => 440 * 2 ** ((note - 69) / 12);

/** Original procedural score and effects; all sound begins only after unlock in a user gesture. */
export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private levels = { master: 0.65, music: 0.55, effects: 0.8 };
  private paused = false;
  private intensity: Intensity = 'title';
  private nextStep = 0;
  private step = 0;
  private disposed = false;

  async unlock(): Promise<void> {
    if (this.disposed) return;
    try {
      if (!this.context) {
        const AudioConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioConstructor) return;
        const context = new AudioConstructor();
        this.context = context;
        this.master = context.createGain();
        this.music = context.createGain();
        this.effects = context.createGain();
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.knee.value = 12;
        limiter.ratio.value = 8;
        this.music.connect(this.master);
        this.effects.connect(this.master);
        this.master.connect(limiter);
        limiter.connect(context.destination);
        this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.applyLevels();
      }
      if (this.context.state === 'suspended') await this.context.resume();
      if (this.context.state === 'running' && !this.timer) {
        this.nextStep = this.context.currentTime + 0.035;
        this.timer = setInterval(this.schedule, 60);
        this.schedule();
      }
    } catch { /* Audio is optional; denied or unavailable devices must never break a run. */ }
  }

  setLevels(master: number, music: number, effects: number): void {
    this.levels = { master: clamp(master), music: clamp(music), effects: clamp(effects) };
    this.applyLevels();
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    if (!paused && this.context) this.nextStep = this.context.currentTime + 0.035;
    this.applyLevels();
  }

  setIntensity(intensity: Intensity): void { this.intensity = intensity; }

  event(kind: string): void {
    const context = this.context;
    const effects = this.effects;
    if (!context || !effects || context.state !== 'running' || this.disposed) return;
    const t = context.currentTime;
    try {
      switch (kind) {
        case 'core': case 'collect':
          this.tone(880, t, 0.13, 0.23, 'sine', effects, 1320);
          this.tone(1760, t + 0.055, 0.18, 0.11, 'sine', effects);
          break;
        case 'pickup': case 'powerup':
          [64, 71, 76].forEach((note, i) => this.tone(midi(note), t + i * 0.075, 0.23, 0.2, 'triangle', effects));
          break;
        case 'damage':
          this.tone(150, t, 0.2, 0.24, 'sawtooth', effects, 48);
          this.hiss(t, 0.13, 0.2, 1200, effects);
          break;
        case 'crash': case 'death':
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
        case 'complete': case 'victory':
          [52, 59, 64, 68, 71, 76].forEach((note, i) => this.tone(midi(note), t + i * 0.11, 0.6, 0.19, 'triangle', effects));
          break;
        case 'shield': case 'use':
          this.tone(330, t, 0.35, 0.18, 'sine', effects, 990);
          break;
        case 'swap': case 'ui':
          this.tone(620, t, 0.065, 0.12, 'triangle', effects, 780);
          break;
      }
    } catch { /* Device loss is nonfatal. */ }
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
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
      this.music?.gain.setTargetAtTime(this.paused ? 0 : this.levels.music * 0.28, context.currentTime, 0.04);
      this.effects?.gain.setTargetAtTime(this.levels.effects * 0.65, context.currentTime, 0.025);
    } catch { /* Safe before or after audio-device changes. */ }
  }

  private schedule = (): void => {
    const context = this.context;
    const music = this.music;
    if (!context || !music || context.state !== 'running' || this.paused || this.disposed) return;
    if (this.nextStep < context.currentTime) this.nextStep = context.currentTime + 0.025;
    const tempo = this.intensity === 'boss' ? 128 : this.intensity === 'playing' ? 110 : 92;
    const stepLength = 60 / tempo / 4;
    try {
      for (let count = 0; this.nextStep < context.currentTime + 0.16 && count < 8; count++) {
        const t = this.nextStep;
        const beat = this.step % 16;
        const bar = Math.floor(this.step / 16) % 4;
        const root = [40, 36, 43, 38][bar] ?? 40;
        const arp = [12, 19, 24, 26, 19, 15, 24, 19][this.step % 8] ?? 12;
        if (beat % 2 === 0 || this.intensity === 'boss') this.tone(midi(root + arp), t, stepLength * 1.7, 0.105, 'triangle', music);
        if (beat % 4 === 0) {
          this.tone(midi(root), t, stepLength * 3.2, 0.2, 'sawtooth', music, undefined, 480);
          this.tone(125, t, 0.15, 0.32, 'sine', music, 38);
        }
        if (beat === 4 || beat === 12) this.hiss(t, 0.11, 0.14, 1900, music);
        if (beat % 2 === 1 && this.intensity !== 'title') this.hiss(t, 0.04, 0.055, 7200, music);
        if (beat === 0) {
          [12, 19, 22].forEach(interval => this.tone(midi(root + interval), t, stepLength * 15, 0.035, 'sine', music));
        }
        this.step++;
        this.nextStep += stepLength;
      }
    } catch { /* A suspended/disconnected audio device must not affect simulation. */ }
  };

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

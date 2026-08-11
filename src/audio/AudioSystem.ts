export interface AudioSystemOptions {
  volume?: number;
}

/**
 * Procedural Web Audio adapter. It deliberately owns presentation only: gameplay
 * emits events and calls semantic cues, while AudioSystem decides how they sound.
 * No external media files are required for the parity phase.
 */
export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private rain: GainNode | null = null;
  private wind: GainNode | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;
  private volume = 0.55;
  private disposed = false;

  constructor(options: AudioSystemOptions = {}) {
    if (typeof options.volume === 'number') this.volume = clamp01(options.volume);
  }

  setVolume(value: number): void {
    this.volume = clamp01(value);
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.04);
    }
  }

  async resume(): Promise<void> {
    if (this.disposed) return;
    const context = this.ensureContext();
    if (!context) return;
    if (context.state === 'suspended') await context.resume();
    this.ensureAmbience();
  }

  setAtmosphere(rainLevel: number, windLevel: number): void {
    const context = this.ensureContext();
    if (!context || !this.rain || !this.wind) return;
    const now = context.currentTime;
    this.rain.gain.setTargetAtTime(clamp01(rainLevel) * 0.14, now, 0.25);
    this.wind.gain.setTargetAtTime(clamp01(windLevel) * 0.09, now, 0.4);
  }

  playShot(kind: 'pistol' | 'shotgun' | 'bow'): void {
    const context = this.ensureContext();
    if (!context || context.state !== 'running') return;

    if (kind === 'bow') {
      this.tone(165, 85, 0.075, 0.055, 'triangle');
      this.noiseBurst(0.035, 0.018, 1300);
      return;
    }

    if (kind === 'shotgun') {
      this.noiseBurst(0.12, 0.22, 1500);
      this.tone(92, 48, 0.12, 0.12, 'sine');
      return;
    }

    this.noiseBurst(0.055, 0.13, 2600);
    this.tone(190, 92, 0.055, 0.07, 'square');
  }

  playHit(critical = false): void {
    const context = this.ensureContext();
    if (!context || context.state !== 'running') return;
    this.noiseBurst(critical ? 0.075 : 0.045, critical ? 0.075 : 0.045, 720);
    if (critical) this.tone(120, 70, 0.06, 0.05, 'sine');
  }

  playPlayerHit(): void {
    const context = this.ensureContext();
    if (!context || context.state !== 'running') return;
    this.tone(78, 52, 0.12, 0.08, 'sawtooth');
  }

  playPickup(type: 'health' | 'ammo'): void {
    const context = this.ensureContext();
    if (!context || context.state !== 'running') return;
    if (type === 'health') {
      this.tone(420, 620, 0.09, 0.05, 'sine');
    } else {
      this.tone(260, 340, 0.06, 0.04, 'square');
    }
  }

  playThunder(intensity = 1): void {
    const context = this.ensureContext();
    if (!context || context.state !== 'running') return;
    const strength = Math.max(0.25, Math.min(1.5, intensity));
    this.noiseBurst(0.9, 0.18 * strength, 420);
    this.tone(46, 28, 1.1, 0.16 * strength, 'sine');
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    try { this.ambienceSource?.stop(); } catch { /* already stopped */ }
    this.ambienceSource = null;
    this.rain = null;
    this.wind = null;
    this.master = null;
    if (this.context && this.context.state !== 'closed') void this.context.close();
    this.context = null;
  }

  private ensureContext(): AudioContext | null {
    if (this.disposed) return null;
    if (this.context) return this.context;
    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;

    const context = new AudioContextCtor();
    const master = context.createGain();
    master.gain.value = this.volume;
    master.connect(context.destination);

    const rain = context.createGain();
    rain.gain.value = 0;
    rain.connect(master);

    const wind = context.createGain();
    wind.gain.value = 0;
    wind.connect(master);

    this.context = context;
    this.master = master;
    this.rain = rain;
    this.wind = wind;
    this.ensureAmbience();
    return context;
  }

  private ensureAmbience(): void {
    const context = this.context;
    if (!context || this.ambienceSource) return;

    const seconds = 2;
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const rainFilter = context.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 1800;
    source.connect(rainFilter);
    rainFilter.connect(this.rain!);

    const windFilter = context.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 520;
    source.connect(windFilter);
    windFilter.connect(this.wind!);

    source.start();
    this.ambienceSource = source;
  }

  private noiseBurst(duration: number, level: number, cutoff: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);

    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = context.createGain();
    gain.gain.setValueAtTime(level, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
    source.stop(context.currentTime + duration + 0.02);
  }

  private tone(from: number, to: number, duration: number, level: number, type: OscillatorType): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, from), context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), context.currentTime + duration);
    gain.gain.setValueAtTime(level, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

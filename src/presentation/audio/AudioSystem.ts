import type { FacefallEvents, ShotEvent } from '../../combat/types';
import type { EventBus } from '../../core/EventBus';

/**
 * Procedural Web Audio presentation layer.
 * No external audio assets: short transients are synthesized and ambience uses
 * looped noise buffers. Simulation only emits events; this adapter owns sound.
 */
export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: GainNode | null = null;
  private rain: AudioBufferSourceNode | null = null;
  private wind: AudioBufferSourceNode | null = null;
  private volume = 0.72;
  private started = false;
  private readonly cleanups: Array<() => void> = [];

  constructor(events: EventBus<FacefallEvents>) {
    this.cleanups.push(events.on('shot', (event) => this.onShot(event)));
    this.cleanups.push(events.on('weaponReload', (event) => this.onReload(event.weaponId)));
    this.cleanups.push(events.on('hit', (event) => {
      if (event.targetId === 'player') this.pulse(88, 0.12, 0.06, 'sawtooth');
      else this.noiseBurst(event.critical ? 0.11 : 0.06, event.critical ? 0.10 : 0.055, 1300);
    }));
    this.cleanups.push(events.on('kill', () => this.pulse(180, 0.08, 0.035, 'triangle')));
    this.cleanups.push(events.on('enemyAttack', (event) => {
      const base = event.kind === 'brute' ? 58 : event.kind === 'runner' ? 118 : 84;
      this.pulse(base, event.kind === 'brute' ? 0.19 : 0.11, event.kind === 'brute' ? 0.08 : 0.045, 'sawtooth');
      this.noiseBurst(event.kind === 'brute' ? 0.16 : 0.08, event.kind === 'brute' ? 0.08 : 0.035, 680);
    }));
    this.cleanups.push(events.on('footstep', (event) => {
      this.noiseBurst(event.sprinting ? 0.045 : 0.032, event.sprinting ? 0.032 : 0.021, 520);
    }));
    this.cleanups.push(events.on('thunder', (event) => this.thunder(event.intensity)));
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.025);
    }
  }

  async resume(): Promise<void> {
    const context = this.ensureContext();
    if (context.state === 'suspended') await context.resume();
    if (!this.started) this.startAmbience();
  }

  suspend(): void {
    if (this.context?.state === 'running') void this.context.suspend();
  }

  dispose(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.rain?.stop();
    this.wind?.stop();
    this.rain = null;
    this.wind = null;
    this.started = false;
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.ambience = null;
  }

  private ensureContext(): AudioContext {
    if (this.context) return this.context;
    const context = new AudioContext({ latencyHint: 'interactive' });
    const master = context.createGain();
    master.gain.value = this.volume;
    master.connect(context.destination);
    const ambience = context.createGain();
    ambience.gain.value = 0.12;
    ambience.connect(master);
    this.context = context;
    this.master = master;
    this.ambience = ambience;
    return context;
  }

  private startAmbience(): void {
    const context = this.ensureContext();
    if (!this.ambience || this.started) return;
    this.started = true;

    const rainBuffer = this.makeNoiseBuffer(context, 2.2, 0.55);
    const rain = context.createBufferSource();
    rain.buffer = rainBuffer;
    rain.loop = true;
    const rainFilter = context.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 1500;
    const rainGain = context.createGain();
    rainGain.gain.value = 0.34;
    rain.connect(rainFilter).connect(rainGain).connect(this.ambience);
    rain.start();
    this.rain = rain;

    const windBuffer = this.makeNoiseBuffer(context, 3.6, 0.32);
    const wind = context.createBufferSource();
    wind.buffer = windBuffer;
    wind.loop = true;
    const windFilter = context.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 520;
    const windGain = context.createGain();
    windGain.gain.value = 0.24;
    wind.connect(windFilter).connect(windGain).connect(this.ambience);
    wind.start();
    this.wind = wind;
  }

  private onShot(event: ShotEvent): void {
    if (!this.context || this.context.state !== 'running') return;
    if (event.weaponId === 'pistol') {
      this.noiseBurst(0.055, 0.13, 1700);
      this.pulse(105, 0.045, 0.07, 'square');
      return;
    }
    if (event.weaponId === 'shotgun') {
      this.noiseBurst(0.11, 0.28, 950);
      this.pulse(72, 0.08, 0.14, 'sawtooth');
      return;
    }
    this.pulse(420, 0.07, 0.035, 'triangle');
    this.noiseBurst(0.035, 0.035, 2600);
  }

  private onReload(weaponId: 'pistol' | 'shotgun' | 'bow'): void {
    if (!this.context || this.context.state !== 'running') return;
    if (weaponId === 'bow') {
      this.noiseBurst(0.04, 0.018, 2200);
      this.pulse(340, 0.045, 0.018, 'triangle');
      return;
    }
    const base = weaponId === 'shotgun' ? 165 : 230;
    this.pulse(base, 0.045, 0.025, 'square');
    this.noiseBurst(weaponId === 'shotgun' ? 0.075 : 0.05, 0.022, 1100);
  }

  private thunder(intensity: number): void {
    if (!this.context || this.context.state !== 'running') return;
    const strength = Math.max(0.25, Math.min(1, intensity));
    this.noiseBurst(0.72, 0.12 * strength, 240);
    this.pulse(42, 0.55, 0.09 * strength, 'sawtooth');
  }

  private pulse(frequency: number, duration: number, gainValue: number, type: OscillatorType): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.55), now + duration);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }

  private noiseBurst(duration: number, gainValue: number, lowpass: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || context.state !== 'running') return;
    const source = context.createBufferSource();
    source.buffer = this.makeNoiseBuffer(context, duration, 1);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    const now = context.currentTime;
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(master);
    source.start(now);
  }

  private makeNoiseBuffer(context: AudioContext, seconds: number, amplitude: number): AudioBuffer {
    const frames = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < frames; index++) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.82 + white * 0.18;
      data[index] = previous * amplitude;
    }
    return buffer;
  }
}

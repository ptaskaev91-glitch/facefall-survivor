import type { FacefallEvents } from '../../combat/types';
import type { EventBus } from '../../core/EventBus';

export class ZombieVoiceSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.55;
  private readonly cleanups: Array<() => void> = [];

  constructor(events: EventBus<FacefallEvents>) {
    this.cleanups.push(events.on('enemyAttack', (event) => this.groan(event.kind === 'brute' ? 0.95 : event.kind === 'runner' ? 0.62 : 0.75)));
    this.cleanups.push(events.on('kill', (event) => {
      if (event.targetId === 'player') return;
      this.deathCry(event.critical ? 1 : 0.82);
    }));
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.volume * 0.42, this.context.currentTime, 0.03);
  }

  async resume(): Promise<void> {
    const context = this.ensureContext();
    if (context.state === 'suspended') await context.resume();
  }

  dispose(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    void this.context?.close();
    this.context = null;
    this.master = null;
  }

  private ensureContext(): AudioContext {
    if (this.context) return this.context;
    const context = new AudioContext({ latencyHint: 'interactive' });
    const master = context.createGain();
    master.gain.value = this.volume * 0.42;
    master.connect(context.destination);
    this.context = context;
    this.master = master;
    return context;
  }

  private groan(intensity: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || context.state !== 'running') return;
    const now = context.currentTime;
    const duration = 0.42 + Math.random() * 0.38;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(72 + Math.random() * 34, now);
    oscillator.frequency.linearRampToValueAtTime(48 + Math.random() * 20, now + duration);
    filter.type = 'bandpass';
    filter.frequency.value = 430 + Math.random() * 240;
    filter.Q.value = 1.4;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055 * intensity, now + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(filter).connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  private deathCry(intensity: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || context.state !== 'running') return;
    const now = context.currentTime;
    const duration = 0.58;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(155, now);
    oscillator.frequency.exponentialRampToValueAtTime(46, now + duration);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1050, now);
    filter.frequency.exponentialRampToValueAtTime(360, now + duration);
    filter.Q.value = 1.05;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.11 * intensity, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(filter).connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}

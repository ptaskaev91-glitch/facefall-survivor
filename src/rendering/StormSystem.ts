import { PointLight, Scene, Vector3 } from 'three';
import type { EventBus } from '../core/EventBus';
import type { FacefallEvents } from '../combat/types';

/** Lightweight atmospheric lightning. One reused light, no allocations per flash. */
export class StormSystem {
  private readonly flash = new PointLight(0xcfe3ff, 0, 70, 1.7);
  private timer = 5 + Math.random() * 5;
  private flashTime = 0;
  private activity = 1;

  constructor(scene: Scene, private readonly events: EventBus<FacefallEvents>) {
    this.flash.position.copy(new Vector3(-8, 24, -12));
    scene.add(this.flash);
  }

  setActivity(value: number): void {
    this.activity = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    if (this.activity <= 0.01) {
      this.flashTime = 0;
      this.flash.intensity = 0;
    }
  }

  get currentActivity(): number { return this.activity; }

  update(dt: number): void {
    if (this.activity <= 0.01) return;

    if (this.flashTime > 0) {
      this.flashTime = Math.max(0, this.flashTime - dt);
      const normalized = this.flashTime / 0.16;
      this.flash.intensity = 34 * this.activity * normalized * normalized;
      if (this.flashTime <= 0) this.flash.intensity = 0;
    }

    this.timer -= dt * (0.5 + this.activity * 0.75);
    if (this.timer > 0) return;
    this.timer = 9 + Math.random() * 13;
    this.flashTime = 0.16;
    this.flash.intensity = 34 * this.activity;
    this.events.emit('thunder', { intensity: (0.45 + Math.random() * 0.45) * this.activity });
  }

  dispose(): void {
    this.flash.removeFromParent();
  }
}

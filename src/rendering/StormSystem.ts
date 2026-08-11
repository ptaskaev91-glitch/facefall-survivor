import { PointLight, Scene, Vector3 } from 'three';
import type { EventBus } from '../core/EventBus';
import type { FacefallEvents } from '../combat/types';

/** Lightweight atmospheric lightning. One reused light, no allocations per flash. */
export class StormSystem {
  private readonly flash = new PointLight(0xcfe3ff, 0, 70, 1.7);
  private timer = 5 + Math.random() * 5;
  private flashTime = 0;

  constructor(scene: Scene, private readonly events: EventBus<FacefallEvents>) {
    this.flash.position.copy(new Vector3(-8, 24, -12));
    scene.add(this.flash);
  }

  update(dt: number): void {
    if (this.flashTime > 0) {
      this.flashTime = Math.max(0, this.flashTime - dt);
      const normalized = this.flashTime / 0.16;
      this.flash.intensity = 34 * normalized * normalized;
      if (this.flashTime <= 0) this.flash.intensity = 0;
    }

    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 9 + Math.random() * 13;
    this.flashTime = 0.16;
    this.flash.intensity = 34;
    this.events.emit('thunder', { intensity: 0.65 + Math.random() * 0.35 });
  }

  dispose(): void {
    this.flash.removeFromParent();
  }
}

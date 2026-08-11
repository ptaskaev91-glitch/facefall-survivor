import * as THREE from 'three';
import type { AudioSystem } from '../audio/AudioSystem';

/** Sparse atmospheric lightning. No gameplay effect. */
export class LightningSystem {
  private readonly light = new THREE.DirectionalLight(0xe7f1ff, 0);
  private timer = 8 + Math.random() * 10;
  private flashTime = 0;
  private thunderDelay = -1;
  private intensity = 1;

  constructor(scene: THREE.Scene, private readonly audio: AudioSystem) {
    this.light.position.set(-10, 28, 12);
    scene.add(this.light);
  }

  update(dt: number): void {
    this.timer -= dt;
    if (this.timer <= 0) this.trigger();

    if (this.flashTime > 0) {
      this.flashTime -= dt;
      const phase = Math.max(0, this.flashTime / 0.18);
      this.light.intensity = this.intensity * (phase > 0.55 ? 7 : 3.5) * phase;
    } else {
      this.light.intensity = 0;
    }

    if (this.thunderDelay >= 0) {
      this.thunderDelay -= dt;
      if (this.thunderDelay <= 0) {
        this.audio.playThunder(this.intensity);
        this.thunderDelay = -1;
      }
    }
  }

  dispose(): void {
    this.light.removeFromParent();
    this.light.dispose();
  }

  private trigger(): void {
    this.intensity = 0.65 + Math.random() * 0.55;
    this.flashTime = 0.18;
    this.thunderDelay = 0.3 + Math.random() * 1.1;
    this.timer = 9 + Math.random() * 18;
  }
}

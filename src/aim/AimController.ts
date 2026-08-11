import { Vector2 } from 'three';
import type { CameraMode } from '../camera/CameraDirector';
import type { InputSnapshot } from '../input/InputManager';

export interface AimControllerOptions {
  reticle?: HTMLElement;
  touchSensitivity?: number;
}

/**
 * Owns the visible screen-space reticle. The reticle is gameplay state, not decoration:
 * its NDC position is used to build the actual weapon aim ray.
 */
export class AimController {
  private readonly ndc = new Vector2(0, 0);
  private readonly center = new Vector2(0, 0);
  private mode: CameraMode = 'top';
  private readonly touchSensitivity: number;

  constructor(private readonly options: AimControllerOptions = {}) {
    this.touchSensitivity = options.touchSensitivity ?? 1.05;
    this.renderReticle();
  }

  setMode(mode: CameraMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    // TOP keeps a free cursor. 3RD starts from the optical centre so camera and gun
    // never begin a mode switch aimed at an arbitrary screen edge.
    if (mode === 'third') this.ndc.set(0, 0);
    this.renderReticle();
  }

  reset(mode: CameraMode = this.mode): void {
    this.mode = mode;
    this.ndc.set(0, 0);
    this.renderReticle();
  }

  update(input: InputSnapshot): void {
    // Desktop mouse remains absolute. Touch does not set hasPointer and therefore
    // moves the virtual cursor relatively via aimX/aimY below.
    if (input.hasPointer) {
      this.ndc.set(input.pointerX, input.pointerY);
      this.clamp();
    }

    if (Math.abs(input.aimX) > 0.001 || Math.abs(input.aimY) > 0.001) {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      this.ndc.x += (input.aimX / width) * 2 * this.touchSensitivity;
      this.ndc.y -= (input.aimY / height) * 2 * this.touchSensitivity;
      this.clamp();
    }

    this.renderReticle();
  }

  getNdc(out = new Vector2()): Vector2 {
    return out.copy(this.ndc);
  }

  /**
   * In third person the reticle may float inside a soft zone. Once it leaves the
   * centre zone, the character/camera yaw follows it continuously.
   */
  getThirdPersonTurnDemand(): number {
    if (this.mode !== 'third') return 0;
    const deadZone = 0.12;
    const magnitude = Math.abs(this.ndc.x);
    if (magnitude <= deadZone) return 0;
    const normalized = Math.min(1, (magnitude - deadZone) / 0.42);
    return Math.sign(this.ndc.x) * normalized;
  }

  private clamp(): void {
    if (this.mode === 'top') {
      // Leave room for the top HUD and bottom touch controls while still allowing
      // a wide aiming arc around the player.
      this.ndc.x = Math.max(-0.84, Math.min(0.84, this.ndc.x));
      this.ndc.y = Math.max(-0.58, Math.min(0.70, this.ndc.y));
      return;
    }

    // 3RD uses a tighter floating reticle. Camera yaw follows when the reticle
    // approaches the horizontal edge of this zone.
    this.ndc.x = Math.max(-0.48, Math.min(0.48, this.ndc.x));
    this.ndc.y = Math.max(-0.34, Math.min(0.34, this.ndc.y));
  }

  private renderReticle(): void {
    const reticle = this.options.reticle;
    if (!reticle) return;
    const x = (this.ndc.x * 0.5 + 0.5) * 100;
    const y = (-this.ndc.y * 0.5 + 0.5) * 100;
    reticle.style.left = `${x}%`;
    reticle.style.top = `${y}%`;
    reticle.dataset.mode = this.mode;
  }
}

import type { Vector3 } from 'three';

/**
 * Converts normalized screen-space movement into horizontal world movement.
 *
 * Input convention:
 * - x > 0 = right on screen
 * - y < 0 = up/forward on screen
 *
 * The active camera updates the horizontal forward basis each render. This
 * keeps WASD and the mobile joystick intuitive in both TOP and 3RD modes.
 */
export class MovementFrame {
  private forwardX = 0;
  private forwardZ = -1;
  private rightX = 1;
  private rightZ = 0;

  setFromCameraForward(forward: Vector3): void {
    const x = forward.x;
    const z = forward.z;
    const length = Math.hypot(x, z);
    if (length <= 1e-6) return;

    this.forwardX = x / length;
    this.forwardZ = z / length;
    this.rightX = -this.forwardZ;
    this.rightZ = this.forwardX;
  }

  map(x: number, y: number): { x: number; y: number } {
    const forwardAmount = -y;
    return {
      x: this.rightX * x + this.forwardX * forwardAmount,
      y: this.rightZ * x + this.forwardZ * forwardAmount
    };
  }
}

export const movementFrame = new MovementFrame();

import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { CameraCollision } from './CameraCollision';

export interface ThirdPersonCameraSettings {
  distance: number;
  height: number;
  side: number;
  lookHeight: number;
  lookAhead: number;
  fov: number;
  smoothing: number;
}

const DEFAULTS: ThirdPersonCameraSettings = {
  distance: 7.0,
  height: 4.05,
  side: 0.72,
  lookHeight: 1.0,
  lookAhead: 4.1,
  fov: 70,
  smoothing: 10
};

export class ThirdPersonCamera {
  readonly settings: ThirdPersonCameraSettings;
  private readonly forward = new Vector3(0, 0, -1);
  private readonly right = new Vector3(1, 0, 0);
  private readonly desired = new Vector3();
  private readonly lookTarget = new Vector3();
  private readonly collisionAnchor = new Vector3();

  constructor(settings: Partial<ThirdPersonCameraSettings> = {}) {
    this.settings = { ...DEFAULTS, ...settings };
  }

  update(
    camera: PerspectiveCamera,
    target: Vector3,
    facing: Vector3,
    dt: number,
    collision?: CameraCollision
  ): void {
    this.forward.copy(facing).setY(0);
    if (this.forward.lengthSq() < 1e-6) this.forward.set(0, 0, -1);
    this.forward.normalize();
    this.right.set(-this.forward.z, 0, this.forward.x).normalize();

    this.desired.copy(target)
      .addScaledVector(this.forward, -this.settings.distance)
      .addScaledVector(this.right, this.settings.side);
    this.desired.y += this.settings.height;

    // Look ahead of the player so the fixed center crosshair points into playable space,
    // not into the character's upper back/head.
    this.lookTarget.copy(target)
      .addScaledVector(this.forward, this.settings.lookAhead);
    this.lookTarget.y = target.y + this.settings.lookHeight;

    if (collision) {
      this.collisionAnchor.copy(target);
      this.collisionAnchor.y += 1.25;
      collision.resolve(this.collisionAnchor, this.desired, this.desired);
    }

    const alpha = 1 - Math.exp(-this.settings.smoothing * dt);
    camera.position.lerp(this.desired, alpha);
    camera.fov = MathUtils.damp(camera.fov, this.settings.fov, this.settings.smoothing, dt);
    camera.lookAt(this.lookTarget);
    camera.updateProjectionMatrix();
  }
}

import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

export interface TopDownCameraSettings {
  height: number;
  distance: number;
  lookHeight: number;
  fov: number;
  smoothing: number;
}

const DEFAULTS: TopDownCameraSettings = {
  height: 15.5,
  distance: 12.5,
  lookHeight: 0.7,
  fov: 55,
  smoothing: 10
};

export class TopDownCamera {
  readonly settings: TopDownCameraSettings;
  private readonly desired = new Vector3();
  private readonly lookTarget = new Vector3();

  constructor(settings: Partial<TopDownCameraSettings> = {}) {
    this.settings = { ...DEFAULTS, ...settings };
  }

  update(camera: PerspectiveCamera, target: Vector3, dt: number): void {
    this.desired.set(
      target.x + this.settings.distance,
      target.y + this.settings.height,
      target.z + this.settings.distance
    );
    this.lookTarget.set(target.x, target.y + this.settings.lookHeight, target.z);

    const alpha = 1 - Math.exp(-this.settings.smoothing * dt);
    camera.position.lerp(this.desired, alpha);
    camera.fov = MathUtils.damp(camera.fov, this.settings.fov, this.settings.smoothing, dt);
    camera.lookAt(this.lookTarget);
    camera.updateProjectionMatrix();
  }
}

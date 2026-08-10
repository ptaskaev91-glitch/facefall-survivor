import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

export type CameraMode = 'top' | 'third';

export interface CameraRigSettings {
  thirdDistance: number;
  thirdHeight: number;
  thirdSide: number;
  thirdLookHeight: number;
  thirdFov: number;
  topHeight: number;
  topDistance: number;
  topFov: number;
  smoothing: number;
}

const DEFAULTS: CameraRigSettings = {
  thirdDistance: 5.6,
  thirdHeight: 2.45,
  thirdSide: 0.85,
  thirdLookHeight: 1.35,
  thirdFov: 68,
  topHeight: 15.5,
  topDistance: 12.5,
  topFov: 55,
  smoothing: 10
};

export class DualCameraRig {
  mode: CameraMode = 'top';
  readonly settings: CameraRigSettings;
  private readonly desired = new Vector3();
  private readonly lookTarget = new Vector3();
  private readonly forward = new Vector3(0, 0, -1);
  private readonly right = new Vector3(1, 0, 0);

  constructor(readonly camera: PerspectiveCamera, settings: Partial<CameraRigSettings> = {}) {
    this.settings = { ...DEFAULTS, ...settings };
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  update(target: Vector3, facing: Vector3, dt: number): void {
    this.forward.copy(facing).setY(0);
    if (this.forward.lengthSq() < 1e-6) this.forward.set(0, 0, -1);
    this.forward.normalize();
    this.right.set(-this.forward.z, 0, this.forward.x).normalize();

    if (this.mode === 'third') {
      this.desired.copy(target)
        .addScaledVector(this.forward, -this.settings.thirdDistance)
        .addScaledVector(this.right, this.settings.thirdSide)
        .add(new Vector3(0, this.settings.thirdHeight, 0));
      this.lookTarget.copy(target).add(new Vector3(0, this.settings.thirdLookHeight, 0));
      this.camera.fov = MathUtils.damp(this.camera.fov, this.settings.thirdFov, this.settings.smoothing, dt);
    } else {
      this.desired.copy(target).add(new Vector3(this.settings.topDistance, this.settings.topHeight, this.settings.topDistance));
      this.lookTarget.copy(target).add(new Vector3(0, 0.7, 0));
      this.camera.fov = MathUtils.damp(this.camera.fov, this.settings.topFov, this.settings.smoothing, dt);
    }

    const alpha = 1 - Math.exp(-this.settings.smoothing * dt);
    this.camera.position.lerp(this.desired, alpha);
    this.camera.lookAt(this.lookTarget);
    this.camera.updateProjectionMatrix();
  }
}

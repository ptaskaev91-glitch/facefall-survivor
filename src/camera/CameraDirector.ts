import type { PerspectiveCamera, Vector3 } from 'three';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { TopDownCamera } from './TopDownCamera';

export type CameraMode = 'top' | 'third';

export class CameraDirector {
  mode: CameraMode = 'top';
  readonly topDown: TopDownCamera;
  readonly thirdPerson: ThirdPersonCamera;

  constructor(
    private readonly camera: PerspectiveCamera,
    topDown = new TopDownCamera(),
    thirdPerson = new ThirdPersonCamera()
  ) {
    this.topDown = topDown;
    this.thirdPerson = thirdPerson;
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  toggle(): CameraMode {
    this.mode = this.mode === 'top' ? 'third' : 'top';
    return this.mode;
  }

  update(target: Vector3, facing: Vector3, dt: number): void {
    if (this.mode === 'third') {
      this.thirdPerson.update(this.camera, target, facing, dt);
      return;
    }
    this.topDown.update(this.camera, target, dt);
  }
}

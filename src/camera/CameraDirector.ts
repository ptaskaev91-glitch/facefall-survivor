import { Vector3, type PerspectiveCamera } from 'three';
import { movementFrame } from '../input/MovementFrame';
import type { CameraCollision } from './CameraCollision';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { TopDownCamera } from './TopDownCamera';

export type CameraMode = 'top' | 'third';

export class CameraDirector {
  mode: CameraMode = 'top';
  readonly topDown: TopDownCamera;
  readonly thirdPerson: ThirdPersonCamera;
  private collision: CameraCollision | undefined;
  private readonly movementForward = new Vector3(0, 0, -1);

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

  setCollision(collision: CameraCollision | undefined): void {
    this.collision = collision;
  }

  toggle(): CameraMode {
    this.mode = this.mode === 'top' ? 'third' : 'top';
    return this.mode;
  }

  update(target: Vector3, facing: Vector3, dt: number): void {
    if (this.mode === 'third') {
      this.thirdPerson.update(this.camera, target, facing, dt, this.collision);
    } else {
      this.topDown.update(this.camera, target, dt);
    }

    this.camera.getWorldDirection(this.movementForward);
    this.movementForward.y = 0;
    movementFrame.setFromCameraForward(this.movementForward);
  }
}

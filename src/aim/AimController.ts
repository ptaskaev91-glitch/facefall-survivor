import { Plane, Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three';
import type { CameraMode } from '../camera/CameraDirector';

/**
 * Shared aim state. The visible reticle is the source of truth for the weapon ray.
 * TOP uses a free screen cursor. 3RD uses a floating reticle with soft-edge turning.
 */
export class AimController {
  private readonly ndc = new Vector2(0, 0);
  private readonly worldDirection = new Vector3(0, 0, -1);
  private readonly raycaster = new Raycaster();
  private readonly aimPlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly aimPoint = new Vector3();
  private readonly muzzleApprox = new Vector3();
  private readonly torsoOffset = new Vector3(0, 1.15, 0);
  private reticle: HTMLElement | undefined;
  private mode: CameraMode = 'top';
  private readonly touchSensitivity = 1.05;

  setReticle(reticle: HTMLElement | undefined): void {
    this.reticle = reticle;
    this.renderReticle();
  }

  setMode(mode: CameraMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'third') this.ndc.set(0, 0);
    this.clamp();
    this.renderReticle();
  }

  reset(mode: CameraMode = this.mode): void {
    this.mode = mode;
    this.ndc.set(0, 0);
    this.worldDirection.set(0, 0, -1);
    this.renderReticle();
  }

  setPointerNdc(x: number, y: number): void {
    this.ndc.set(x, y);
    this.clamp();
    this.renderReticle();
  }

  addTouchDelta(dx: number, dy: number): void {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.ndc.x += (dx / width) * 2 * this.touchSensitivity;
    this.ndc.y -= (dy / height) * 2 * this.touchSensitivity;
    this.clamp();
    this.renderReticle();
  }

  getNdc(out = new Vector2()): Vector2 {
    return out.copy(this.ndc);
  }

  getWorldDirection(out = new Vector3()): Vector3 {
    return out.copy(this.worldDirection);
  }

  /**
   * Converts the current visible reticle into the world-space direction used by
   * WeaponSystem. Crosshair position and ShotEvent therefore stay synchronized.
   */
  updateWorldAim(camera: PerspectiveCamera, playerPosition: Vector3): void {
    this.raycaster.setFromCamera(this.ndc, camera);

    if (this.mode === 'top') {
      // Aim at torso height rather than at the ground, otherwise a top camera ray
      // would make every shot dive into the asphalt directly in front of the hero.
      this.aimPlane.constant = -(playerPosition.y + 0.95);
      const hit = this.raycaster.ray.intersectPlane(this.aimPlane, this.aimPoint);
      if (!hit) return;
      this.worldDirection.copy(hit).sub(playerPosition).setY(0);
      if (this.worldDirection.lengthSq() > 1e-6) this.worldDirection.normalize();
      return;
    }

    // 3RD keeps vertical aiming. Using an approximate muzzle position makes close
    // targets line up better than simply copying the camera ray direction.
    this.raycaster.ray.at(70, this.aimPoint);
    this.muzzleApprox.copy(playerPosition).add(this.torsoOffset);
    this.worldDirection.copy(this.aimPoint).sub(this.muzzleApprox);
    if (this.worldDirection.lengthSq() > 1e-6) this.worldDirection.normalize();
  }

  getThirdPersonTurnDemand(): number {
    if (this.mode !== 'third') return 0;
    const deadZone = 0.12;
    const magnitude = Math.abs(this.ndc.x);
    if (magnitude <= deadZone) return 0;
    const normalized = Math.min(1, (magnitude - deadZone) / 0.36);
    return Math.sign(this.ndc.x) * normalized;
  }

  private clamp(): void {
    if (this.mode === 'top') {
      this.ndc.x = Math.max(-0.84, Math.min(0.84, this.ndc.x));
      this.ndc.y = Math.max(-0.58, Math.min(0.70, this.ndc.y));
      return;
    }
    this.ndc.x = Math.max(-0.48, Math.min(0.48, this.ndc.x));
    this.ndc.y = Math.max(-0.34, Math.min(0.34, this.ndc.y));
  }

  private renderReticle(): void {
    if (!this.reticle) return;
    const x = (this.ndc.x * 0.5 + 0.5) * 100;
    const y = (-this.ndc.y * 0.5 + 0.5) * 100;
    this.reticle.style.left = `${x}%`;
    this.reticle.style.top = `${y}%`;
    this.reticle.dataset.mode = this.mode;
  }
}

export const aimController = new AimController();

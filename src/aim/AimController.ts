import { Plane, Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three';
import type { CameraMode } from '../camera/CameraDirector';

/**
 * Shared aim state.
 * TOP: free/internal aim point represented by a very faint laser; mobile can fully auto-steer it.
 * 3RD: crosshair is fixed in the exact screen center; swipe and auto-aim rotate yaw only.
 */
export class AimController {
  private readonly ndc = new Vector2(0, 0);
  private readonly worldDirection = new Vector3(0, 0, -1);
  private readonly raycaster = new Raycaster();
  private readonly aimPlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly aimPoint = new Vector3();
  private readonly muzzleApprox = new Vector3();
  private readonly torsoOffset = new Vector3(0, 1.15, 0);
  private readonly projectedPlayer = new Vector3();
  private reticle: HTMLElement | undefined;
  private laser: HTMLDivElement | undefined;
  private mode: CameraMode = 'top';
  private touchSensitivity = 1.05;
  private thirdPersonDeadzone = 0.12;
  private thirdTurnDelta = 0;

  setReticle(reticle: HTMLElement | undefined): void {
    this.reticle = reticle;
    this.ensureLaser();
    this.renderAimUi();
  }

  configure(options: { sensitivity?: number; deadzone?: number }): void {
    if (typeof options.sensitivity === 'number' && Number.isFinite(options.sensitivity)) {
      this.touchSensitivity = Math.max(0.45, Math.min(2.2, options.sensitivity));
    }
    if (typeof options.deadzone === 'number' && Number.isFinite(options.deadzone)) {
      this.thirdPersonDeadzone = Math.max(0.04, Math.min(0.28, options.deadzone));
    }
  }

  setMode(mode: CameraMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.thirdTurnDelta = 0;
    if (mode === 'third') this.ndc.set(0, 0);
    this.clamp();
    this.renderAimUi();
  }

  getMode(): CameraMode {
    return this.mode;
  }

  reset(mode: CameraMode = this.mode): void {
    this.mode = mode;
    this.ndc.set(0, 0);
    this.thirdTurnDelta = 0;
    this.worldDirection.set(0, 0, -1);
    this.renderAimUi();
  }

  setPointerNdc(x: number, y: number): void {
    if (this.mode === 'third') {
      this.ndc.set(0, 0);
      this.renderAimUi();
      return;
    }
    this.ndc.set(x, y);
    this.clamp();
    this.renderAimUi();
  }

  addTouchDelta(dx: number, dy: number): void {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);

    if (this.mode === 'third') {
      this.thirdTurnDelta += (dx / width) * this.touchSensitivity * 1.8;
      this.thirdTurnDelta = Math.max(-0.36, Math.min(0.36, this.thirdTurnDelta));
      this.ndc.set(0, 0);
      this.renderAimUi();
      return;
    }

    this.ndc.x += (dx / width) * 2 * this.touchSensitivity;
    this.ndc.y -= (dy / height) * 2 * this.touchSensitivity;
    this.clamp();
    this.renderAimUi();
  }

  addMouseLookDelta(dx: number): void {
    if (this.mode !== 'third') return;
    const width = Math.max(1, window.innerWidth);
    this.thirdTurnDelta += (dx / width) * this.touchSensitivity * 1.8;
    this.thirdTurnDelta = Math.max(-0.36, Math.min(0.36, this.thirdTurnDelta));
  }

  /** Mobile aim-assist correction. TOP moves its internal aim point; 3RD converts X correction to yaw. */
  nudgeNdc(delta: Vector2): void {
    if (this.mode === 'third') {
      this.thirdTurnDelta += delta.x * 1.75;
      this.thirdTurnDelta = Math.max(-0.24, Math.min(0.24, this.thirdTurnDelta));
      return;
    }
    this.ndc.add(delta);
    this.clamp();
    this.renderAimUi();
  }

  /** TOP recoil can move the internal aim point. 3RD keeps the crosshair fixed. */
  applyRecoil(yawDegrees: number, pitchDegrees: number): void {
    if (this.mode === 'third') return;
    this.ndc.x += yawDegrees * 0.0065;
    this.ndc.y += pitchDegrees * 0.007;
    this.clamp();
    this.renderAimUi();
  }

  getNdc(out = new Vector2()): Vector2 {
    return out.copy(this.ndc);
  }

  getWorldDirection(out = new Vector3()): Vector3 {
    return out.copy(this.worldDirection);
  }

  updateWorldAim(camera: PerspectiveCamera, playerPosition: Vector3): void {
    if (this.mode === 'third') this.ndc.set(0, 0);
    this.raycaster.setFromCamera(this.ndc, camera);

    if (this.mode === 'top') {
      this.aimPlane.constant = -(playerPosition.y + 0.95);
      const hit = this.raycaster.ray.intersectPlane(this.aimPlane, this.aimPoint);
      if (!hit) return;
      this.worldDirection.copy(hit).sub(playerPosition).setY(0);
      if (this.worldDirection.lengthSq() > 1e-6) this.worldDirection.normalize();
      this.renderLaser(camera, playerPosition);
      return;
    }

    this.raycaster.ray.at(70, this.aimPoint);
    this.muzzleApprox.copy(playerPosition).add(this.torsoOffset);
    this.worldDirection.copy(this.aimPoint).sub(this.muzzleApprox);
    if (this.worldDirection.lengthSq() > 1e-6) this.worldDirection.normalize();
    this.renderAimUi();
  }

  consumeThirdPersonTurnDelta(): number {
    if (this.mode !== 'third') {
      this.thirdTurnDelta = 0;
      return 0;
    }
    const value = this.thirdTurnDelta;
    this.thirdTurnDelta = 0;
    return value;
  }

  getThirdPersonTurnDemand(): number {
    return this.mode === 'third' ? this.thirdTurnDelta : 0;
  }

  private clamp(): void {
    if (this.mode === 'top') {
      this.ndc.x = Math.max(-0.84, Math.min(0.84, this.ndc.x));
      this.ndc.y = Math.max(-0.58, Math.min(0.70, this.ndc.y));
      return;
    }
    this.ndc.set(0, 0);
  }

  private ensureLaser(): void {
    if (this.laser || !this.reticle?.parentElement) return;
    const laser = document.createElement('div');
    laser.setAttribute('aria-hidden', 'true');
    laser.dataset.aimLaser = 'true';
    Object.assign(laser.style, {
      position: 'absolute', left: '0px', top: '0px', width: '0px', height: '1px',
      transformOrigin: '0 50%', pointerEvents: 'none', opacity: '0', zIndex: '3',
      background: 'linear-gradient(90deg, rgba(217,242,125,.04), rgba(217,242,125,.13))',
      boxShadow: '0 0 3px rgba(217,242,125,.05)'
    });
    this.reticle.parentElement.appendChild(laser);
    this.laser = laser;
  }

  private renderLaser(camera: PerspectiveCamera, playerPosition: Vector3): void {
    if (this.mode !== 'top' || !this.laser) {
      if (this.laser) this.laser.style.opacity = '0';
      return;
    }

    this.projectedPlayer.copy(playerPosition).add(this.torsoOffset).project(camera);
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const startX = (this.projectedPlayer.x * 0.5 + 0.5) * width;
    const startY = (-this.projectedPlayer.y * 0.5 + 0.5) * height;
    const endX = (this.ndc.x * 0.5 + 0.5) * width;
    const endY = (-this.ndc.y * 0.5 + 0.5) * height;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    this.laser.style.left = `${startX}px`;
    this.laser.style.top = `${startY}px`;
    this.laser.style.width = `${length}px`;
    this.laser.style.transform = `rotate(${angle}deg)`;
    this.laser.style.opacity = '0.18';
    this.renderAimUi();
  }

  private renderAimUi(): void {
    if (this.reticle) {
      if (this.mode === 'third') {
        this.reticle.style.left = '50%';
        this.reticle.style.top = '50%';
        this.reticle.style.opacity = '0.92';
      } else {
        this.reticle.style.opacity = '0';
      }
      this.reticle.dataset.mode = this.mode;
    }
    if (this.laser && this.mode !== 'top') this.laser.style.opacity = '0';
  }
}

export const aimController = new AimController();

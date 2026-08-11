import { Plane, Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three';
import type { CameraMode } from '../camera/CameraDirector';

export interface AimSettings {
  sensitivity: number;
  deadzone: number;
  assist: number;
}

/**
 * Shared aim state. The visible reticle is the source of truth for the weapon ray.
 * TOP uses a free screen cursor. 3RD uses a floating reticle with soft-edge turning.
 * Aim assist modifies the visible reticle itself, never a hidden shot-only direction.
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
  private settings: AimSettings = { sensitivity: 1.05, deadzone: 0.12, assist: 0.18 };

  configure(settings: Partial<AimSettings>): void {
    if (typeof settings.sensitivity === 'number') this.settings.sensitivity = clamp(settings.sensitivity, 0.55, 1.8);
    if (typeof settings.deadzone === 'number') this.settings.deadzone = clamp(settings.deadzone, 0.04, 0.28);
    if (typeof settings.assist === 'number') this.settings.assist = clamp(settings.assist, 0, 0.45);
  }

  get assistStrength(): number {
    return this.settings.assist;
  }

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
    this.ndc.x += (dx / width) * 2 * this.settings.sensitivity;
    this.ndc.y -= (dy / height) * 2 * this.settings.sensitivity;
    this.clamp();
    this.renderReticle();
  }

  /**
   * Pull the visible reticle toward a projected target while it is already close.
   * Returns true when assistance was applied. The weapon ray is recalculated from
   * the assisted reticle afterwards, preserving visible-reticle/shot parity.
   */
  assistTowardNdc(targetX: number, targetY: number, dt: number, mobileOnly = true): boolean {
    if (this.settings.assist <= 0) return false;
    if (mobileOnly && !isCoarsePointer()) return false;
    if (targetX < -1 || targetX > 1 || targetY < -1 || targetY > 1) return false;

    const dx = targetX - this.ndc.x;
    const dy = targetY - this.ndc.y;
    const distance = Math.hypot(dx, dy);
    const captureRadius = this.mode === 'third' ? 0.22 : 0.30;
    if (distance > captureRadius) return false;

    const centerWeight = 1 - distance / captureRadius;
    const blend = 1 - Math.exp(-dt * (4 + this.settings.assist * 22 * centerWeight));
    this.ndc.x += dx * blend * this.settings.assist;
    this.ndc.y += dy * blend * this.settings.assist;
    this.clamp();
    this.renderReticle();
    return true;
  }

  getNdc(out = new Vector2()): Vector2 {
    return out.copy(this.ndc);
  }

  getWorldDirection(out = new Vector3()): Vector3 {
    return out.copy(this.worldDirection);
  }

  updateWorldAim(camera: PerspectiveCamera, playerPosition: Vector3): void {
    this.raycaster.setFromCamera(this.ndc, camera);

    if (this.mode === 'top') {
      this.aimPlane.constant = -(playerPosition.y + 0.95);
      const hit = this.raycaster.ray.intersectPlane(this.aimPlane, this.aimPoint);
      if (!hit) return;
      this.worldDirection.copy(hit).sub(playerPosition).setY(0);
      if (this.worldDirection.lengthSq() > 1e-6) this.worldDirection.normalize();
      return;
    }

    this.raycaster.ray.at(70, this.aimPoint);
    this.muzzleApprox.copy(playerPosition).add(this.torsoOffset);
    this.worldDirection.copy(this.aimPoint).sub(this.muzzleApprox);
    if (this.worldDirection.lengthSq() > 1e-6) this.worldDirection.normalize();
  }

  getThirdPersonTurnDemand(): number {
    if (this.mode !== 'third') return 0;
    const magnitude = Math.abs(this.ndc.x);
    if (magnitude <= this.settings.deadzone) return 0;
    const normalized = Math.min(1, (magnitude - this.settings.deadzone) / 0.36);
    return Math.sign(this.ndc.x) * normalized;
  }

  private clamp(): void {
    if (this.mode === 'top') {
      this.ndc.x = clamp(this.ndc.x, -0.84, 0.84);
      this.ndc.y = clamp(this.ndc.y, -0.58, 0.70);
      return;
    }
    this.ndc.x = clamp(this.ndc.x, -0.48, 0.48);
    this.ndc.y = clamp(this.ndc.y, -0.34, 0.34);
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isCoarsePointer(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

export const aimController = new AimController();

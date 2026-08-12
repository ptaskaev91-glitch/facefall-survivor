import { aimController } from '../aim/AimController';
import { InputManager, type InputAction } from './InputManager';

export interface TouchInputElements {
  joystick: HTMLElement;
  stick: HTMLElement;
  fire: HTMLElement;
  movementSurface?: HTMLElement;
  aimSurface?: HTMLElement;
  reload?: HTMLElement;
  switchWeapon?: HTMLElement;
  toggleCamera?: HTMLElement;
  sprint?: HTMLElement;
}

export class TouchInput {
  private joystickPointer: number | null = null;
  private aimPointer: number | null = null;
  private joystickCenterX = 0;
  private joystickCenterY = 0;
  private aimLastX = 0;
  private aimLastY = 0;
  private readonly maxRadius = 46;
  private attached = false;
  private readonly actionCleanups: Array<() => void> = [];

  constructor(private readonly input: InputManager, private readonly elements: TouchInputElements) {}

  private get surface(): HTMLElement | undefined {
    return this.elements.movementSurface ?? this.elements.aimSurface;
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.elements.joystick.style.display = 'none';
    this.surface?.addEventListener('pointerdown', this.onSurfaceDown);
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);

    this.bindAction(this.elements.fire, 'fire');
    this.bindAction(this.elements.reload, 'reload');
    this.bindAction(this.elements.switchWeapon, 'switchWeapon');
    this.bindAction(this.elements.toggleCamera, 'toggleCamera');
    this.bindAction(this.elements.sprint, 'sprint');
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.surface?.removeEventListener('pointerdown', this.onSurfaceDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    for (const cleanup of this.actionCleanups.splice(0)) cleanup();
    this.resetJoystick();
    this.aimPointer = null;
    this.input.reset();
  }

  private bindAction(element: HTMLElement | undefined, action: InputAction): void {
    if (!element) return;
    element.style.touchAction = 'none';

    const press = (event: PointerEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      this.safeCapture(element, event.pointerId);
      this.input.setAction(action, true);
    };

    const release = (event: PointerEvent): void => {
      event.preventDefault();
      this.input.setAction(action, false);
    };

    element.addEventListener('pointerdown', press);
    element.addEventListener('pointerup', release);
    element.addEventListener('pointercancel', release);
    element.addEventListener('lostpointercapture', release);

    this.actionCleanups.push(() => {
      element.removeEventListener('pointerdown', press);
      element.removeEventListener('pointerup', release);
      element.removeEventListener('pointercancel', release);
      element.removeEventListener('lostpointercapture', release);
    });
  }

  private onSurfaceDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') return;
    event.preventDefault();

    const mode = aimController.getMode();
    if (mode === 'top') {
      if (this.joystickPointer === null) this.beginJoystick(event);
      return;
    }

    const movementZone = event.clientX <= window.innerWidth * 0.58;
    if (this.joystickPointer === null && movementZone) {
      this.beginJoystick(event);
      return;
    }

    if (this.aimPointer === null && event.pointerId !== this.joystickPointer) {
      this.aimPointer = event.pointerId;
      this.aimLastX = event.clientX;
      this.aimLastY = event.clientY;
      this.safeCapture(this.surface, event.pointerId);
    }
  };

  private beginJoystick(event: PointerEvent): void {
    this.joystickPointer = event.pointerId;
    this.joystickCenterX = event.clientX;
    this.joystickCenterY = event.clientY;

    const rect = this.elements.joystick.getBoundingClientRect();
    const width = rect.width || 112;
    const height = rect.height || 112;
    Object.assign(this.elements.joystick.style, {
      display: 'block',
      left: `${event.clientX - width / 2}px`,
      top: `${event.clientY - height / 2}px`,
      right: 'auto',
      bottom: 'auto'
    });

    this.safeCapture(this.surface, event.pointerId);
    this.updateJoystick(event.clientX, event.clientY);
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId === this.joystickPointer) {
      event.preventDefault();
      this.updateJoystick(event.clientX, event.clientY);
      return;
    }

    if (event.pointerId === this.aimPointer) {
      event.preventDefault();
      const dx = event.clientX - this.aimLastX;
      const dy = event.clientY - this.aimLastY;
      this.aimLastX = event.clientX;
      this.aimLastY = event.clientY;
      aimController.addTouchDelta(dx, dy);
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId === this.joystickPointer) this.resetJoystick();
    if (event.pointerId === this.aimPointer) this.aimPointer = null;
  };

  private updateJoystick(clientX: number, clientY: number): void {
    let dx = clientX - this.joystickCenterX;
    let dy = clientY - this.joystickCenterY;
    const length = Math.hypot(dx, dy);
    if (length > this.maxRadius) {
      const scale = this.maxRadius / length;
      dx *= scale;
      dy *= scale;
    }
    this.elements.stick.style.transform = `translate(${dx}px, ${dy}px)`;
    this.input.setMove(dx / this.maxRadius, dy / this.maxRadius);
  }

  private resetJoystick(): void {
    this.joystickPointer = null;
    this.elements.stick.style.transform = 'translate(0px, 0px)';
    this.elements.joystick.style.display = 'none';
    this.input.setMove(0, 0);
  }

  private safeCapture(element: HTMLElement | undefined, pointerId: number): void {
    if (!element?.setPointerCapture) return;
    try {
      element.setPointerCapture(pointerId);
    } catch {
      // Some browsers/synthetic events can report a pointerdown without an active capture slot.
      // Movement still works through window-level pointermove/up listeners.
    }
  }
}

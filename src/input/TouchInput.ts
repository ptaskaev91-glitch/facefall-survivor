import { InputManager, type InputAction } from './InputManager';

export interface TouchInputElements {
  joystick: HTMLElement;
  stick: HTMLElement;
  fire: HTMLElement;
  reload?: HTMLElement;
  switchWeapon?: HTMLElement;
  toggleCamera?: HTMLElement;
  sprint?: HTMLElement;
}

export class TouchInput {
  private joystickPointer: number | null = null;
  private joystickCenterX = 0;
  private joystickCenterY = 0;
  private readonly maxRadius = 46;
  private attached = false;
  private readonly actionCleanups: Array<() => void> = [];

  constructor(private readonly input: InputManager, private readonly elements: TouchInputElements) {}

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.elements.joystick.addEventListener('pointerdown', this.onJoystickDown);
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
    this.elements.joystick.removeEventListener('pointerdown', this.onJoystickDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    for (const cleanup of this.actionCleanups.splice(0)) cleanup();
    this.resetJoystick();
    this.input.reset();
  }

  private bindAction(element: HTMLElement | undefined, action: InputAction): void {
    if (!element) return;
    element.style.touchAction = 'none';

    const press = (event: PointerEvent): void => {
      event.preventDefault();
      element.setPointerCapture?.(event.pointerId);
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

  private onJoystickDown = (event: PointerEvent): void => {
    event.preventDefault();
    if (this.joystickPointer !== null) return;
    this.joystickPointer = event.pointerId;
    const rect = this.elements.joystick.getBoundingClientRect();
    this.joystickCenterX = rect.left + rect.width / 2;
    this.joystickCenterY = rect.top + rect.height / 2;
    this.elements.joystick.setPointerCapture?.(event.pointerId);
    this.updateJoystick(event.clientX, event.clientY);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.joystickPointer) return;
    event.preventDefault();
    this.updateJoystick(event.clientX, event.clientY);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.joystickPointer) return;
    this.resetJoystick();
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
    this.input.setMove(0, 0);
  }
}

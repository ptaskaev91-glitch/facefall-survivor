import type { InputAction } from './InputManager';
import { InputManager } from './InputManager';

const ACTION_KEYS: Partial<Record<string, InputAction>> = {
  Space: 'fire',
  KeyR: 'reload',
  KeyQ: 'switchWeapon',
  KeyC: 'toggleCamera',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint'
};

export class KeyboardMouseInput {
  private keys = new Set<string>();
  private attached = false;

  constructor(private readonly input: InputManager, private readonly target: Window = window) {}

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('blur', this.onBlur);
    this.target.addEventListener('mousemove', this.onMouseMove);
    this.target.addEventListener('mousedown', this.onMouseDown);
    this.target.addEventListener('mouseup', this.onMouseUp);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.target.removeEventListener('mousemove', this.onMouseMove);
    this.target.removeEventListener('mousedown', this.onMouseDown);
    this.target.removeEventListener('mouseup', this.onMouseUp);
    this.keys.clear();
    this.input.reset();
  }

  updateMovement(): void {
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    const forward = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const backward = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    this.input.setMove(Number(right) - Number(left), Number(backward) - Number(forward));
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
    const action = ACTION_KEYS[event.code];
    if (action) this.input.setAction(action, true);
    this.updateMovement();
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    const action = ACTION_KEYS[event.code];
    if (action) this.input.setAction(action, false);
    this.updateMovement();
  };

  private onBlur = (): void => {
    this.keys.clear();
    this.input.reset();
  };

  private onMouseMove = (event: MouseEvent): void => {
    this.input.setAimDelta(event.movementX, event.movementY);
    this.input.setPointerNdc(
      event.clientX / Math.max(1, this.target.innerWidth) * 2 - 1,
      -(event.clientY / Math.max(1, this.target.innerHeight) * 2 - 1)
    );
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button === 0) this.input.setAction('fire', true);
  };

  private onMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) this.input.setAction('fire', false);
  };
}

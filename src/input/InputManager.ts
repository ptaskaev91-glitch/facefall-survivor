export type InputAction = 'fire' | 'reload' | 'switchWeapon' | 'toggleCamera' | 'sprint';

export interface InputSnapshot {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  fire: boolean;
  sprint: boolean;
}

export class InputManager {
  private moveX = 0;
  private moveY = 0;
  private aimX = 0;
  private aimY = 0;
  private held = new Set<InputAction>();
  private pressed = new Set<InputAction>();

  setMove(x: number, y: number): void {
    const length = Math.hypot(x, y);
    const scale = length > 1 ? 1 / length : 1;
    this.moveX = x * scale;
    this.moveY = y * scale;
  }

  setAimDelta(x: number, y: number): void {
    this.aimX += x;
    this.aimY += y;
  }

  setAction(action: InputAction, down: boolean): void {
    if (down) {
      if (!this.held.has(action)) this.pressed.add(action);
      this.held.add(action);
    } else {
      this.held.delete(action);
    }
  }

  isHeld(action: InputAction): boolean {
    return this.held.has(action);
  }

  consumePressed(action: InputAction): boolean {
    if (!this.pressed.has(action)) return false;
    this.pressed.delete(action);
    return true;
  }

  snapshot(): InputSnapshot {
    const snapshot = {
      moveX: this.moveX,
      moveY: this.moveY,
      aimX: this.aimX,
      aimY: this.aimY,
      fire: this.held.has('fire'),
      sprint: this.held.has('sprint')
    };
    this.aimX = 0;
    this.aimY = 0;
    return snapshot;
  }

  reset(): void {
    this.moveX = this.moveY = this.aimX = this.aimY = 0;
    this.held.clear();
    this.pressed.clear();
  }
}

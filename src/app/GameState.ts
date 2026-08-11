export type GameState =
  | 'boot'
  | 'menu'
  | 'face_setup'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'error'
  | 'disposed';

const ALLOWED_TRANSITIONS: Record<GameState, readonly GameState[]> = {
  boot: ['menu', 'loading', 'error', 'disposed'],
  menu: ['face_setup', 'loading', 'disposed'],
  face_setup: ['menu', 'loading', 'disposed'],
  loading: ['playing', 'menu', 'error', 'disposed'],
  playing: ['paused', 'gameover', 'menu', 'error', 'disposed'],
  paused: ['playing', 'gameover', 'menu', 'error', 'disposed'],
  gameover: ['loading', 'menu', 'disposed'],
  error: ['menu', 'loading', 'disposed'],
  disposed: []
};

export class GameStateController {
  private value: GameState = 'boot';

  get current(): GameState {
    return this.value;
  }

  is(state: GameState): boolean {
    return this.value === state;
  }

  transition(next: GameState): void {
    if (next === this.value) return;
    const allowed = ALLOWED_TRANSITIONS[this.value];
    if (!allowed.includes(next)) {
      throw new Error(`Invalid game state transition: ${this.value} -> ${next}`);
    }
    this.value = next;
  }
}

export type GameState =
  | 'boot'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'error'
  | 'disposed';

const ALLOWED_TRANSITIONS: Record<GameState, readonly GameState[]> = {
  boot: ['loading', 'error', 'disposed'],
  loading: ['playing', 'error', 'disposed'],
  playing: ['paused', 'gameover', 'error', 'disposed'],
  paused: ['playing', 'gameover', 'error', 'disposed'],
  gameover: ['loading', 'disposed'],
  error: ['loading', 'disposed'],
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

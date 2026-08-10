export interface GameLoopHooks {
  fixedUpdate(dt: number): void;
  render(alpha: number, frameDt: number): void;
}

export interface GameLoopOptions {
  fixedStep?: number;
  maxFrameDelta?: number;
  maxSubSteps?: number;
}

export class GameLoop {
  private readonly fixedStep: number;
  private readonly maxFrameDelta: number;
  private readonly maxSubSteps: number;
  private frameId = 0;
  private running = false;
  private lastTime = 0;
  private accumulator = 0;

  constructor(private readonly hooks: GameLoopHooks, options: GameLoopOptions = {}) {
    this.fixedStep = options.fixedStep ?? 1 / 60;
    this.maxFrameDelta = options.maxFrameDelta ?? 0.1;
    this.maxSubSteps = options.maxSubSteps ?? 5;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now() / 1000;
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.accumulator = 0;
  }

  private tick = (timeMs: number): void => {
    if (!this.running) return;

    const now = timeMs / 1000;
    const frameDt = Math.min(Math.max(now - this.lastTime, 0), this.maxFrameDelta);
    this.lastTime = now;
    this.accumulator += frameDt;

    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < this.maxSubSteps) {
      this.hooks.fixedUpdate(this.fixedStep);
      this.accumulator -= this.fixedStep;
      steps++;
    }

    if (steps === this.maxSubSteps && this.accumulator >= this.fixedStep) {
      this.accumulator %= this.fixedStep;
    }

    this.hooks.render(this.accumulator / this.fixedStep, frameDt);
    this.frameId = requestAnimationFrame(this.tick);
  };
}

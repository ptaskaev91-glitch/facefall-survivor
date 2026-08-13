import type { DamageEvent } from '../combat/types';

export interface RunSessionSnapshot { kills: number; score: number; }

export class RunSession {
  private _kills = 0;
  private _score = 0;
  get kills(): number { return this._kills; }
  get score(): number { return this._score; }
  reset(): void { this._kills = 0; this._score = 0; }
  recordKill(hit: DamageEvent): number {
    this._kills += 1;
    const award = 100 + Math.round(hit.amount * 2) + (hit.critical ? 75 : 0);
    this._score += award;
    return award;
  }
  snapshot(): RunSessionSnapshot { return { kills: this._kills, score: this._score }; }
}

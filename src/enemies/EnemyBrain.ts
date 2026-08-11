export type EnemyIntent = 'wander' | 'investigate' | 'chase' | 'hold' | 'attack' | 'stagger';

export interface EnemyBrainContext {
  distanceToPlayer: number;
  attackRange: number;
  attackTimer: number;
  staggerTimer: number;
  hasLineOfSight: boolean;
  alertTimer: number;
}

/**
 * Small explicit state tree inspired by the audited gameplay architectures.
 * It deliberately stays data-light: pathfinding and movement remain EnemySystem concerns.
 */
export class EnemyBrain {
  decide(context: EnemyBrainContext): EnemyIntent {
    if (context.staggerTimer > 0) return 'stagger';

    if (context.hasLineOfSight) {
      if (context.distanceToPlayer <= context.attackRange) {
        return context.attackTimer <= 0 ? 'attack' : 'hold';
      }
      return 'chase';
    }

    if (context.alertTimer > 0) return 'investigate';
    return 'wander';
  }
}

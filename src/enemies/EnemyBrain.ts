export type EnemyIntent = 'wander' | 'investigate' | 'chase' | 'hold' | 'attack' | 'stagger';

export interface EnemyBrainContext {
  distanceToPlayer: number;
  attackRange: number;
  attackTimer: number;
  staggerTimer: number;
  hasLineOfSight: boolean;
  targetStickTimer: number;
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

    // Briefly keep the high-urgency pursuit state after LOS breaks. EnemySystem
    // pursues the last actually seen position rather than reading the hidden player.
    if (context.targetStickTimer > 0) return 'chase';
    if (context.alertTimer > 0) return 'investigate';
    return 'wander';
  }
}

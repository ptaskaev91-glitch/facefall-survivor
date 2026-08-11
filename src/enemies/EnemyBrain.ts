export type EnemyIntent = 'chase' | 'hold' | 'attack';

/**
 * Lightweight state boundary before navmesh/perception work.
 * EnemySystem executes movement; EnemyBrain decides the high-level intent.
 */
export class EnemyBrain {
  decide(distanceToPlayer: number, attackRange: number, attackTimer: number): EnemyIntent {
    if (distanceToPlayer > attackRange) return 'chase';
    if (attackTimer <= 0) return 'attack';
    return 'hold';
  }
}

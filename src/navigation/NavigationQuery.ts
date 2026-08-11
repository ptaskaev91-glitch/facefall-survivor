import { Vector3 } from 'three';

/**
 * Runtime path-query seam. EnemySystem asks only for the next waypoint and does
 * not care whether it comes from direct chase, Recast/Detour, or a debug graph.
 */
export interface NavigationQuery {
  nextWaypoint(from: Vector3, target: Vector3, out: Vector3): Vector3;
}

export class DirectNavigationQuery implements NavigationQuery {
  nextWaypoint(_from: Vector3, target: Vector3, out: Vector3): Vector3 {
    return out.copy(target);
  }
}

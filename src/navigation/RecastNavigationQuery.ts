import { Vector3 } from 'three';
import { DirectNavigationQuery, type NavigationQuery } from './NavigationQuery';

/**
 * Small structural subset of recast-navigation's NavMeshQuery.computePath result.
 * Keeping the dependency behind this boundary lets the runtime consume an offline
 * Detour navmesh without coupling EnemySystem to the WASM package.
 */
export interface RecastPathPoint {
  x: number;
  y: number;
  z: number;
}

export interface RecastPathResult {
  path?: readonly RecastPathPoint[];
}

export interface RecastPathProvider {
  computePath(start: RecastPathPoint, end: RecastPathPoint): RecastPathResult;
}

export interface RecastNavigationQueryOptions {
  /** Waypoints this close to the actor are considered already reached. */
  waypointReachDistance?: number;
  /** Temporary navigation used while a navmesh is unavailable or a query fails. */
  fallback?: NavigationQuery;
}

/**
 * NavigationQuery adapter for a Detour/Recast path provider.
 *
 * This class is intentionally synchronous and stateless. Path caching/repath LOD
 * belongs one layer above the raw query adapter so it can be keyed per enemy and
 * profiled independently from the WASM/navmesh integration.
 */
export class RecastNavigationQuery implements NavigationQuery {
  private readonly waypointReachDistanceSq: number;
  private readonly fallback: NavigationQuery;

  constructor(
    private readonly provider: RecastPathProvider,
    options: RecastNavigationQueryOptions = {},
  ) {
    const reachDistance = Math.max(0, options.waypointReachDistance ?? 0.45);
    this.waypointReachDistanceSq = reachDistance * reachDistance;
    this.fallback = options.fallback ?? new DirectNavigationQuery();
  }

  nextWaypoint(from: Vector3, target: Vector3, out: Vector3): Vector3 {
    let result: RecastPathResult;
    try {
      result = this.provider.computePath(from, target);
    } catch {
      return this.fallback.nextWaypoint(from, target, out);
    }

    const path = result.path;
    if (!path || path.length < 2) {
      return this.fallback.nextWaypoint(from, target, out);
    }

    // Recast paths normally start at (or very close to) the projected actor
    // position. Start at index 1 and skip any tiny near-start segments.
    let waypointIndex = 1;
    while (
      waypointIndex < path.length - 1
      && horizontalDistanceSq(from, path[waypointIndex]) <= this.waypointReachDistanceSq
    ) {
      waypointIndex += 1;
    }

    const waypoint = path[waypointIndex];
    if (!isFinitePoint(waypoint)) {
      return this.fallback.nextWaypoint(from, target, out);
    }

    return out.set(waypoint.x, waypoint.y, waypoint.z);
  }
}

function horizontalDistanceSq(a: RecastPathPoint, b: RecastPathPoint): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function isFinitePoint(point: RecastPathPoint | undefined): point is RecastPathPoint {
  return Boolean(
    point
    && Number.isFinite(point.x)
    && Number.isFinite(point.y)
    && Number.isFinite(point.z),
  );
}

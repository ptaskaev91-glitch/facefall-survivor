import { Vector3 } from 'three';
import { DirectNavigationQuery, type NavigationQuery } from './NavigationQuery';

/**
 * Small structural subset of the path points returned by recast-navigation.
 * The concrete WASM/NavMeshQuery integration stays behind RecastPathProvider so
 * EnemySystem never needs to import Recast directly.
 */
export interface RecastPathPoint {
  x: number;
  y: number;
  z: number;
}

export interface RecastPathResult {
  path?: readonly RecastPathPoint[];
}

/**
 * Provider boundary for the eventual Detour/NavMeshQuery runtime. A concrete
 * provider may project start/end onto the navmesh before calling computePath.
 */
export interface RecastPathProvider {
  computePath(start: RecastPathPoint, end: RecastPathPoint): RecastPathResult;
}

export interface RecastNavigationQueryOptions {
  /** Waypoints this close to the actor are considered already reached. */
  waypointReachDistance?: number;
  /** Minimum time between expensive Detour path queries for the same actor. */
  repathIntervalMs?: number;
  /** Force an early repath when the target moves farther than this distance. */
  targetMoveDistance?: number;
  /** Injectable monotonic clock for deterministic tests. */
  now?: () => number;
  /** Temporary navigation used while a navmesh is unavailable or a query fails. */
  fallback?: NavigationQuery;
}

interface CachedPathState {
  path: readonly RecastPathPoint[];
  waypointIndex: number;
  queriedAt: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

/**
 * NavigationQuery adapter for a Detour/Recast path provider.
 *
 * Actor paths are cached by the stable Vector3 instance used as EnemyActor.position.
 * This prevents a future Recast integration from doing an expensive WASM path query
 * for every infected on every render/fixed step. The cache repaths periodically or
 * sooner when the target moves far enough.
 */
export class RecastNavigationQuery implements NavigationQuery {
  private readonly waypointReachDistanceSq: number;
  private readonly repathIntervalMs: number;
  private readonly targetMoveDistanceSq: number;
  private readonly now: () => number;
  private readonly fallback: NavigationQuery;
  private readonly pathByActor = new WeakMap<Vector3, CachedPathState>();

  constructor(
    private readonly provider: RecastPathProvider,
    options: RecastNavigationQueryOptions = {},
  ) {
    const reachDistance = Math.max(0, options.waypointReachDistance ?? 0.45);
    const targetMoveDistance = Math.max(0, options.targetMoveDistance ?? 0.75);
    this.waypointReachDistanceSq = reachDistance * reachDistance;
    this.repathIntervalMs = Math.max(0, options.repathIntervalMs ?? 250);
    this.targetMoveDistanceSq = targetMoveDistance * targetMoveDistance;
    this.now = options.now ?? (() => performance.now());
    this.fallback = options.fallback ?? new DirectNavigationQuery();
  }

  nextWaypoint(from: Vector3, target: Vector3, out: Vector3): Vector3 {
    const now = this.now();
    let state = this.pathByActor.get(from);

    if (!state || this.shouldRepath(state, target, now)) {
      state = this.queryPath(from, target, now);
      if (!state) {
        this.pathByActor.delete(from);
        return this.fallback.nextWaypoint(from, target, out);
      }
      this.pathByActor.set(from, state);
    }

    const path = state.path;
    while (
      state.waypointIndex < path.length - 1
      && horizontalDistanceSq(from, path[state.waypointIndex]) <= this.waypointReachDistanceSq
    ) {
      state.waypointIndex += 1;
    }

    const waypoint = path[state.waypointIndex];
    if (!isFinitePoint(waypoint)) {
      this.pathByActor.delete(from);
      return this.fallback.nextWaypoint(from, target, out);
    }

    return out.set(waypoint.x, waypoint.y, waypoint.z);
  }

  private shouldRepath(state: CachedPathState, target: Vector3, now: number): boolean {
    if (now - state.queriedAt >= this.repathIntervalMs) {
      return true;
    }

    const dx = target.x - state.targetX;
    const dz = target.z - state.targetZ;
    return dx * dx + dz * dz >= this.targetMoveDistanceSq;
  }

  private queryPath(from: Vector3, target: Vector3, now: number): CachedPathState | undefined {
    let result: RecastPathResult;
    try {
      result = this.provider.computePath(from, target);
    } catch {
      return undefined;
    }

    const path = result.path;
    if (!path || path.length < 2 || !isFinitePoint(path[1])) {
      return undefined;
    }

    return {
      path,
      waypointIndex: 1,
      queriedAt: now,
      targetX: target.x,
      targetY: target.y,
      targetZ: target.z,
    };
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

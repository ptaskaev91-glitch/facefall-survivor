import type { NavigationQuery } from './NavigationQuery';
import { RecastNavigationQuery, type RecastPathProvider } from './RecastNavigationQuery';

export interface LoadedRecastNavigation {
  query: NavigationQuery;
  dispose(): void;
}

/**
 * Loads an offline-baked Detour navmesh. No Recast generation runs in the browser;
 * mobile clients only initialize WASM, import the compact binary and query paths.
 */
export async function loadRecastNavigation(
  navMeshUrl: string,
  fallback: NavigationQuery,
): Promise<LoadedRecastNavigation> {
  const recast = await import('recast-navigation');
  await recast.init();

  const response = await fetch(navMeshUrl);
  if (!response.ok) throw new Error(`Navmesh request failed: ${response.status} ${response.statusText}`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error('Navmesh response is empty');

  const { navMesh } = recast.importNavMesh(bytes);
  const navMeshQuery = new recast.NavMeshQuery(navMesh, { maxNodes: 4096 });
  navMeshQuery.defaultQueryHalfExtents = { x: 2.5, y: 3, z: 2.5 };

  const provider: RecastPathProvider = {
    computePath(start, end) {
      const projectedStart = navMeshQuery.findClosestPoint(start);
      const projectedEnd = navMeshQuery.findClosestPoint(end);
      if (!projectedStart.success || !projectedEnd.success) return {};

      const result = navMeshQuery.computePath(projectedStart.point, projectedEnd.point);
      return result.success ? { path: result.path } : {};
    },
  };

  const query = new RecastNavigationQuery(provider, {
    fallback,
    waypointReachDistance: 0.5,
    repathIntervalMs: 250,
    targetMoveDistance: 0.8,
  });

  return {
    query,
    dispose() {
      navMeshQuery.destroy();
      navMesh.destroy();
    },
  };
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from 'three';
import {
  RecastNavigationQuery,
  type RecastPathProvider,
} from '../../src/navigation/RecastNavigationQuery';

test('RecastNavigationQuery returns the first useful Detour waypoint', () => {
  const provider: RecastPathProvider = {
    computePath: () => ({
      path: [
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 0, z: 1 },
        { x: 8, y: 0, z: 2 },
        { x: 10, y: 0, z: 0 },
      ],
    }),
  };
  const query = new RecastNavigationQuery(provider);
  const out = new Vector3();

  query.nextWaypoint(new Vector3(0, 0, 0), new Vector3(10, 0, 0), out);

  assert.deepEqual(out.toArray(), [3, 0, 1]);
});

test('RecastNavigationQuery advances cached waypoints without an extra path query', () => {
  let calls = 0;
  const provider: RecastPathProvider = {
    computePath: () => {
      calls += 1;
      return {
        path: [
          { x: 0, y: 0, z: 0 },
          { x: 0.15, y: 0, z: 0.1 },
          { x: 4, y: 0, z: 2 },
          { x: 10, y: 0, z: 0 },
        ],
      };
    },
  };
  const actorPosition = new Vector3(0, 0, 0);
  const query = new RecastNavigationQuery(provider, {
    waypointReachDistance: 0.5,
    repathIntervalMs: 1_000,
    now: () => 100,
  });
  const out = new Vector3();

  query.nextWaypoint(actorPosition, new Vector3(10, 0, 0), out);
  assert.deepEqual(out.toArray(), [4, 0, 2]);

  actorPosition.set(3.9, 0, 1.9);
  query.nextWaypoint(actorPosition, new Vector3(10, 0, 0), out);

  assert.deepEqual(out.toArray(), [10, 0, 0]);
  assert.equal(calls, 1, 'cached path should advance without querying Detour again');
});

test('RecastNavigationQuery repaths after the configured interval', () => {
  let calls = 0;
  let now = 0;
  const provider: RecastPathProvider = {
    computePath: (_start, end) => {
      calls += 1;
      return { path: [{ x: 0, y: 0, z: 0 }, { ...end }] };
    },
  };
  const actorPosition = new Vector3(0, 0, 0);
  const target = new Vector3(8, 0, 0);
  const query = new RecastNavigationQuery(provider, {
    repathIntervalMs: 250,
    targetMoveDistance: 10,
    now: () => now,
  });
  const out = new Vector3();

  query.nextWaypoint(actorPosition, target, out);
  now = 200;
  query.nextWaypoint(actorPosition, target, out);
  assert.equal(calls, 1);

  now = 250;
  query.nextWaypoint(actorPosition, target, out);
  assert.equal(calls, 2);
});

test('RecastNavigationQuery repaths early when the target moves far enough', () => {
  let calls = 0;
  const provider: RecastPathProvider = {
    computePath: (_start, end) => {
      calls += 1;
      return { path: [{ x: 0, y: 0, z: 0 }, { ...end }] };
    },
  };
  const actorPosition = new Vector3(0, 0, 0);
  const target = new Vector3(8, 0, 0);
  const query = new RecastNavigationQuery(provider, {
    repathIntervalMs: 10_000,
    targetMoveDistance: 0.75,
    now: () => 100,
  });
  const out = new Vector3();

  query.nextWaypoint(actorPosition, target, out);
  target.set(8.8, 0, 0);
  query.nextWaypoint(actorPosition, target, out);

  assert.equal(calls, 2);
  assert.deepEqual(out.toArray(), [8.8, 0, 0]);
});

test('RecastNavigationQuery falls back to direct pursuit when no path is available', () => {
  const provider: RecastPathProvider = {
    computePath: () => ({ path: undefined }),
  };
  const query = new RecastNavigationQuery(provider);
  const target = new Vector3(7, 0, -5);
  const out = new Vector3();

  query.nextWaypoint(new Vector3(1, 0, 1), target, out);

  assert.deepEqual(out.toArray(), target.toArray());
});

test('RecastNavigationQuery contains provider failures behind the fallback boundary', () => {
  const provider: RecastPathProvider = {
    computePath: () => {
      throw new Error('navmesh unavailable');
    },
  };
  const query = new RecastNavigationQuery(provider);
  const target = new Vector3(-2, 0, 9);
  const out = new Vector3();

  assert.doesNotThrow(() => query.nextWaypoint(new Vector3(), target, out));
  assert.deepEqual(out.toArray(), target.toArray());
});

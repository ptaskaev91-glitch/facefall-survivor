import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { exportNavMesh, init, NavMeshQuery } from 'recast-navigation';
import { threeToSoloNavMesh } from '@recast-navigation/three';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const levelRoot = resolve(root, 'public/assets/levels/abandoned-outskirts');
const sourcePath = resolve(levelRoot, 'level.glb');
const manifestPath = resolve(levelRoot, 'level.manifest.json');
const outputPath = resolve(levelRoot, 'navmesh.bin');

await init();

const [source, manifestText] = await Promise.all([
  readFile(sourcePath),
  readFile(manifestPath, 'utf8'),
]);
const manifest = JSON.parse(manifestText);
const playerSpawn = manifest.markers?.find((marker) => marker.kind === 'player-spawn');
const enemySpawns = manifest.markers?.filter((marker) => marker.kind === 'enemy-spawn') ?? [];
if (!playerSpawn?.position) throw new Error('Abandoned Outskirts manifest has no player-spawn marker');
if (enemySpawns.length === 0) throw new Error('Abandoned Outskirts manifest has no enemy-spawn markers');

const arrayBuffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
const loader = new GLTFLoader();
const gltf = await new Promise((resolveGltf, reject) => loader.parse(arrayBuffer, '', resolveGltf, reject));
gltf.scene.updateMatrixWorld(true);

const meshes = [];
gltf.scene.traverse((object) => {
  if (!(object instanceof THREE.Mesh)) return;
  // The authored level currently contains only static gameplay geometry.
  // World matrices must be baked before Recast receives the triangles.
  const clone = new THREE.Mesh(object.geometry.clone(), object.material);
  clone.matrix.copy(object.matrixWorld);
  clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
  clone.updateMatrixWorld(true);
  meshes.push(clone);
});

if (meshes.length === 0) throw new Error('Abandoned Outskirts contains no meshes for navmesh baking');

const config = {
  borderSize: 0,
  cs: 0.2,
  ch: 0.2,
  walkableSlopeAngle: 42,
  walkableHeight: 1.75,
  walkableClimb: 0.55,
  walkableRadius: 0.48,
  maxEdgeLen: 12,
  maxSimplificationError: 1.3,
  minRegionArea: 4,
  mergeRegionArea: 16,
  maxVertsPerPoly: 6,
  detailSampleDist: 6,
  detailSampleMaxError: 1,
};

const result = threeToSoloNavMesh(meshes, config);
if (!result.success || !result.navMesh) {
  throw new Error(`Recast navmesh bake failed: ${String(result.error ?? 'unknown error')}`);
}

const query = new NavMeshQuery(result.navMesh, { maxNodes: 4096 });
query.defaultQueryHalfExtents = { x: 2.5, y: 3, z: 2.5 };

for (const spawn of enemySpawns) {
  if (!spawn.position) throw new Error(`Enemy spawn ${spawn.id ?? '<unnamed>'} has no position`);
  const projectedStart = query.findClosestPoint(spawn.position);
  const projectedEnd = query.findClosestPoint(playerSpawn.position);
  if (!projectedStart.success || !projectedEnd.success) {
    throw new Error(`Recast navmesh probe ${spawn.id ?? '<unnamed>'} could not project start/end`);
  }
  const path = query.computePath(projectedStart.point, projectedEnd.point);
  if (!path.success || path.path.length < 2) {
    throw new Error(`Recast navmesh probe ${spawn.id ?? '<unnamed>'} has no traversable path to player start`);
  }
}

const bytes = exportNavMesh(result.navMesh);
await writeFile(outputPath, bytes);

query.destroy();
result.navMesh.destroy();
for (const mesh of meshes) mesh.geometry.dispose();
console.log(`Facefall navmesh baked: ${bytes.byteLength} bytes · meshes=${meshes.length} · spawnProbes=${enemySpawns.length}`);

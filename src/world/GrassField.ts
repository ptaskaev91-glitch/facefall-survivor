import {
  ConeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3
} from 'three';
import type { QualityProfile } from '../graphics/quality';

interface GrassCell {
  center: Vector3;
  radius: number;
  mesh: InstancedMesh;
}

export class GrassField {
  readonly group = new Group();
  private readonly cells: GrassCell[] = [];
  private readonly geometry = new ConeGeometry(0.045, 0.7, 3);
  private readonly material = new MeshStandardMaterial({ color: 0x4e713f, roughness: 1 });

  constructor(private readonly quality: QualityProfile, areaSize = 88, cellSize = 14) {
    this.geometry.translate(0, 0.35, 0);

    const cellsPerAxis = Math.max(1, Math.floor(areaSize / cellSize));
    const totalCells = cellsPerAxis * cellsPerAxis;
    const perCell = Math.max(6, Math.floor(quality.grassInstances / totalCells));
    const half = areaSize / 2;

    const matrix = new Matrix4();
    const quat = new Quaternion();
    const scale = new Vector3();
    const pos = new Vector3();
    const yAxis = new Vector3(0, 1, 0);

    for (let gx = 0; gx < cellsPerAxis; gx++) {
      for (let gz = 0; gz < cellsPerAxis; gz++) {
        const cellX = -half + (gx + 0.5) * cellSize;
        const cellZ = -half + (gz + 0.5) * cellSize;
        const mesh = new InstancedMesh(this.geometry, this.material, perCell);
        mesh.frustumCulled = true;

        const clusters = Array.from({ length: 3 }, () => ({
          x: cellX + (Math.random() - 0.5) * cellSize * 0.55,
          z: cellZ + (Math.random() - 0.5) * cellSize * 0.55
        }));

        for (let i = 0; i < perCell; i++) {
          const cluster = clusters[i % clusters.length];
          const spreadX = (Math.random() + Math.random() + Math.random() - 1.5) * cellSize * 0.18;
          const spreadZ = (Math.random() + Math.random() + Math.random() - 1.5) * cellSize * 0.18;
          pos.set(cluster.x + spreadX, 0.015, cluster.z + spreadZ);
          quat.setFromAxisAngle(yAxis, Math.random() * Math.PI * 2);
          const width = 0.65 + Math.random() * 0.9;
          const height = 0.55 + Math.random() * 1.6;
          scale.set(width, height, width);
          matrix.compose(pos, quat, scale);
          mesh.setMatrixAt(i, matrix);
        }

        mesh.instanceMatrix.needsUpdate = true;
        this.group.add(mesh);
        this.cells.push({ center: new Vector3(cellX, 0, cellZ), radius: cellSize * 0.8, mesh });
      }
    }
  }

  update(cameraPosition: Vector3): void {
    const maxDistance = this.quality.grassDistance;
    for (const cell of this.cells) {
      const dx = cameraPosition.x - cell.center.x;
      const dz = cameraPosition.z - cell.center.z;
      const visibleDistance = maxDistance + cell.radius;
      cell.mesh.visible = dx * dx + dz * dz <= visibleDistance * visibleDistance;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

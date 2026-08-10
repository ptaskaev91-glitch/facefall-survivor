import { Vector3 } from 'three';

export interface SpatialHashItem {
  id: string;
  position: Vector3;
}

export class SpatialHash<T extends SpatialHashItem> {
  private readonly cells = new Map<string, Set<T>>();
  private readonly itemCells = new Map<T, string>();

  constructor(readonly cellSize = 4) {
    if (cellSize <= 0) throw new Error('SpatialHash cellSize must be positive');
  }

  insert(item: T): void {
    this.remove(item);
    const key = this.keyFor(item.position.x, item.position.z);
    let bucket = this.cells.get(key);
    if (!bucket) {
      bucket = new Set<T>();
      this.cells.set(key, bucket);
    }
    bucket.add(item);
    this.itemCells.set(item, key);
  }

  update(item: T): void {
    const next = this.keyFor(item.position.x, item.position.z);
    const previous = this.itemCells.get(item);
    if (previous === next) return;
    this.remove(item);
    let bucket = this.cells.get(next);
    if (!bucket) {
      bucket = new Set<T>();
      this.cells.set(next, bucket);
    }
    bucket.add(item);
    this.itemCells.set(item, next);
  }

  remove(item: T): void {
    const key = this.itemCells.get(item);
    if (!key) return;
    const bucket = this.cells.get(key);
    bucket?.delete(item);
    if (bucket?.size === 0) this.cells.delete(key);
    this.itemCells.delete(item);
  }

  queryRadius(position: Vector3, radius: number, out: T[] = []): T[] {
    out.length = 0;
    const minX = Math.floor((position.x - radius) / this.cellSize);
    const maxX = Math.floor((position.x + radius) / this.cellSize);
    const minZ = Math.floor((position.z - radius) / this.cellSize);
    const maxZ = Math.floor((position.z + radius) / this.cellSize);
    const radiusSq = radius * radius;

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const bucket = this.cells.get(`${x}:${z}`);
        if (!bucket) continue;
        for (const item of bucket) {
          const dx = item.position.x - position.x;
          const dz = item.position.z - position.z;
          if (dx * dx + dz * dz <= radiusSq) out.push(item);
        }
      }
    }
    return out;
  }

  clear(): void {
    this.cells.clear();
    this.itemCells.clear();
  }

  get occupiedCellCount(): number {
    return this.cells.size;
  }

  private keyFor(x: number, z: number): string {
    return `${Math.floor(x / this.cellSize)}:${Math.floor(z / this.cellSize)}`;
  }
}

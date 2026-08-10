import { Object3D, Ray, Vector3 } from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { Octree } from 'three/addons/math/Octree.js';

export interface CollisionResult {
  collided: boolean;
  grounded: boolean;
  normal: Vector3;
  depth: number;
}

export interface WorldRayHit {
  distance: number;
  position: Vector3;
}

export class CollisionWorld {
  private staticTree = new Octree();
  private readonly ray = new Ray();

  rebuild(root: Object3D): void {
    this.staticTree = new Octree();
    this.staticTree.fromGraphNode(root);
  }

  resolveCapsule(capsule: Capsule): CollisionResult {
    const hit = this.staticTree.capsuleIntersect(capsule);
    if (!hit) {
      return { collided: false, grounded: false, normal: new Vector3(), depth: 0 };
    }

    const normal = hit.normal.clone();
    const depth = hit.depth;
    capsule.translate(normal.clone().multiplyScalar(depth));

    return {
      collided: true,
      grounded: normal.y > 0.55,
      normal,
      depth
    };
  }

  raycast(origin: Vector3, direction: Vector3, maxDistance = Infinity): WorldRayHit | null {
    this.ray.origin.copy(origin);
    this.ray.direction.copy(direction).normalize();
    const hit = this.staticTree.rayIntersect(this.ray);
    if (!hit || hit.distance > maxDistance) return null;
    return {
      distance: hit.distance,
      position: hit.position.clone()
    };
  }

  segmentCast(start: Vector3, end: Vector3): WorldRayHit | null {
    const direction = end.clone().sub(start);
    const distance = direction.length();
    if (distance <= 1e-6) return null;
    return this.raycast(start, direction.multiplyScalar(1 / distance), distance);
  }

  get octree(): Octree {
    return this.staticTree;
  }
}

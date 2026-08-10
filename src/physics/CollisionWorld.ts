import { Object3D, Vector3 } from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { Capsule } from 'three/addons/math/Capsule.js';

export interface CollisionResult {
  collided: boolean;
  grounded: boolean;
  normal: Vector3;
  depth: number;
}

export class CollisionWorld {
  private staticTree = new Octree();

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

  get octree(): Octree {
    return this.staticTree;
  }
}

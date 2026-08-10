import * as THREE from 'three';
import type { DamageSystem } from '../combat/DamageSystem';
import { Health } from '../combat/Health';
import type { SpatialHash, SpatialHashItem } from '../physics/SpatialHash';
import { ENEMY_ARCHETYPES, type EnemyArchetype, type EnemyId } from './archetypes';

interface EnemySpatialItem extends SpatialHashItem {
  root: THREE.Object3D;
}

export interface EnemyActor {
  id: string;
  archetype: EnemyArchetype;
  root: THREE.Group;
  velocity: THREE.Vector3;
  attackTimer: number;
  alive: boolean;
  unregisterDamage: () => void;
  spatial: EnemySpatialItem;
}

export interface EnemySystemOptions {
  shadows: boolean;
  maxActive: number;
}

export class EnemySystem {
  private readonly actors = new Map<string, EnemyActor>();
  private readonly hitMeshes: THREE.Object3D[] = [];
  private nextId = 1;
  private readonly desired = new THREE.Vector3();
  private readonly offset = new THREE.Vector3();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly damage: DamageSystem,
    private readonly spatial: SpatialHash<EnemySpatialItem>,
    private readonly options: EnemySystemOptions
  ) {}

  spawn(type: EnemyId, position: THREE.Vector3): EnemyActor | null {
    if (this.activeCount >= this.options.maxActive) return null;

    const archetype = ENEMY_ARCHETYPES[type];
    const id = `enemy-${type}-${this.nextId++}`;
    const radius = type === 'brute' ? 0.55 : 0.34;
    const bodyLength = type === 'brute' ? 1.15 : 0.82;
    const color = type === 'brute' ? 0x765246 : type === 'runner' ? 0x725b4a : 0x66564d;
    const root = this.makeCapsuleMarker(radius, bodyLength, color);
    root.position.copy(position);
    root.scale.setScalar(type === 'runner' ? 0.88 : type === 'brute' ? 1.18 : 1);
    root.traverse((object) => { object.userData.damageTargetId = id; });
    this.scene.add(root);
    this.hitMeshes.push(root);

    const unregisterDamage = this.damage.register({ id, health: new Health(archetype.health) });
    const spatial: EnemySpatialItem = { id, position: root.position, root };
    const actor: EnemyActor = {
      id,
      archetype,
      root,
      velocity: new THREE.Vector3(),
      attackTimer: 0,
      alive: true,
      unregisterDamage,
      spatial
    };

    this.actors.set(id, actor);
    this.spatial.insert(spatial);
    return actor;
  }

  update(dt: number, playerPosition: THREE.Vector3, onAttack: (actor: EnemyActor) => void): void {
    for (const actor of this.actors.values()) {
      if (!actor.alive || !actor.root.visible) continue;
      actor.attackTimer = Math.max(0, actor.attackTimer - dt);

      this.offset.copy(playerPosition).sub(actor.root.position).setY(0);
      const distance = this.offset.length();
      if (distance <= actor.archetype.attackRange) {
        actor.velocity.multiplyScalar(Math.exp(-dt * 12));
        if (actor.attackTimer <= 0) {
          actor.attackTimer = actor.archetype.attackCooldown;
          onAttack(actor);
        }
        continue;
      }

      if (distance > 1e-5) this.desired.copy(this.offset).multiplyScalar(1 / distance).multiplyScalar(actor.archetype.speed);
      const blend = 1 - Math.exp(-actor.archetype.acceleration * dt);
      actor.velocity.lerp(this.desired, blend);
      actor.root.position.addScaledVector(actor.velocity, dt);
      actor.root.rotation.y = Math.atan2(-actor.velocity.x, -actor.velocity.z);
      this.spatial.update(actor.spatial);
    }
  }

  kill(id: string): boolean {
    const actor = this.actors.get(id);
    if (!actor || !actor.alive) return false;
    actor.alive = false;
    actor.root.visible = false;
    actor.unregisterDamage();
    this.spatial.remove(actor.spatial);
    return true;
  }

  reset(): void {
    for (const actor of this.actors.values()) {
      actor.unregisterDamage();
      this.spatial.remove(actor.spatial);
      actor.root.removeFromParent();
      actor.root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      });
    }
    this.actors.clear();
    this.hitMeshes.length = 0;
  }

  rootFor(id: string): THREE.Object3D | undefined {
    return this.actors.get(id)?.root;
  }

  get meshes(): readonly THREE.Object3D[] {
    return this.hitMeshes;
  }

  get activeCount(): number {
    let count = 0;
    for (const actor of this.actors.values()) if (actor.alive && actor.root.visible) count++;
    return count;
  }

  private makeCapsuleMarker(radius: number, bodyLength: number, color: number): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, bodyLength, 10), material);
    cylinder.position.y = bodyLength / 2 + radius;
    const lower = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material);
    lower.position.y = radius;
    const upper = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material);
    upper.position.y = bodyLength + radius;
    for (const mesh of [cylinder, lower, upper]) mesh.castShadow = this.options.shadows;
    group.add(cylinder, lower, upper);
    return group;
  }
}

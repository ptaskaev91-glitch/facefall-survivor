import * as THREE from 'three';
import type { DamageSystem } from '../combat/DamageSystem';
import { Health } from '../combat/Health';
import { LocalAvoidance } from '../navigation/LocalAvoidance';
import { DirectNavigationQuery, type NavigationQuery } from '../navigation/NavigationQuery';
import { SpatialHash, type SpatialHashItem } from '../physics/SpatialHash';
import { ENEMY_ARCHETYPES, type EnemyArchetype, type EnemyId } from './archetypes';
import { EnemyBrain } from './EnemyBrain';

interface EnemySpatialItem extends SpatialHashItem {
  root: THREE.Object3D;
}

export interface EnemyActor {
  id: string;
  archetype: EnemyArchetype;
  root: THREE.Group;
  velocity: THREE.Vector3;
  attackTimer: number;
  staggerTimer: number;
  alertTimer: number;
  wanderTimer: number;
  lastKnownTarget: THREE.Vector3;
  wanderTarget: THREE.Vector3;
  alive: boolean;
  unregisterDamage: () => void;
  spatial: EnemySpatialItem;
}

export interface EnemySystemOptions {
  shadows: boolean;
  maxActive: number;
  spatialCellSize?: number;
  canSeeTarget?: (from: THREE.Vector3, to: THREE.Vector3) => boolean;
}

export class EnemySystem {
  private readonly actors = new Map<string, EnemyActor>();
  private readonly hitMeshes: THREE.Object3D[] = [];
  private readonly spatial: SpatialHash<EnemySpatialItem>;
  private readonly brain = new EnemyBrain();
  private readonly avoidance = new LocalAvoidance<EnemySpatialItem>();
  private readonly neighbours: EnemySpatialItem[] = [];
  private navigation: NavigationQuery = new DirectNavigationQuery();
  private nextId = 1;
  private readonly desired = new THREE.Vector3();
  private readonly steered = new THREE.Vector3();
  private readonly offset = new THREE.Vector3();
  private readonly waypoint = new THREE.Vector3();
  private readonly target = new THREE.Vector3();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly damage: DamageSystem,
    private readonly options: EnemySystemOptions
  ) {
    this.spatial = new SpatialHash<EnemySpatialItem>(options.spatialCellSize ?? 4);
  }

  setNavigationQuery(navigation: NavigationQuery): void {
    this.navigation = navigation;
  }

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
      staggerTimer: 0,
      alertTimer: 1.4,
      wanderTimer: 0,
      lastKnownTarget: position.clone(),
      wanderTarget: position.clone(),
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
      actor.staggerTimer = Math.max(0, actor.staggerTimer - dt);
      actor.alertTimer = Math.max(0, actor.alertTimer - dt);
      actor.wanderTimer = Math.max(0, actor.wanderTimer - dt);

      this.offset.copy(playerPosition).sub(actor.root.position).setY(0);
      const distance = this.offset.length();
      const sightRange = actor.archetype.id === 'runner' ? 30 : actor.archetype.id === 'brute' ? 25 : 27;
      const inSightRange = distance <= sightRange;
      const hasLineOfSight = inSightRange && (this.options.canSeeTarget?.(actor.root.position, playerPosition) ?? true);

      if (hasLineOfSight) {
        actor.lastKnownTarget.copy(playerPosition);
        actor.alertTimer = 3.8;
      }

      const intent = this.brain.decide({
        distanceToPlayer: distance,
        attackRange: actor.archetype.attackRange,
        attackTimer: actor.attackTimer,
        staggerTimer: actor.staggerTimer,
        hasLineOfSight,
        alertTimer: actor.alertTimer
      });

      if (intent === 'stagger') {
        actor.velocity.multiplyScalar(Math.exp(-dt * 8));
        actor.root.position.addScaledVector(actor.velocity, dt);
        this.spatial.update(actor.spatial);
        continue;
      }

      if (intent === 'attack') {
        actor.velocity.multiplyScalar(Math.exp(-dt * 12));
        actor.attackTimer = actor.archetype.attackCooldown;
        onAttack(actor);
        continue;
      }

      if (intent === 'hold') {
        actor.velocity.multiplyScalar(Math.exp(-dt * 12));
        continue;
      }

      if (intent === 'chase') {
        this.target.copy(playerPosition);
      } else if (intent === 'investigate') {
        this.target.copy(actor.lastKnownTarget);
      } else {
        this.updateWanderTarget(actor);
        this.target.copy(actor.wanderTarget);
      }

      this.navigation.nextWaypoint(actor.root.position, this.target, this.waypoint);
      this.offset.copy(this.waypoint).sub(actor.root.position).setY(0);
      const waypointDistance = this.offset.length();
      if (waypointDistance > 1e-5) {
        const speedScale = intent === 'wander' ? 0.42 : intent === 'investigate' ? 0.72 : 1;
        this.desired.copy(this.offset)
          .multiplyScalar(1 / waypointDistance)
          .multiplyScalar(actor.archetype.speed * speedScale);
      } else {
        this.desired.set(0, 0, 0);
      }

      const separationRadius = actor.archetype.id === 'brute' ? 1.75 : actor.archetype.id === 'runner' ? 1.15 : 1.35;
      const separationStrength = actor.archetype.id === 'brute' ? 4.4 : actor.archetype.id === 'runner' ? 3.0 : 3.5;
      this.spatial.queryRadius(actor.root.position, separationRadius, this.neighbours);
      this.avoidance.apply(actor.spatial, this.neighbours, this.desired, separationRadius, separationStrength, this.steered);
      if (this.steered.lengthSq() > actor.archetype.speed * actor.archetype.speed) {
        this.steered.setLength(actor.archetype.speed);
      }

      const blend = 1 - Math.exp(-actor.archetype.acceleration * dt);
      actor.velocity.lerp(this.steered, blend);
      actor.root.position.addScaledVector(actor.velocity, dt);
      if (actor.velocity.lengthSq() > 1e-5) actor.root.rotation.y = Math.atan2(-actor.velocity.x, -actor.velocity.z);
      this.spatial.update(actor.spatial);
    }
  }

  hearNoise(origin: THREE.Vector3, radius: number, alertSeconds = 4.5): void {
    const radiusSq = radius * radius;
    for (const actor of this.actors.values()) {
      if (!actor.alive || actor.root.position.distanceToSquared(origin) > radiusSq) continue;
      actor.lastKnownTarget.copy(origin);
      actor.alertTimer = Math.max(actor.alertTimer, alertSeconds);
    }
  }

  stagger(id: string, duration: number, direction?: THREE.Vector3, impulse = 0): boolean {
    const actor = this.actors.get(id);
    if (!actor || !actor.alive) return false;
    const resistance = actor.archetype.id === 'brute' ? 0.48 : actor.archetype.id === 'runner' ? 0.9 : 0.75;
    actor.staggerTimer = Math.max(actor.staggerTimer, Math.max(0, duration) * resistance);
    actor.alertTimer = Math.max(actor.alertTimer, 3.5);
    if (direction && impulse > 0) {
      this.offset.copy(direction).setY(0);
      if (this.offset.lengthSq() > 1e-6) actor.velocity.add(this.offset.normalize().multiplyScalar(impulse * resistance));
    }
    return true;
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
    this.spatial.clear();
  }

  rootFor(id: string): THREE.Object3D | undefined {
    return this.actors.get(id)?.root;
  }

  get meshes(): readonly THREE.Object3D[] {
    return this.hitMeshes;
  }

  get aimTargets(): readonly THREE.Object3D[] {
    return this.hitMeshes;
  }

  get activeCount(): number {
    let count = 0;
    for (const actor of this.actors.values()) if (actor.alive && actor.root.visible) count++;
    return count;
  }

  get occupiedCellCount(): number {
    return this.spatial.occupiedCellCount;
  }

  private updateWanderTarget(actor: EnemyActor): void {
    const nearTarget = actor.root.position.distanceToSquared(actor.wanderTarget) < 1.2 * 1.2;
    if (actor.wanderTimer > 0 && !nearTarget) return;
    actor.wanderTimer = 1.8 + Math.random() * 2.8;
    const angle = Math.random() * Math.PI * 2;
    const distance = 2.5 + Math.random() * 4.5;
    actor.wanderTarget.copy(actor.root.position).add(new THREE.Vector3(
      Math.sin(angle) * distance,
      0,
      Math.cos(angle) * distance
    ));
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

import * as THREE from 'three';
import type { DamageSystem } from '../combat/DamageSystem';
import { Health } from '../combat/Health';
import { LocalAvoidance } from '../navigation/LocalAvoidance';
import { DirectNavigationQuery, type NavigationQuery } from '../navigation/NavigationQuery';
import { SpatialHash, type SpatialHashItem } from '../physics/SpatialHash';
import { ENEMY_ARCHETYPES, type EnemyArchetype, type EnemyId } from './archetypes';
import { EnemyBrain, type EnemyIntent } from './EnemyBrain';
import {
  perceptionInterval,
  sightRangeFor,
  steeringInterval,
  TARGET_STICK_SECONDS,
  VISUAL_ALERT_SECONDS,
} from './EnemyPerception';
import { animateEnemyVisual, createEnemyVisual, playEnemyVisualAction, updateEnemyVisualLod } from './EnemyVisualFactory';

interface EnemySpatialItem extends SpatialHashItem { root: THREE.Object3D; }

export interface EnemyActor {
  id: string;
  archetype: EnemyArchetype;
  root: THREE.Group;
  velocity: THREE.Vector3;
  steeringVelocity: THREE.Vector3;
  attackTimer: number;
  staggerTimer: number;
  alertTimer: number;
  targetStickTimer: number;
  perceptionTimer: number;
  steeringTimer: number;
  hasLineOfSight: boolean;
  currentIntent: EnemyIntent;
  wanderTimer: number;
  deathTimer: number;
  groanTimer: number;
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
  onGroan?: (actor: EnemyActor) => void;
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

  setNavigationQuery(navigation: NavigationQuery): void { this.navigation = navigation; }

  spawn(type: EnemyId, position: THREE.Vector3): EnemyActor | null {
    if (this.activeCount >= this.options.maxActive) return null;
    const archetype = ENEMY_ARCHETYPES[type];
    const id = `enemy-${type}-${this.nextId++}`;
    const root = createEnemyVisual(type, this.options.shadows);
    root.position.copy(position);
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
      steeringVelocity: new THREE.Vector3(),
      attackTimer: 0,
      staggerTimer: 0,
      alertTimer: 1.4,
      targetStickTimer: 0,
      perceptionTimer: Math.random() * 0.08,
      steeringTimer: Math.random() * 0.05,
      hasLineOfSight: false,
      currentIntent: 'wander',
      wanderTimer: 0,
      deathTimer: 0,
      groanTimer: 1.5 + Math.random() * 3.5,
      lastKnownTarget: position.clone(),
      wanderTarget: position.clone(),
      alive: true,
      unregisterDamage,
      spatial,
    };
    this.actors.set(id, actor);
    this.spatial.insert(spatial);
    return actor;
  }

  update(dt: number, playerPosition: THREE.Vector3, onAttack: (actor: EnemyActor) => void): void {
    for (const actor of this.actors.values()) {
      if (!actor.root.visible) continue;
      if (!actor.alive) {
        actor.deathTimer = Math.max(0, actor.deathTimer - dt);
        animateEnemyVisual(actor.root, 0, dt);
        if (actor.deathTimer <= 0) actor.root.visible = false;
        continue;
      }

      actor.attackTimer = Math.max(0, actor.attackTimer - dt);
      actor.staggerTimer = Math.max(0, actor.staggerTimer - dt);
      actor.alertTimer = Math.max(0, actor.alertTimer - dt);
      actor.targetStickTimer = Math.max(0, actor.targetStickTimer - dt);
      actor.perceptionTimer = Math.max(0, actor.perceptionTimer - dt);
      actor.steeringTimer = Math.max(0, actor.steeringTimer - dt);
      actor.wanderTimer = Math.max(0, actor.wanderTimer - dt);
      actor.groanTimer = Math.max(0, actor.groanTimer - dt);
      if (actor.groanTimer <= 0) { actor.groanTimer = 3.4 + Math.random() * 5.2; this.options.onGroan?.(actor); }
      animateEnemyVisual(actor.root, actor.velocity.length(), dt);

      this.offset.copy(playerPosition).sub(actor.root.position).setY(0);
      const distance = this.offset.length();
      updateEnemyVisualLod(actor.root, distance);

      if (actor.perceptionTimer <= 0) {
        const inSightRange = distance <= sightRangeFor(actor.archetype.id);
        const hasLineOfSight = inSightRange && (this.options.canSeeTarget?.(actor.root.position, playerPosition) ?? true);
        actor.hasLineOfSight = hasLineOfSight;
        actor.perceptionTimer = perceptionInterval(distance);
        if (hasLineOfSight) {
          actor.lastKnownTarget.copy(playerPosition);
          actor.alertTimer = VISUAL_ALERT_SECONDS;
          actor.targetStickTimer = TARGET_STICK_SECONDS;
          actor.steeringTimer = 0;
        }
      }

      const intent = this.brain.decide({
        distanceToPlayer: distance,
        attackRange: actor.archetype.attackRange,
        attackTimer: actor.attackTimer,
        staggerTimer: actor.staggerTimer,
        hasLineOfSight: actor.hasLineOfSight,
        targetStickTimer: actor.targetStickTimer,
        alertTimer: actor.alertTimer,
      });
      if (intent !== actor.currentIntent) {
        actor.currentIntent = intent;
        actor.steeringTimer = 0;
      }

      if (intent === 'stagger') {
        actor.steeringVelocity.set(0, 0, 0);
        actor.velocity.multiplyScalar(Math.exp(-dt * 8));
        actor.root.position.addScaledVector(actor.velocity, dt);
        this.spatial.update(actor.spatial);
        continue;
      }
      if (intent === 'attack') {
        actor.steeringVelocity.set(0, 0, 0);
        actor.velocity.multiplyScalar(Math.exp(-dt * 12));
        actor.attackTimer = actor.archetype.attackCooldown;
        playEnemyVisualAction(actor.root, 'attack');
        onAttack(actor);
        continue;
      }
      if (intent === 'hold') {
        actor.steeringVelocity.set(0, 0, 0);
        actor.velocity.multiplyScalar(Math.exp(-dt * 12));
        continue;
      }

      if (intent === 'chase' || intent === 'investigate') this.target.copy(actor.lastKnownTarget);
      else { this.updateWanderTarget(actor); this.target.copy(actor.wanderTarget); }

      if (actor.steeringTimer <= 0) {
        actor.steeringTimer = steeringInterval(distance);
        this.navigation.nextWaypoint(actor.root.position, this.target, this.waypoint);
        this.offset.copy(this.waypoint).sub(actor.root.position).setY(0);
        const waypointDistance = this.offset.length();
        if (waypointDistance > 1e-5) {
          const speedScale = intent === 'wander' ? 0.42 : intent === 'investigate' ? 0.72 : 1;
          this.desired.copy(this.offset).multiplyScalar(1 / waypointDistance).multiplyScalar(actor.archetype.speed * speedScale);
        } else this.desired.set(0, 0, 0);

        const separationRadius = actor.archetype.id === 'brute' ? 1.75 : actor.archetype.id === 'runner' ? 1.15 : 1.35;
        const separationStrength = actor.archetype.id === 'brute' ? 4.4 : actor.archetype.id === 'runner' ? 3.0 : 3.5;
        this.spatial.queryRadius(actor.root.position, separationRadius, this.neighbours);
        this.avoidance.apply(actor.spatial, this.neighbours, this.desired, separationRadius, separationStrength, this.steered);
        if (this.steered.lengthSq() > actor.archetype.speed * actor.archetype.speed) this.steered.setLength(actor.archetype.speed);
        actor.steeringVelocity.copy(this.steered);
      }

      const blend = 1 - Math.exp(-actor.archetype.acceleration * dt);
      actor.velocity.lerp(actor.steeringVelocity, blend);
      actor.root.position.addScaledVector(actor.velocity, dt);
      if (actor.velocity.lengthSq() > 1e-5) actor.root.rotation.y = Math.atan2(-actor.velocity.x, -actor.velocity.z);
      this.spatial.update(actor.spatial);
    }
  }

  hearNoise(origin: THREE.Vector3, radius: number, alertSeconds = 4.5): void {
    const radiusSq = radius * radius;
    for (const actor of this.actors.values()) {
      if (!actor.alive || actor.root.position.distanceToSquared(origin) > radiusSq) continue;
      if (!actor.hasLineOfSight) {
        actor.lastKnownTarget.copy(origin);
        actor.targetStickTimer = 0;
      }
      actor.alertTimer = Math.max(actor.alertTimer, alertSeconds);
      actor.steeringTimer = 0;
    }
  }

  stagger(id: string, duration: number, direction?: THREE.Vector3, impulse = 0): boolean {
    const actor = this.actors.get(id);
    if (!actor || !actor.alive) return false;
    const resistance = actor.archetype.id === 'brute' ? 0.48 : actor.archetype.id === 'runner' ? 0.9 : 0.75;
    actor.staggerTimer = Math.max(actor.staggerTimer, Math.max(0, duration) * resistance);
    actor.alertTimer = Math.max(actor.alertTimer, 3.5);
    actor.steeringTimer = 0;
    playEnemyVisualAction(actor.root, 'stagger');
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
    actor.deathTimer = 1.08;
    actor.velocity.set(0, 0, 0);
    actor.steeringVelocity.set(0, 0, 0);
    actor.unregisterDamage();
    this.spatial.remove(actor.spatial);
    actor.root.traverse((object) => {
      if (!object.userData.damageCollider) return;
      delete object.userData.damageTargetId;
      object.raycast = () => undefined;
    });
    playEnemyVisualAction(actor.root, 'death');
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
    this.actors.clear(); this.hitMeshes.length = 0; this.spatial.clear();
  }

  rootFor(id: string): THREE.Object3D | undefined { return this.actors.get(id)?.root; }
  get meshes(): readonly THREE.Object3D[] { return this.hitMeshes; }
  get aimTargets(): readonly THREE.Object3D[] { return this.hitMeshes; }
  get activeCount(): number {
    let count = 0; for (const actor of this.actors.values()) if (actor.alive && actor.root.visible) count++; return count;
  }
  get occupiedCellCount(): number { return this.spatial.occupiedCellCount; }

  private updateWanderTarget(actor: EnemyActor): void {
    const nearTarget = actor.root.position.distanceToSquared(actor.wanderTarget) < 1.2 * 1.2;
    if (actor.wanderTimer > 0 && !nearTarget) return;
    actor.wanderTimer = 1.8 + Math.random() * 2.8;
    const angle = Math.random() * Math.PI * 2;
    const distance = 2.5 + Math.random() * 4.5;
    actor.wanderTarget.copy(actor.root.position).add(new THREE.Vector3(Math.sin(angle) * distance, 0, Math.cos(angle) * distance));
  }
}

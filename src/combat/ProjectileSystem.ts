import { Vector3 } from 'three';
import { DamageSystem } from './DamageSystem';
import { WEAPONS } from './weapons';
import type { HitZone, ShotEvent, WeaponId } from './types';

export interface ProjectileCollision {
  targetId?: string;
  point: Vector3;
  hitZone: HitZone;
}

export type ProjectileCollisionQuery = (from: Vector3, to: Vector3) => ProjectileCollision | null;

export interface ProjectileState {
  id: number;
  weaponId: WeaponId;
  sourceId: string;
  position: Vector3;
  previousPosition: Vector3;
  velocity: Vector3;
  gravity: number;
  age: number;
  lifetime: number;
  active: boolean;
}

export class ProjectileSystem {
  private readonly projectiles: ProjectileState[] = [];
  private nextId = 1;

  constructor(
    private readonly damage: DamageSystem,
    private readonly collisionQuery: ProjectileCollisionQuery,
    private readonly capacity = 48
  ) {}

  spawnFromShot(shot: ShotEvent): ProjectileState | null {
    const definition = WEAPONS[shot.weaponId];
    if (definition.fireModel !== 'projectile' || !definition.projectileSpeed) return null;

    let projectile = this.projectiles.find((candidate) => !candidate.active);
    if (!projectile && this.projectiles.length < this.capacity) {
      projectile = {
        id: 0,
        weaponId: shot.weaponId,
        sourceId: shot.sourceId,
        position: new Vector3(),
        previousPosition: new Vector3(),
        velocity: new Vector3(),
        gravity: 0,
        age: 0,
        lifetime: 0,
        active: false
      };
      this.projectiles.push(projectile);
    }
    if (!projectile) return null;

    projectile.id = this.nextId++;
    projectile.weaponId = shot.weaponId;
    projectile.sourceId = shot.sourceId;
    projectile.position.copy(shot.origin);
    projectile.previousPosition.copy(shot.origin);
    projectile.velocity.copy(shot.direction).normalize().multiplyScalar(definition.projectileSpeed);
    projectile.gravity = definition.projectileGravity ?? 0;
    projectile.age = 0;
    projectile.lifetime = 5;
    projectile.active = true;
    return projectile;
  }

  update(dt: number): void {
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;

      projectile.age += dt;
      if (projectile.age >= projectile.lifetime) {
        projectile.active = false;
        continue;
      }

      projectile.previousPosition.copy(projectile.position);
      projectile.velocity.y -= projectile.gravity * dt;
      projectile.position.addScaledVector(projectile.velocity, dt);

      const collision = this.collisionQuery(projectile.previousPosition, projectile.position);
      if (!collision) continue;

      if (collision.targetId) {
        const definition = WEAPONS[projectile.weaponId];
        const multiplier = collision.hitZone === 'head'
          ? definition.headMultiplier
          : collision.hitZone === 'limb'
            ? definition.limbMultiplier
            : 1;
        this.damage.apply({
          amount: definition.damage * multiplier,
          kind: 'arrow',
          sourceId: projectile.sourceId,
          targetId: collision.targetId,
          hitPoint: collision.point.clone(),
          direction: projectile.velocity.clone().normalize(),
          impulse: definition.impulse,
          hitZone: collision.hitZone,
          critical: collision.hitZone === 'head'
        });
      }

      projectile.active = false;
    }
  }

  active(): readonly ProjectileState[] {
    return this.projectiles.filter((projectile) => projectile.active);
  }
}

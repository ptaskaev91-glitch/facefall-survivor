import * as THREE from 'three';
import type { EffectAdapters, EffectContext } from './EffectSystem';
import { DecalPool } from './DecalPool';
import { ParticlePool, type ParticleInstance } from './ParticlePool';
import type { DecalRecipe, ParticleRecipe } from './recipes';

class SimpleParticle implements ParticleInstance {
  readonly object: THREE.Mesh;
  age = 0;
  lifetime = 1;
  active = false;
  readonly velocity = new THREE.Vector3();
  private drag = 1.5;

  constructor() {
    this.object = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 5, 4),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 1 })
    );
    this.object.visible = false;
  }

  configure(recipe: ParticleRecipe, context: EffectContext): void {
    const material = this.object.material as THREE.MeshBasicMaterial;
    const color = recipe.kind === 'blood' ? 0x6f1010
      : recipe.kind === 'spark' ? 0xffd17a
        : recipe.kind === 'smoke' ? 0x777d78
          : recipe.kind === 'casing' ? 0xb08b43
            : 0x665d4d;
    material.color.setHex(color);
    material.opacity = recipe.kind === 'smoke' ? 0.55 : 0.95;
    this.object.scale.setScalar(Math.max(0.25, recipe.size / 0.04));
    this.object.position.copy(context.origin);

    const direction = context.direction?.clone().normalize() ?? new THREE.Vector3(0, 1, 0);
    const jitter = new THREE.Vector3(
      (Math.random() - 0.5) * 1.4,
      Math.random() * 1.2,
      (Math.random() - 0.5) * 1.4
    );
    this.velocity.copy(direction).multiplyScalar(recipe.speed * 0.45).addScaledVector(jitter, recipe.speed);
    this.drag = recipe.kind === 'casing' ? 0.7 : recipe.kind === 'smoke' ? 2.5 : 1.4;
  }

  reset(): void {
    this.velocity.set(0, 0, 0);
  }

  update(dt: number): void {
    this.object.position.addScaledVector(this.velocity, dt);
    this.velocity.multiplyScalar(Math.exp(-this.drag * dt));
    if ((this.object.material as THREE.MeshBasicMaterial).color.r > 0.3) this.velocity.y -= 2.6 * dt;
    const material = this.object.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, 1 - this.age / this.lifetime);
  }
}

export class CameraImpulse {
  private strength = 0;
  private readonly offset = new THREE.Vector3();

  add(strength: number): void {
    this.strength = Math.min(1.5, this.strength + Math.max(0, strength));
  }

  apply(camera: THREE.Camera, dt: number): void {
    if (this.strength <= 0.001) return;
    this.offset.set(
      (Math.random() - 0.5) * this.strength,
      (Math.random() - 0.5) * this.strength * 0.65,
      (Math.random() - 0.5) * this.strength * 0.45
    );
    camera.position.add(this.offset);
    this.strength *= Math.exp(-12 * dt);
  }
}

export class RuntimeFx {
  readonly cameraImpulse = new CameraImpulse();
  readonly adapters: EffectAdapters;
  private readonly particles: ParticlePool<SimpleParticle>;
  private readonly decals: DecalPool;

  constructor(private readonly scene: THREE.Scene, particleCapacity = 320, decalCapacity = 72) {
    this.particles = new ParticlePool(scene, particleCapacity, () => new SimpleParticle());
    this.decals = new DecalPool(scene, decalCapacity, () => {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 10),
        new THREE.MeshBasicMaterial({ color: 0x4c0909, transparent: true, opacity: 0.82, depthWrite: false })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.015;
      return mesh;
    });

    this.adapters = {
      spawnParticle: (recipe, context) => this.spawnParticles(recipe, context),
      spawnDecal: (recipe, context) => this.spawnDecal(recipe, context),
      cameraShake: (strength) => this.cameraImpulse.add(strength)
    };
  }

  update(dt: number): void {
    this.particles.update(dt);
    this.decals.update(dt);
  }

  dispose(): void {
    this.particles.dispose();
    this.decals.dispose();
  }

  private spawnParticles(recipe: ParticleRecipe, context: EffectContext): void {
    for (let i = 0; i < recipe.count; i++) {
      const particle = this.particles.acquire(recipe.lifetime * (0.8 + Math.random() * 0.35));
      particle.configure(recipe, context);
    }
  }

  private spawnDecal(recipe: DecalRecipe, context: EffectContext): void {
    const parent = context.parent ?? this.scene;
    const decal = this.decals.spawn(parent, recipe.lifetime);
    decal.mesh.position.copy(context.origin);
    decal.mesh.position.y = Math.max(0.012, context.origin.y + 0.012);
    decal.mesh.scale.setScalar(recipe.size);
  }
}

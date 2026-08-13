import * as THREE from 'three';
import { CharacterModel } from '../characters/CharacterModel';
import type { DamageSystem } from '../combat/DamageSystem';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { QualityProfile } from '../graphics/quality';

export type FamilyRole = 'mama' | 'papa';
export interface FamilyFaces { mamaFaceDataUrl?: string | null; papaFaceDataUrl?: string | null; }
interface Companion { role: FamilyRole; root: THREE.Group; model: CharacterModel; fireTimer: number; unlocked: boolean; face: string | null; }
const HERO = '/assets/characters/quaternius-universal-base-male/Superhero_Male_FullBody.gltf';
const ANIM = '/assets/animations/quaternius-universal-animation-library/UAL1_Standard.glb';

export class FamilyCompanionSystem {
  private readonly companions: Record<FamilyRole, Companion>;
  private readonly temp = new THREE.Vector3();
  private readonly target = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene, private readonly quality: QualityProfile, private readonly enemies: EnemySystem, private readonly damage: DamageSystem) {
    this.companions = { mama: this.make('mama'), papa: this.make('papa') };
  }
  configureFaces(faces: FamilyFaces): void { this.companions.mama.face = faces.mamaFaceDataUrl ?? null; this.companions.papa.face = faces.papaFaceDataUrl ?? null; }
  reset(): void { for (const c of Object.values(this.companions)) { c.unlocked = false; c.root.visible = false; c.fireTimer = 0; } }
  async syncWave(wave: number): Promise<void> { if (wave >= 4 && !this.companions.mama.unlocked) await this.unlock(this.companions.mama); if (wave >= 7 && !this.companions.papa.unlocked) await this.unlock(this.companions.papa); }
  update(dt: number, player: THREE.Vector3, facing: THREE.Vector3): void {
    const active = this.active;
    active.forEach((c, i) => {
      const desired = this.temp.copy(player).add(new THREE.Vector3(i === 0 ? -1.45 : 1.45, 0, 1.75));
      c.root.position.lerp(desired, 1 - Math.exp(-dt * 5.5));
      const enemy = this.nearest(c.root.position);
      if (enemy) {
        enemy.getWorldPosition(this.target);
        const dir = this.target.clone().sub(c.root.position).setY(0);
        if (dir.lengthSq() > 1e-5) c.root.rotation.y = Math.atan2(-dir.x, -dir.z);
        c.fireTimer -= dt;
        if (c.fireTimer <= 0) {
          c.fireTimer = c.role === 'mama' ? 0.72 : 0.58;
          const id = enemy.userData.damageTargetId as string | undefined;
          if (id) {
            const hitPoint = this.target.clone().add(new THREE.Vector3(0, 1, 0));
            const shot = hitPoint.clone().sub(c.root.position).normalize();
            this.damage.apply({ amount: c.role === 'mama' ? 17 : 21, kind: 'bullet', sourceId: `super-${c.role}`, targetId: id, hitPoint, direction: shot, impulse: 5, hitZone: 'torso', critical: false });
            c.model.playPistolFire();
          }
        }
      } else c.root.rotation.y = Math.atan2(-facing.x, -facing.z);
      c.model.update(dt, c.root.position.distanceTo(desired) > 0.08 ? 3.8 : 0);
    });
  }
  get heroCount(): number { return 1 + this.active.length; }
  get activeRoles(): FamilyRole[] { return this.active.map((c) => c.role); }
  dispose(): void { for (const c of Object.values(this.companions)) { c.model.dispose(); c.root.removeFromParent(); } }
  private get active(): Companion[] { return Object.values(this.companions).filter((c) => c.unlocked); }
  private make(role: FamilyRole): Companion { const root = new THREE.Group(); root.name = `super-${role}`; root.visible = false; const model = new CharacterModel(this.quality.shadows); root.add(model.root); this.scene.add(root); return { role, root, model, fireTimer: 0, unlocked: false, face: null }; }
  private async unlock(c: Companion): Promise<void> {
    c.unlocked = true;
    c.root.visible = true;
    try {
      await c.model.load(HERO);
      await c.model.loadAnimations(ANIM);
      await c.model.setFaceDataUrl(c.face);
      c.model.setVisible(true);
      c.model.setActiveWeapon('pistol');
      this.decorate(c);
    } catch (error) {
      console.warn(`[Super Makar] ${c.role} model unavailable`, error);
    }
  }
  private decorate(c: Companion): void {
    if (c.model.root.getObjectByName(`super-${c.role}-marker`)) return;
    if (c.role === 'mama') {
      const head = c.model.root.getObjectByName('Head') ?? c.model.root;
      const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x36251f, roughness: 0.82 });
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), hairMaterial);
      bun.name = 'super-mama-marker';
      bun.position.set(0, 0.07, 0.095);
      bun.scale.set(1.05, 1.15, 1.05);
      bun.castShadow = this.quality.shadows;
      head.add(bun);

      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.15, 5, 8), hairMaterial.clone());
      tail.name = 'super-mama-ponytail';
      tail.rotation.x = 0.3;
      tail.position.set(0, -0.07, 0.14);
      tail.castShadow = this.quality.shadows;
      head.add(tail);

      c.model.root.scale.x *= 0.94;
    } else {
      const marker = new THREE.Group();
      marker.name = 'super-papa-marker';
      c.model.root.add(marker);
      c.model.root.scale.x *= 1.04;
    }
  }
  private nearest(from: THREE.Vector3): THREE.Object3D | null { let best: THREE.Object3D | null = null; let bestDistance = 900; for (const root of this.enemies.aimTargets) { if (!root.visible || !root.userData.damageTargetId) continue; const distance = root.position.distanceToSquared(from); if (distance < bestDistance) { bestDistance = distance; best = root; } } return best; }
}

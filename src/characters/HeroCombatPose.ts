import * as THREE from 'three';
import type { WeaponId } from '../combat/types';

export type HeroCombatPoseAction =
  | 'shotgun-fire'
  | 'shotgun-reload'
  | 'bow-draw'
  | 'bow-release'
  | 'hit'
  | 'death';

interface PoseBones {
  head: THREE.Bone | null;
  spine: THREE.Bone | null;
  clavicleL: THREE.Bone | null;
  clavicleR: THREE.Bone | null;
  upperArmL: THREE.Bone | null;
  upperArmR: THREE.Bone | null;
  lowerArmL: THREE.Bone | null;
  lowerArmR: THREE.Bone | null;
  handL: THREE.Bone | null;
  handR: THREE.Bone | null;
}

/**
 * Lightweight upper-body combat overlay layered after the locomotion mixer.
 * It fills weapon/reaction states that are intentionally absent from the compact
 * vendored animation library without replacing or distorting the authored rig.
 */
export class HeroCombatPose {
  private bones: PoseBones | null = null;
  private action: HeroCombatPoseAction | null = null;
  private elapsed = 0;
  private duration = 0;
  private initialProgress = 0;

  bind(root: THREE.Object3D): void {
    const bone = (...names: string[]): THREE.Bone | null => {
      for (const name of names) {
        const found = root.getObjectByName(name);
        if (found instanceof THREE.Bone) return found;
      }
      return null;
    };
    this.bones = {
      head: bone('Head', 'head'),
      spine: bone('spine_03', 'Spine2', 'spine_02'),
      clavicleL: bone('clavicle_l', 'Shoulder_L'),
      clavicleR: bone('clavicle_r', 'Shoulder_R'),
      upperArmL: bone('upperarm_l', 'UpperArm_L'),
      upperArmR: bone('upperarm_r', 'UpperArm_R'),
      lowerArmL: bone('lowerarm_l', 'LowerArm_L'),
      lowerArmR: bone('lowerarm_r', 'LowerArm_R'),
      handL: bone('hand_l', 'Hand_L'),
      handR: bone('hand_r', 'Hand_R')
    };
  }

  clear(): void {
    this.bones = null;
    this.action = null;
    this.elapsed = 0;
    this.duration = 0;
    this.initialProgress = 0;
  }

  play(action: HeroCombatPoseAction, duration: number, initialProgress = 0): boolean {
    if (!this.bones) return false;
    this.action = action;
    this.duration = Math.max(0.05, duration);
    this.elapsed = 0;
    this.initialProgress = THREE.MathUtils.clamp(initialProgress, 0, 0.95);
    return true;
  }

  update(dt: number, weapon: WeaponId): boolean {
    if (!this.bones) return false;
    this.applyWeaponStance(weapon);
    if (!this.action) return false;

    this.elapsed += Math.max(0, dt);
    const raw = this.initialProgress + (1 - this.initialProgress) * (this.elapsed / this.duration);
    const t = THREE.MathUtils.clamp(raw, 0, 1);
    this.applyAction(this.action, t);
    if (t >= 1 && this.action !== 'death') {
      this.action = null;
      this.elapsed = 0;
      this.duration = 0;
      this.initialProgress = 0;
    }
    return true;
  }

  get activeAction(): HeroCombatPoseAction | null { return this.action; }

  private applyWeaponStance(weapon: WeaponId): void {
    const b = this.bones!;
    if (weapon === 'shotgun') {
      b.spine?.rotateX(-0.06);
      b.clavicleL?.rotateZ(-0.10);
      b.clavicleR?.rotateZ(0.08);
      b.upperArmL?.rotateX(-0.62);
      b.upperArmL?.rotateZ(-0.18);
      b.lowerArmL?.rotateX(-0.62);
      b.upperArmR?.rotateX(-0.48);
      b.upperArmR?.rotateZ(0.13);
      b.lowerArmR?.rotateX(-1.00);
    } else if (weapon === 'bow') {
      b.spine?.rotateX(-0.035);
      b.clavicleL?.rotateZ(-0.17);
      b.upperArmL?.rotateX(-1.12);
      b.upperArmL?.rotateZ(-0.10);
      b.lowerArmL?.rotateX(-0.15);
      b.clavicleR?.rotateZ(0.22);
      b.upperArmR?.rotateX(-0.78);
      b.upperArmR?.rotateZ(0.25);
      b.lowerArmR?.rotateX(-1.30);
    }
  }

  private applyAction(action: HeroCombatPoseAction, t: number): void {
    const b = this.bones!;
    const pulse = Math.sin(Math.PI * t);
    switch (action) {
      case 'shotgun-fire':
        b.spine?.rotateX(0.11 * pulse);
        b.upperArmR?.rotateX(0.22 * pulse);
        b.upperArmL?.rotateX(0.16 * pulse);
        b.head?.rotateX(-0.05 * pulse);
        break;
      case 'shotgun-reload': {
        const pump = Math.sin(Math.PI * Math.min(1, t * 1.2));
        b.lowerArmL?.rotateX(0.72 * pump);
        b.upperArmL?.rotateX(0.28 * pump);
        b.handL?.rotateZ(-0.16 * pump);
        break;
      }
      case 'bow-draw': {
        const ease = 1 - Math.pow(1 - t, 2);
        b.upperArmR?.rotateZ(0.34 * ease);
        b.lowerArmR?.rotateX(-0.42 * ease);
        b.spine?.rotateZ(-0.06 * ease);
        b.head?.rotateY(-0.08 * ease);
        break;
      }
      case 'bow-release':
        b.upperArmR?.rotateZ(-0.28 * pulse);
        b.lowerArmR?.rotateX(0.55 * pulse);
        b.spine?.rotateZ(0.05 * pulse);
        break;
      case 'hit':
        b.spine?.rotateX(0.24 * pulse);
        b.spine?.rotateZ(-0.11 * pulse);
        b.head?.rotateX(-0.15 * pulse);
        b.upperArmL?.rotateZ(-0.16 * pulse);
        break;
      case 'death': {
        const ease = t * t * (3 - 2 * t);
        b.spine?.rotateX(0.78 * ease);
        b.spine?.rotateZ(-0.46 * ease);
        b.head?.rotateX(-0.32 * ease);
        b.head?.rotateZ(0.28 * ease);
        b.upperArmL?.rotateZ(-0.74 * ease);
        b.upperArmR?.rotateZ(0.64 * ease);
        b.lowerArmL?.rotateX(0.30 * ease);
        b.lowerArmR?.rotateX(0.38 * ease);
        break;
      }
    }
  }
}

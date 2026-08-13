from pathlib import Path

# CharacterModel: add lightweight upper-body combat overlays for states missing from UAL1.
p = Path('src/characters/CharacterModel.ts')
s = p.read_text()
s = s.replace("import { resolveLocomotionState, type LocomotionState } from './CharacterLocomotion';", "import { resolveLocomotionState, type LocomotionState } from './CharacterLocomotion';\nimport { HeroCombatPose } from './HeroCombatPose';")
s = s.replace("  private readonly actions = new Map<LocomotionState, THREE.AnimationAction>();\n", "  private readonly actions = new Map<LocomotionState, THREE.AnimationAction>();\n  private readonly combatPose = new HeroCombatPose();\n")
s = s.replace("    this.headBone = this.findBone(instance, 'Head');\n    this.eyes = instance.getObjectByName('Eyes') ?? null;", "    this.headBone = this.findBone(instance, 'Head');\n    this.eyes = instance.getObjectByName('Eyes') ?? null;\n    this.combatPose.bind(instance);")
old_update = """    if (this.overrideAction) {
      this.overrideTime = Math.max(0, this.overrideTime - safeDt);
      this.mixer.update(safeDt);
      if (this.overrideTime <= 0) this.finishOverride();
      return;
    }

    this.setLocomotion(this.desiredLocomotion);
    this.mixer.update(safeDt);
"""
new_update = """    if (this.overrideAction) {
      this.overrideTime = Math.max(0, this.overrideTime - safeDt);
      this.mixer.update(safeDt);
      this.combatPose.update(safeDt, this.activeWeapon);
      if (this.overrideTime <= 0) this.finishOverride();
      return;
    }

    this.setLocomotion(this.desiredLocomotion);
    this.mixer.update(safeDt);
    this.combatPose.update(safeDt, this.activeWeapon);
"""
if old_update not in s: raise SystemExit('CharacterModel update anchor missing')
s = s.replace(old_update, new_update)
s = s.replace("""    if (!clip) return false;
    return this.playOverride(clip, Math.min(0.56, Math.max(0.16, clip.duration)), 0.045);
  }

  playHit(): boolean { const clip = this.findClip(['Hit', 'Hit_Reaction', 'Damage'], [/hit/i, /damage/i, /impact/i]); return clip ? this.playOverride(clip, Math.min(0.55, Math.max(0.2, clip.duration)), 0.04) : false; }

  playDeath(): boolean { const clip = this.findClip(['Death', 'Die', 'Death_01'], [/death/i, /die/i, /dying/i]); return clip ? this.playOverride(clip, Math.max(0.8, clip.duration), 0.08) : false; }
""", """    if (clip) return this.playOverride(clip, Math.min(0.56, Math.max(0.16, clip.duration)), 0.045);
    return this.combatPose.play('shotgun-fire', 0.38);
  }

  playHit(): boolean {
    const clip = this.findClip(['Hit', 'Hit_Reaction', 'Damage'], [/hit/i, /damage/i, /impact/i]);
    return clip ? this.playOverride(clip, Math.min(0.55, Math.max(0.2, clip.duration)), 0.04) : this.combatPose.play('hit', 0.42);
  }

  playDeath(): boolean {
    const clip = this.findClip(['Death', 'Die', 'Death_01'], [/death/i, /die/i, /dying/i]);
    if (clip) return this.playOverride(clip, Math.max(0.8, clip.duration), 0.08);
    const started = this.combatPose.play('death', 1.1, 0.35);
    if (started) this.combatPose.update(0, this.activeWeapon);
    return started;
  }
""")
s = s.replace("""    if (!clip) return false;
    return this.playOverride(clip, Math.max(0.32, clip.duration), 0.08);
  }

  dispose(): void {
""", """    if (clip) return this.playOverride(clip, Math.max(0.32, clip.duration), 0.08);
    return this.combatPose.play('shotgun-reload', 0.92);
  }

  playBowDraw(): boolean {
    return this.combatPose.play('bow-draw', 0.78);
  }

  playBowRelease(): boolean {
    return this.combatPose.play('bow-release', 0.34);
  }

  dispose(): void {
""")
s = s.replace("    this.overrideTime = 0;\n    this.desiredLocomotion = 'idle';", "    this.overrideTime = 0;\n    this.combatPose.clear();\n    this.desiredLocomotion = 'idle';")
p.write_text(s)

# PlayerRuntime: stop using pistol fallback for shotgun; bow drives both skeleton and weapon geometry.
p = Path('src/player/PlayerRuntime.ts')
s = p.read_text()
s = s.replace("""    if (weaponId === 'shotgun') {
      // UAL1_Standard currently has no long-gun clip. Prefer one if a future library adds it,
      // otherwise keep combat-event timing visible with the compatible pistol one-shot.
      return this.characterModel.playShotgunFire() || this.characterModel.playPistolFire();
    }
    if (weaponId === 'bow') return this.weaponVisual.playBowRelease();
""", """    if (weaponId === 'shotgun') return this.characterModel.playShotgunFire();
    if (weaponId === 'bow') {
      const pose = this.characterModel.playBowRelease();
      const visual = this.weaponVisual.playBowRelease();
      return pose || visual;
    }
""")
s = s.replace("""    if (weaponId === 'shotgun') {
      return this.characterModel.playShotgunReload() || this.characterModel.playPistolReload();
    }
    if (weaponId === 'bow') return this.weaponVisual.playBowReload();
""", """    if (weaponId === 'shotgun') return this.characterModel.playShotgunReload();
    if (weaponId === 'bow') {
      const pose = this.characterModel.playBowDraw();
      const visual = this.weaponVisual.playBowReload();
      return pose || visual;
    }
""")
p.write_text(s)

# WeaponSocketVisual: keep procedural meshes as fallback, hydrate production GLBs asynchronously.
p = Path('src/characters/WeaponSocketVisual.ts')
s = p.read_text()
s = s.replace("import * as THREE from 'three';\n", "import * as THREE from 'three';\nimport { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\n")
s = s.replace("export class WeaponSocketVisual {\n", "export class WeaponSocketVisual {\n  private readonly loader = new GLTFLoader();\n")
s = s.replace("  private activeWeapon: WeaponId = 'pistol';\n  private enabled = false;\n", "  private activeWeapon: WeaponId = 'pistol';\n  private enabled = false;\n  private assetGeneration = 0;\n")
s = s.replace("""    this.updateBowGeometry();
    this.updateVisibility();
    this.update(0);
    return true;
""", """    this.updateBowGeometry();
    this.updateVisibility();
    this.update(0);
    const generation = ++this.assetGeneration;
    void this.hydrateWeaponGlb('shotgun', '/assets/weapons/shotgun.glb', generation);
    void this.hydrateWeaponGlb('bow', '/assets/weapons/bow-arrow.glb', generation);
    return true;
""")
# Shotgun procedural fallback wrapper.
s = s.replace("""    const group = new THREE.Group();
    group.name = 'weapon-shotgun';

    const steel =""", """    const group = new THREE.Group();
    group.name = 'weapon-shotgun';
    const fallback = new THREE.Group();
    fallback.name = 'weapon-shotgun-procedural-fallback';

    const steel =""")
s = s.replace("""    group.add(receiver, barrel, magazineTube, pump, pistolGrip, stock, buttPad, beadSight);

    const muzzle = new THREE.Object3D();
""", """    fallback.add(receiver, barrel, magazineTube, pump, pistolGrip, stock, buttPad, beadSight);
    group.add(fallback);

    const muzzle = new THREE.Object3D();
""")
# Bow procedural static/arrow fallback wrapper. String remains dynamic outside it.
s = s.replace("""    const group = new THREE.Group();
    group.name = 'weapon-bow';
    // Keep the bow just forward of the left palm and vertically oriented.
""", """    const group = new THREE.Group();
    group.name = 'weapon-bow';
    const fallback = new THREE.Group();
    fallback.name = 'weapon-bow-procedural-fallback';
    // Keep the bow just forward of the left palm and vertically oriented.
""")
s = s.replace("""    group.add(riser, grip, upperLimb, lowerLimb, bowString, arrow);

    const muzzle = new THREE.Object3D();
""", """    fallback.add(riser, grip, upperLimb, lowerLimb, arrow);
    group.add(fallback, bowString);

    const muzzle = new THREE.Object3D();
""")
# Invalidate pending GLB loads during detach.
s = s.replace("""  private detach(): void {
    this.socket?.removeFromParent();
""", """  private detach(): void {
    this.assetGeneration += 1;
    this.socket?.removeFromParent();
""")
# Add GLB hydrator before updateBowGeometry.
anchor = "  private updateBowGeometry(): void {"
hydrator = """  private async hydrateWeaponGlb(weaponId: 'shotgun' | 'bow', url: string, generation: number): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(url);
      if (generation !== this.assetGeneration) {
        this.disposeLoadedObject(gltf.scene);
        return;
      }
      const group = this.weaponGroups.get(weaponId);
      if (!group) {
        this.disposeLoadedObject(gltf.scene);
        return;
      }
      gltf.scene.name = `weapon-${weaponId}-glb-visual`;
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = this.shadows;
        object.receiveShadow = false;
        this.geometries.push(object.geometry);
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        this.materials.push(...materials);
      });
      group.add(gltf.scene);
      const fallback = group.getObjectByName(`weapon-${weaponId}-procedural-fallback`);
      if (fallback) fallback.visible = false;
      if (weaponId === 'bow') {
        const arrow = gltf.scene.getObjectByName('bow-arrow-glb');
        if (arrow instanceof THREE.Group) this.bowArrow = arrow;
        this.updateBowGeometry();
      }
    } catch (error) {
      console.warn(`[Facefall] ${weaponId} GLB unavailable; keeping procedural fallback.`, error);
    }
  }

  private disposeLoadedObject(root: THREE.Object3D): void {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
  }

"""
if anchor not in s: raise SystemExit('WeaponSocketVisual bow anchor missing')
s = s.replace(anchor, hydrator + anchor)
p.write_text(s)

# Unit contract: generated weapon GLBs must be valid GLB v2 and contain named authored nodes.
Path('tests/unit/weapon-assets.test.ts').write_text("""import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function glbJson(file: string): any {
  const bytes = readFileSync(resolve(process.cwd(), file));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  const len = bytes.readUInt32LE(12);
  return JSON.parse(bytes.subarray(20, 20 + len).toString('utf8').replace(/[\\u0000\\u0020]+$/g, ''));
}

test('production shotgun and bow/arrow are real GLB assets', () => {
  const shotgun = glbJson('public/assets/weapons/shotgun.glb');
  const bow = glbJson('public/assets/weapons/bow-arrow.glb');
  const shotgunNames = (shotgun.nodes ?? []).map((node: any) => node.name ?? '');
  const bowNames = (bow.nodes ?? []).map((node: any) => node.name ?? '');
  assert.ok(shotgunNames.includes('shotgun-glb-root'));
  assert.ok(bowNames.includes('bow-glb-root'));
  assert.ok(bowNames.includes('bow-arrow-glb'));
});
""")

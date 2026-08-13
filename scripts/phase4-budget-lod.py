from pathlib import Path

# Lazy-load noncritical weapon GLBs only on first selection.
p = Path('src/characters/WeaponSocketVisual.ts')
s = p.read_text()
s = s.replace("  private assetGeneration = 0;\n", "  private assetGeneration = 0;\n  private readonly loadedWeaponAssets = new Set<'shotgun' | 'bow'>();\n  private readonly loadingWeaponAssets = new Set<'shotgun' | 'bow'>();\n")
s = s.replace("""    const generation = ++this.assetGeneration;
    void this.hydrateWeaponGlb('shotgun', '/assets/weapons/shotgun.glb', generation);
    void this.hydrateWeaponGlb('bow', '/assets/weapons/bow-arrow.glb', generation);
    return true;
""", """    this.assetGeneration += 1;
    this.ensureWeaponAsset(this.activeWeapon);
    return true;
""")
s = s.replace("""  setActiveWeapon(weaponId: WeaponId): void {
    this.activeWeapon = weaponId;
""", """  setActiveWeapon(weaponId: WeaponId): void {
    this.activeWeapon = weaponId;
    this.ensureWeaponAsset(weaponId);
""")
anchor = "  private async hydrateWeaponGlb(weaponId: 'shotgun' | 'bow', url: string, generation: number): Promise<void> {"
ensure = """  private ensureWeaponAsset(weaponId: WeaponId): void {
    if (weaponId !== 'shotgun' && weaponId !== 'bow') return;
    if (!this.socket || this.loadedWeaponAssets.has(weaponId) || this.loadingWeaponAssets.has(weaponId)) return;
    this.loadingWeaponAssets.add(weaponId);
    const url = weaponId === 'shotgun' ? '/assets/weapons/shotgun.glb' : '/assets/weapons/bow-arrow.glb';
    const generation = this.assetGeneration;
    void this.hydrateWeaponGlb(weaponId, url, generation).finally(() => this.loadingWeaponAssets.delete(weaponId));
  }

"""
if anchor not in s: raise SystemExit('hydrate anchor missing')
s = s.replace(anchor, ensure + anchor)
s = s.replace("""      group.add(gltf.scene);
      const fallback = group.getObjectByName(`weapon-${weaponId}-procedural-fallback`);
""", """      group.add(gltf.scene);
      this.loadedWeaponAssets.add(weaponId);
      const fallback = group.getObjectByName(`weapon-${weaponId}-procedural-fallback`);
""")
s = s.replace("""    this.weaponGroups.clear();
    this.muzzles.clear();
""", """    this.weaponGroups.clear();
    this.muzzles.clear();
    this.loadedWeaponAssets.clear();
    this.loadingWeaponAssets.clear();
""")
p.write_text(s)

# Distance LOD for production infected: far bodies keep rig/hit proxies but drop wounds/shadows.
p = Path('src/enemies/RiggedWalkerVisual.ts')
s = p.read_text()
s = s.replace("import type { EnemyId } from './archetypes';\n", "import type { EnemyId } from './archetypes';\nimport { ASSET_BUDGET } from '../assets/AssetBudget';\n")
anchor = "export function updateRiggedWalker(root: THREE.Group, speed: number, dt: number): boolean { return updateRiggedInfected(root, speed, dt); }\n"
lod = """
export function setRiggedInfectedLod(root: THREE.Group, distance: number): boolean {
  const runtime = root.userData.riggedInfectedRuntime as InfectedRuntime | undefined;
  if (!runtime) return false;
  const near = distance <= ASSET_BUDGET.infectedNearLodDistance;
  const tier = near ? 'near' : 'far';
  if (root.userData.infectedLodTier === tier) return true;
  root.userData.infectedLodTier = tier;
  runtime.wrapper.traverse((object) => {
    if (object.userData.decorative) object.visible = near;
    if (object instanceof THREE.Mesh && object.userData.visualOnly) object.castShadow = near;
  });
  return true;
}

export function updateRiggedWalker(root: THREE.Group, speed: number, dt: number): boolean { return updateRiggedInfected(root, speed, dt); }
"""
if anchor not in s: raise SystemExit('rigged tail anchor missing')
s = s.replace(anchor, lod)
p.write_text(s)

# Surface LOD function through EnemyVisualFactory.
p = Path('src/enemies/EnemyVisualFactory.ts')
s = p.read_text()
s = s.replace("import { hydrateRiggedInfected, playRiggedInfectedAction, updateRiggedInfected } from './RiggedWalkerVisual';", "import { hydrateRiggedInfected, playRiggedInfectedAction, setRiggedInfectedLod, updateRiggedInfected } from './RiggedWalkerVisual';")
s += "\nexport function updateEnemyVisualLod(root: THREE.Group, distance: number): boolean { return setRiggedInfectedLod(root, distance); }\n"
p.write_text(s)

# Apply LOD only when distance is already computed; no extra spatial work.
p = Path('src/enemies/EnemySystem.ts')
s = p.read_text()
s = s.replace("import { animateEnemyVisual, createEnemyVisual, playEnemyVisualAction } from './EnemyVisualFactory';", "import { animateEnemyVisual, createEnemyVisual, playEnemyVisualAction, updateEnemyVisualLod } from './EnemyVisualFactory';")
s = s.replace("""      const distance = this.offset.length();
      const sightRange = actor.archetype.id === 'runner' ? 30 : actor.archetype.id === 'brute' ? 25 : 27;
""", """      const distance = this.offset.length();
      updateEnemyVisualLod(actor.root, distance);
      const sightRange = actor.archetype.id === 'runner' ? 30 : actor.archetype.id === 'brute' ? 25 : 27;
""")
p.write_text(s)

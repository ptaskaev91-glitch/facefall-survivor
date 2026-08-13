import * as THREE from 'three';
interface CoinActor { root: THREE.Group; amount: number; velocity: THREE.Vector3; life: number; }
export class CoinSystem {
  private readonly coins: CoinActor[] = [];
  private readonly offset = new THREE.Vector3();
  constructor(private readonly scene: THREE.Scene, private readonly collect: (amount: number) => void) {}
  spawn(position: THREE.Vector3, amount: number): void {
    const root = new THREE.Group(); root.name = 'coin-pickup';
    const material = new THREE.MeshStandardMaterial({ color: 0xf5c542, metalness: 0.72, roughness: 0.28 });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.055, 14), material); mesh.rotation.x = Math.PI / 2; root.add(mesh);
    root.position.copy(position).add(new THREE.Vector3(0, 0.75, 0)); this.scene.add(root);
    this.coins.push({ root, amount, velocity: new THREE.Vector3((Math.random() - 0.5) * 1.8, 2.4, (Math.random() - 0.5) * 1.8), life: 20 });
  }
  update(dt: number, player: THREE.Vector3): void {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i]; coin.life -= dt; coin.velocity.y -= 5.4 * dt; coin.root.position.addScaledVector(coin.velocity, dt);
      if (coin.root.position.y < 0.18) { coin.root.position.y = 0.18; coin.velocity.y = Math.abs(coin.velocity.y) * 0.28; coin.velocity.x *= 0.82; coin.velocity.z *= 0.82; }
      coin.root.rotation.y += dt * 5.2; this.offset.copy(coin.root.position).sub(player).setY(0);
      if (this.offset.lengthSq() < 1.35 * 1.35) { this.collect(coin.amount); this.remove(i); } else if (coin.life <= 0) this.remove(i);
    }
  }
  reset(): void { while (this.coins.length) this.remove(this.coins.length - 1); }
  dispose(): void { this.reset(); }
  get activeCount(): number { return this.coins.length; }
  private remove(i: number): void { const [coin] = this.coins.splice(i, 1); coin.root.traverse((object) => { if (!(object instanceof THREE.Mesh)) return; object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; for (const material of materials) material.dispose(); }); coin.root.removeFromParent(); }
}

import * as THREE from 'three';

interface CoinActor {
  root: THREE.Mesh;
  value: number;
  age: number;
}

export class CoinSystem {
  private readonly coins: CoinActor[] = [];
  private readonly geometry = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 14);
  private readonly material = new THREE.MeshStandardMaterial({ color: 0xf0c64f, emissive: 0x6b4e05, emissiveIntensity: 0.28, roughness: 0.36, metalness: 0.7 });
  private readonly temp = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene, private readonly onCollect: (value: number) => void) {}

  spawn(position: THREE.Vector3, value = 1): void {
    const root = new THREE.Mesh(this.geometry, this.material);
    root.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.32, (Math.random() - 0.5) * 0.5));
    root.rotation.x = Math.PI / 2;
    root.castShadow = true;
    this.scene.add(root);
    this.coins.push({ root, value: Math.max(1, Math.floor(value)), age: 0 });
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    for (let index = this.coins.length - 1; index >= 0; index--) {
      const coin = this.coins[index];
      coin.age += dt;
      coin.root.rotation.z += dt * 4.2;
      coin.root.position.y += Math.sin((coin.age + index) * 4) * dt * 0.05;
      this.temp.copy(coin.root.position).sub(playerPosition);
      this.temp.y = 0;
      const distance = this.temp.length();
      if (distance < 3.2 && distance > 0.08) coin.root.position.addScaledVector(this.temp.normalize(), -dt * (5.5 + (3.2 - distance) * 4));
      if (distance <= 0.85) {
        this.onCollect(coin.value);
        coin.root.removeFromParent();
        this.coins.splice(index, 1);
        continue;
      }
      if (coin.age > 28) {
        coin.root.removeFromParent();
        this.coins.splice(index, 1);
      }
    }
  }

  reset(): void { for (const coin of this.coins) coin.root.removeFromParent(); this.coins.length = 0; }
  dispose(): void { this.reset(); this.geometry.dispose(); this.material.dispose(); }
  get activeCount(): number { return this.coins.length; }
}

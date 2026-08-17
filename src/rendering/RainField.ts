import * as THREE from 'three';
import type { QualityProfile } from '../graphics/quality';

export class RainField {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly speeds: Float32Array;
  private readonly count: number;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material: THREE.PointsMaterial;
  private intensity = 1;
  private activeCount: number;

  constructor(scene: THREE.Scene, quality: QualityProfile) {
    this.count = quality.id === 'mobile-low' ? 420 : quality.id === 'mobile-high' ? 760 : 1200;
    this.activeCount = this.count;
    this.positions = new Float32Array(this.count * 3);
    this.speeds = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) this.resetDrop(i, new THREE.Vector3());

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setDrawRange(0, this.activeCount);
    this.material = new THREE.PointsMaterial({
      color: 0xbcd0c5,
      size: quality.id === 'desktop-high' ? 0.055 : 0.045,
      transparent: true,
      opacity: quality.id === 'mobile-low' ? 0.42 : 0.5,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  setIntensity(value: number): void {
    const next = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
    if (Math.abs(next - this.intensity) < 0.005) return;
    this.intensity = next;
    this.activeCount = Math.max(0, Math.floor(this.count * next));
    this.geometry.setDrawRange(0, this.activeCount);
    this.material.opacity = 0.12 + next * 0.4;
    this.points.visible = this.activeCount > 0;
  }

  get currentIntensity(): number { return this.intensity; }

  update(dt: number, anchor: THREE.Vector3): void {
    if (!this.points.visible || this.activeCount <= 0) return;
    const wind = 0.4 + this.intensity * 0.55;
    for (let i = 0; i < this.activeCount; i++) {
      const offset = i * 3;
      this.positions[offset] += dt * wind;
      this.positions[offset + 1] -= this.speeds[i] * dt;
      this.positions[offset + 2] += dt * 0.2;

      const dx = this.positions[offset] - anchor.x;
      const dz = this.positions[offset + 2] - anchor.z;
      if (this.positions[offset + 1] < anchor.y - 0.5 || Math.abs(dx) > 19 || Math.abs(dz) > 19) {
        this.resetDrop(i, anchor);
      }
    }
    const attribute = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.needsUpdate = true;
  }

  dispose(): void {
    this.points.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }

  private resetDrop(index: number, anchor: THREE.Vector3): void {
    const offset = index * 3;
    this.positions[offset] = anchor.x + (Math.random() - 0.5) * 36;
    this.positions[offset + 1] = anchor.y + 4 + Math.random() * 16;
    this.positions[offset + 2] = anchor.z + (Math.random() - 0.5) * 36;
    this.speeds[index] = 10 + Math.random() * 10;
  }
}

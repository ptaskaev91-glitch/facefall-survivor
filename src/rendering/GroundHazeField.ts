import * as THREE from 'three';
import type { QualityProfile } from '../graphics/quality';

/**
 * One-draw-call ground haze used with scene fog. This is intentionally not
 * volumetric fog: a small points buffer gives mobile-friendly low mist motion.
 */
export class GroundHazeField {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly drift: Float32Array;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material: THREE.PointsMaterial;
  private readonly texture: THREE.CanvasTexture;
  private readonly count: number;
  private intensity = 0;

  constructor(scene: THREE.Scene, quality: QualityProfile) {
    this.count = quality.id === 'mobile-low' ? 24 : quality.id === 'mobile-high' ? 36 : 52;
    this.positions = new Float32Array(this.count * 3);
    this.drift = new Float32Array(this.count * 2);
    for (let i = 0; i < this.count; i += 1) this.reset(i, new THREE.Vector3());

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.texture = this.makeTexture();
    this.material = new THREE.PointsMaterial({
      color: 0x91a69b,
      map: this.texture,
      alphaMap: this.texture,
      size: quality.id === 'desktop-high' ? 8.5 : 6.4,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
      fog: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    this.points.visible = false;
    scene.add(this.points);
  }

  setIntensity(value: number, color = 0x91a69b): void {
    this.intensity = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
    this.material.color.setHex(color);
    this.material.opacity = this.intensity * 0.24;
    this.points.visible = this.intensity > 0.025;
  }

  update(dt: number, anchor: THREE.Vector3): void {
    if (!this.points.visible) return;
    const speed = 0.32 + this.intensity * 0.36;
    for (let i = 0; i < this.count; i += 1) {
      const offset = i * 3;
      const driftOffset = i * 2;
      this.positions[offset] += this.drift[driftOffset] * dt * speed;
      this.positions[offset + 2] += this.drift[driftOffset + 1] * dt * speed;
      const dx = this.positions[offset] - anchor.x;
      const dz = this.positions[offset + 2] - anchor.z;
      if (Math.abs(dx) > 22 || Math.abs(dz) > 22) this.reset(i, anchor);
    }
    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.points.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }

  private reset(index: number, anchor: THREE.Vector3): void {
    const offset = index * 3;
    const driftOffset = index * 2;
    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.sqrt(Math.random()) * 20;
    this.positions[offset] = anchor.x + Math.cos(angle) * radius;
    this.positions[offset + 1] = anchor.y + 0.25 + Math.random() * 1.2;
    this.positions[offset + 2] = anchor.z + Math.sin(angle) * radius;
    this.drift[driftOffset] = 0.25 + Math.random() * 0.65;
    this.drift[driftOffset + 1] = (Math.random() - 0.5) * 0.45;
  }

  private makeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D unavailable for haze texture');
    const gradient = context.createRadialGradient(32, 32, 3, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(255,255,255,.52)');
    gradient.addColorStop(0.42, 'rgba(255,255,255,.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }
}

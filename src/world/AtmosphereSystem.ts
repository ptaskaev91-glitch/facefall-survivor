import * as THREE from 'three';
import { GroundHazeField } from '../rendering/GroundHazeField';
import { RainField } from '../rendering/RainField';
import { StormSystem } from '../rendering/StormSystem';
import { ATMOSPHERE_PRESETS, type AtmosphereId, type AtmospherePreset, bloodMoonVisibility } from './AtmospherePresets';

interface AtmosphereDependencies {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  hemisphere: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  rain: RainField;
  storm: StormSystem;
  haze: GroundHazeField;
}

/**
 * Owns presentation-only time/weather state. It never changes AI perception,
 * collision, hit proxies or damage rules.
 */
export class AtmosphereSystem {
  private readonly background = new THREE.Color();
  private readonly fogColor = new THREE.Color();
  private readonly hemiSky = new THREE.Color();
  private readonly hemiGround = new THREE.Color();
  private readonly keyColor = new THREE.Color();
  private readonly keyTargetPosition = new THREE.Vector3();
  private readonly skyForward = new THREE.Vector3();
  private readonly skyRight = new THREE.Vector3();
  private readonly skyUp = new THREE.Vector3(0, 1, 0);
  private readonly moon: THREE.Sprite;
  private readonly moonMaterial: THREE.SpriteMaterial;
  private readonly moonTexture: THREE.CanvasTexture;
  private targetId: AtmosphereId = 'dawn';
  private appliedId: AtmosphereId = 'dawn';
  private rainIntensity = ATMOSPHERE_PRESETS.dawn.rainIntensity;
  private stormIntensity = ATMOSPHERE_PRESETS.dawn.stormIntensity;
  private hazeIntensity = ATMOSPHERE_PRESETS.dawn.hazeIntensity;
  private moonOpacity = 0;

  constructor(private readonly deps: AtmosphereDependencies) {
    this.moonTexture = this.makeBloodMoonTexture();
    this.moonMaterial = new THREE.SpriteMaterial({
      map: this.moonTexture,
      color: 0xffc0a0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false,
    });
    this.moon = new THREE.Sprite(this.moonMaterial);
    this.moon.name = 'blood-moon-sky';
    this.moon.scale.set(18, 18, 1);
    this.moon.frustumCulled = false;
    this.moon.renderOrder = -100;
    this.deps.scene.add(this.moon);
    this.applyImmediate('dawn');
  }

  get currentId(): AtmosphereId { return this.appliedId; }
  get target(): AtmosphereId { return this.targetId; }
  get isBloodMoon(): boolean { return this.targetId === 'blood-moon'; }

  setPreset(id: AtmosphereId, immediate = false): void {
    this.targetId = id;
    if (immediate) this.applyImmediate(id);
  }

  /** Presentation readability only. AI LOS intentionally ignores this value. */
  visibilityAtDistance(distance: number): number {
    return this.targetId === 'blood-moon' ? bloodMoonVisibility(distance) : 1;
  }

  update(dt: number): void {
    const target = ATMOSPHERE_PRESETS[this.targetId];
    const alpha = 1 - Math.exp(-Math.max(0, dt) * 1.15);
    this.lerpScene(target, alpha);

    this.rainIntensity = THREE.MathUtils.lerp(this.rainIntensity, target.rainIntensity, alpha);
    this.stormIntensity = THREE.MathUtils.lerp(this.stormIntensity, target.stormIntensity, alpha);
    this.hazeIntensity = THREE.MathUtils.lerp(this.hazeIntensity, target.hazeIntensity, alpha);
    this.moonOpacity = THREE.MathUtils.lerp(this.moonOpacity, target.moonOpacity, alpha);

    this.deps.rain.setIntensity(this.rainIntensity);
    this.deps.storm.setActivity(this.stormIntensity);
    this.deps.haze.setIntensity(this.hazeIntensity, this.currentFogHex());
    this.moonMaterial.opacity = this.moonOpacity;
    this.moon.visible = this.moonOpacity > 0.01;

    if (this.closeEnough(target)) this.appliedId = this.targetId;
  }

  updateSkyPosition(): void {
    if (!this.moon.visible) return;
    const camera = this.deps.camera;
    camera.getWorldDirection(this.skyForward);
    this.skyRight.crossVectors(this.skyForward, this.skyUp).normalize();
    this.moon.position.copy(camera.position)
      .addScaledVector(this.skyForward, 105)
      .addScaledVector(this.skyRight, -38)
      .addScaledVector(this.skyUp, 31);
  }

  dispose(): void {
    this.moon.removeFromParent();
    this.moonMaterial.dispose();
    this.moonTexture.dispose();
  }

  private applyImmediate(id: AtmosphereId): void {
    const preset = ATMOSPHERE_PRESETS[id];
    const sceneBackground = this.ensureBackground();
    sceneBackground.setHex(preset.background);
    const fog = this.ensureFog();
    fog.color.setHex(preset.fogColor);
    fog.density = preset.fogDensity;
    this.deps.hemisphere.color.setHex(preset.hemisphereSky);
    this.deps.hemisphere.groundColor.setHex(preset.hemisphereGround);
    this.deps.hemisphere.intensity = preset.hemisphereIntensity;
    this.deps.key.color.setHex(preset.keyColor);
    this.deps.key.intensity = preset.keyIntensity;
    this.deps.key.position.set(...preset.keyPosition);
    this.deps.renderer.toneMappingExposure = preset.exposure;
    this.rainIntensity = preset.rainIntensity;
    this.stormIntensity = preset.stormIntensity;
    this.hazeIntensity = preset.hazeIntensity;
    this.moonOpacity = preset.moonOpacity;
    this.deps.rain.setIntensity(this.rainIntensity);
    this.deps.storm.setActivity(this.stormIntensity);
    this.deps.haze.setIntensity(this.hazeIntensity, preset.fogColor);
    this.moonMaterial.opacity = this.moonOpacity;
    this.moon.visible = this.moonOpacity > 0.01;
    this.targetId = id;
    this.appliedId = id;
  }

  private lerpScene(target: AtmospherePreset, alpha: number): void {
    const sceneBackground = this.ensureBackground();
    this.background.setHex(target.background);
    sceneBackground.lerp(this.background, alpha);

    const fog = this.ensureFog();
    this.fogColor.setHex(target.fogColor);
    fog.color.lerp(this.fogColor, alpha);
    fog.density = THREE.MathUtils.lerp(fog.density, target.fogDensity, alpha);

    this.hemiSky.setHex(target.hemisphereSky);
    this.hemiGround.setHex(target.hemisphereGround);
    this.keyColor.setHex(target.keyColor);
    this.keyTargetPosition.set(...target.keyPosition);
    this.deps.hemisphere.color.lerp(this.hemiSky, alpha);
    this.deps.hemisphere.groundColor.lerp(this.hemiGround, alpha);
    this.deps.hemisphere.intensity = THREE.MathUtils.lerp(this.deps.hemisphere.intensity, target.hemisphereIntensity, alpha);
    this.deps.key.color.lerp(this.keyColor, alpha);
    this.deps.key.intensity = THREE.MathUtils.lerp(this.deps.key.intensity, target.keyIntensity, alpha);
    this.deps.key.position.lerp(this.keyTargetPosition, alpha);
    this.deps.renderer.toneMappingExposure = THREE.MathUtils.lerp(this.deps.renderer.toneMappingExposure, target.exposure, alpha);
  }

  private closeEnough(target: AtmospherePreset): boolean {
    const fog = this.ensureFog();
    return Math.abs(fog.density - target.fogDensity) < 0.0005
      && Math.abs(this.rainIntensity - target.rainIntensity) < 0.02
      && Math.abs(this.moonOpacity - target.moonOpacity) < 0.02;
  }

  private currentFogHex(): number {
    return this.ensureFog().color.getHex();
  }

  private ensureBackground(): THREE.Color {
    if (!(this.deps.scene.background instanceof THREE.Color)) this.deps.scene.background = new THREE.Color(0x07100b);
    return this.deps.scene.background;
  }

  private ensureFog(): THREE.FogExp2 {
    if (!(this.deps.scene.fog instanceof THREE.FogExp2)) this.deps.scene.fog = new THREE.FogExp2(0x0b1610, 0.015);
    return this.deps.scene.fog;
  }

  private makeBloodMoonTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D unavailable for blood moon texture');

    const glow = context.createRadialGradient(64, 64, 18, 64, 64, 62);
    glow.addColorStop(0, 'rgba(255,116,88,1)');
    glow.addColorStop(0.5, 'rgba(213,38,48,.98)');
    glow.addColorStop(0.78, 'rgba(121,10,22,.82)');
    glow.addColorStop(1, 'rgba(85,0,15,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, 128, 128);

    context.globalCompositeOperation = 'multiply';
    context.fillStyle = 'rgba(56,5,12,.25)';
    for (const [x, y, r] of [[43, 47, 8], [78, 38, 5], [83, 73, 9], [50, 82, 4], [64, 58, 3]] as const) {
      context.beginPath();
      context.arc(x, y, r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }
}

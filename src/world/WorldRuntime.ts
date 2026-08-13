import * as THREE from 'three';
import { CameraCollision } from '../camera/CameraCollision';
import { CameraDirector, type CameraMode } from '../camera/CameraDirector';
import type { FacefallEvents } from '../combat/types';
import { EventBus } from '../core/EventBus';
import type { QualityProfile } from '../graphics/quality';
import { CollisionWorld } from '../physics/CollisionWorld';
import { RainField } from '../rendering/RainField';
import { StormSystem } from '../rendering/StormSystem';
import { AssetManager } from './AssetManager';
import { GrassField } from './GrassField';
import { LevelLoader } from './LevelLoader';
import type { LevelManifest, LevelMarker } from './LevelManifest';

/**
 * Owns renderer, scene, static collision and environment lifecycle.
 * Gameplay systems may query scene/camera/collision but do not construct them.
 */
export class WorldRuntime {
  readonly scene = new THREE.Scene();
  readonly collisionWorld = new CollisionWorld();
  readonly camera: THREE.PerspectiveCamera;
  readonly cameraRig: CameraDirector;
  readonly renderer: THREE.WebGLRenderer;

  private readonly staticWorld = new THREE.Group();
  private readonly grass: GrassField;
  private readonly rain: RainField;
  private readonly storm: StormSystem;
  private readonly assets = new AssetManager();
  private readonly levelLoader = new LevelLoader(this.assets, this.collisionWorld);
  private readonly levelLights: THREE.Light[] = [];

  constructor(appElement: HTMLElement, readonly quality: QualityProfile, events: EventBus<FacefallEvents>) {
    this.renderer = this.createRenderer(appElement);
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.08, 220);
    this.cameraRig = new CameraDirector(this.camera);
    this.cameraRig.setCollision(new CameraCollision(this.collisionWorld));
    this.grass = new GrassField(quality);
    this.rain = new RainField(this.scene, quality);
    this.storm = new StormSystem(this.scene, events);
    this.configureScene();
    this.createFallbackGeometry();
  }

  setCameraMode(mode: CameraMode): void { this.cameraRig.setMode(mode); }

  updateSimulation(dt: number): void { this.storm.update(dt); }

  updateFrame(playerPosition: THREE.Vector3, facing: THREE.Vector3, dt: number): void {
    this.cameraRig.update(playerPosition, facing, dt);
    this.grass.update(this.camera.position);
    this.rain.update(dt, playerPosition);
  }

  render(): void { this.renderer.render(this.scene, this.camera); }

  resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio));
  }

  async loadManifest(): Promise<{ manifest: LevelManifest; levelId: string }> {
    try {
      const loaded = await this.levelLoader.load({ glbUrl: '/assets/levels/abandoned-outskirts/level.glb', manifestUrl: '/assets/levels/abandoned-outskirts/level.manifest.json', shadows: this.quality.shadows });
      AssetManager.disposeObject(this.staticWorld);
      this.staticWorld.clear();
      this.staticWorld.add(loaded.root);
      this.applyManifestLights(loaded.manifest);
      return { manifest: loaded.manifest, levelId: loaded.manifest.id };
    } catch (error) {
      console.warn('Facefall: manifest load failed, keeping procedural fallback', error);
      const manifest = this.fallbackManifest();
      this.applyManifestLights(manifest);
      return { manifest, levelId: 'lab-fallback' };
    }
  }

  dispose(): void {
    for (const light of this.levelLights.splice(0)) light.removeFromParent();
    this.rain.dispose();
    this.storm.dispose();
    this.assets.clearCache();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
    this.renderer.dispose();
  }

  private createRenderer(appElement: HTMLElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: this.quality.antialias, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = this.quality.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    appElement.replaceChildren(renderer.domElement);
    return renderer;
  }

  private configureScene(): void {
    this.scene.background = new THREE.Color(0x07100b);
    this.scene.fog = new THREE.FogExp2(0x0b1610, this.quality.fogDensity);
    this.scene.add(new THREE.HemisphereLight(0xc6d4c7, 0x172019, 1.5));
    const moon = new THREE.DirectionalLight(0xdbe8df, 2.0);
    moon.position.set(-18, 32, -12);
    moon.castShadow = this.quality.shadows;
    moon.shadow.mapSize.set(this.quality.shadowMapSize, this.quality.shadowMapSize);
    this.scene.add(moon);
    this.scene.add(this.staticWorld);
    this.scene.add(this.grass.group);
  }

  private createFallbackGeometry(): void {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), new THREE.MeshStandardMaterial({ color: 0x273827, roughness: 0.96 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.staticWorld.add(ground);
    const road = new THREE.Mesh(new THREE.BoxGeometry(13, 0.08, 92), new THREE.MeshStandardMaterial({ color: 0x303735, roughness: 0.48, metalness: 0.08 }));
    road.position.set(0, -0.03, 0);
    road.receiveShadow = true;
    this.staticWorld.add(road);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x41483f, roughness: 0.9 });
    for (const [x, z, sx, sz] of [[-11, -8, 8, 5], [12, 10, 7, 6], [-14, 18, 5, 8]] as const) {
      const obstacle = new THREE.Mesh(new THREE.BoxGeometry(sx, 3.2, sz), wallMaterial);
      obstacle.position.set(x, 1.6, z);
      obstacle.castShadow = this.quality.shadows;
      obstacle.receiveShadow = true;
      this.staticWorld.add(obstacle);
    }
    this.collisionWorld.rebuild(this.staticWorld);
  }

  private applyManifestLights(manifest: LevelManifest): void {
    for (const light of this.levelLights.splice(0)) light.removeFromParent();
    for (const marker of manifest.markers.filter((item) => item.kind === 'light')) {
      const intensity = typeof marker.data?.intensity === 'number' ? marker.data.intensity : 6;
      const distance = typeof marker.data?.distance === 'number' ? marker.data.distance : 14;
      const warm = marker.data?.warm === true;
      const light = new THREE.PointLight(warm ? 0xffc56e : 0xcbd8ff, intensity, distance, 2);
      light.position.set(marker.position.x, marker.position.y, marker.position.z);
      this.scene.add(light);
      this.levelLights.push(light);
    }
  }

  private fallbackManifest(): LevelManifest {
    const markers: LevelMarker[] = [
      { id: 'fallback-player', kind: 'player-spawn', position: { x: 0, y: 0, z: 10 }, rotationY: Math.PI },
      { id: 'fallback-north', kind: 'enemy-spawn', position: { x: 0, y: 0, z: -28 }, radius: 5 },
      { id: 'fallback-west', kind: 'enemy-spawn', position: { x: -24, y: 0, z: -8 }, radius: 6 },
      { id: 'fallback-east', kind: 'enemy-spawn', position: { x: 24, y: 0, z: 8 }, radius: 6 },
      { id: 'fallback-health', kind: 'loot', position: { x: 4, y: 0, z: 4 }, data: { type: 'health', amount: 35 } },
      { id: 'fallback-ammo', kind: 'loot', position: { x: -6, y: 0, z: 1 }, data: { type: 'ammo', amount: 24 } }
    ];
    return { id: 'lab-fallback', name: 'Lab Fallback', version: 1, markers };
  }
}

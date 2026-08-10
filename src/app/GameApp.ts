import * as THREE from 'three';
import { CameraCollision } from '../camera/CameraCollision';
import { CameraDirector, type CameraMode } from '../camera/CameraDirector';
import { DamageSystem } from '../combat/DamageSystem';
import { Health } from '../combat/Health';
import { ProjectileSystem, type ProjectileCollision } from '../combat/ProjectileSystem';
import { ProjectileVisuals } from '../combat/ProjectileVisuals';
import type { FacefallEvents, HitZone } from '../combat/types';
import { WEAPONS } from '../combat/weapons';
import { WeaponSystem } from '../combat/WeaponSystem';
import { EventBus } from '../core/EventBus';
import { GameLoop } from '../core/GameLoop';
import { EffectSystem } from '../effects/EffectSystem';
import { LightPool } from '../effects/LightPool';
import { EFFECTS } from '../effects/recipes';
import { RuntimeFx } from '../effects/RuntimeFx';
import { ENEMY_ARCHETYPES } from '../enemies/archetypes';
import { detectQuality, type QualityProfile } from '../graphics/quality';
import { InputManager } from '../input/InputManager';
import { KeyboardMouseInput } from '../input/KeyboardMouseInput';
import { TouchInput } from '../input/TouchInput';
import { CollisionWorld } from '../physics/CollisionWorld';
import { PlayerCapsule } from '../physics/PlayerCapsule';
import { SpatialHash, type SpatialHashItem } from '../physics/SpatialHash';
import { AssetManager } from '../world/AssetManager';
import { GrassField } from '../world/GrassField';
import { LevelLoader } from '../world/LevelLoader';
import type { LevelManifest } from '../world/LevelManifest';
import { GameStateController } from './GameState';

export interface GameAppDom {
  app: HTMLDivElement;
  status: HTMLDivElement;
  topButton: HTMLButtonElement;
  thirdButton: HTMLButtonElement;
  joystick?: HTMLElement;
  stick?: HTMLElement;
  touchFire?: HTMLElement;
  touchReload?: HTMLElement;
  touchWeapon?: HTMLElement;
  touchCamera?: HTMLElement;
}

interface EnemySpatialItem extends SpatialHashItem {
  root: THREE.Object3D;
}

export class GameApp {
  readonly state = new GameStateController();

  private readonly quality: QualityProfile;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly cameraRig: CameraDirector;
  private readonly staticWorld = new THREE.Group();
  private readonly collisionWorld = new CollisionWorld();
  private readonly playerController = new PlayerCapsule();
  private readonly grass: GrassField;
  private readonly assets = new AssetManager();
  private readonly levelLoader = new LevelLoader(this.assets, this.collisionWorld);

  private readonly events = new EventBus<FacefallEvents>();
  private readonly weaponSystem = new WeaponSystem(this.events);
  private readonly damageSystem = new DamageSystem(this.events);
  private readonly input = new InputManager();
  private readonly keyboard: KeyboardMouseInput;
  private touch: TouchInput | null = null;

  private readonly lightPool: LightPool;
  private readonly runtimeFx: RuntimeFx;
  private readonly effects: EffectSystem;
  private readonly projectileSystem: ProjectileSystem;
  private readonly projectileVisuals: ProjectileVisuals;
  private readonly enemySpatial = new SpatialHash<EnemySpatialItem>(4);
  private readonly enemySpatialItems = new Map<string, EnemySpatialItem>();

  private readonly player = new THREE.Group();
  private readonly facing = new THREE.Vector3(0, 0, -1);
  private readonly move = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly temp = new THREE.Vector3();
  private readonly muzzle = new THREE.Vector3();
  private readonly aimPoint = new THREE.Vector3();
  private readonly aimDirection = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly aimNdc = new THREE.Vector2();
  private readonly aimPlane = new THREE.Plane(this.up, 0);
  private readonly raycaster = new THREE.Raycaster();
  private readonly enemyMeshes: THREE.Object3D[] = [];
  private readonly enemyRoots = new Map<string, THREE.Object3D>();
  private readonly unsubscribeEvents: Array<() => void> = [];

  private readonly loop: GameLoop;
  private cameraMode: CameraMode = 'top';
  private statusRefresh = 0;
  private disposed = false;
  private levelId = 'lab-fallback';

  constructor(private readonly dom: GameAppDom) {
    this.quality = detectQuality();
    this.renderer = this.createRenderer();
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.08, 220);
    this.cameraRig = new CameraDirector(this.camera);
    this.cameraRig.setCollision(new CameraCollision(this.collisionWorld));
    this.grass = new GrassField(this.quality);
    this.keyboard = new KeyboardMouseInput(this.input);
    this.lightPool = new LightPool(this.scene, Math.max(1, this.quality.maxDynamicLights));
    this.runtimeFx = new RuntimeFx(
      this.scene,
      this.quality.id === 'mobile-low' ? 220 : 360,
      this.quality.id === 'mobile-low' ? 48 : 80
    );
    this.effects = new EffectSystem({
      ...this.runtimeFx.adapters,
      spawnLight: (recipe, context) => {
        this.lightPool.spawn({
          color: recipe.color,
          intensity: recipe.intensity,
          distance: recipe.distance,
          lifetime: recipe.lifetime,
          position: context.origin
        });
      }
    });
    this.projectileSystem = new ProjectileSystem(
      this.damageSystem,
      (from, to) => this.queryProjectileCollision(from, to),
      this.quality.id === 'mobile-low' ? 32 : 48
    );
    this.projectileVisuals = new ProjectileVisuals(this.scene, this.quality.id === 'mobile-low' ? 32 : 48);

    this.configureScene();
    this.createWorldGeometry();
    this.createPlayer();
    this.createEnemies();
    this.bindCombatEvents();
    this.bindUi();

    this.loop = new GameLoop({
      fixedUpdate: (dt) => this.fixedUpdate(dt),
      render: (_alpha, frameDt) => this.render(frameDt)
    }, {
      fixedStep: 1 / 60,
      maxFrameDelta: 0.1,
      maxSubSteps: 5
    });
  }

  async start(): Promise<void> {
    if (this.disposed) throw new Error('Cannot start a disposed GameApp');
    if (!this.state.is('boot') && !this.state.is('error')) return;

    this.state.transition('loading');
    this.dom.status.textContent = 'ENGINE NEXT · загружаем manifest уровня…';

    try {
      await this.loadLevelManifest();
      this.keyboard.attach();
      this.attachTouchInput();
      window.addEventListener('resize', this.onResize);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.setCameraMode('top');
      this.refreshStatus();
      this.state.transition('playing');
      this.loop.start();
    } catch (error) {
      this.state.transition('error');
      throw error;
    }
  }

  pause(): void {
    if (!this.state.is('playing')) return;
    this.loop.stop();
    this.input.reset();
    this.state.transition('paused');
    this.refreshStatus();
  }

  resume(): void {
    if (!this.state.is('paused')) return;
    this.state.transition('playing');
    this.loop.start();
    this.refreshStatus();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.loop.stop();
    this.keyboard.detach();
    this.touch?.detach();
    this.touch = null;
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    for (const unsubscribe of this.unsubscribeEvents.splice(0)) unsubscribe();

    this.projectileVisuals.dispose();
    this.runtimeFx.dispose();
    this.lightPool.dispose();
    this.enemySpatial.clear();
    this.assets.clearCache();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });

    this.renderer.dispose();
    this.dom.app.replaceChildren();
    if (!this.state.is('disposed')) this.state.transition('disposed');
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: this.quality.antialias,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = this.quality.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.dom.app.replaceChildren(renderer.domElement);
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

  private createWorldGeometry(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 110, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x273827, roughness: 0.96 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.staticWorld.add(ground);

    const road = new THREE.Mesh(
      new THREE.BoxGeometry(13, 0.08, 92),
      new THREE.MeshStandardMaterial({ color: 0x303735, roughness: 0.48, metalness: 0.08 })
    );
    road.position.set(0, -0.03, 0);
    road.receiveShadow = true;
    this.staticWorld.add(road);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x41483f, roughness: 0.9 });
    for (const [x, z, sx, sz] of [
      [-11, -8, 8, 5],
      [12, 10, 7, 6],
      [-14, 18, 5, 8]
    ] as const) {
      const obstacle = new THREE.Mesh(new THREE.BoxGeometry(sx, 3.2, sz), wallMaterial);
      obstacle.position.set(x, 1.6, z);
      obstacle.castShadow = this.quality.shadows;
      obstacle.receiveShadow = true;
      this.staticWorld.add(obstacle);
    }

    this.collisionWorld.rebuild(this.staticWorld);
  }

  private createPlayer(): void {
    const marker = this.makeCapsuleMarker(0.36, 0.85, 0x8d9c8d);
    const weaponMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.1, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x1f2421, roughness: 0.32, metalness: 0.65 })
    );
    weaponMesh.position.set(0.32, 1.18, -0.52);
    marker.add(weaponMesh);
    this.player.add(marker);
    this.scene.add(this.player);
  }

  private createEnemies(): void {
    for (const [i, enemy] of Object.values(ENEMY_ARCHETYPES).entries()) {
      const id = `enemy-${enemy.id}-${i}`;
      const radius = enemy.id === 'brute' ? 0.55 : 0.34;
      const length = enemy.id === 'brute' ? 1.15 : 0.82;
      const color = enemy.id === 'brute' ? 0x765246 : enemy.id === 'runner' ? 0x725b4a : 0x66564d;
      const mesh = this.makeCapsuleMarker(radius, length, color);
      mesh.position.set(-4 + i * 4.2, 0, -8 - i * 2.5);
      const scale = enemy.id === 'runner' ? 0.88 : enemy.id === 'brute' ? 1.18 : 1;
      mesh.scale.setScalar(scale);
      mesh.traverse((object) => { object.userData.damageTargetId = id; });
      this.scene.add(mesh);
      this.enemyMeshes.push(mesh);
      this.enemyRoots.set(id, mesh);
      this.damageSystem.register({ id, health: new Health(enemy.health) });

      const spatialItem: EnemySpatialItem = { id, position: mesh.position, root: mesh };
      this.enemySpatialItems.set(id, spatialItem);
      this.enemySpatial.insert(spatialItem);
    }
  }

  private bindCombatEvents(): void {
    this.unsubscribeEvents.push(this.events.on('shot', (shot) => {
      this.effects.play(`${shot.weaponId}-shot`, { origin: shot.origin, direction: shot.direction });

      const definition = WEAPONS[shot.weaponId];
      if (definition.fireModel === 'projectile') {
        this.projectileSystem.spawnFromShot(shot);
        return;
      }

      for (let pellet = 0; pellet < definition.pellets; pellet++) {
        const direction = this.spreadDirection(shot.direction, definition.spread);
        this.raycaster.set(shot.origin, direction);
        this.raycaster.far = 70;
        const intersections = this.raycaster.intersectObjects(this.enemyMeshes, true);
        const intersection = intersections.find((entry) => entry.object.visible && entry.object.userData.damageTargetId);
        if (!intersection) continue;

        const worldHit = this.collisionWorld.raycast(shot.origin, direction, intersection.distance);
        if (worldHit && worldHit.distance < intersection.distance) continue;

        const targetId = intersection.object.userData.damageTargetId as string;
        const hitZone = this.getHitZone(intersection.object, intersection.point);
        const multiplier = hitZone === 'head'
          ? definition.headMultiplier
          : hitZone === 'limb'
            ? definition.limbMultiplier
            : 1;

        this.damageSystem.apply({
          amount: definition.damage * multiplier,
          kind: shot.weaponId === 'shotgun' ? 'pellet' : 'bullet',
          sourceId: shot.sourceId,
          targetId,
          hitPoint: intersection.point.clone(),
          direction: direction.clone(),
          impulse: definition.impulse,
          hitZone,
          critical: hitZone === 'head'
        });
      }
    }));

    this.unsubscribeEvents.push(this.events.on('hit', (hit) => {
      this.effects.play(hit.critical || hit.amount >= 60 ? 'flesh-hit-heavy' : 'flesh-hit', {
        origin: hit.hitPoint,
        direction: hit.direction,
        parent: this.scene
      });
      this.dom.status.dataset.lastEvent = `${hit.hitZone.toUpperCase()} ${Math.round(hit.amount)} DMG`;
      this.refreshStatus();
    }));

    this.unsubscribeEvents.push(this.events.on('kill', (hit) => {
      const root = this.enemyRoots.get(hit.targetId);
      if (root) root.visible = false;
      const spatial = this.enemySpatialItems.get(hit.targetId);
      if (spatial) this.enemySpatial.remove(spatial);
      this.dom.status.dataset.lastEvent = `KILL ${hit.targetId}`;
      this.refreshStatus();
    }));
  }

  private bindUi(): void {
    this.dom.topButton.addEventListener('click', this.onTopCamera);
    this.dom.thirdButton.addEventListener('click', this.onThirdCamera);
  }

  private attachTouchInput(): void {
    const { joystick, stick, touchFire } = this.dom;
    if (!joystick || !stick || !touchFire || this.touch) return;

    this.touch = new TouchInput(this.input, {
      joystick,
      stick,
      fire: touchFire,
      aimSurface: this.renderer.domElement,
      reload: this.dom.touchReload,
      switchWeapon: this.dom.touchWeapon,
      toggleCamera: this.dom.touchCamera
    });
    this.touch.attach();
  }

  private fixedUpdate(dt: number): void {
    if (!this.state.is('playing')) return;

    const controls = this.input.snapshot();
    this.desired.set(controls.moveX, 0, controls.moveY);

    this.updateAim(controls, dt);

    if (this.cameraMode === 'top' && !controls.hasPointer && this.desired.lengthSq() > 0) {
      this.desired.normalize();
      this.facing.lerp(this.temp.copy(this.desired), 1 - Math.exp(-dt * 12)).normalize();
    }

    const targetSpeed = this.desired.lengthSq() > 0 ? (controls.sprint ? 7.1 : 5.0) : 0;
    if (this.desired.lengthSq() > 0) this.desired.normalize();
    this.move.copy(this.desired).multiplyScalar(targetSpeed);
    this.playerController.moveToward(this.move, dt);
    this.playerController.integrate(dt, this.collisionWorld);

    this.player.position.set(
      this.playerController.position.x,
      this.playerController.position.y - 0.35,
      this.playerController.position.z
    );
    this.player.rotation.y = Math.atan2(-this.facing.x, -this.facing.z);

    this.weaponSystem.update(dt);
    this.projectileSystem.update(dt);
    this.effects.update(dt);
    this.runtimeFx.update(dt);
    this.lightPool.update(dt);

    if (this.input.consumePressed('toggleCamera')) this.setCameraMode(this.cameraMode === 'top' ? 'third' : 'top');
    if (this.input.consumePressed('switchWeapon')) this.weaponSystem.cycle();
    if (this.input.consumePressed('reload')) this.weaponSystem.reload();
    if (controls.fire) {
      this.muzzle.copy(this.player.position).add(this.temp.set(0, 1.15, 0)).addScaledVector(this.facing, 0.5);
      this.weaponSystem.fire('player', this.muzzle, this.facing);
    }

    this.statusRefresh -= dt;
    if (this.statusRefresh <= 0) {
      this.statusRefresh = 0.2;
      this.refreshStatus();
    }
  }

  private updateAim(controls: ReturnType<InputManager['snapshot']>, dt: number): void {
    if (this.cameraMode === 'third') {
      if (Math.abs(controls.aimX) > 0.001) {
        this.facing.applyAxisAngle(this.up, -controls.aimX * 0.0045).normalize();
      }
      return;
    }

    if (!controls.hasPointer) return;
    this.aimNdc.set(controls.pointerX, controls.pointerY);
    this.raycaster.setFromCamera(this.aimNdc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.aimPlane, this.aimPoint);
    if (!hit) return;

    this.aimDirection.copy(hit).sub(this.player.position).setY(0);
    if (this.aimDirection.lengthSq() <= 1e-5) return;
    this.aimDirection.normalize();
    this.facing.lerp(this.aimDirection, 1 - Math.exp(-dt * 18)).normalize();
  }

  private render(frameDt: number): void {
    this.cameraRig.update(this.player.position, this.facing, frameDt);
    this.runtimeFx.cameraImpulse.apply(this.camera, frameDt);
    this.projectileVisuals.sync(this.projectileSystem.active());
    this.grass.update(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }

  private async loadLevelManifest(): Promise<void> {
    try {
      const manifest = await this.levelLoader.loadManifest('/assets/levels/abandoned-outskirts/level.manifest.json');
      this.applyLevelManifest(manifest);
      this.levelId = manifest.id;
    } catch (error) {
      console.warn('Facefall: manifest load failed, keeping procedural fallback', error);
      this.levelId = 'lab-fallback';
    }
  }

  private applyLevelManifest(manifest: LevelManifest): void {
    const playerSpawn = manifest.markers.find((marker) => marker.kind === 'player-spawn');
    if (playerSpawn) {
      this.playerController.teleport(new THREE.Vector3(
        playerSpawn.position.x,
        playerSpawn.position.y + 0.35,
        playerSpawn.position.z
      ));
      if (typeof playerSpawn.rotationY === 'number') {
        this.facing.set(-Math.sin(playerSpawn.rotationY), 0, -Math.cos(playerSpawn.rotationY)).normalize();
      }
    }

    const enemySpawns = manifest.markers.filter((marker) => marker.kind === 'enemy-spawn');
    const roots = [...this.enemyRoots.values()];
    roots.forEach((root, index) => {
      const marker = enemySpawns[index % Math.max(1, enemySpawns.length)];
      if (!marker) return;
      const spread = marker.radius ?? 3;
      root.position.set(
        marker.position.x + (index - 1) * Math.min(2.5, spread * 0.4),
        marker.position.y,
        marker.position.z + index * 1.2
      );
    });
    this.rebuildEnemySpatial();

    for (const marker of manifest.markers.filter((item) => item.kind === 'light')) {
      const intensity = typeof marker.data?.intensity === 'number' ? marker.data.intensity : 6;
      const distance = typeof marker.data?.distance === 'number' ? marker.data.distance : 14;
      const warm = marker.data?.warm === true;
      const light = new THREE.PointLight(warm ? 0xffc56e : 0xcbd8ff, intensity, distance, 2);
      light.position.set(marker.position.x, marker.position.y, marker.position.z);
      this.scene.add(light);
    }
  }

  private rebuildEnemySpatial(): void {
    this.enemySpatial.clear();
    for (const item of this.enemySpatialItems.values()) this.enemySpatial.insert(item);
  }

  private queryProjectileCollision(from: THREE.Vector3, to: THREE.Vector3): ProjectileCollision | null {
    const direction = this.temp.copy(to).sub(from);
    const distance = direction.length();
    if (distance <= 1e-6) return null;
    direction.multiplyScalar(1 / distance);

    this.raycaster.set(from, direction);
    this.raycaster.far = distance;
    const enemyHit = this.raycaster.intersectObjects(this.enemyMeshes, true)
      .find((entry) => entry.object.visible && entry.object.userData.damageTargetId);
    const worldHit = this.collisionWorld.segmentCast(from, to);

    if (enemyHit && (!worldHit || enemyHit.distance <= worldHit.distance)) {
      return {
        targetId: enemyHit.object.userData.damageTargetId as string,
        point: enemyHit.point.clone(),
        hitZone: this.getHitZone(enemyHit.object, enemyHit.point)
      };
    }

    if (worldHit) {
      this.effects.play('surface-hit', { origin: worldHit.position, direction });
      return { point: worldHit.position, hitZone: 'torso' };
    }

    return null;
  }

  private setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    this.cameraRig.setMode(mode);
    this.dom.topButton.dataset.active = String(mode === 'top');
    this.dom.thirdButton.dataset.active = String(mode === 'third');
    this.refreshStatus();
  }

  private getHitZone(object: THREE.Object3D, point: THREE.Vector3): HitZone {
    const rootId = object.userData.damageTargetId as string | undefined;
    const root = rootId ? this.enemyRoots.get(rootId) : undefined;
    if (!root) return 'torso';
    const localY = point.y - root.position.y;
    if (localY > 1.35 * root.scale.y) return 'head';
    if (localY < 0.55 * root.scale.y) return 'limb';
    return 'torso';
  }

  private spreadDirection(base: THREE.Vector3, spread: number): THREE.Vector3 {
    const result = base.clone();
    result.x += (Math.random() - 0.5) * spread;
    result.y += (Math.random() - 0.5) * spread * 0.45;
    result.z += (Math.random() - 0.5) * spread;
    return result.normalize();
  }

  private makeCapsuleMarker(radius: number, bodyLength: number, color: number): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, bodyLength, 10), material);
    cylinder.position.y = bodyLength / 2 + radius;
    const lower = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material);
    lower.position.y = radius;
    const upper = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material);
    upper.position.y = bodyLength + radius;
    for (const mesh of [cylinder, lower, upper]) mesh.castShadow = this.quality.shadows;
    group.add(cylinder, lower, upper);
    return group;
  }

  private refreshStatus(): void {
    const runtime = this.weaponSystem.runtime();
    const lastEvent = this.dom.status.dataset.lastEvent ? ` · ${this.dom.status.dataset.lastEvent}` : '';
    this.dom.status.textContent = [
      `state=${this.state.current}`,
      `level=${this.levelId}`,
      `quality=${this.quality.id}`,
      `camera=${this.cameraMode}`,
      `${WEAPONS[this.weaponSystem.selected].label} ${runtime.magazine}/${runtime.reserve}`,
      `enemies=${this.enemyMeshes.filter((enemy) => enemy.visible).length}`,
      `arrows=${this.projectileSystem.active().length}`,
      `spatialCells=${this.enemySpatial.occupiedCellCount}`,
      `fx=${Object.keys(EFFECTS).length}`,
      `lights=${this.lightPool.activeCount}`,
      'Three.js=bundled'
    ].join(' · ') + lastEvent;
  }

  private onTopCamera = (): void => this.setCameraMode('top');
  private onThirdCamera = (): void => this.setCameraMode('third');

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio));
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) this.pause();
    else this.resume();
  };
}

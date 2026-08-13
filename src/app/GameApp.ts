import * as THREE from 'three';
import { AimAssist } from '../aim/AimAssist';
import { aimController } from '../aim/AimController';
import type { CameraMode } from '../camera/CameraDirector';
import { DamageSystem } from '../combat/DamageSystem';
import { Health } from '../combat/Health';
import { ProjectileSystem, type ProjectileCollision } from '../combat/ProjectileSystem';
import { ProjectileVisuals } from '../combat/ProjectileVisuals';
import type { FacefallEvents, HitZone } from '../combat/types';
import { WEAPONS, type WeaponDefinition } from '../combat/weapons';
import { WeaponSystem } from '../combat/WeaponSystem';
import { EventBus } from '../core/EventBus';
import { GameLoop } from '../core/GameLoop';
import { EffectSystem } from '../effects/EffectSystem';
import { LightPool } from '../effects/LightPool';
import { EFFECTS } from '../effects/recipes';
import { RuntimeFx } from '../effects/RuntimeFx';
import { EnemySystem, type EnemyActor } from '../enemies/EnemySystem';
import { detectQuality, type QualityProfile } from '../graphics/quality';
import { InputManager } from '../input/InputManager';
import { KeyboardMouseInput } from '../input/KeyboardMouseInput';
import { TouchInput } from '../input/TouchInput';
import { CollisionNavigationQuery } from '../navigation/CollisionNavigationQuery';
import { PickupSystem } from '../pickups/PickupSystem';
import { PlayerRuntime } from '../player/PlayerRuntime';
import { WaveDirector } from '../waves/WaveDirector';
import type { LevelManifest } from '../world/LevelManifest';
import { WorldRuntime } from '../world/WorldRuntime';
import { CombatRuntime } from './CombatRuntime';
import { GameHud } from './GameHud';
import { GameStateController } from './GameState';
import { RunSession } from './RunSession';

export interface GameAppDom {
  app: HTMLDivElement;
  status: HTMLDivElement;
  topButton: HTMLButtonElement;
  thirdButton: HTMLButtonElement;
  hp?: HTMLElement;
  wave?: HTMLElement;
  kills?: HTMLElement;
  score?: HTMLElement;
  gameOver?: HTMLElement;
  gameOverStats?: HTMLElement;
  restart?: HTMLButtonElement;
  joystick?: HTMLElement;
  stick?: HTMLElement;
  touchFire?: HTMLElement;
  touchReload?: HTMLElement;
  touchWeapon?: HTMLElement;
  touchCamera?: HTMLElement;
}

export interface StartRunOptions {
  cameraMode?: CameraMode;
  faceDataUrl?: string | null;
}

/**
 * Top-level gameplay orchestrator.
 * Renderer/world lifecycle, player visual/collider lifecycle and DOM presentation
 * are delegated to dedicated runtimes so GLB/animation work does not grow this
 * class back into a God Object.
 */
export class GameApp {
  readonly state = new GameStateController();
  readonly events = new EventBus<FacefallEvents>();

  private readonly quality: QualityProfile;
  private readonly world: WorldRuntime;
  private readonly player: PlayerRuntime;
  private readonly hud: GameHud;
  private readonly session = new RunSession();
  private readonly combat: CombatRuntime;

  private readonly weaponSystem = new WeaponSystem(this.events);
  private readonly damageSystem = new DamageSystem(this.events);
  private readonly playerHealth = new Health(100);
  private readonly input = new InputManager();
  private readonly keyboard: KeyboardMouseInput;
  private touch: TouchInput | null = null;
  private runtimeInputAttached = false;

  private readonly lightPool: LightPool;
  private readonly runtimeFx: RuntimeFx;
  private readonly effects: EffectSystem;
  private readonly projectileSystem: ProjectileSystem;
  private readonly projectileVisuals: ProjectileVisuals;
  private readonly enemySystem: EnemySystem;
  private readonly pickups: PickupSystem;
  private readonly waveDirector = new WaveDirector();
  private readonly aimAssist = new AimAssist();
  private readonly maxActiveEnemies: number;
  private readonly unregisterPlayerDamage: () => void;

  private readonly temp = new THREE.Vector3();
  private readonly muzzle = new THREE.Vector3();
  private readonly aimDirection = new THREE.Vector3();
  private readonly aimNdc = new THREE.Vector2();
  private readonly assistDelta = new THREE.Vector2();
  private readonly raycaster = new THREE.Raycaster();
  private readonly unsubscribeEvents: Array<() => void> = [];
  private readonly loop: GameLoop;
  private readonly coarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  private cameraMode: CameraMode = 'top';
  private statusRefresh = 0;
  private disposed = false;
  private levelId = 'lab-fallback';
  private manifest: LevelManifest | null = null;
  private aimAssistStrength = 0.72;
  private movementSpreadMultiplier = 1;
  private footstepTimer = 0;

  constructor(private readonly dom: GameAppDom) {
    this.quality = detectQuality();
    this.maxActiveEnemies = this.quality.id === 'mobile-low' ? 12 : this.quality.id === 'mobile-high' ? 20 : 30;
    this.world = new WorldRuntime(this.dom.app, this.quality, this.events);
    this.player = new PlayerRuntime(this.world.scene, this.quality);
    this.hud = new GameHud(this.dom);
    this.keyboard = new KeyboardMouseInput(this.input);

    this.lightPool = new LightPool(this.world.scene, Math.max(1, this.quality.maxDynamicLights));
    this.runtimeFx = new RuntimeFx(
      this.world.scene,
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
    this.projectileVisuals = new ProjectileVisuals(this.world.scene, this.quality.id === 'mobile-low' ? 32 : 48);
    this.enemySystem = new EnemySystem(this.world.scene, this.damageSystem, {
      shadows: this.quality.shadows,
      maxActive: this.maxActiveEnemies
    });
    this.pickups = new PickupSystem(this.world.scene, {
      heal: (amount) => this.playerHealth.heal(amount) > 0,
      ammo: (amount) => this.weaponSystem.addReserve(amount),
      collected: (kind, amount) => {
        this.hud.setLastEvent(kind === 'health' ? `MEDKIT +${amount}` : `AMMO +${amount}`);
        this.refreshStatus();
      }
    });
    this.unregisterPlayerDamage = this.damageSystem.register({ id: 'player', health: this.playerHealth });

    this.enemySystem.setNavigationQuery(new CollisionNavigationQuery(this.world.collisionWorld));
    this.combat = new CombatRuntime({ events: this.events, damageSystem: this.damageSystem, projectileSystem: this.projectileSystem, enemySystem: this.enemySystem, player: this.player, world: this.world, effects: this.effects, hud: this.hud, session: this.session, movementSpread: () => this.movementSpreadMultiplier, applyWeaponRecoil: (definition) => this.applyWeaponRecoil(definition), resolveHitZone: (object, point) => this.getHitZone(object, point), refreshStatus: () => this.refreshStatus(), endRun: () => this.endRun() });
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

  configureAimAssist(strength: number): void {
    this.aimAssistStrength = Math.max(0, Math.min(1, Number.isFinite(strength) ? strength : 0));
  }

  enterMenu(): void {
    if (this.disposed || this.state.is('menu')) return;
    this.loop.stop();
    this.waveDirector.stop();
    this.input.reset();
    this.hud.hideGameOver();
    if (this.state.is('boot') || this.state.is('error') || this.state.is('gameover') || this.state.is('playing') || this.state.is('paused')) {
      this.state.transition('menu');
    }
    this.refreshStatus();
  }

  async start(options: StartRunOptions = {}): Promise<void> {
    if (this.disposed) throw new Error('Cannot start a disposed GameApp');
    if (this.state.is('boot')) this.enterMenu();
    if (!this.state.is('menu') && !this.state.is('face_setup') && !this.state.is('error')) return;

    this.state.transition('loading');
    this.dom.status.textContent = 'ENGINE NEXT · загружаем уровень и gameplay manifest…';
    try {
      if (!this.manifest) await this.loadLevelManifest();
      await this.player.setFaceDataUrl(options.faceDataUrl ?? null);
      this.attachRuntimeInput();
      this.resetRun();
      this.setCameraMode(options.cameraMode ?? 'top');
      this.state.transition('playing');
      this.loop.start();
      this.refreshStatus();
    } catch (error) {
      this.state.transition('error');
      throw error;
    }
  }

  restart(): void {
    if (!this.state.is('gameover')) return;
    this.state.transition('loading');
    this.resetRun();
    this.state.transition('playing');
    this.loop.start();
    this.refreshStatus();
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
    this.combat.dispose();

    this.unregisterPlayerDamage();
    this.waveDirector.stop();
    this.enemySystem.reset();
    this.pickups.dispose();
    this.projectileVisuals.dispose();
    this.runtimeFx.dispose();
    this.lightPool.dispose();
    this.player.dispose();
    this.world.dispose();
    this.events.clear();
    this.dom.app.replaceChildren();
    if (!this.state.is('disposed')) this.state.transition('disposed');
  }

  private attachRuntimeInput(): void {
    if (this.runtimeInputAttached) return;
    this.runtimeInputAttached = true;
    this.keyboard.attach();
    this.attachTouchInput();
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private bindUi(): void {
    this.dom.topButton.addEventListener('click', this.onTopCamera);
    this.dom.thirdButton.addEventListener('click', this.onThirdCamera);
    this.dom.restart?.addEventListener('click', this.onRestart);
  }

  private attachTouchInput(): void {
    const { joystick, stick, touchFire } = this.dom;
    if (!joystick || !stick || !touchFire || this.touch) return;
    this.touch = new TouchInput(this.input, {
      joystick,
      stick,
      fire: touchFire,
      aimSurface: this.world.renderer.domElement,
      reload: this.dom.touchReload,
      switchWeapon: this.dom.touchWeapon,
      toggleCamera: this.dom.touchCamera
    });
    this.touch.attach();
  }

  private fixedUpdate(dt: number): void {
    if (!this.state.is('playing')) return;
    const controls = this.input.snapshot();
    this.updateAim(dt);
    const movement = this.player.move(controls.moveX, controls.moveY, controls.sprint, dt, this.world.collisionWorld);
    this.movementSpreadMultiplier = movement.movementSpreadMultiplier;

    this.updateFootsteps(dt, movement.targetSpeed, controls.sprint);
    this.weaponSystem.update(dt);
    this.projectileSystem.update(dt);
    this.enemySystem.update(dt, this.player.position, (actor) => this.applyEnemyAttack(actor));
    this.pickups.update(dt, this.player.position);
    for (const request of this.waveDirector.update(dt, this.enemySystem.activeCount, this.maxActiveEnemies)) {
      this.enemySystem.spawn(request.type, request.position);
    }
    this.effects.update(dt);
    this.runtimeFx.update(dt);
    this.lightPool.update(dt);
    this.world.updateSimulation(dt);

    if (this.input.consumePressed('toggleCamera')) this.setCameraMode(this.cameraMode === 'top' ? 'third' : 'top');
    if (this.input.consumePressed('switchWeapon')) this.player.setActiveWeapon(this.weaponSystem.cycle());
    if (this.input.consumePressed('reload')) this.weaponSystem.reload();
    if (controls.fire) {
      this.player.muzzle(this.muzzle);
      this.weaponSystem.fire('player', this.muzzle, this.player.facing);
    }

    this.statusRefresh -= dt;
    if (this.statusRefresh <= 0) {
      this.statusRefresh = 0.18;
      this.refreshStatus();
    }
  }

  private applyEnemyAttack(actor: EnemyActor): void {
    this.aimDirection.copy(this.player.position).sub(actor.root.position).setY(0);
    if (this.aimDirection.lengthSq() > 1e-5) this.aimDirection.normalize();
    this.events.emit('enemyAttack', { sourceId: actor.id, position: actor.root.position.clone(), kind: actor.archetype.id });
    this.damageSystem.apply({
      amount: actor.archetype.attackDamage,
      kind: 'melee',
      sourceId: actor.id,
      targetId: 'player',
      hitPoint: this.player.position.clone().add(this.temp.set(0, 1.0, 0)),
      direction: this.aimDirection.clone(),
      impulse: actor.archetype.mass * 0.02,
      hitZone: 'torso',
      critical: false
    });
  }

  private updateAim(dt: number): void {
    if (this.coarsePointer && this.aimAssistStrength > 0 && this.enemySystem.activeCount > 0) {
      aimController.getNdc(this.aimNdc);
      this.aimAssist.findCorrection(
        this.world.camera,
        this.aimNdc,
        this.enemySystem.aimTargets,
        this.aimAssistStrength,
        this.cameraMode,
        this.assistDelta
      );
      this.assistDelta.multiplyScalar(Math.min(1, dt * 30));
      aimController.nudgeNdc(this.assistDelta);
    }

    aimController.updateWorldAim(this.world.camera, this.player.position);
    if (this.cameraMode !== 'top') return;
    this.aimDirection.copy(aimController.getWorldDirection(this.aimDirection)).setY(0);
    if (this.aimDirection.lengthSq() <= 1e-5) return;
    this.aimDirection.normalize();
    this.player.facing.lerp(this.aimDirection, 1 - Math.exp(-dt * 18)).normalize();
  }

  private updateFootsteps(dt: number, targetSpeed: number, sprinting: boolean): void {
    if (targetSpeed <= 0.2) {
      this.footstepTimer = 0;
      return;
    }
    this.footstepTimer -= dt;
    if (this.footstepTimer > 0) return;
    this.footstepTimer = sprinting ? 0.33 : 0.48;
    this.events.emit('footstep', { position: this.player.position.clone(), sprinting });
  }

  private applyWeaponRecoil(definition: WeaponDefinition): void {
    const recoil = definition.recoil;
    const pitch = recoil.pitchMin + Math.random() * Math.max(0, recoil.pitchMax - recoil.pitchMin);
    const yaw = recoil.yawMin + Math.random() * Math.max(0, recoil.yawMax - recoil.yawMin);
    aimController.applyRecoil(yaw, pitch);
    this.runtimeFx.cameraImpulse.add(recoil.cameraKick);
  }

  private render(frameDt: number): void {
    this.world.updateFrame(this.player.position, this.player.facing, frameDt);
    this.runtimeFx.cameraImpulse.apply(this.world.camera, frameDt);
    this.projectileVisuals.sync(this.projectileSystem.active());
    this.world.render();
  }

  private async loadLevelManifest(): Promise<void> {
    const loaded = await this.world.loadManifest();
    this.manifest = loaded.manifest;
    this.levelId = loaded.levelId;
    this.waveDirector.configure(loaded.manifest.markers);
    this.pickups.configure(loaded.manifest.markers);
  }

  private resetRun(): void {
    this.enemySystem.reset();
    this.weaponSystem.reset();
    this.player.setActiveWeapon(this.weaponSystem.selected);
    this.projectileSystem.reset();
    this.playerHealth.reset();
    this.pickups.reset();
    this.session.reset();
    this.footstepTimer = 0;
    this.movementSpreadMultiplier = 1;
    this.hud.clearLastEvent();
    this.waveDirector.reset();
    this.hud.hideGameOver();

    const playerSpawn = this.manifest?.markers.find((marker) => marker.kind === 'player-spawn');
    this.player.reset(playerSpawn, this.cameraMode);
    this.input.reset();
    aimController.reset(this.cameraMode);
    this.refreshStatus();
  }

  private endRun(): void {
    if (!this.state.is('playing')) return;
    this.waveDirector.stop();
    this.loop.stop();
    this.input.reset();
    this.state.transition('gameover');
    this.hud.showGameOver(this.waveDirector.wave, this.session.kills, this.session.score);
    this.hud.setLastEvent('RUN ENDED');
    this.refreshStatus();
  }

  private queryProjectileCollision(from: THREE.Vector3, to: THREE.Vector3): ProjectileCollision | null {
    const direction = this.temp.copy(to).sub(from);
    const distance = direction.length();
    if (distance <= 1e-6) return null;
    direction.multiplyScalar(1 / distance);
    this.raycaster.set(from, direction);
    this.raycaster.far = distance;
    const enemyHit = this.raycaster.intersectObjects([...this.enemySystem.meshes], true)
      .find((entry) => entry.object.visible && entry.object.userData.damageTargetId);
    const worldHit = this.world.collisionWorld.segmentCast(from, to);

    if (enemyHit && (!worldHit || enemyHit.distance <= worldHit.distance)) {
      return {
        targetId: enemyHit.object.userData.damageTargetId as string,
        point: enemyHit.point.clone(),
        hitZone: this.getHitZone(enemyHit.object, enemyHit.point)
      };
    }
    if (worldHit) {
      this.effects.play('surface-hit', { origin: worldHit.position, direction });
      return { point: worldHit.position, hitZone: 'environment' };
    }
    return null;
  }

  private setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    this.world.setCameraMode(mode);
    this.dom.topButton.dataset.active = String(mode === 'top');
    this.dom.thirdButton.dataset.active = String(mode === 'third');
    this.refreshStatus();
  }

  private getHitZone(object: THREE.Object3D, point: THREE.Vector3): HitZone {
    const rootId = object.userData.damageTargetId as string | undefined;
    const root = rootId ? this.enemySystem.rootFor(rootId) : undefined;
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

  private refreshStatus(): void {
    const runtime = this.weaponSystem.runtime();
    this.hud.refresh({
      state: this.state.current,
      levelId: this.levelId,
      hp: this.playerHealth.value,
      wave: this.waveDirector.wave,
      kills: this.session.kills,
      score: this.session.score,
      qualityId: this.quality.id,
      cameraMode: this.cameraMode,
      weaponLabel: WEAPONS[this.weaponSystem.selected].label,
      magazine: runtime.magazine,
      reserve: runtime.reserve,
      activeEnemies: this.enemySystem.activeCount,
      maxActiveEnemies: this.maxActiveEnemies,
      pickups: this.pickups.activeCount,
      projectiles: this.projectileSystem.active().length,
      spatialCells: this.enemySystem.occupiedCellCount,
      aimAssistStrength: this.aimAssistStrength,
      effectRecipeCount: Object.keys(EFFECTS).length
    });
  }

  private onTopCamera = (): void => this.setCameraMode('top');
  private onThirdCamera = (): void => this.setCameraMode('third');
  private onRestart = (): void => this.restart();
  private onResize = (): void => this.world.resize();
  private onVisibilityChange = (): void => {
    if (document.hidden) this.pause();
    else this.resume();
  };
}

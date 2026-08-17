import type { GameApp } from '../app/GameApp';

interface RendererInfoLike {
  render: {
    calls: number;
    triangles: number;
  };
}

interface RendererLike {
  info: RendererInfoLike;
  getPixelRatio(): number;
}

interface EnemyActorLike {
  alive?: boolean;
  root?: { visible?: boolean };
  currentIntent?: string;
}

interface NavigationLike {
  nextWaypoint: (...args: any[]) => any;
}

interface EnemySystemLike {
  activeCount: number;
  occupiedCellCount: number;
  actors?: Map<string, EnemyActorLike>;
  navigation?: NavigationLike;
  setNavigationQuery?: (navigation: NavigationLike) => void;
}

interface DebugAppInternals {
  world: { renderer: RendererLike };
  enemySystem: EnemySystemLike;
  quality: { id: string };
  navigationMode: string;
  canEnemySeeTarget: (...args: any[]) => boolean;
}

interface IntervalCounters {
  losQueries: number;
  losBlocked: number;
  navRequests: number;
}

const UPDATE_INTERVAL_MS = 250;

/**
 * Opt-in runtime profiler for real-device tuning. It is installed only for
 * ?debug=1 so the normal game does not pay DOM/profiler instrumentation cost.
 */
export class DebugPerformanceOverlay {
  private readonly runtime: DebugAppInternals;
  private readonly element: HTMLDivElement;
  private readonly counters: IntervalCounters = { losQueries: 0, losBlocked: 0, navRequests: 0 };
  private readonly instrumentedNavigation = new WeakSet<object>();
  private frameId = 0;
  private lastFrameAt = performance.now();
  private intervalStartedAt = this.lastFrameAt;
  private frames = 0;
  private frameMsTotal = 0;
  private frameMsMax = 0;
  private disposed = false;
  private restoreLos: (() => void) | null = null;
  private restoreSetNavigation: (() => void) | null = null;

  constructor(app: GameApp) {
    this.runtime = app as unknown as DebugAppInternals;
    this.element = this.createElement();
    this.instrumentLos();
    this.instrumentNavigationChanges();
    this.instrumentNavigation(this.runtime.enemySystem.navigation);
    this.frameId = requestAnimationFrame(this.tick);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.restoreLos?.();
    this.restoreSetNavigation?.();
    this.element.remove();
  }

  private tick = (now: number): void => {
    if (this.disposed) return;
    const frameMs = Math.max(0, now - this.lastFrameAt);
    this.lastFrameAt = now;
    this.frames += 1;
    this.frameMsTotal += frameMs;
    this.frameMsMax = Math.max(this.frameMsMax, frameMs);

    const elapsed = now - this.intervalStartedAt;
    if (elapsed >= UPDATE_INTERVAL_MS) this.refresh(elapsed);
    this.frameId = requestAnimationFrame(this.tick);
  };

  private refresh(elapsedMs: number): void {
    this.instrumentNavigation(this.runtime.enemySystem.navigation);

    const seconds = Math.max(0.001, elapsedMs / 1000);
    const fps = this.frames / seconds;
    const avgFrameMs = this.frames > 0 ? this.frameMsTotal / this.frames : 0;
    const renderer = this.runtime.world.renderer;
    const renderInfo = renderer.info.render;
    const enemySystem = this.runtime.enemySystem;
    const intents = this.countIntents(enemySystem.actors);
    const blockedPct = this.counters.losQueries > 0 ? (this.counters.losBlocked / this.counters.losQueries) * 100 : 0;

    this.element.dataset.samples = String(Number(this.element.dataset.samples ?? '0') + 1);
    this.element.dataset.fps = fps.toFixed(1);
    this.element.dataset.frameMs = avgFrameMs.toFixed(2);
    this.element.dataset.drawCalls = String(renderInfo.calls);
    this.element.dataset.triangles = String(renderInfo.triangles);
    this.element.dataset.activeEnemies = String(enemySystem.activeCount);
    this.element.dataset.losPerSecond = (this.counters.losQueries / seconds).toFixed(1);
    this.element.dataset.navPerSecond = (this.counters.navRequests / seconds).toFixed(1);
    this.element.dataset.navigation = this.runtime.navigationMode;

    this.element.textContent = [
      `DEBUG PERF · ${this.runtime.quality.id} · nav=${this.runtime.navigationMode}`,
      `FPS ${fps.toFixed(1)} · FRAME ${avgFrameMs.toFixed(2)} ms · MAX ${this.frameMsMax.toFixed(1)} ms`,
      `DRAW ${renderInfo.calls} · TRI ${compactNumber(renderInfo.triangles)} · DPR ${renderer.getPixelRatio().toFixed(2)}`,
      `AI ${enemySystem.activeCount} · chase ${intents.chase} · inv ${intents.investigate} · atk ${intents.attack}`,
      `LOS/s ${(this.counters.losQueries / seconds).toFixed(1)} · blocked ${blockedPct.toFixed(0)}%`,
      `NAV/s ${(this.counters.navRequests / seconds).toFixed(1)} · cells ${enemySystem.occupiedCellCount}`,
    ].join('\n');

    this.intervalStartedAt = performance.now();
    this.frames = 0;
    this.frameMsTotal = 0;
    this.frameMsMax = 0;
    this.counters.losQueries = 0;
    this.counters.losBlocked = 0;
    this.counters.navRequests = 0;
  }

  private instrumentLos(): void {
    const original = this.runtime.canEnemySeeTarget.bind(this.runtime);
    this.runtime.canEnemySeeTarget = (...args: any[]): boolean => {
      this.counters.losQueries += 1;
      const visible = original(...args);
      if (!visible) this.counters.losBlocked += 1;
      return visible;
    };
    this.restoreLos = () => { this.runtime.canEnemySeeTarget = original; };
  }

  private instrumentNavigationChanges(): void {
    const enemySystem = this.runtime.enemySystem;
    if (!enemySystem.setNavigationQuery) return;
    const original = enemySystem.setNavigationQuery.bind(enemySystem);
    enemySystem.setNavigationQuery = (navigation: NavigationLike): void => {
      this.instrumentNavigation(navigation);
      original(navigation);
    };
    this.restoreSetNavigation = () => { enemySystem.setNavigationQuery = original; };
  }

  private instrumentNavigation(navigation: NavigationLike | undefined): void {
    if (!navigation || typeof navigation !== 'object' || typeof navigation.nextWaypoint !== 'function') return;
    if (this.instrumentedNavigation.has(navigation as object)) return;
    this.instrumentedNavigation.add(navigation as object);
    const original = navigation.nextWaypoint.bind(navigation);
    navigation.nextWaypoint = (...args: any[]): any => {
      this.counters.navRequests += 1;
      return original(...args);
    };
  }

  private countIntents(actors: Map<string, EnemyActorLike> | undefined): Record<string, number> {
    const counts: Record<string, number> = { chase: 0, investigate: 0, attack: 0, hold: 0, wander: 0, stagger: 0 };
    if (!actors) return counts;
    for (const actor of actors.values()) {
      if (actor.alive === false || actor.root?.visible === false) continue;
      const intent = actor.currentIntent;
      if (intent && intent in counts) counts[intent] += 1;
    }
    return counts;
  }

  private createElement(): HTMLDivElement {
    const element = document.createElement('div');
    element.id = 'debugPerformance';
    element.dataset.visible = 'true';
    element.dataset.samples = '0';
    element.setAttribute('role', 'status');
    element.setAttribute('aria-label', 'Facefall performance metrics');
    Object.assign(element.style, {
      position: 'fixed',
      zIndex: '90',
      right: 'max(12px, env(safe-area-inset-right))',
      top: '104px',
      width: 'min(290px, calc(100vw - 24px))',
      padding: '10px 12px',
      border: '1px solid rgba(217,242,125,.32)',
      borderRadius: '10px',
      background: 'rgba(3,8,5,.88)',
      color: '#d9f27d',
      font: '600 10px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      whiteSpace: 'pre-line',
      pointerEvents: 'none',
      boxShadow: '0 10px 30px rgba(0,0,0,.3)',
      backdropFilter: 'blur(8px)',
    });
    document.body.appendChild(element);
    return element;
  }
}

export function attachDebugPerformanceOverlay(app: GameApp): DebugPerformanceOverlay | null {
  if (typeof window === 'undefined') return null;
  if (new URLSearchParams(window.location.search).get('debug') !== '1') return null;
  return new DebugPerformanceOverlay(app);
}

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

import { aimController } from '../aim/AimController';
import { AudioSystem } from '../presentation/audio/AudioSystem';
import { GameApp, type GameAppDom } from './GameApp';
import { ProductShell, resolveProductShellDom } from './ProductShell';

function required<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required DOM element: ${selector}`);
  return element;
}

function optional<T extends HTMLElement>(selector: string): T | undefined {
  return document.querySelector<T>(selector) ?? undefined;
}

function markBuildUi(): void {
  const badge = document.querySelector<HTMLElement>('.lab-badge');
  const kicker = document.querySelector<HTMLElement>('.menu-kicker');
  const notes = [...document.querySelectorAll<HTMLElement>('.menu-note')];
  if (badge) badge.textContent = 'FACEFALL // 0.9.3 WEAPON SLICE';
  if (kicker) kicker.textContent = 'FACEFALL SURVIVOR · ENGINE NEXT 0.9.3';
  if (notes[0]) {
    notes[0].textContent = 'TOP: коснись свободной точки — джойстик появится под пальцем, герой сам выбирает цель. 3RD: крестик в центре, свайп справа — ручной yaw. WEAP переключает pistol / shotgun / bow. FIRE и R синхронизированы с production weapon presentation; у лука стрела и тетива реагируют на реальный выстрел и перезарядку.';
  }
}

export function resolveGameAppDom(): GameAppDom {
  return {
    app: required<HTMLDivElement>('#app'),
    status: required<HTMLDivElement>('#status'),
    topButton: required<HTMLButtonElement>('#camTop'),
    thirdButton: required<HTMLButtonElement>('#camThird'),
    hp: optional<HTMLElement>('#runHp'),
    wave: optional<HTMLElement>('#runWave'),
    kills: optional<HTMLElement>('#runKills'),
    score: optional<HTMLElement>('#runScore'),
    gameOver: optional<HTMLElement>('#gameOver'),
    gameOverStats: optional<HTMLElement>('#gameOverStats'),
    restart: optional<HTMLButtonElement>('#restartRun'),
    joystick: optional<HTMLElement>('#joy'),
    stick: optional<HTMLElement>('#stick'),
    touchFire: optional<HTMLElement>('#touchFire'),
    touchReload: optional<HTMLElement>('#touchReload'),
    touchWeapon: optional<HTMLElement>('#touchWeapon'),
    touchCamera: optional<HTMLElement>('#touchCamera')
  };
}

export async function bootstrapEngineNext(): Promise<GameApp | null> {
  let dom: GameAppDom | null = null;
  let app: GameApp | null = null;

  try {
    markBuildUi();
    aimController.setReticle(optional<HTMLElement>('#aimReticle'));
    dom = resolveGameAppDom();
    dom.status.textContent = 'ENGINE NEXT · готовим меню…';
    app = new GameApp(dom);

    const audio = new AudioSystem(app.events);
    const shell = new ProductShell(app, resolveProductShellDom(), audio);
    shell.attach();

    const unlockAudio = (): void => { void audio.resume(); };
    document.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
    window.addEventListener('pagehide', () => audio.dispose(), { once: true });

    const runtimeWindow = window as Window & {
      __facefallApp?: GameApp;
      __facefallShell?: ProductShell;
      __facefallAudio?: AudioSystem;
    };
    runtimeWindow.__facefallApp = app;
    runtimeWindow.__facefallShell = shell;
    runtimeWindow.__facefallAudio = audio;
    return app;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (dom) {
      dom.status.textContent = `ENGINE NEXT ERROR · ${message}`;
      dom.status.dataset.error = 'true';
    }
    console.error('[Facefall] engine-next bootstrap failed', error);
    app?.dispose();
    return null;
  }
}

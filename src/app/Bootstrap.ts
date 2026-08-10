import { GameApp, type GameAppDom } from './GameApp';

function required<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required DOM element: ${selector}`);
  return element;
}

function optional<T extends HTMLElement>(selector: string): T | undefined {
  return document.querySelector<T>(selector) ?? undefined;
}

export function resolveGameAppDom(): GameAppDom {
  return {
    app: required<HTMLDivElement>('#app'),
    status: required<HTMLDivElement>('#status'),
    topButton: required<HTMLButtonElement>('#camTop'),
    thirdButton: required<HTMLButtonElement>('#camThird'),
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
    dom = resolveGameAppDom();
    dom.status.textContent = 'ENGINE NEXT · bootstrap…';
    app = new GameApp(dom);
    await app.start();

    // Helpful for manual engine-lab debugging; not used by gameplay systems.
    (window as Window & { __facefallApp?: GameApp }).__facefallApp = app;
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

import { bootstrapEngineNext } from './app/Bootstrap';
import { attachDebugPerformanceOverlay } from './debug/DebugPerformanceOverlay';

const GAME_CONTROL_SELECTOR = '.touch button,.lab-controls button,.weapon-shop button,.joy';

function installGameplaySelectionGuard(): () => void {
  const prevent = (event: Event): void => {
    const target = event.target;
    if (target instanceof Element && target.closest(GAME_CONTROL_SELECTOR)) event.preventDefault();
  };
  document.addEventListener('selectstart', prevent);
  document.addEventListener('contextmenu', prevent);
  return () => {
    document.removeEventListener('selectstart', prevent);
    document.removeEventListener('contextmenu', prevent);
  };
}

const removeSelectionGuard = installGameplaySelectionGuard();
window.addEventListener('pagehide', removeSelectionGuard, { once: true });

void bootstrapEngineNext().then((app) => {
  if (!app) return;
  const debugOverlay = attachDebugPerformanceOverlay(app);
  if (!debugOverlay) return;

  const runtimeWindow = window as Window & { __facefallDebugOverlay?: { dispose(): void } };
  runtimeWindow.__facefallDebugOverlay = debugOverlay;
  window.addEventListener('pagehide', () => debugOverlay.dispose(), { once: true });
});

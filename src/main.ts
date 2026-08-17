import { bootstrapEngineNext } from './app/Bootstrap';
import { attachDebugPerformanceOverlay } from './debug/DebugPerformanceOverlay';

void bootstrapEngineNext().then((app) => {
  if (!app) return;
  const debugOverlay = attachDebugPerformanceOverlay(app);
  if (!debugOverlay) return;

  const runtimeWindow = window as Window & { __facefallDebugOverlay?: { dispose(): void } };
  runtimeWindow.__facefallDebugOverlay = debugOverlay;
  window.addEventListener('pagehide', () => debugOverlay.dispose(), { once: true });
});

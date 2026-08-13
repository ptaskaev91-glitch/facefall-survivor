import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 412, height: 915 },
  hasTouch: true,
  isMobile: true
});

test('3RD auto-aim moves the visible reticle onto a live infected', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#menuCamThird').click();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });

  // Chromium touch emulation does not consistently expose `(pointer: coarse)` like a real
  // Android browser does. Force the runtime flag so this test exercises the exact mobile path.
  await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    if (!app) throw new Error('Facefall runtime is unavailable for auto-aim inspection');
    app.coarsePointer = true;
  });

  await page.waitForFunction(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    return (runtimeWindow.__facefallApp?.enemySystem?.activeCount ?? 0) > 0;
  }, undefined, { timeout: 12_000 });

  const locked = await page.waitForFunction(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    const reticle = document.querySelector<HTMLElement>('#aimReticle');
    if (!app || !reticle) return false;

    const camera = app.world.camera;
    const targets = app.enemySystem.aimTargets as any[];
    const rect = reticle.getBoundingClientRect();
    const reticleX = rect.left + rect.width * 0.5;
    const reticleY = rect.top + rect.height * 0.5;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const target of targets) {
      if (!target.visible) continue;
      const projected = target.position.clone();
      projected.y += 1.12;
      projected.project(camera);
      if (projected.z < -1 || projected.z > 1) continue;
      if (Math.abs(projected.x) > 0.82 || Math.abs(projected.y) > 0.78) continue;
      const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
      bestDistance = Math.min(bestDistance, Math.hypot(x - reticleX, y - reticleY));
    }

    // Moving targets and the camera/body follow are sampled on different fixed/render ticks.
    // 44 px keeps the crosshair inside the target silhouette on a 412 px mobile viewport.
    return bestDistance < 44;
  }, undefined, { timeout: 8_000 });

  expect(await locked.jsonValue()).toBe(true);
  await page.screenshot({ path: 'test-artifacts/mobile-third-autoaim-lock.png', fullPage: true });
  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

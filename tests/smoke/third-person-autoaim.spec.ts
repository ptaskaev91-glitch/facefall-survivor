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

  await page.waitForTimeout(1800);

  const diagnostic = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    const reticle = document.querySelector<HTMLElement>('#aimReticle');
    if (!app || !reticle) throw new Error('Facefall runtime/reticle unavailable');

    const camera = app.world.camera;
    const targets = app.enemySystem.aimTargets as any[];
    const rect = reticle.getBoundingClientRect();
    const reticleX = rect.left + rect.width * 0.5;
    const reticleY = rect.top + rect.height * 0.5;
    const projectedTargets: Array<{ x: number; y: number; z: number; distance: number }> = [];

    for (const target of targets) {
      if (!target.visible) continue;
      const projected = target.position.clone();
      projected.y += 1.12;
      projected.project(camera);
      const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
      projectedTargets.push({
        x,
        y,
        z: projected.z,
        distance: Math.hypot(x - reticleX, y - reticleY)
      });
    }

    projectedTargets.sort((a, b) => a.distance - b.distance);
    return {
      reticle: {
        x: reticleX,
        y: reticleY,
        styleLeft: reticle.style.left,
        styleTop: reticle.style.top
      },
      coarsePointer: app.coarsePointer,
      cameraMode: app.cameraMode,
      activeEnemies: app.enemySystem.activeCount,
      targets: projectedTargets.slice(0, 4),
      bestDistance: projectedTargets[0]?.distance ?? Number.POSITIVE_INFINITY
    };
  });

  console.log(`AUTOAIM_DIAG ${JSON.stringify(diagnostic)}`);
  await page.screenshot({ path: 'test-artifacts/mobile-third-autoaim-lock.png', fullPage: true });

  expect(diagnostic.coarsePointer).toBe(true);
  expect(diagnostic.cameraMode).toBe('third');
  expect(diagnostic.activeEnemies).toBeGreaterThan(0);
  expect(diagnostic.bestDistance).toBeLessThan(60);
  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

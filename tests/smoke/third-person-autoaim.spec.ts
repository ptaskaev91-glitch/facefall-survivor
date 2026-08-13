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

  // Build a deterministic third-person encounter. Natural wave spawns can initially land
  // behind the current camera, which is valid gameplay but cannot prove visible lock-on.
  await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    if (!app) throw new Error('Facefall runtime is unavailable for auto-aim inspection');

    app.coarsePointer = true;
    app.waveDirector.stop();
    app.enemySystem.reset();

    const spawn = app.player.position.clone().addScaledVector(app.player.facing, 8);
    spawn.y = app.player.position.y;
    const actor = app.enemySystem.spawn('walker', spawn);
    if (!actor) throw new Error('Failed to spawn deterministic auto-aim target');
  });

  await page.waitForFunction(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    const reticle = document.querySelector<HTMLElement>('#aimReticle');
    if (!app || !reticle || app.enemySystem.activeCount !== 1) return false;

    const camera = app.world.camera;
    const target = (app.enemySystem.aimTargets as any[])[0];
    if (!target?.visible) return false;

    const targetWorld = target.position.clone();
    targetWorld.y += 1.12;
    const projected = targetWorld.project(camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    const rect = reticle.getBoundingClientRect();
    const reticleX = rect.left + rect.width * 0.5;
    const reticleY = rect.top + rect.height * 0.5;

    return Math.hypot(x - reticleX, y - reticleY) < 42;
  }, undefined, { timeout: 8_000 });

  const diagnostic = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    const reticle = document.querySelector<HTMLElement>('#aimReticle');
    if (!app || !reticle) throw new Error('Facefall runtime/reticle unavailable');

    const target = (app.enemySystem.aimTargets as any[])[0];
    const targetWorld = target.position.clone();
    targetWorld.y += 1.12;
    const projected = targetWorld.project(app.world.camera);
    const targetX = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const targetY = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    const rect = reticle.getBoundingClientRect();
    const reticleX = rect.left + rect.width * 0.5;
    const reticleY = rect.top + rect.height * 0.5;

    return {
      reticleX,
      reticleY,
      targetX,
      targetY,
      distance: Math.hypot(targetX - reticleX, targetY - reticleY),
      styleLeft: reticle.style.left,
      styleTop: reticle.style.top,
      coarsePointer: app.coarsePointer,
      cameraMode: app.cameraMode
    };
  });

  console.log(`AUTOAIM_LOCK ${JSON.stringify(diagnostic)}`);
  expect(diagnostic.coarsePointer).toBe(true);
  expect(diagnostic.cameraMode).toBe('third');
  // The real contract is spatial: the rendered reticle must converge onto the live target.
  // A target may legitimately project through the vertical screen center, so requiring
  // styleTop != 50% made this test flaky even when the lock was already correct.
  expect(diagnostic.distance).toBeLessThan(42);
  await page.screenshot({ path: 'test-artifacts/mobile-third-autoaim-lock.png', fullPage: true });
  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

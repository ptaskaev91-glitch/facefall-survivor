import { expect, test } from '@playwright/test';

test('debug performance overlay is absent in normal runs', async ({ page }) => {
  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#debugPerformance')).toHaveCount(0);
});

test('debug=1 reports renderer, AI, LOS and navigation cadence', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/engine-lab.html?debug=1', { waitUntil: 'domcontentloaded' });
  const overlay = page.locator('#debugPerformance');
  await expect(overlay).toBeVisible();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });
  await expect(page.locator('#status')).toContainText('nav=recast', { timeout: 20_000 });

  await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    app.loop.stop();
    app.waveDirector.stop();
    app.enemySystem.reset();

    const player = app.player.position.clone();
    const spawn = player.clone().set(player.x + 7, player.y, player.z);
    const actor = app.enemySystem.spawn('walker', spawn, player);
    if (!actor) throw new Error('failed to spawn debug metrics actor');

    // Force enough expensive AI samples to make the 4 Hz overlay interval
    // deterministic instead of depending on wave timing.
    for (let i = 0; i < 12; i += 1) {
      actor.perceptionTimer = 0;
      actor.steeringTimer = 0;
      app.enemySystem.update(1 / 60, player, () => {});
    }
  });

  await expect.poll(async () => Number(await overlay.getAttribute('data-los-per-second')), { timeout: 5_000 }).toBeGreaterThan(0);
  await expect.poll(async () => Number(await overlay.getAttribute('data-nav-per-second')), { timeout: 5_000 }).toBeGreaterThan(0);
  await expect(overlay).toContainText('FPS');
  await expect(overlay).toContainText('FRAME');
  await expect(overlay).toContainText('DRAW');
  await expect(overlay).toContainText('TRI');
  await expect(overlay).toContainText('AI');
  await expect(overlay).toContainText('LOS/s');
  await expect(overlay).toContainText('NAV/s');
  await expect(overlay).toContainText('nav=recast');

  const metrics = await overlay.evaluate((element) => ({
    fps: Number((element as HTMLElement).dataset.fps),
    frameMs: Number((element as HTMLElement).dataset.frameMs),
    drawCalls: Number((element as HTMLElement).dataset.drawCalls),
    triangles: Number((element as HTMLElement).dataset.triangles),
    activeEnemies: Number((element as HTMLElement).dataset.activeEnemies),
    losPerSecond: Number((element as HTMLElement).dataset.losPerSecond),
    navPerSecond: Number((element as HTMLElement).dataset.navPerSecond),
    navigation: (element as HTMLElement).dataset.navigation,
  }));

  expect(metrics.fps).toBeGreaterThan(0);
  expect(metrics.frameMs).toBeGreaterThan(0);
  expect(metrics.drawCalls).toBeGreaterThan(0);
  expect(metrics.triangles).toBeGreaterThan(0);
  expect(metrics.activeEnemies).toBe(1);
  expect(metrics.losPerSecond).toBeGreaterThan(0);
  expect(metrics.navPerSecond).toBeGreaterThan(0);
  expect(metrics.navigation).toBe('recast');
  expect(pageErrors).toEqual([]);
});

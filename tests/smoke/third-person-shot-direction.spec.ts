import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

test('3RD shot follows the reticle even when body facing is deliberately wrong', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#menuCamThird').click();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });

  const diagnostic = await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    if (!app) throw new Error('Facefall runtime unavailable');

    app.waveDirector.stop();
    app.enemySystem.reset();

    const forward = app.player.facing.clone().setY(0).normalize();
    const spawn = app.player.position.clone().addScaledVector(forward, 8);
    spawn.y = app.player.position.y;
    if (!app.enemySystem.spawn('walker', spawn)) throw new Error('Failed to spawn deterministic target');

    app.player.facing.set(1, 0, 0);
    app.player.muzzle(app.muzzle);
    const muzzle = app.muzzle.clone();
    let captured: any = null;
    const off = app.events.on('shot', (shot: any) => {
      if (shot.sourceId === 'player') captured = shot;
    });

    const fired = app.weaponSystem.fire('player', app.muzzle, app.player.facing);
    off();
    if (!fired || !captured) throw new Error('Player shot was not emitted');

    const direction = captured.direction.clone().normalize();
    return {
      bodyFacingDot: direction.dot(app.player.facing),
      direction: direction.toArray(),
      muzzle: muzzle.toArray()
    };
  });

  expect(diagnostic.bodyFacingDot).toBeLessThan(0.9);
  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

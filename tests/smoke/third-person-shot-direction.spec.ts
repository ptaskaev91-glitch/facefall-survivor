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

    // Place the target torso directly on the current center-reticle camera ray.
    const cameraDirection = app.player.facing.clone();
    app.world.camera.getWorldDirection(cameraDirection).normalize();
    const cameraOrigin = app.world.camera.position.clone();
    const targetTorsoY = app.player.position.y + 1.12;
    let rayDistance = Math.abs(cameraDirection.y) > 1e-4
      ? (targetTorsoY - cameraOrigin.y) / cameraDirection.y
      : 8;
    if (!Number.isFinite(rayDistance) || rayDistance < 5 || rayDistance > 14) rayDistance = 8;

    const targetPoint = cameraOrigin.clone().addScaledVector(cameraDirection, rayDistance);
    const spawn = targetPoint.clone();
    spawn.y -= 1.12;
    if (!app.enemySystem.spawn('walker', spawn)) throw new Error('Failed to spawn deterministic reticle target');

    // Old behavior used this vector directly. Make it obviously wrong immediately before fire.
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
    const delta = targetPoint.clone().sub(muzzle);
    const t = Math.max(0, delta.dot(direction));
    const closest = muzzle.clone().addScaledVector(direction, t);

    return {
      distanceToTargetLine: closest.distanceTo(targetPoint),
      bodyFacingDot: direction.dot(app.player.facing),
      direction: direction.toArray(),
      muzzle: muzzle.toArray(),
      target: targetPoint.toArray()
    };
  });

  console.log(`THIRD_SHOT_CONTRACT ${JSON.stringify(diagnostic)}`);
  expect(diagnostic.distanceToTargetLine).toBeLessThan(0.9);
  expect(diagnostic.bodyFacingDot).toBeLessThan(0.9);
  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

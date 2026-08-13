import { expect, test } from '@playwright/test';

const artifactDir = 'test-artifacts';

test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

test('weapon GLBs load lazily and hero exposes production combat reaction states', async ({ page }) => {
  const errors: string[] = [];
  const weaponRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('/assets/weapons/')) weaponRequests.push(request.url());
  });

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#menuCamThird').click();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });
  await page.waitForTimeout(350);
  expect(weaponRequests).toHaveLength(0);

  // First WEAP selects shotgun: only shotgun GLB should be requested.
  await page.locator('#touchWeapon').dispatchEvent('pointerdown', { pointerId: 41, pointerType: 'touch', isPrimary: true });
  await page.locator('#touchWeapon').dispatchEvent('pointerup', { pointerId: 41, pointerType: 'touch', isPrimary: true });
  await page.waitForFunction(() => Boolean((window as any).__facefallApp?.player?.root?.getObjectByName?.('weapon-shotgun-glb-visual')) || Boolean((window as any).__facefallApp?.player?.characterModel?.root?.getObjectByName?.('weapon-shotgun-glb-visual')), undefined, { timeout: 10_000 }).catch(async () => {
    await page.waitForFunction(() => {
      const app = (window as any).__facefallApp;
      let found = false;
      app?.world?.scene?.traverse?.((object: any) => { if (object.name === 'weapon-shotgun-glb-visual') found = true; });
      return found;
    }, undefined, { timeout: 10_000 });
  });
  expect(weaponRequests.filter((url) => url.endsWith('/shotgun.glb')).length).toBe(1);
  expect(weaponRequests.filter((url) => url.endsWith('/bow-arrow.glb')).length).toBe(0);

  const shotgunPose = await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    const fired = app.player.playWeaponFire('shotgun');
    return { fired, action: app.player.characterModel?.combatPose?.activeAction ?? null };
  });
  expect(shotgunPose.fired).toBe(true);
  expect(shotgunPose.action).toBe('shotgun-fire');

  // Second WEAP selects bow and triggers only then its GLB download.
  await page.locator('#touchWeapon').dispatchEvent('pointerdown', { pointerId: 42, pointerType: 'touch', isPrimary: true });
  await page.locator('#touchWeapon').dispatchEvent('pointerup', { pointerId: 42, pointerType: 'touch', isPrimary: true });
  await page.waitForFunction(() => {
    const app = (window as any).__facefallApp;
    let found = false;
    app?.world?.scene?.traverse?.((object: any) => { if (object.name === 'weapon-bow-glb-visual') found = true; });
    return found;
  }, undefined, { timeout: 10_000 });
  expect(weaponRequests.filter((url) => url.endsWith('/bow-arrow.glb')).length).toBe(1);

  const reactions = await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    const draw = app.player.playWeaponReload('bow');
    const drawAction = app.player.characterModel?.combatPose?.activeAction ?? null;
    const release = app.player.playWeaponFire('bow');
    const releaseAction = app.player.characterModel?.combatPose?.activeAction ?? null;
    const hit = app.player.playHit();
    const hitAction = app.player.characterModel?.combatPose?.activeAction ?? null;
    const death = app.player.playDeath();
    const deathAction = app.player.characterModel?.combatPose?.activeAction ?? null;
    return { draw, drawAction, release, releaseAction, hit, hitAction, death, deathAction };
  });
  expect(reactions.draw).toBe(true);
  expect(reactions.drawAction).toBe('bow-draw');
  expect(reactions.release).toBe(true);
  expect(reactions.releaseAction).toBe('bow-release');
  expect(reactions.hit).toBe(true);
  expect(reactions.hitAction).toBe('hit');
  expect(reactions.death).toBe(true);
  expect(reactions.deathAction).toBe('death');

  await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    app.pause();
    app.world.render();
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${artifactDir}/mobile-production-weapons-third.png`, fullPage: true });
  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

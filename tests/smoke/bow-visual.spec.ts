import { expect, test } from '@playwright/test';

const artifactDir = 'test-artifacts';

test.use({
  viewport: { width: 412, height: 915 },
  hasTouch: true,
  isMobile: true
});

test('bow visual follows combat release and reload lifecycle', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#menuCamThird').click();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });
  await page.waitForTimeout(1200);

  // This test owns weapon presentation/lifecycle, not TouchInput timing. Select the
  // requested weapon through the runtime boundary so a synthetic pointer race cannot
  // leave the test on shotgun while the visual asset is still hydrating.
  await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    app.weaponSystem.unlock('shotgun');
    app.weaponSystem.unlock('bow');
    if (!app.weaponSystem.select('bow')) throw new Error('Unable to select unlocked bow');
    app.player.setActiveWeapon('bow');
  });

  await expect.poll(async () => page.evaluate(() => {
    const app = (window as any).__facefallApp;
    const bow = app.player.root.getObjectByName('weapon-bow');
    const arrow = app.player.root.getObjectByName('bow-nocked-arrow');
    return {
      selected: app.weaponSystem.selected as string,
      bowVisible: Boolean(bow?.visible),
      arrowVisible: Boolean(arrow?.visible),
      magazine: app.weaponSystem.runtime('bow').magazine as number
    };
  }), { timeout: 12_000 }).toMatchObject({
    selected: 'bow',
    bowVisible: true,
    arrowVisible: true,
    magazine: 1
  });

  await page.screenshot({ path: `${artifactDir}/mobile-bow-ready-third.png`, fullPage: true });

  const fired = await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    app.player.muzzle(app.muzzle);
    return app.weaponSystem.fire('player', app.muzzle, app.player.facing) as boolean;
  });
  expect(fired).toBe(true);

  await expect.poll(async () => page.evaluate(() => {
    const app = (window as any).__facefallApp;
    const arrow = app.player.root.getObjectByName('bow-nocked-arrow');
    return {
      magazine: app.weaponSystem.runtime('bow').magazine as number,
      arrowVisible: Boolean(arrow?.visible)
    };
  }), { timeout: 3_000 }).toMatchObject({ magazine: 0, arrowVisible: false });

  await page.screenshot({ path: `${artifactDir}/mobile-bow-release-third.png`, fullPage: true });

  await expect.poll(async () => page.evaluate(() => (window as any).__facefallApp.weaponSystem.runtime('bow').state as string), {
    timeout: 3_000
  }).toBe('idle');

  const reloadStarted = await page.evaluate(() => (window as any).__facefallApp.weaponSystem.reload() as boolean);
  expect(reloadStarted).toBe(true);

  await expect.poll(async () => page.evaluate(() => {
    const app = (window as any).__facefallApp;
    const arrow = app.player.root.getObjectByName('bow-nocked-arrow');
    return {
      state: app.weaponSystem.runtime('bow').state as string,
      arrowVisible: Boolean(arrow?.visible)
    };
  }), { timeout: 3_000 }).toMatchObject({ state: 'reloading', arrowVisible: true });

  // Bow reload is intentionally animated over subsequent simulation frames. The
  // contract is that the string actually starts drawing during reload, not that its
  // geometry mutates synchronously inside WeaponSystem.reload().
  await expect.poll(async () => page.evaluate(() => {
    const app = (window as any).__facefallApp;
    const string = app.player.root.getObjectByName('bow-string') as any;
    const positions = string?.geometry?.getAttribute('position');
    return positions ? positions.getZ(1) as number : 0;
  }), { timeout: 2_000, intervals: [50, 100, 150] }).toBeLessThan(-0.05);

  await page.screenshot({ path: `${artifactDir}/mobile-bow-draw-third.png`, fullPage: true });

  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

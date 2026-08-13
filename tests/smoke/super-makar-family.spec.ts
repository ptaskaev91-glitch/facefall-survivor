import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

test('Super Makar unlocks family heroes and buys weapons with zombie coins', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText('СУПЕР МАКАР');
  await page.locator('#menuCamThird').click();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20000 });

  const family = await page.evaluate(async () => {
    const app = (window as any).__facefallApp;
    await app.family.syncWave(4);
    await app.family.syncWave(7);
    app.coins = 35;
    app.refreshStatus();
    return { roles: app.family.activeRoles, mama: Boolean(app.world.scene.getObjectByName('super-mama')), papa: Boolean(app.world.scene.getObjectByName('super-papa')) };
  });
  expect(family.roles).toEqual(['mama', 'papa']);
  expect(family.mama && family.papa).toBe(true);
  await expect(page.locator('#coinCount')).toHaveText('35');
  await page.locator('#buyShotgun').click();
  await expect(page.locator('#buyShotgun')).toContainText('✓');
  await expect(page.locator('#coinCount')).toHaveText('15');
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-artifacts/mobile-super-makar-family.png', fullPage: true });
});

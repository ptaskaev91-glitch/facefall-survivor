import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

test('Abandoned Outskirts activates the offline Recast navigation backend', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#startGame').click();

  await expect(page.locator('#status')).toContainText('level=abandoned-outskirts', { timeout: 20_000 });
  await expect(page.locator('#status')).toContainText('nav=recast', { timeout: 20_000 });

  const navigation = await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    const query = app.enemySystem.navigation;
    const from = app.player.position.clone().set(-24, 0, -8);
    const target = app.player.position.clone().set(0, 0, 10);
    const out = app.player.position.clone();
    query.nextWaypoint(from, target, out);
    return {
      constructorName: query.constructor.name,
      waypoint: [out.x, out.y, out.z],
    };
  });

  expect(navigation.constructorName).toBe('RecastNavigationQuery');
  expect(navigation.waypoint.every(Number.isFinite)).toBe(true);
  expect(errors).toEqual([]);
});

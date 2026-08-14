import { expect, test } from '@playwright/test';

test('engine-next boots menu and starts a run without fatal page errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });

  const menu = page.locator('#productMenu');
  await expect(menu).toHaveAttribute('data-visible', 'true');
  await expect(page.locator('#startGame')).toBeVisible();
  await expect(page.locator('#menuCamTop')).toHaveAttribute('data-active', 'true');
  await expect(page.locator('.lab-badge')).toContainText('0.13.0');
  await expect(page.locator('.menu-kicker')).toContainText('ENGINE NEXT 0.13.0');

  await page.locator('#startGame').click();

  await expect(menu).toHaveAttribute('data-visible', 'false', { timeout: 15_000 });
  await expect(page.locator('#app canvas')).toBeVisible();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 15_000 });

  await page.locator('#camThird').click();
  await expect(page.locator('#camThird')).toHaveAttribute('data-active', 'true');
  await expect(page.locator('#status')).toContainText('camera=third');

  expect(pageErrors, `Fatal browser errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

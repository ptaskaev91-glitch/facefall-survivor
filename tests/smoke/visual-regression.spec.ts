import { expect, test } from '@playwright/test';

const artifactDir = 'test-artifacts';

test.use({
  viewport: { width: 412, height: 915 },
  hasTouch: true,
  isMobile: true
});

test('capture mobile TOP and 3RD checkpoints for visual review', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#menuCamTop').click();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 15_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${artifactDir}/mobile-top.png`, fullPage: true });

  await page.locator('#camThird').click();
  await expect(page.locator('#status')).toContainText('camera=third');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${artifactDir}/mobile-third.png`, fullPage: true });

  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

import { expect, test } from '@playwright/test';

const faceSvg = (fill: string, label: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400"><rect width="320" height="400" fill="${fill}"/><circle cx="160" cy="185" r="105" fill="#f2c6a6"/><circle cx="122" cy="165" r="12" fill="#202020"/><circle cx="198" cy="165" r="12" fill="#202020"/><path d="M115 245 Q160 280 205 245" fill="none" stroke="#8c4e4e" stroke-width="10"/><text x="160" y="365" text-anchor="middle" font-size="34" font-family="sans-serif" fill="#fff">${label}</text></svg>`;

test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

test('Super Makar unlocks family heroes and buys weapons with zombie coins', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText('СУПЕР МАКАР');

  await page.locator('#makarFaceInput').setInputFiles({ name: 'makar.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(faceSvg('#315c94', 'МАКАР')) });
  await page.locator('#mamaFaceInput').setInputFiles({ name: 'mama.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(faceSvg('#8f4e7a', 'МАМА')) });
  await page.locator('#papaFaceInput').setInputFiles({ name: 'papa.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(faceSvg('#4d6c3e', 'ПАПА')) });
  await expect(page.locator('#makarFacePreview')).toBeVisible();
  await expect(page.locator('#mamaFacePreview')).toBeVisible();
  await expect(page.locator('#papaFacePreview')).toBeVisible();

  await page.locator('#menuCamThird').click();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20000 });

  const family = await page.evaluate(async () => {
    const app = (window as any).__facefallApp;
    await app.family.syncWave(4);
    await app.family.syncWave(7);
    app.coins = 35;
    app.refreshStatus();
    return {
      roles: app.family.activeRoles,
      mama: Boolean(app.world.scene.getObjectByName('super-mama')),
      papa: Boolean(app.world.scene.getObjectByName('super-papa')),
      mamaMarker: Boolean(app.world.scene.getObjectByName('super-mama-marker')),
      papaMarker: Boolean(app.world.scene.getObjectByName('super-papa-marker'))
    };
  });
  expect(family.roles).toEqual(['mama', 'papa']);
  expect(family.mama && family.papa).toBe(true);
  expect(family.mamaMarker && family.papaMarker).toBe(true);
  await expect(page.locator('#coinCount')).toHaveText('35');
  await page.locator('#buyShotgun').click();
  await expect(page.locator('#buyShotgun')).toContainText('✓');
  await expect(page.locator('#coinCount')).toHaveText('15');
  expect(errors).toEqual([]);
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'test-artifacts/mobile-super-makar-family.png', fullPage: true });
});

import { expect, test } from '@playwright/test';

const faceSvg = (fill: string, label: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="${fill}"/><circle cx="590" cy="190" r="125" fill="#f2c6a6"/><circle cx="545" cy="165" r="12" fill="#202020"/><circle cx="635" cy="165" r="12" fill="#202020"/><path d="M545 250 Q590 285 635 250" fill="none" stroke="#8c4e4e" stroke-width="10"/><text x="590" y="360" text-anchor="middle" font-size="34" font-family="sans-serif" fill="#fff">${label}</text></svg>`;

test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

test('Super Makar normalizes family faces, unlocks heroes and buys weapons with zombie coins', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  // Deterministic browser-side face detection path. Production uses the native
  // FaceDetector when available and falls back to centered 4:5 framing otherwise.
  await page.addInitScript(() => {
    (window as any).FaceDetector = class {
      async detect(source: { width?: number; height?: number }) {
        const width = source.width ?? 800;
        const height = source.height ?? 400;
        return [{ boundingBox: { x: width * 0.58, y: height * 0.12, width: width * 0.27, height: height * 0.66 } }];
      }
    };
  });

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText('СУПЕР МАКАР');

  await page.locator('#makarFaceInput').setInputFiles({ name: 'makar.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(faceSvg('#315c94', 'МАКАР')) });
  await page.locator('#mamaFaceInput').setInputFiles({ name: 'mama.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(faceSvg('#8f4e7a', 'МАМА')) });
  await page.locator('#papaFaceInput').setInputFiles({ name: 'papa.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(faceSvg('#4d6c3e', 'ПАПА')) });
  await expect(page.locator('#makarFacePreview')).toBeVisible();
  await expect(page.locator('#mamaFacePreview')).toBeVisible();
  await expect(page.locator('#papaFacePreview')).toBeVisible();

  const normalizedFace = await page.locator('#makarFacePreview').evaluate((image) => ({
    width: image.naturalWidth,
    height: image.naturalHeight,
    src: image.src,
    autoCrop: image.dataset.autoCrop,
  }));
  expect(normalizedFace.width).toBe(512);
  expect(normalizedFace.height).toBe(640);
  expect(normalizedFace.src.startsWith('data:image/jpeg')).toBe(true);
  expect(normalizedFace.autoCrop).toBe('face');

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
      papaMarker: Boolean(app.world.scene.getObjectByName('super-papa-marker')),
      makarFaceShell: Boolean(app.world.scene.getObjectByName('uploaded-face-shell')),
      mamaFaceShell: Boolean(app.world.scene.getObjectByName('super-mama')?.getObjectByName('uploaded-face-shell')),
      papaFaceShell: Boolean(app.world.scene.getObjectByName('super-papa')?.getObjectByName('uploaded-face-shell')),
    };
  });
  expect(family.roles).toEqual(['mama', 'papa']);
  expect(family.mama && family.papa).toBe(true);
  expect(family.mamaMarker && family.papaMarker).toBe(true);
  expect(family.makarFaceShell && family.mamaFaceShell && family.papaFaceShell).toBe(true);
  await expect(page.locator('#coinCount')).toHaveText('35');
  await page.locator('#buyShotgun').click();
  await expect(page.locator('#buyShotgun')).toContainText('✓');
  await expect(page.locator('#coinCount')).toHaveText('15');
  expect(errors).toEqual([]);
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'test-artifacts/mobile-super-makar-family.png', fullPage: true });
});

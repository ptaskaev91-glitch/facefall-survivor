import { expect, test } from '@playwright/test';

const artifactDir = 'test-artifacts';

const testFaceSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400">
  <rect width="320" height="400" fill="#d49a72"/>
  <ellipse cx="160" cy="205" rx="126" ry="170" fill="#efc39f"/>
  <ellipse cx="112" cy="170" rx="25" ry="18" fill="#fff"/>
  <ellipse cx="208" cy="170" rx="25" ry="18" fill="#fff"/>
  <circle cx="112" cy="170" r="10" fill="#263b32"/>
  <circle cx="208" cy="170" r="10" fill="#263b32"/>
  <path d="M160 185 L142 255 L177 255" fill="none" stroke="#9f654e" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M104 301 Q160 337 216 301" fill="none" stroke="#7d3d3d" stroke-width="12" stroke-linecap="round"/>
  <path d="M55 104 Q160 17 265 104" fill="none" stroke="#3f2c22" stroke-width="30" stroke-linecap="round"/>
</svg>`;

test.use({
  viewport: { width: 412, height: 915 },
  hasTouch: true,
  isMobile: true
});

test('capture mobile TOP and 3RD checkpoints with uploaded face', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#faceInput').setInputFiles({
    name: 'visual-smoke-face.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(testFaceSvg)
  });
  await expect(page.locator('#facePreview')).toBeVisible();

  await page.locator('#menuCamTop').click();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${artifactDir}/mobile-top.png`, fullPage: true });

  await page.locator('#camThird').click();
  await expect(page.locator('#status')).toContainText('camera=third');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${artifactDir}/mobile-third.png`, fullPage: true });

  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

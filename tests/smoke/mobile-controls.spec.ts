import { expect, test } from '@playwright/test';

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 412, height: 915 }
});

test('TOP touch creates a floating joystick under the finger', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 15_000 });

  const canvas = page.locator('#app canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const touchX = Math.round(box.x + box.width * 0.34);
  const touchY = Math.round(box.y + box.height * 0.62);

  await canvas.dispatchEvent('pointerdown', {
    pointerId: 41,
    pointerType: 'touch',
    isPrimary: true,
    clientX: touchX,
    clientY: touchY,
    bubbles: true
  });

  const joystick = page.locator('#joy');
  await expect(joystick).toBeVisible();
  const joyBox = await joystick.boundingBox();
  expect(joyBox).not.toBeNull();
  if (joyBox) {
    expect(Math.abs(joyBox.x + joyBox.width / 2 - touchX)).toBeLessThan(4);
    expect(Math.abs(joyBox.y + joyBox.height / 2 - touchY)).toBeLessThan(4);
  }

  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointerup', {
      pointerId: 41,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 140,
      clientY: 560,
      bubbles: true
    }));
  });
  await expect(joystick).toBeHidden();

  expect(pageErrors, `Fatal browser errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

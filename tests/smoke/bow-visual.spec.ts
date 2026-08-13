import { expect, test } from '@playwright/test';

const artifactDir = 'test-artifacts';

const pointerDown = (pointerId: number) => ({
  pointerId,
  pointerType: 'touch',
  isPrimary: true,
  button: 0,
  buttons: 1
});

const pointerUp = (pointerId: number) => ({
  pointerId,
  pointerType: 'touch',
  isPrimary: true,
  button: 0,
  buttons: 0
});

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

  const weapon = page.locator('#touchWeapon');
  for (const pointerId of [71, 72]) {
    await weapon.dispatchEvent('pointerdown', pointerDown(pointerId));
    await page.waitForTimeout(45);
    await weapon.dispatchEvent('pointerup', pointerUp(pointerId));
    await page.waitForTimeout(100);
  }

  const ready = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    if (!app) throw new Error('Facefall runtime is unavailable for bow inspection');
    const bow = app.player.root.getObjectByName('weapon-bow');
    const arrow = app.player.root.getObjectByName('bow-nocked-arrow');
    return {
      selected: app.weaponSystem.selected as string,
      bowVisible: Boolean(bow?.visible),
      arrowVisible: Boolean(arrow?.visible),
      magazine: app.weaponSystem.runtime('bow').magazine as number
    };
  });
  expect(ready.selected).toBe('bow');
  expect(ready.bowVisible).toBe(true);
  expect(ready.arrowVisible).toBe(true);
  expect(ready.magazine).toBe(1);
  await page.screenshot({ path: `${artifactDir}/mobile-bow-ready-third.png`, fullPage: true });

  const fire = page.locator('#touchFire');
  await fire.dispatchEvent('pointerdown', pointerDown(73));
  await page.waitForTimeout(120);
  await fire.dispatchEvent('pointerup', pointerUp(73));
  await page.waitForTimeout(70);

  const released = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    const arrow = app.player.root.getObjectByName('bow-nocked-arrow');
    return {
      magazine: app.weaponSystem.runtime('bow').magazine as number,
      arrowVisible: Boolean(arrow?.visible)
    };
  });
  expect(released.magazine).toBe(0);
  expect(released.arrowVisible).toBe(false);
  await page.screenshot({ path: `${artifactDir}/mobile-bow-release-third.png`, fullPage: true });

  await page.waitForTimeout(850);
  const reload = page.locator('#touchReload');
  await reload.dispatchEvent('pointerdown', pointerDown(74));
  await page.waitForTimeout(45);
  await reload.dispatchEvent('pointerup', pointerUp(74));
  await page.waitForTimeout(180);

  const drawing = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    const arrow = app.player.root.getObjectByName('bow-nocked-arrow');
    const string = app.player.root.getObjectByName('bow-string') as any;
    const positions = string?.geometry?.getAttribute('position');
    return {
      state: app.weaponSystem.runtime('bow').state as string,
      arrowVisible: Boolean(arrow?.visible),
      stringNockZ: positions ? positions.getZ(1) as number : 0
    };
  });
  expect(drawing.state).toBe('reloading');
  expect(drawing.arrowVisible).toBe(true);
  expect(drawing.stringNockZ).toBeLessThan(-0.05);
  await page.screenshot({ path: `${artifactDir}/mobile-bow-draw-third.png`, fullPage: true });

  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

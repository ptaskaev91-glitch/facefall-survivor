import { expect, test, type Page } from '@playwright/test';

const artifactDir = 'test-artifacts';

test.use({
  viewport: { width: 412, height: 915 },
  hasTouch: true,
  isMobile: true,
});

async function startAt(page: Page, atmosphere: 'dawn' | 'overcast' | 'dusk' | 'blood-moon'): Promise<any> {
  await page.goto(`/engine-lab.html?atmosphere=${atmosphere}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });
  await expect(page.locator('#status')).toContainText('nav=recast', { timeout: 20_000 });
  return page.evaluate(() => {
    const app = (window as any).__facefallApp;
    if (!app) throw new Error('Facefall runtime unavailable');
    return app.world.getAtmosphereDebugState();
  });
}

test('gameplay action controls are icon-only and suppress Android-style text selection', async ({ page }) => {
  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });

  for (const selector of ['#touchFire', '#touchReload', '#touchWeapon', '#touchCamera']) {
    const control = page.locator(selector);
    const result = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      const selectEvent = new Event('selectstart', { bubbles: true, cancelable: true });
      const contextEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      const selectDispatch = element.dispatchEvent(selectEvent);
      const contextDispatch = element.dispatchEvent(contextEvent);
      return {
        userSelect: style.userSelect,
        selectPrevented: !selectDispatch || selectEvent.defaultPrevented,
        contextPrevented: !contextDispatch || contextEvent.defaultPrevented,
        visibleText: element.textContent?.trim() ?? '',
        ariaLabel: element.getAttribute('aria-label') ?? '',
        svgCount: element.querySelectorAll('svg').length,
      };
    });

    expect(result.userSelect).toBe('none');
    expect(result.selectPrevented).toBe(true);
    expect(result.contextPrevented).toBe(true);
    expect(result.visibleText).toBe('');
    expect(result.ariaLabel.length).toBeGreaterThan(0);
    expect(result.svgCount).toBe(1);
  }

  expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
});

test('dawn, overcast and dusk expose distinct weather/light states', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const dawn = await startAt(page, 'dawn');
  expect(dawn.id).toBe('dawn');
  expect(dawn.fogDensity).toBeLessThan(0.015);
  expect(dawn.rainIntensity).toBeLessThan(0.15);

  const overcast = await startAt(page, 'overcast');
  expect(overcast.id).toBe('overcast');
  expect(overcast.rainIntensity).toBeGreaterThan(0.9);
  expect(overcast.stormIntensity).toBeGreaterThan(0.6);
  expect(overcast.fogDensity).toBeGreaterThan(dawn.fogDensity);
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${artifactDir}/mobile-overcast-rain.png`, fullPage: true });

  const dusk = await startAt(page, 'dusk');
  expect(dusk.id).toBe('dusk');
  expect(dusk.exposure).toBeLessThan(dawn.exposure);
  expect(dusk.rainIntensity).toBeLessThan(overcast.rainIntensity);
  expect(dusk.fogDensity).toBeGreaterThan(overcast.fogDensity);

  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

test('blood moon night limits distance readability but keeps the near zone lit', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const night = await startAt(page, 'blood-moon');
  expect(night.id).toBe('blood-moon');
  expect(night.bloodMoonVisible).toBe(true);
  expect(night.fogDensity).toBeGreaterThan(0.05);
  expect(night.exposure).toBeLessThan(0.8);
  expect(night.visibilityAt18m).toBeLessThan(0.4);
  expect(night.rainIntensity).toBeLessThan(0.1);

  const proximity = await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    const light = app?.world?.scene?.getObjectByName('blood-moon-proximity-light');
    if (!light) throw new Error('Blood Moon proximity light is missing');
    return { visible: light.visible, intensity: light.intensity, distance: light.distance };
  });
  expect(proximity.visible).toBe(true);
  expect(proximity.intensity).toBeGreaterThan(4.5);
  expect(proximity.distance).toBeLessThanOrEqual(10);

  await page.waitForTimeout(450);
  await page.screenshot({ path: `${artifactDir}/mobile-blood-moon-top.png`, fullPage: true });

  await page.locator('#camThird').click();
  await expect(page.locator('#status')).toContainText('camera=third');
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${artifactDir}/mobile-blood-moon-third.png`, fullPage: true });

  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

test('debug profiler exposes the active atmosphere preset', async ({ page }) => {
  await page.goto('/engine-lab.html?debug=1&atmosphere=blood-moon', { waitUntil: 'domcontentloaded' });
  const overlay = page.locator('#debugPerformance');
  await expect(overlay).toBeVisible();
  await expect.poll(async () => overlay.getAttribute('data-atmosphere'), { timeout: 5_000 }).toBe('blood-moon');
  await expect(overlay).toContainText('sky=blood-moon');
});

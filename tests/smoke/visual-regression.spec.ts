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

async function fireSelectedWeapon(page: any): Promise<boolean> {
  return page.evaluate(() => {
    const app = (window as any).__facefallApp;
    if (!app) throw new Error('Facefall runtime is unavailable for fire inspection');
    app.player.muzzle(app.muzzle);
    return app.weaponSystem.fire('player', app.muzzle, app.player.facing) as boolean;
  });
}

test('capture mobile TOP, 3RD, pistol fire/reload and uploaded-face checkpoints', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#makarFaceInput').setInputFiles({
    name: 'visual-smoke-face.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(testFaceSvg)
  });
  await expect(page.locator('#makarFacePreview')).toBeVisible();

  await page.locator('#menuCamTop').click();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${artifactDir}/mobile-top.png`, fullPage: true });

  await page.locator('#camThird').click();
  await expect(page.locator('#status')).toContainText('camera=third');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${artifactDir}/mobile-third.png`, fullPage: true });

  const magazineBefore = await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    if (!app) throw new Error('Facefall runtime is unavailable for ammo inspection');
    return app.weaponSystem.runtime().magazine as number;
  });

  // Visual regression owns the weapon/combat presentation, not TouchInput timing.
  // Fire through WeaponSystem so the same ShotEvent/CombatRuntime/animation chain runs
  // deterministically instead of depending on a synthetic held pointer event.
  expect(await fireSelectedWeapon(page)).toBe(true);

  await expect.poll(async () => page.evaluate(() => (window as any).__facefallApp.weaponSystem.runtime().magazine as number), {
    timeout: 3_000
  }).toBeLessThan(magazineBefore);
  await page.screenshot({ path: `${artifactDir}/mobile-pistol-fire-third.png`, fullPage: true });

  await expect.poll(async () => page.evaluate(() => (window as any).__facefallApp.weaponSystem.runtime().state as string), {
    timeout: 3_000
  }).toBe('idle');

  const reloadStarted = await page.evaluate(() => (window as any).__facefallApp.weaponSystem.reload() as boolean);
  expect(reloadStarted).toBe(true);
  await expect.poll(async () => page.evaluate(() => (window as any).__facefallApp.weaponSystem.runtime().state as string), {
    timeout: 3_000
  }).toBe('reloading');

  // Freeze reload pose and inspect the hero/front face deterministically.
  await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    if (!app) throw new Error('Facefall runtime is unavailable for reload inspection');
    app.pause();

    const player = app.player;
    const world = app.world;
    const position = player.position;
    const facing = player.facing;
    const camera = world.camera;

    camera.position.set(
      position.x + facing.x * 2.25,
      position.y + 1.55,
      position.z + facing.z * 2.25
    );
    camera.fov = 38;
    camera.lookAt(position.x, position.y + 1.38, position.z);
    camera.updateProjectionMatrix();
    world.render();
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: `${artifactDir}/mobile-pistol-reload-front.png`, fullPage: true });
  await page.screenshot({ path: `${artifactDir}/mobile-face-front.png`, fullPage: true });

  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});


test('capture mobile shotgun fire and reload production checkpoints', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#menuCamThird').click();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    app.weaponSystem.unlock('shotgun');
    if (!app.weaponSystem.select('shotgun')) throw new Error('Unable to select unlocked shotgun');
    app.player.setActiveWeapon('shotgun');
  });

  await expect.poll(async () => page.evaluate(() => {
    const app = (window as any).__facefallApp;
    return {
      selected: app.weaponSystem.selected as string,
      visible: Boolean(app.player.root.getObjectByName('weapon-shotgun')?.visible)
    };
  }), { timeout: 12_000 }).toMatchObject({ selected: 'shotgun', visible: true });

  const magazineBefore = await page.evaluate(() => (window as any).__facefallApp.weaponSystem.runtime('shotgun').magazine as number);
  expect(await fireSelectedWeapon(page)).toBe(true);

  await expect.poll(async () => page.evaluate(() => (window as any).__facefallApp.weaponSystem.runtime('shotgun').magazine as number), {
    timeout: 3_000
  }).toBeLessThan(magazineBefore);
  await page.screenshot({ path: `${artifactDir}/mobile-shotgun-fire-third.png`, fullPage: true });

  await expect.poll(async () => page.evaluate(() => (window as any).__facefallApp.weaponSystem.runtime('shotgun').state as string), {
    timeout: 3_000
  }).toBe('idle');

  const reloadStarted = await page.evaluate(() => (window as any).__facefallApp.weaponSystem.reload() as boolean);
  expect(reloadStarted).toBe(true);
  await expect.poll(async () => page.evaluate(() => (window as any).__facefallApp.weaponSystem.runtime('shotgun').state as string), {
    timeout: 3_000
  }).toBe('reloading');
  await page.screenshot({ path: `${artifactDir}/mobile-shotgun-reload-third.png`, fullPage: true });

  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

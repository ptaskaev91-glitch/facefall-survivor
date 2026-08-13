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

test('capture mobile TOP, 3RD, pistol fire/reload and uploaded-face checkpoints', async ({ page }) => {
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

  const magazineBefore = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    if (!app) throw new Error('Facefall runtime is unavailable for ammo inspection');
    return app.weaponSystem.runtime().magazine as number;
  });

  // FIRE is intentionally a held action in TouchInput. Keep pointerdown alive across
  // several fixed updates rather than using an instantaneous synthetic tap.
  const fire = page.locator('#touchFire');
  await fire.dispatchEvent('pointerdown', pointerDown(41));
  await page.waitForTimeout(110);
  await fire.dispatchEvent('pointerup', pointerUp(41));
  await page.waitForTimeout(40);

  const magazineAfter = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    if (!app) throw new Error('Facefall runtime is unavailable for ammo inspection');
    return app.weaponSystem.runtime().magazine as number;
  });
  expect(magazineAfter).toBeLessThan(magazineBefore);
  await page.screenshot({ path: `${artifactDir}/mobile-pistol-fire-third.png`, fullPage: true });

  // Let the short fire cooldown finish before asking WeaponSystem to enter reload.
  await page.waitForTimeout(450);
  const stateBeforeReload = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    if (!app) throw new Error('Facefall runtime is unavailable for reload inspection');
    return app.weaponSystem.runtime().state as string;
  });
  expect(stateBeforeReload).toBe('idle');

  const reload = page.locator('#touchReload');
  await reload.dispatchEvent('pointerdown', pointerDown(42));
  await page.waitForTimeout(45);
  await reload.dispatchEvent('pointerup', pointerUp(42));
  await page.waitForTimeout(110);

  const reloadState = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    if (!app) throw new Error('Facefall runtime is unavailable for reload inspection');
    return app.weaponSystem.runtime().state as string;
  });
  expect(reloadState).toBe('reloading');

  // Freeze reload pose and inspect the hero/front face deterministically.
  await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
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

  const weapon = page.locator('#touchWeapon');
  await weapon.dispatchEvent('pointerdown', pointerDown(61));
  await page.waitForTimeout(45);
  await weapon.dispatchEvent('pointerup', pointerUp(61));
  await page.waitForTimeout(120);

  const selected = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    if (!app) throw new Error('Facefall runtime is unavailable for weapon inspection');
    return app.weaponSystem.selected as string;
  });
  expect(selected).toBe('shotgun');

  const magazineBefore = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    return app.weaponSystem.runtime('shotgun').magazine as number;
  });

  const fire = page.locator('#touchFire');
  await fire.dispatchEvent('pointerdown', pointerDown(62));
  await page.waitForTimeout(120);
  await fire.dispatchEvent('pointerup', pointerUp(62));
  await page.waitForTimeout(70);

  const magazineAfter = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    return app.weaponSystem.runtime('shotgun').magazine as number;
  });
  expect(magazineAfter).toBeLessThan(magazineBefore);
  await page.screenshot({ path: `${artifactDir}/mobile-shotgun-fire-third.png`, fullPage: true });

  await page.waitForTimeout(700);
  const reload = page.locator('#touchReload');
  await reload.dispatchEvent('pointerdown', pointerDown(63));
  await page.waitForTimeout(45);
  await reload.dispatchEvent('pointerup', pointerUp(63));
  await page.waitForTimeout(130);

  const reloadState = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any };
    const app = runtimeWindow.__facefallApp;
    return app.weaponSystem.runtime('shotgun').state as string;
  });
  expect(reloadState).toBe('reloading');
  await page.screenshot({ path: `${artifactDir}/mobile-shotgun-reload-third.png`, fullPage: true });

  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

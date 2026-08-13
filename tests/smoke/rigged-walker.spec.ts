import { expect, test } from '@playwright/test';

const artifactDir = 'test-artifacts';

test.use({
  viewport: { width: 412, height: 915 },
  hasTouch: true,
  isMobile: true
});

test('Walker hydrates into rigged animated presentation without changing enemy root', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#menuCamThird').click();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });
  await page.waitForTimeout(900);

  const id = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any; __walkerSmokeId?: string };
    const app = runtimeWindow.__facefallApp;
    if (!app) throw new Error('Facefall runtime is unavailable for Walker smoke');
    const spawn = app.player.position.clone();
    spawn.x += 1.8;
    spawn.z -= 5.5;
    const actor = app.enemySystem.spawn('walker', spawn);
    if (!actor) throw new Error('Could not spawn Walker for visual smoke');
    runtimeWindow.__walkerSmokeId = actor.id;
    return actor.id as string;
  });
  expect(id).toContain('enemy-walker-');

  await page.waitForFunction(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any; __walkerSmokeId?: string };
    const app = runtimeWindow.__facefallApp;
    const id = runtimeWindow.__walkerSmokeId;
    return Boolean(app && id && app.enemySystem.rootFor(id)?.userData.riggedWalkerReady);
  }, undefined, { timeout: 20_000 });

  const firstPose = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any; __walkerSmokeId?: string };
    const root = runtimeWindow.__facefallApp?.enemySystem.rootFor(runtimeWindow.__walkerSmokeId);
    const thigh = root?.getObjectByName('thigh_l');
    return thigh ? thigh.quaternion.toArray() : null;
  });
  await page.waitForTimeout(650);

  const state = await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any; __walkerSmokeId?: string };
    const app = runtimeWindow.__facefallApp;
    const id = runtimeWindow.__walkerSmokeId;
    const root = app.enemySystem.rootFor(id);
    if (!root) throw new Error('Walker root disappeared');
    const rigged = root.getObjectByName('walker-rigged-visual');
    const fallbackTorso = root.children.find((child: any) => child.name === 'torso');
    const thigh = root.getObjectByName('thigh_l');
    let skinnedMeshes = 0;
    let missingTargetIds = 0;
    rigged?.traverse((object: any) => {
      if (object.isSkinnedMesh) skinnedMeshes += 1;
      if (object.isMesh && object.userData.damageTargetId !== id) missingTargetIds += 1;
    });
    const runtime = root.userData.riggedWalkerRuntime;
    return {
      ready: Boolean(root.userData.riggedWalkerReady),
      riggedVisible: Boolean(rigged?.visible),
      fallbackVisible: fallbackTorso?.visible ?? true,
      skinnedMeshes,
      missingTargetIds,
      animationClock: runtime?.clock ?? 0,
      motion: runtime?.active ?? null,
      thighPose: thigh?.quaternion.toArray() ?? null
    };
  });

  expect(state.ready).toBe(true);
  expect(state.riggedVisible).toBe(true);
  expect(state.fallbackVisible).toBe(false);
  expect(state.skinnedMeshes).toBeGreaterThan(0);
  expect(state.missingTargetIds).toBe(0);
  expect(state.animationClock).toBeGreaterThan(0);
  expect(['idle', 'walk']).toContain(state.motion);
  expect(state.thighPose).not.toEqual(firstPose);

  await page.evaluate(() => {
    const runtimeWindow = window as Window & { __facefallApp?: any; __walkerSmokeId?: string };
    const app = runtimeWindow.__facefallApp;
    const root = app.enemySystem.rootFor(runtimeWindow.__walkerSmokeId);
    app.pause();
    const camera = app.world.camera;
    camera.position.set(root.position.x + 2.9, root.position.y + 1.55, root.position.z + 3.6);
    camera.fov = 38;
    camera.lookAt(root.position.x, root.position.y + 1.0, root.position.z);
    camera.updateProjectionMatrix();
    app.world.render();
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${artifactDir}/mobile-rigged-walker-third.png`, fullPage: true });

  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

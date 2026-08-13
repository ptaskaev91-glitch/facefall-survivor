import { expect, test } from '@playwright/test';

const artifactDir = 'test-artifacts';

test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

test('Walker Runner and Brute reuse one rigged asset with distinct presentation and bone hit zones', async ({ page }) => {
  const errors: string[] = [];
  let zombieRequests = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('/assets/enemies/mesh2motion-human-zombie/human-zombie.glb')) zombieRequests += 1;
  });

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#menuCamThird').click();
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });

  const ids = await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    if (!app) throw new Error('Facefall runtime unavailable');
    app.enemySystem.reset();
    const p = app.player.position.clone();
    const placements = [
      ['walker', -2.3, -6.2],
      ['runner', 0, -6.6],
      ['brute', 2.5, -7.0]
    ] as const;
    return placements.map(([type, x, z]) => {
      const at = p.clone(); at.x += x; at.z += z;
      const actor = app.enemySystem.spawn(type, at);
      if (!actor) throw new Error(`Failed to spawn ${type}`);
      return actor.id;
    });
  });

  await page.waitForFunction((enemyIds) => {
    const app = (window as any).__facefallApp;
    return enemyIds.every((id: string) => app.enemySystem.rootFor(id)?.userData.riggedInfectedReady);
  }, ids, { timeout: 20_000 });
  await page.waitForTimeout(250);

  const state = await page.evaluate((enemyIds) => {
    const app = (window as any).__facefallApp;
    return enemyIds.map((id: string) => {
      const root = app.enemySystem.rootFor(id);
      const zones = new Set<string>();
      let colliderCount = 0;
      let skinnedMeshes = 0;
      root.traverse((object: any) => {
        if (object.isSkinnedMesh) skinnedMeshes += 1;
        if (object.userData.damageCollider) {
          colliderCount += 1;
          zones.add(object.userData.hitZone);
        }
      });
      const wrapper = root.getObjectByName('infected-rigged-visual');
      const model = wrapper?.children.find((child: any) => /-rigged-model$/.test(child.name));
      return {
        id,
        type: root.userData.productionInfectedType,
        asset: root.userData.productionAsset,
        rootScale: root.scale.x,
        modelScaleX: model?.scale.x ?? 0,
        modelScaleZ: model?.scale.z ?? 0,
        colliderCount,
        zones: [...zones],
        skinnedMeshes,
        fallbackVisible: root.children.some((child: any) => child.name === 'torso' && child.visible)
      };
    });
  }, ids);

  expect(state.map((item) => item.type)).toEqual(['walker', 'runner', 'brute']);
  expect(new Set(state.map((item) => item.asset)).size).toBe(1);
  expect(state.every((item) => item.skinnedMeshes > 0)).toBe(true);
  expect(state.every((item) => item.colliderCount >= 8)).toBe(true);
  expect(state.every((item) => item.zones.includes('head') && item.zones.includes('torso') && item.zones.includes('limb'))).toBe(true);
  expect(state.every((item) => !item.fallbackVisible)).toBe(true);
  expect(state[1].rootScale).toBeLessThan(state[0].rootScale);
  expect(state[2].rootScale).toBeGreaterThan(state[0].rootScale);
  expect(state[1].modelScaleX).toBeLessThan(state[0].modelScaleX);
  expect(state[2].modelScaleX).toBeGreaterThan(state[0].modelScaleX);
  expect(zombieRequests).toBeLessThanOrEqual(1);

  const reactions = await page.evaluate((enemyIds) => {
    const app = (window as any).__facefallApp;
    const [walkerId, runnerId, bruteId] = enemyIds;
    app.enemySystem.stagger(runnerId, 0.4);
    const runner = app.enemySystem.rootFor(runnerId);
    const stagger = runner.userData.riggedInfectedRuntime?.action;
    app.enemySystem.kill(bruteId);
    const brute = app.enemySystem.rootFor(bruteId);
    const death = brute.userData.riggedInfectedRuntime?.action;
    const visibleDuringDeath = brute.visible;
    const walker = app.enemySystem.rootFor(walkerId);
    walker.position.copy(app.player.position).add({ x: 0.3, y: 0, z: -0.4 } as any);
    return { stagger, death, visibleDuringDeath };
  }, ids);
  expect(reactions.stagger).toBe('stagger');
  expect(reactions.death).toBe('death');
  expect(reactions.visibleDuringDeath).toBe(true);

  await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    app.pause();
    const ids = [...app.enemySystem.meshes].map((root: any) => root.userData.damageTargetId).filter(Boolean);
    const roots = ids.map((id: string) => app.enemySystem.rootFor(id)).filter(Boolean);
    if (!roots.length) return;
    const center = roots.reduce((acc: any, root: any) => acc.add(root.position), roots[0].position.clone().set(0, 0, 0)).multiplyScalar(1 / roots.length);
    app.world.camera.position.set(center.x + 6.8, center.y + 3.1, center.z + 8.8);
    app.world.camera.fov = 42;
    app.world.camera.lookAt(center.x, center.y + 1.0, center.z);
    app.world.camera.updateProjectionMatrix();
    app.world.render();
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${artifactDir}/mobile-production-infected-third.png`, fullPage: true });

  expect(errors, `Fatal browser errors: ${errors.join(' | ')}`).toEqual([]);
});

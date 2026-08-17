import { expect, test } from '@playwright/test';

test('infected use LOS memory and hearing without reading a hidden player position', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/engine-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('state=playing', { timeout: 20_000 });

  const result = await page.evaluate(() => {
    const app = (window as any).__facefallApp;
    app.loop.stop();
    app.waveDirector.stop();
    app.enemySystem.reset();

    const player = app.player.position.clone();
    const spawn = player.clone().set(player.x + 8, player.y, player.z);
    const farSpawn = player.clone().set(player.x + 30, player.y, player.z);
    const actor = app.enemySystem.spawn('walker', spawn);
    const farActor = app.enemySystem.spawn('walker', farSpawn);
    if (!actor || !farActor) throw new Error('failed to spawn perception smoke actors');

    // Force the first perception sample to report no LOS. The actor must not
    // silently read the player's real position through the blocked sight state.
    app.enemySystem.options.canSeeTarget = () => false;
    actor.alertTimer = 0;
    actor.targetStickTimer = 0;
    actor.perceptionTimer = 0;
    actor.steeringTimer = 0;
    app.enemySystem.update(1 / 60, player, () => {});
    const hiddenState = {
      intent: actor.currentIntent,
      lastKnown: actor.lastKnownTarget.toArray(),
      spawn: spawn.toArray(),
    };

    // A nearby sound should redirect investigation, while an actor outside the
    // hearing radius should keep its previous target memory.
    const noise = player.clone().set(player.x + 1, player.y, player.z + 2);
    const farBefore = farActor.lastKnownTarget.clone().toArray();
    app.enemySystem.hearNoise(noise, 12, 2.5);
    const heardState = {
      alert: actor.alertTimer,
      targetStick: actor.targetStickTimer,
      lastKnown: actor.lastKnownTarget.toArray(),
      noise: noise.toArray(),
      farBefore,
      farAfter: farActor.lastKnownTarget.toArray(),
    };

    // Restore LOS and verify the visible target switches to chase and refreshes
    // last-known position from the actual player location.
    app.enemySystem.options.canSeeTarget = () => true;
    actor.perceptionTimer = 0;
    app.enemySystem.update(1 / 60, player, () => {});
    const visibleState = {
      hasLineOfSight: actor.hasLineOfSight,
      intent: actor.currentIntent,
      targetStick: actor.targetStickTimer,
      lastKnown: actor.lastKnownTarget.toArray(),
      player: player.toArray(),
    };

    // Breaking LOS should retain chase briefly, but only toward the last visible
    // point. Once the sticky timer expires the same alert falls back to investigate.
    app.enemySystem.options.canSeeTarget = () => false;
    actor.perceptionTimer = 0;
    app.enemySystem.update(1 / 60, player, () => {});
    const stickyState = {
      hasLineOfSight: actor.hasLineOfSight,
      intent: actor.currentIntent,
      targetStick: actor.targetStickTimer,
      lastKnown: actor.lastKnownTarget.toArray(),
    };
    actor.targetStickTimer = 0;
    actor.perceptionTimer = 0;
    app.enemySystem.update(1 / 60, player, () => {});
    const investigateState = { intent: actor.currentIntent, alert: actor.alertTimer };

    return { hiddenState, heardState, visibleState, stickyState, investigateState };
  });

  expect(result.hiddenState.intent).toBe('wander');
  expect(result.hiddenState.lastKnown).toEqual(result.hiddenState.spawn);

  expect(result.heardState.alert).toBeGreaterThanOrEqual(2.5);
  expect(result.heardState.targetStick).toBe(0);
  expect(result.heardState.lastKnown).toEqual(result.heardState.noise);
  expect(result.heardState.farAfter).toEqual(result.heardState.farBefore);

  expect(result.visibleState.hasLineOfSight).toBe(true);
  expect(result.visibleState.intent).toBe('chase');
  expect(result.visibleState.targetStick).toBeGreaterThan(0);
  expect(result.visibleState.lastKnown).toEqual(result.visibleState.player);

  expect(result.stickyState.hasLineOfSight).toBe(false);
  expect(result.stickyState.intent).toBe('chase');
  expect(result.stickyState.targetStick).toBeGreaterThan(0);
  expect(result.stickyState.lastKnown).toEqual(result.visibleState.player);
  expect(result.investigateState.intent).toBe('investigate');
  expect(result.investigateState.alert).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);
});

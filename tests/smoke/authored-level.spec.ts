import { expect, test } from '@playwright/test';
test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
test('Abandoned Outskirts loads authored GLB as active world', async ({ page }) => {
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/engine-lab.html',{waitUntil:'domcontentloaded'}); await page.locator('#menuCamThird').click(); await page.locator('#startGame').click();
  await expect(page.locator('#status')).toContainText('level=abandoned-outskirts',{timeout:20000});
  const state=await page.evaluate(()=>{const app=(window as any).__facefallApp; const names:string[]=[]; app.world.scene.traverse((o:any)=>names.push(o.name)); return {garage:names.includes('garage-shell'),house:names.includes('house-shell'),car:names.includes('car-body'),fallback:app.world.scene.getObjectByName('lab-fallback')};});
  expect(state.garage&&state.house&&state.car).toBe(true); expect(state.fallback).toBeFalsy(); expect(errors).toEqual([]);
  await page.evaluate(()=>{const app=(window as any).__facefallApp; app.pause(); const c=app.world.camera; c.position.set(10,7,20); c.fov=48; c.lookAt(0,1,-6); c.updateProjectionMatrix(); app.world.render();}); await page.screenshot({path:'test-artifacts/mobile-authored-outskirts-third.png',fullPage:true});
});

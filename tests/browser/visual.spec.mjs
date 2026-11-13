import { test, expect, routes, visit, navigate, freezeDecorations, armCompositorCapture, seekCaptured } from './fixtures.mjs';
import { fileURLToPath } from 'node:url';

const countStyles = fileURLToPath(new URL('./screenshot.css', import.meta.url));

test.beforeEach(async ({}, testInfo) => {
  test.skip(['firefox', 'webkit'].includes(testInfo.project.name), 'Golden pixels use the pinned Chromium/Windows renderer; behavior still runs across engines.');
});

test('four production page viewports retain the approved composition', async ({ page }) => {
  await visit(page);
  for (const route of routes) {
    if (route.name !== 'Home') await navigate(page, route.name);
    await freezeDecorations(page);
    // Publishing an article should not require approving new design goldens.
    // Counts/lists are verified semantically by build and behavior tests.
    const options = {};
    if (route.name === 'Writing') {
      const head = await page.locator('.vs-page-head').boundingBox();
      options.clip = { x: 0, y: 0, width: page.viewportSize().width, height: Math.ceil(head.y + head.height) };
      options.stylePath = countStyles;
    } else if (route.name === 'Home') options.stylePath = countStyles;
    await expect(page).toHaveScreenshot(`${route.name.toLowerCase()}-rest.png`, options);
  }
});

test('native return filmstrip protects blending, grain and title handoff', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'One full compositor filmstrip; other widths have behavior and resting pixels.');
  await visit(page);
  await navigate(page, 'About');
  await freezeDecorations(page);
  await armCompositorCapture(page);
  await page.locator('.nv-nav').getByRole('link', { name: 'Home', exact: true }).click();
  expect(await page.evaluate(() => window.__captureReady)).toBeGreaterThan(2);
  // Pause real browser animations, then seek their actual compositor effects.
  // Never use screenshot's default animation disabling: it skips the regression frames.
  for (const time of [0, 160, 270]) {
    await seekCaptured(page, time);
    await expect(page).toHaveScreenshot(`home-return-${time}ms.png`);
  }
  await page.evaluate(() => {
    for (const animation of window.__capturedAnimations) {
      if (animation.effect?.pseudoElement) animation.finish();
      else animation.currentTime = 280;
    }
  });
  await page.evaluate(() => window.__nativeTransition.finished);
  await freezeDecorations(page);
  await expect(page).toHaveScreenshot('home-return-live-280ms.png');
  for (const time of [690, 1010]) {
    await page.evaluate(time => {
      for (const animation of window.__capturedAnimations) if (!animation.effect?.pseudoElement) animation.currentTime = time;
    }, time);
    await expect(page).toHaveScreenshot(`home-return-live-${time}ms.png`);
  }
  await page.evaluate(() => {
    for (const animation of window.__capturedAnimations) if (!animation.effect?.pseudoElement) animation.finish();
  });
});

test('interior handoff keeps the sky painted during the old blank interval', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'One compositor frame for the reported full-width gap.');
  await visit(page, '/archive/');
  await freezeDecorations(page);
  await armCompositorCapture(page);
  await page.locator('.nv-nav').getByRole('link', { name: 'Links', exact: true }).click();
  expect(await page.evaluate(() => window.__captureReady)).toBeGreaterThan(1);
  await seekCaptured(page, 65);
  await expect(page).toHaveScreenshot('writing-links-65ms.png', {
    clip: { x: 0, y: 98, width: page.viewportSize().width, height: 48 },
  });
  await page.evaluate(() => window.__capturedAnimations.forEach(animation => animation.finish()));
  await page.evaluate(() => window.__nativeTransition.finished);
});

test('native departure filmstrip protects outgoing additive lettering and planet', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Full departure capture in the reference compositor.');
  await visit(page);
  await freezeDecorations(page);
  await armCompositorCapture(page);
  await page.locator('.nv-nav').getByRole('link', { name: 'About', exact: true }).click();
  expect(await page.evaluate(() => window.__captureReady)).toBeGreaterThan(2);
  for (const time of [0, 80, 200]) {
    await seekCaptured(page, time);
    await expect(page).toHaveScreenshot(`home-departure-${time}ms.png`);
  }
  await page.evaluate(() => {
    for (const animation of window.__capturedAnimations) animation.finish();
  });
  await page.evaluate(() => window.__nativeTransition.finished);
});

test('opening pixels preserve the two slow title reveals and horizon', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'First-entry compositor baseline.');
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('.nv-horizon')?.getAnimations().length > 0);
  await page.evaluate(async () => {
    window.__capturedAnimations = document.getAnimations().filter(animation =>
      animation.effect?.target?.matches?.('.nv-title-first, .nv-titleblock h1 em, .nv-horizon'));
    for (const animation of window.__capturedAnimations) animation.pause();
    await document.fonts.ready;
  });
  expect(await page.evaluate(() => window.__capturedAnimations.length)).toBe(3);
  for (const time of [0, 1000, 2740]) {
    await seekCaptured(page, time);
    await expect(page).toHaveScreenshot(`home-opening-${time}ms.png`);
  }
  await page.evaluate(() => {
    for (const animation of window.__capturedAnimations) animation.finish();
  });
});

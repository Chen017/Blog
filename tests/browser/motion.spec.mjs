import { test, expect, visit, navigate, settled } from './fixtures.mjs';

test('fresh Home opens each title line once at the established slow timing', async ({ page }) => {
  await page.goto('/');
  await settled(page);
  const probe = await page.evaluate(() => window.__motionProbe);
  for (const [target, duration, delay] of [['first', 1800, 450], ['space', 2100, 550]]) {
    const calls = probe.calls.filter(call => call.target === target);
    expect(calls).toHaveLength(1);
    expect(calls[0].timing).toMatchObject({ duration, delay, fill: 'both' });
    expect(calls[0].pose.opacity).toBeCloseTo(0.45, 2);
  }
  await expect(page.locator('.nv-title-first')).toHaveCSS('opacity', '1');
  await expect(page.locator('.nv-titleblock h1 em')).toHaveCSS('translate', 'none');
  await navigate(page, 'Writing');
  await navigate(page, 'Home');
  const durations = await page.evaluate(() => window.__motionProbe.calls.filter(call => ['first', 'space'].includes(call.target)).map(call => call.timing.duration));
  expect(durations.filter(duration => duration === 1800 || duration === 2100)).toHaveLength(2);
});

test('both return lines are staged before paint and start before the slide finishes', async ({ page }) => {
  await visit(page);
  for (const name of ['Writing', 'Links', 'About']) {
    await navigate(page, name);
    await page.evaluate(() => { window.__motionProbe.calls = []; window.__motionProbe.frames = []; window.__motionProbe.recording = true; });
    await navigate(page, 'Home');
    const probe = await page.evaluate(() => { window.__motionProbe.recording = false; return window.__motionProbe; });
    const transition = probe.transitions.at(-1);
    // Fallback navigation is covered separately; do not mistake it for native transition evidence.
    expect(transition?.ready, 'this scenario requires native View Transitions').toBeGreaterThan(0);
    expect(probe.staged.prepared).toBe(true);
    expect(probe.staged.first.opacity).toBeCloseTo(0.45, 2);
    expect(probe.staged.first.translate).toBe('0px 12px');
    expect(probe.staged.space.translate).toBe('0px 8px');
    expect(probe.staged.space.rotate).toBe('-2deg');
    for (const [target, duration, delay] of [['first', 580, 110], ['space', 820, 190]]) {
      const calls = probe.calls.filter(call => call.target === target);
      expect(calls).toHaveLength(1);
      expect(calls[0].timing).toMatchObject({ duration, delay, fill: 'both' });
      expect(calls[0].time).toBeLessThan(transition.end);
    }
    const frames = probe.frames.filter(frame => frame.path === '/' && frame.space);
    expect(frames.length).toBeGreaterThan(3);
    const duringSlide = frames.filter(frame => frame.time < transition.end);
    expect(duringSlide.some(frame => frame.first.opacity > 0.46), 'Etalib’s must visibly progress during the slide').toBe(true);
    expect(duringSlide.some(frame => (Number.parseFloat(frame.space.translate.split(' ').at(-1)) || 0) < 7.9),
      'Space. must visibly progress before the slide completes').toBe(true);
    for (const frame of frames) {
      expect(frame.title.blend).toBe('plus-lighter');
      expect(frame.grain.display).not.toBe('none');
      expect(frame.space.opacity).toBe(1);
    }
    // A normal pose followed by a lower pose would produce a positive Y jump.
    const ys = frames.map(frame => Number.parseFloat(frame.space.translate.split(' ').at(-1)) || 0);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeLessThan(0.5);
    await expect(page.locator('.nv-title-first')).toHaveCSS('opacity', '1');
    await expect(page.locator('.nv-titleblock h1 em')).toHaveCSS('rotate', 'none');
    expect(await page.locator('.nv-titleblock h1').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  }
});

test('native slide direction follows the tab order in both directions', async ({ page }) => {
  await visit(page);
  for (const [name, slide] of [['About', 'astroSlideFromRight'], ['Writing', 'astroSlideFromLeft'], ['Links', 'astroSlideFromRight'], ['Home', 'astroSlideFromLeft']]) {
    await navigate(page, name);
    const transition = await page.evaluate(() => window.__motionProbe.transitions.at(-1));
    expect(transition?.ready).toBeGreaterThan(0);
    const animation = transition.animations.find(animation => animation.name === slide);
    expect(animation, JSON.stringify(transition.animations)).toBeTruthy();
    expect(animation.timing.duration).toBe(280);
    const xs = animation.frames.map(frame => frame.transform);
    expect(xs[0]).not.toBe(xs.at(-1));
    // Engines serialize translateX as translate when the Y coordinate is zero.
    expect(xs[0]).toMatch(slide.endsWith('Right') ? /^translate(?:X)?\(100%\)$/ : /^translate(?:X)?\(-100%\)$/);
  }
});

test('interior headings keep their separate staggered entrances', async ({ page }) => {
  await visit(page);
  for (const name of ['Writing', 'Links', 'About']) {
    await page.evaluate(() => { window.__motionProbe.calls = []; });
    await navigate(page, name);
    const calls = await page.evaluate(() => window.__motionProbe.calls);
    const heading = calls.filter(call => call.target === 'H1');
    const flourish = calls.filter(call => call.target === 'EM');
    expect(heading).toHaveLength(1);
    expect(flourish).toHaveLength(1);
    expect(heading[0].timing).toMatchObject({ duration: 580, delay: 110 });
    expect(flourish[0].timing).toMatchObject({ duration: 820, delay: 190 });
  }
});

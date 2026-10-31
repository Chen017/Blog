import { test, expect, routes, visit, navigate, settled } from './fixtures.mjs';

test('all twelve directed tab routes preserve headings, header and current page', async ({ page }) => {
  await visit(page);
  // Eulerian tour of the four-tab directed graph: every pair in both directions.
  for (const name of ['Writing', 'Home', 'Links', 'Home', 'About', 'Writing', 'Links', 'Writing', 'About', 'Links', 'About', 'Home']) {
    const before = await page.locator('.nv-header').boundingBox();
    await navigate(page, name);
    const route = routes.find(route => route.name === name);
    await expect(page.locator(route.heading)).toBeVisible();
    await expect(page.locator('.nv-nav [aria-current="page"]')).toHaveText(name);
    expect((await page.locator('.nv-header').boundingBox()).y).toBeCloseTo(before.y, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('keyboard navigation and search failure/retry restore focus and remain usable after history', async ({ page }) => {
  await visit(page);
  const writing = page.locator('.nv-nav').getByRole('link', { name: 'Writing', exact: true });
  await writing.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/archive\/$/);
  await settled(page);
  await page.route('**/pagefind/**', route => route.abort('failed'));
  const trigger = page.getByRole('button', { name: 'Search', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#search-input')).toBeFocused();
  await expect(page.locator('#search-panel').getByRole('status')).toContainText('Search could not load');
  await page.unroute('**/pagefind/**');
  await page.getByRole('button', { name: 'Retry loading search' }).click();
  await expect(page.locator('#search-panel').getByRole('status')).toContainText('Search titles and article content');
  await page.locator('#search-input').fill('music');
  await expect(page.locator('.search-result').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.locator('#search-panel')).toHaveAttribute('inert', '');
  await page.goBack();
  await settled(page);
  await trigger.click();
  await expect(page.locator('#search-input')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

for (const activation of ['keyboard', 'pointer']) {
test(`entry history restores filter, sort, source card, scroll and input-specific focus (${activation})`, async ({ page, hasTouch }) => {
  await visit(page);
  const category = page.locator('.nv-filters button').nth(1);
  await category.click();
  const selectedCategory = await category.getAttribute('data-category');
  await page.locator('.nv-order-menu summary').click();
  await page.locator('.nv-order-options [data-order="oldest"]').click();
  const card = page.locator('.nv-entry:not([hidden])').first();
  const cardId = await card.getAttribute('id');
  const link = card.locator('a').first();
  await link.scrollIntoViewIfNeeded();
  if (activation === 'keyboard') await link.focus();
  const scroll = await page.evaluate(() => scrollY);
  if (activation === 'keyboard') await page.keyboard.press('Enter');
  else if (hasTouch) await link.tap();
  else await link.click();
  await expect(page).toHaveURL(/\/posts\//);
  await settled(page);
  await expect(page.locator('.vs-article-head h1')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await settled(page);
  await expect(page.locator('.nv-filters [aria-pressed="true"]')).toHaveAttribute('data-category', selectedCategory);
  await expect(page.locator('.nv-order select')).toHaveValue('oldest');
  if (activation === 'keyboard') await expect(page.locator(`#${cardId} a`).first()).toBeFocused();
  else await expect(page.locator(`#${cardId} a`).first()).not.toBeFocused();
  expect(Math.abs(await page.evaluate(() => scrollY) - scroll)).toBeLessThan(100);
  await page.goForward();
  await expect(page).toHaveURL(/\/posts\//);
  await settled(page);
});
}

test('rapid navigation interrupts old work and the final page remains interactive', async ({ page }) => {
  await visit(page);
  // Real anchors, with second activation inside a running native transition.
  await page.evaluate(async () => {
    const click = name => [...document.querySelectorAll('.nv-nav a')].find(a => a.textContent === name).click();
    click('Writing');
    await new Promise(resolve => document.addEventListener('astro:after-swap', resolve, { once: true }));
    click('Links');
    await new Promise(resolve => document.addEventListener('astro:after-swap', resolve, { once: true }));
    click('Home');
  });
  await expect(page).toHaveURL(/\/$/);
  await settled(page);
  await expect(page.locator('.nv-nav [aria-current]')).toHaveText('Home');
  await expect(page.locator('html')).not.toHaveAttribute('data-voyage-home-fold-deferred', '');
  await page.locator('.nv-filters button').nth(1).click();
  await expect(page.locator('.nv-filters button').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await navigate(page, 'About');
});

test('reduced motion on entry and while animating cancels decorative motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visit(page, '/', false);
  expect(await page.evaluate(() => window.__motionProbe.calls.filter(a => ['first', 'space'].includes(a.target)))).toEqual([]);
  await expect(page.locator('[data-binary]')).toBeDisabled();
  await navigate(page, 'Writing');
  await navigate(page, 'Home');
  await expect(page.locator('.nv-title-first')).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('[data-binary]')).toBeEnabled();
  await page.locator('[data-binary]').focus();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Media-query change events are delivered asynchronously by browser engines.
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await expect.poll(() => page.locator('.nv-dot-a').evaluate(el => el.getAnimations().length)).toBe(0);
  await page.goBack();
  await settled(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
});

test('missing optional browser APIs and blocked storage keep content navigable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'IntersectionObserver', { value: undefined, configurable: true });
    delete window.IntersectionObserver;
    Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await page.goto('/');
  await settled(page);
  await expect(page.locator('.nv-titleblock h1')).toBeVisible();
  await navigate(page, 'Links');
  await navigate(page, 'Home');
  await expect(page.locator('.nv-entry').first()).toBeVisible();
});

test('a failed speculative tab fetch is not cached as a successful destination', async ({ page }) => {
  let failures = 0;
  await page.route('**/archive/', route => {
    failures++;
    return route.fulfill({ status: 503, contentType: 'text/html', body: 'Temporarily unavailable' });
  });
  await visit(page);
  await expect.poll(() => failures).toBeGreaterThan(0);
  await page.unroute('**/archive/');
  await navigate(page, 'Writing');
  await expect(page.locator('.vs-page-head h1')).toContainText('years.');
});

test('reduced transparency replaces additive text with solid readable lettering', async ({ page, browserName, context }) => {
  test.skip(browserName !== 'chromium', 'CDP media emulation is Chromium-specific.');
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  await visit(page);
  await expect(page.locator('.nv-titleblock h1')).toHaveCSS('mix-blend-mode', 'normal');
  await expect(page.locator('.nv-title-first')).toHaveCSS('color', 'rgb(224, 224, 224)');
  await navigate(page, 'Links');
  await navigate(page, 'Home');
  await expect(page.locator('.nv-titleblock h1')).toHaveCSS('mix-blend-mode', 'normal');
  await session.detach();
});

test('no JavaScript still exposes the four pages and article content', async ({ browser, baseURL, viewport, hasTouch, isMobile }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport, hasTouch, isMobile });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
    ? route.continue() : route.fulfill({ status: 204, body: '' }));
  const page = await context.newPage();
  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.locator(route.heading)).toBeVisible();
    await expect(page.locator('.nv-nav a')).toHaveCount(4);
  }
  await page.goto('/');
  await page.locator('.nv-entry a').first().click();
  await expect(page.locator('.vs-article-head h1')).toBeVisible();
  await context.close();
});

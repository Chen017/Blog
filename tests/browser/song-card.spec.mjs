import { test, expect, visit } from './fixtures.mjs';

test('song progress stays in place as the time changes', async ({ page }) => {
  await visit(page, '/posts/happy-new-year-2026/');
  await page.evaluate(() => document.fonts.ready);
  const card = page.locator('[data-song-card="true"]').first();
  const current = card.locator('[data-player-current="true"]');
  const duration = card.locator('[data-player-duration="true"]');
  const progress = card.locator('[data-player-progress-wrap="true"]');
  await expect(progress).toBeVisible();
  const initial = await progress.boundingBox();
  for (const value of ['0:00', '1:01', '1:02', '9:59', '10:00', '99:59']) {
    await current.evaluate((element, text) => { element.textContent = text; }, value);
    await duration.evaluate(element => { element.textContent = '99:59'; });
    const box = await progress.boundingBox();
    expect(box.x).toBeCloseTo(initial.x, 1);
    expect(box.width).toBeCloseTo(initial.width, 1);
  }
});

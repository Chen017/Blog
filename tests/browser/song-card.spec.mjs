import { test, expect, visit } from './fixtures.mjs';

test('song elapsed time keeps each position stable without extra gaps', async ({ page }) => {
  await visit(page, '/posts/happy-new-year-2026/');
  const card = page.locator('[data-song-card="true"]').first();
  await expect(card).toHaveAttribute('data-song-bound-version', 'song-card-v7');
  await page.evaluate(() => document.fonts.ready);
  const audio = card.locator('[data-song-audio="true"]');
  const current = card.locator('[data-player-current="true"]');
  const duration = card.locator('[data-player-duration="true"]');
  const progress = card.locator('[data-player-progress-wrap="true"]');

  const setDuration = seconds => audio.evaluate((element, value) => {
    Object.defineProperty(element, 'duration', { configurable: true, value });
    element.dispatchEvent(new Event('loadedmetadata'));
  }, seconds);
  const setTime = seconds => audio.evaluate((element, value) => {
    Object.defineProperty(element, 'currentTime', { configurable: true, value });
    element.dispatchEvent(new Event('timeupdate'));
  }, seconds);
  const positions = () => current.evaluate(element => {
    const node = element.firstChild;
    return [...node.textContent].map((_, index) => {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const box = range.getBoundingClientRect();
      return { x: box.x, width: box.width };
    });
  });

  await setDuration(267);
  await setTime(51);
  await expect(current).toHaveText('0:51');
  const before = await positions();
  const initialProgress = await progress.boundingBox();
  expect((await current.boundingBox()).width).toBeCloseTo(before[0].width * 4, 0);
  const durationTextWidth = await duration.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect().width;
  });
  expect((await duration.boundingBox()).width).toBeCloseTo(durationTextWidth, 0);

  for (const [seconds, label] of [[52, '0:52'], [59, '0:59'], [60, '1:00']]) {
    await setTime(seconds);
    await expect(current).toHaveText(label);
    const after = await positions();
    after.forEach((position, index) => expect(position.x).toBeCloseTo(before[index].x, 1));
    expect((await progress.boundingBox()).x).toBeCloseTo(initialProgress.x, 1);
  }

  await setDuration(900);
  await setTime(599);
  const beforeMinuteChange = await positions();
  const longTrackProgress = await progress.boundingBox();
  await setTime(600);
  await expect(current).toHaveText('10:00');
  const afterMinuteChange = await positions();
  expect(afterMinuteChange[2].x).toBeCloseTo(beforeMinuteChange[1].x, 1);
  expect((await progress.boundingBox()).x).toBeCloseTo(longTrackProgress.x, 1);
});

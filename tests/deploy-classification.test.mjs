import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isContentOnly, classify } from '../scripts/classify-deploy.mjs';

test('only post documents and supported colocated media use the content path', () => {
  assert.equal(isContentOnly(['src/content/posts/hello/index.md', 'src/content/posts/hello/cover.webp']), true);
  assert.equal(isContentOnly(['src/content/posts/hello/index.mdx', 'src/content/posts/hello/audio.mp3']), true);
  assert.equal(isContentOnly(['public/assets/media/audio.mp3', 'public/assets/images/a.png']), true);
  for (const paths of [[], ['src/content/posts/a/index.md', 'src/layouts/home.astro'], ['src/content/posts/a/script.js'], ['public/assets/images/a.js'], ['.github/workflows/deploy.yml']]) {
    assert.equal(isContentOnly(paths), false);
  }
  assert.equal(classify('0'.repeat(40), 'a'.repeat(40)), false);
  assert.equal(classify('f'.repeat(40), 'a'.repeat(40)), false);
});

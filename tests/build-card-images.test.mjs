import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import { verifyCardImages } from '../scripts/lib/verify-card-images.mjs';

test('publishing an external or public cover does not fail the static build check', async () => {
  const output = await mkdtemp(join(tmpdir(), 'blog-covers-'));
  try {
    await mkdir(join(output, '_astro'));
    await mkdir(join(output, 'assets'));
    await writeFile(join(output, '_astro/cover.webp'), 'image');
    await writeFile(join(output, 'assets/upload.png'), 'image');
    await writeFile(join(output, 'assets/my cover.png'), 'image');
    await verifyCardImages(parse(`<div class="post-card">
      <img src="https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/Googleplex.jpg">
      <img src="/assets/upload.png"><img src="/_astro/cover.webp" srcset="/_astro/cover.webp 640w">
      <img src="/assets/my%20cover.png?v=2">
    </div>`), output);
    await assert.rejects(verifyCardImages(parse('<div class="post-card"><img src="/_astro/cover.webp"></div>'), output), /responsive/);
    await assert.rejects(verifyCardImages(parse('<div class="post-card"><img src="/assets/missing.png"></div>'), output), { code: 'ENOENT' });
    await assert.rejects(verifyCardImages(parse('<div class="post-card"><img src=""></div>'), output), /URL/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

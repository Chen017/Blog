import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { optimizePictureFormats } from '../scripts/lib/optimize-picture-formats.mjs';

test('prefer AVIF only when every responsive width is smaller, preserving WebP and no-JS fallbacks', async () => {
  const output = await mkdtemp(join(tmpdir(), 'blog-picture-formats-'));
  try {
    await mkdir(join(output, '_astro'));
    for (const [file, length] of [['small.avif', 5], ['large.avif', 30], ['small.webp', 10], ['large.webp', 20]]) {
      await writeFile(join(output, '_astro', file), Buffer.alloc(length));
    }
    const mobile = '<picture><source type="image/avif" media="(max-width:767px)" srcset="/_astro/small.avif 390w"><source media="(max-width:767px)" srcset="/_astro/small.webp 390w"><img src="/_astro/large.webp"></picture>';
    const cover = '<picture><source type="image/avif" srcset="/_astro/small.avif 320w, /_astro/large.avif 640w"><img src="/_astro/large.webp" srcset="/_astro/small.webp 320w, /_astro/large.webp 640w"></picture>';
    const original = `<h1>Keep content &amp; entities</h1>${mobile}<template>${cover}</template><noscript>${cover}</noscript>`;
    await writeFile(join(output, 'index.html'), original);
    await optimizePictureFormats(output);
    const result = await readFile(join(output, 'index.html'), 'utf8');
    assert.ok(result.includes(mobile), 'Keep the smaller mobile AVIF and the desktop fallback');
    assert.ok(!result.includes('/_astro/large.avif'), 'Do not serve AVIF that is larger at a high-DPI width');
    assert.equal(result.match(/src="\/_astro\/large.webp" srcset=/g)?.length, 2, 'Keep both the JavaScript and no-JavaScript covers');
    assert.ok(result.startsWith('<h1>Keep content &amp; entities</h1>'), 'Do not reserialize unrelated HTML');
  } finally { await rm(output, { recursive: true, force: true }); }
});

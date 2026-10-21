import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyCardImages(page, output) {
  for (const image of page.querySelectorAll('.post-card img')) {
    const src = image.getAttribute('src') || '';
    assert.ok(src.startsWith('/') || /^https?:\/\//i.test(src), 'Card cover needs a local or HTTP image URL');
    if (src.startsWith('/_astro/')) {
      assert.ok(image.getAttribute('srcset'), 'Processed card covers need responsive sizes');
    }
    if (src.startsWith('/') && !src.startsWith('//')) {
      const pathname = decodeURIComponent(new URL(src, 'https://build.invalid').pathname);
      await access(resolve(output, pathname.slice(1)));
    }
  }
}

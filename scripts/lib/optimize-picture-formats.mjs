import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'node-html-parser';

function candidates(value = '') {
  return value.split(',').map(item => item.trim().split(/\s+/)).filter(([url]) => url);
}

export async function optimizePictureFormats(output) {
  let removed = 0;
  const sizeCache = new Map();
  async function bytes(url) {
    if (!url.startsWith('/_astro/')) return undefined;
    if (!sizeCache.has(url)) {
      const file = resolve(output, decodeURIComponent(new URL(url, 'https://build.invalid').pathname).slice(1));
      sizeCache.set(url, (await stat(file)).size);
    }
    return sizeCache.get(url);
  }
  for (const file of await readdir(output, { recursive: true })) {
    if (!file.endsWith('.html')) continue;
    const filename = resolve(output, file);
    let html = await readFile(filename, 'utf8');
    const original = html;
    for (const picture of parse(html).querySelectorAll('picture')) {
      for (const source of picture.querySelectorAll('source[type="image/avif"]')) {
        const fallback = picture.querySelectorAll('source').find(node => node !== source &&
          node.getAttribute('type') !== 'image/avif' && node.getAttribute('media') === source.getAttribute('media')) ?? picture.querySelector('img');
        if (!fallback) continue;
        const alternatives = new Map(candidates(fallback.getAttribute('srcset')).map(([url, width]) => [width, url]));
        let comparable = false, beneficial = true;
        for (const [url, width] of candidates(source.getAttribute('srcset'))) {
          const other = alternatives.get(width);
          if (!other) { beneficial = false; break; }
          const [avifBytes, fallbackBytes] = await Promise.all([bytes(url), bytes(other)]);
          if (avifBytes === undefined || fallbackBytes === undefined) { beneficial = false; break; }
          comparable = true;
          if (avifBytes >= fallbackBytes) { beneficial = false; break; }
        }
        if (comparable && !beneficial) {
          html = html.replaceAll(source.toString(), '');
          removed++;
        }
      }
    }
    if (html !== original) await writeFile(filename, html);
  }
  return removed;
}

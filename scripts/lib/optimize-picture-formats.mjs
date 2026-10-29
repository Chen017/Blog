import { readFile, writeFile, readdir, stat, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'node-html-parser';

function candidates(value = '') {
  return value.split(',').map(item => item.trim().split(/\s+/)).filter(([url]) => url);
}

export async function optimizePictureFormats(output) {
  let removed = 0;
  const sizeCache = new Map();
  const rejected = new Set();
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
          for (const [url] of candidates(source.getAttribute('srcset'))) if (url.startsWith('/_astro/') && url.endsWith('.avif')) rejected.add(url);
          html = html.replaceAll(source.toString(), '');
          removed++;
        }
      }
    }
    if (html !== original) await writeFile(filename, html);
  }
  const texts = await Promise.all((await readdir(output, {recursive:true})).filter(f => /\.(html|js|css|json)$/.test(f)).map(f => readFile(resolve(output,f),'utf8')));
  // Encrypted HTML can contain references that cannot be found in plaintext.
  if (!texts.some(s => s.includes('data-encrypted='))) for (const url of rejected) {
    if (!texts.some(s => s.includes(url.split('/').pop()))) await unlink(resolve(output, url.slice(1)));
  }
  return removed;
}

import assert from 'node:assert/strict';
import { readFile, access, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'node-html-parser';

const output = resolve('dist');
for (const file of ['index.html', 'archive/index.html', 'friends/index.html', 'about/index.html', '404.html', 'rss.xml', 'atom.xml', 'sitemap-index.xml', 'pagefind/pagefind.js', 'pagefind/pagefind-entry.json']) {
  await access(resolve(output, file));
}
const home = parse(await readFile(resolve(output, 'index.html'), 'utf8'));
assert.ok(!home.querySelector('html').classList.contains('is-loading'), 'Static HTML must remain readable without JavaScript');
assert.ok(home.querySelector('script[src="https://cloud.umami.is/script.js"]'), 'Keep the custom Umami script');
assert.ok(home.querySelectorAll('script').some(script => script.textContent.includes('github-dark')), 'Keep dark mode initialization');
const preloadedFonts = home.querySelectorAll('link[rel="preload"][as="font"]');
assert.ok(preloadedFonts.length > 0, 'Preload the essential Latin face');
for (const font of preloadedFonts) {
  const href = font.getAttribute('href');
  assert.ok(href.startsWith('/_astro/'), 'Font files must be hosted locally');
  assert.ok((await stat(resolve(output, href.slice(1)))).size < 100000, 'Do not eagerly preload the complete Chinese font');
}
assert.ok(!home.querySelector('#loading-overlay'), 'Content must not wait for a loading screen');
assert.equal(home.querySelectorAll('astro-island[component-url*="statistics"]').length, 1, 'Only one statistics island per page');
assert.ok(home.querySelector('#banner picture source[media]'), 'Use one responsive banner image');
await access(resolve(output, 'MiSans/woff2/MiSans-Normal.woff2'));
const links = await readFile(resolve(output, 'friends/index.html'), 'utf8');
assert.match(links, /My other websites/);
assert.match(links, /Links/);
const about = await readFile(resolve(output, 'about/index.html'), 'utf8');
assert.match(about, /data-song-card/);
for (const file of ['index.html', 'archive/index.html']) {
  const page = parse(await readFile(resolve(output, file), 'utf8'));
  for (const island of page.querySelectorAll('astro-island[props]')) {
    const props = JSON.parse(island.getAttribute('props'));
    if (props.posts || props.sortedPosts) {
      assert.ok(!JSON.stringify(props).includes('"password"'), `${file}: secret frontmatter in island props`);
    }
  }
}
assert.match(await readFile(resolve(output, 'rss.xml'), 'utf8'), /<rss[\s>]/);
assert.match(await readFile(resolve(output, 'atom.xml'), 'utf8'), /<feed[\s>]/);
console.log('Static output, search assets, feeds and personal customizations verified.');

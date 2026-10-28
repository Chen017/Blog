import assert from 'node:assert/strict';
import { readFile, access, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'node-html-parser';
import { verifyCardImages } from './lib/verify-card-images.mjs';

const output = resolve('dist');
for (const file of ['index.html', 'archive/index.html', 'friends/index.html', 'about/index.html', 'skills/index.html', 'admin/index.html', 'admin/config.yml', 'admin/editor.js', '404.html', 'rss.xml', 'atom.xml', 'sitemap-index.xml', 'pagefind/pagefind.js', 'pagefind/pagefind-entry.json']) {
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
assert.equal(home.querySelectorAll('astro-island[component-url*="statistics"]').length, 0, 'The homepage keeps its article grid static');
assert.ok(home.querySelector('.nv-sky picture source[srcset]'), 'Use a responsive starfield image');
assert.ok(home.querySelector('.nv-sky svg circle'), 'Render sharp, resolution-independent stars');
assert.equal(home.querySelector('table-of-contents'), null, 'The home page has no article TOC');
assert.ok(!home.querySelectorAll('script').some(script => /initBannerCarousel|initFullscreenWallpaperCarousel/.test(script.textContent)), 'Single wallpapers must not ship carousel initialization');
assert.ok(!home.querySelectorAll('script[src]').some(script => /\/toc(?:\.|Button\.)/.test(script.getAttribute('src'))), 'The home page must not request TOC scripts');
await verifyCardImages(home, output);
assert.ok(home.querySelector('img.nv-avatar[srcset]'), 'Optimize the author avatar');
assert.equal(home.querySelector('nav[aria-label="Pagination"]'), null, 'All writing is available directly on the homepage');
const sourcePosts = [];
const { readdir } = await import('node:fs/promises');
const { default: yaml } = await import('js-yaml');
async function countPublicPosts(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) await countPublicPosts(file);
    else if (/^[^_].*\.mdx?$/.test(entry.name)) {
      const source = await readFile(file, 'utf8');
      const metadata = yaml.load(source.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]);
      if (!metadata.draft) sourcePosts.push(metadata);
    }
  }
}
await countPublicPosts(resolve('src/content/posts'));
assert.equal(home.querySelectorAll('.nv-entry').length, sourcePosts.length, 'Do not silently omit older posts from the homepage');
assert.equal(home.querySelector('html').getAttribute('lang'), 'en');
for (const heading of home.querySelectorAll('h1,h2,h3')) assert.ok(!/[\u3400-\u9fff]/.test(heading.textContent), 'Homepage headings must be English');
assert.ok(!home.querySelector('link[href*="fonts.googleapis.com"]'), 'Self-host the homepage fonts');
assert.ok(!home.querySelector('[data-password]'), 'Never serialize protected post credentials');
assert.ok(!home.querySelector('a[href=""]'), 'Do not output empty navigation links');
assert.ok(!home.querySelectorAll('script').some(script => script.textContent.includes('/pagefind/pagefind.js')), 'Do not initialize the search index before interaction');
for (const stylesheet of home.querySelectorAll('link[rel="stylesheet"]')) {
  assert.ok(!/fancybox|anime|markdown|twikoo/.test(stylesheet.getAttribute('href')), 'Do not load page-specific styles on the home page');
}
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

for (const removed of ['albums/index.html','anime/index.html','diary/index.html','projects/index.html','timeline/index.html','exhibition/index.html','pio','assets/music','FooterConfig.html']) {
  await assert.rejects(access(resolve(output, removed)), { code: 'ENOENT' }, `Removed feature still generated: ${removed}`);
}
const admin = await readFile(resolve(output,'admin/index.html'),'utf8');
for (const file of ['admin/components.js', 'admin/editor.css', 'admin/preview.css', 'admin/mdx-editor.js', 'admin/interface.js', 'admin/preview.js']) await access(resolve(output, file));
assert.ok(admin.indexOf('/admin/components.js') < admin.indexOf('/admin/editor.js'), 'Load component serializers before the editor');
assert.match(admin, /decap-cms@3\.17\.1\//);
assert.ok(admin.includes('type="module"') && admin.includes('/_astro/'), 'Bundle the MDX parser for the static admin page');
const cmsConfig = await readFile(resolve(output,'admin/config.yml'),'utf8');
assert.match(cmsConfig, /repo: Chen017\/Blog/);
assert.ok(!/local_backend:|Spr-Aachen\/Twilight/.test(cmsConfig), 'Production config must use the correct repository without a local proxy');

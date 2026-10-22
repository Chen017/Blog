import { readFile, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { execFileSync } from 'node:child_process';
import { parse } from 'node-html-parser';
import vm from 'node:vm';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const report = {};
const source = (await readFile('src/components/sidebar/toc.ts', 'utf8')).replace(/^import[^\n]*\n/gm, '');
const classList = { contains: () => false, add() {}, remove() {} };
const wrapper = { classList, removeAttribute() {}, setAttribute() {} };
const content = { innerHTML: '' };
const context = vm.createContext({
  HTMLElement: class {}, IntersectionObserver: class {},
  customElements: { get: () => true },
  widgetManager: { getPageHeadings: () => [{ depth: 2, slug: 'literal', text: '<img src=x onerror="void 0">' }] },
});
vm.runInContext(`${stripTypeScriptTypes(source, { mode: 'transform' }).replace('export class', 'class')}\nglobalThis.TOC = TableOfContents;`, context);
const toc = new context.TOC();
toc.dataset = { isFloating: 'true', depth: '6' };
toc.querySelector = selector => selector === '.toc-floating-container' ? wrapper : content;
toc.regenerateTOC();
report.tocTurnsEscapedTextIntoImageElement = Boolean(parse(content.innerHTML).querySelector('img[onerror]'));

const listeners = new Map();
let initCount = 0;
const twikooFile = await readFile('src/components/comment/twikoo.astro', 'utf8');
const twikooScript = twikooFile.match(/<script is:inline define:vars=\{\{ config \}\}>([\s\S]*?)<\/script>/)[1];
const comment = { innerHTML: '' };
const twikooContext = vm.createContext({
  config: {}, window: { location: { pathname: '/posts/example/' } },
  twikoo: { init: () => { initCount++; return Promise.resolve(); } },
  document: { getElementById: () => comment, addEventListener: (type, handler) => {
    const existing = listeners.get(type) || []; existing.push(handler); listeners.set(type, existing);
  } },
  console, setTimeout,
});
vm.runInContext(twikooScript, twikooContext);
for (const event of ['DOMContentLoaded', 'twilight:page:loaded']) for (const listener of listeners.get(event) || []) listener();
report.twikooInitCallsDuringNormalPageLoad = initCount;

report.archiveDateInLosAngeles = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `
  const date = new Date('2025-01-01T00:00:00.000Z');
  console.log(JSON.stringify({year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate()}));
`], { encoding: 'utf8', env: { ...process.env, TZ: 'America/Los_Angeles' } }));

const rss = await readFile('dist/rss.xml', 'utf8');
const atom = await readFile('dist/atom.xml', 'utf8');
report.rssDisplaysMdxImportSource = rss.includes('import saltImg1 from');
report.atomDisplaysMdxImportSource = atom.includes('import saltImg1 from');

const rssSource = (await readFile('src/pages/rss.xml.ts', 'utf8'))
  .replace(/^import[^\n]*\n/gm, '')
  .replace(/const imagesGlob = [\s\S]*?\);\r?\n/, 'const imagesGlob = globalThis.reviewImagesGlob;\n');
const requestedImages = [];
const expectedImageKey = '/src/content/posts/to-feel-not-fight/image.png';
const rssContext = vm.createContext({
  MarkdownIt, sanitizeHtml, htmlParser: { parse }, URL, console: { log() {} },
  siteConfig: { title: 'Review', lang: 'en' },
  getSortedPosts: async () => [{ id: 'review-relative', filePath: 'src/content/posts/review-relative/index.md',
    body: '![Sibling](../to-feel-not-fight/image.png)', data: { title: 'Review', published: new Date() } }],
  getCategoryPathLabel: () => null,
  getFileDirFromPath: value => value.replace(/^src\//, '').replace(/\/[^/]+$/, ''),
  getPostUrl: () => '/posts/review-relative/',
  getImage: async () => ({ src: '/_astro/review-image.webp' }),
  rss: value => value,
  reviewImagesGlob: new Proxy({ [expectedImageKey]: async () => ({ default: {} }) }, {
    get(target, key) { requestedImages.push(key); return target[key]; },
  }),
});
vm.runInContext(`${stripTypeScriptTypes(rssSource, { mode: 'transform' }).replace('export async', 'async')}\nglobalThis.reviewGET = GET;`, rssContext);
const feedResult = await rssContext.reviewGET({ site: new URL('https://example.test/') });
report.relativeFeedImage = { expectedImageKey, requestedImageKeys: requestedImages, outputContent: feedResult.items[0].content };

const cliSource = (await readFile('scripts/new-post.js', 'utf8')).replace(/^import[^\n]*\n/gm, '');
let cliFile, cliContent;
vm.runInNewContext(cliSource, {
  fs: { existsSync: () => false, mkdirSync() {}, writeFileSync(file, body) { cliFile = file; cliContent = body; } },
  path, process: { argv: ['node', 'new-post.js', 'review-cli'] }, console: { log() {}, error() {} },
});
report.newPostCli = { file: cliFile, publishesByDefault: /^draft: false/m.test(cliContent) };
const built = JSON.parse(await readFile(new URL('probe-results.json', import.meta.url), 'utf8'));
built.feed.rssExposesMdxImports = report.rssDisplaysMdxImportSource;
built.feed.atomExposesMdxImports = report.atomDisplaysMdxImportSource;
await writeFile(new URL('probe-results.json', import.meta.url), `${JSON.stringify(built, null, 2)}\n`);
await writeFile(new URL('unit-probe-results.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

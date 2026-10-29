import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { execFileSync } from 'node:child_process';
import { parse } from 'node-html-parser';
import yaml from 'js-yaml';
import { hasValidPostPassword, publicPostDescription } from '../src/utils/post-security.ts';
import { normalizePostRoute } from '../src/utils/route-name.ts';
import { escapeHtml } from '../src/utils/html.ts';
import { createUmamiStatsClient } from '../src/utils/umami-stats.ts';
import { createPost } from '../scripts/new-post.js';
import { z } from 'astro/zod';
import { getCategoryPathParts } from '../src/utils/category.ts';

test('encrypted posts cannot silently become plaintext or expose an automatic excerpt', () => {
    for (const password of [undefined, '', '  ', '\n']) assert.equal(hasValidPostPassword({ encrypted: true, password }), false);
    assert.equal(hasValidPostPassword({ encrypted: true, password: ' secret ' }), true);
    assert.equal(publicPostDescription({ encrypted: true }, 'PRIVATE_BODY'), 'This content is password protected.');
    assert.equal(publicPostDescription({ encrypted: true, description: 'Public summary' }, 'PRIVATE_BODY'), 'Public summary');
    assert.equal(publicPostDescription({ encrypted: false }, 'Public body'), 'Public body');
});

test('the actual content schema rejects empty passwords before a build can publish them', async () => {
    const raw = (await readFile('src/content.config.ts', 'utf8')).replace(/^import[^\n]*\n/gm, '');
    const context = vm.createContext({ z, getCategoryPathParts, hasValidPostPassword, defineCollection: options => options, glob: () => ({}) });
    vm.runInContext(`${stripTypeScriptTypes(raw, { mode: 'transform' }).replace('export const collections', 'const collections')}\nglobalThis.schema = collections.posts.schema;`, context);
    assert.equal(context.schema.safeParse({ title: 'Private', encrypted: true, password: '  ' }).success, false);
    assert.equal(context.schema.safeParse({ title: 'Private', encrypted: true, password: 'secret' }).success, true);
});

test('custom route aliases and their links use one normalization rule', () => {
    for (const value of ['hello', '/hello/', 'posts/hello', '/posts/hello/', ' posts/hello/ ']) assert.equal(normalizePostRoute(value), 'hello');
    assert.equal(normalizePostRoute('posts/folder/文章/'), 'folder/文章');
    for (const value of ['/', '../hello', 'a/../b', 'a?x=y', 'a#b', 'a\\b']) assert.throws(() => normalizePostRoute(value));
});

test('TOC preserves literal code in headings without creating HTML elements or attributes', async () => {
    const raw = (await readFile('src/components/sidebar/toc.ts', 'utf8')).replace(/^import[^\n]*\n/gm, '');
    const content = { innerHTML: '' };
    const wrapper = { classList: { contains: () => false, add() {}, remove() {} }, removeAttribute() {} };
    const heading = { depth: 2, slug: 'title" onclick="bad', text: '<img src=x onerror="bad"> & literal' };
    const context = vm.createContext({ HTMLElement: class {}, IntersectionObserver: class {}, customElements: { get: () => true },
        escapeHtml, getPageHeadings: () => [heading] });
    vm.runInContext(`${stripTypeScriptTypes(raw, { mode: 'transform' }).replace('export class', 'class')}\nglobalThis.TOC = TableOfContents;`, context);
    const toc = new context.TOC();
    toc.dataset = { isFloating: 'true' };
    toc.querySelector = selector => selector === '.toc-floating-container' ? wrapper : content;
    toc.regenerateTOC();
    const html = parse(content.innerHTML);
    assert.equal(html.querySelector('img,[onclick],[onerror]'), null);
    assert.ok(html.textContent.includes(heading.text));
    assert.equal(decodeURIComponent(html.querySelector('a').getAttribute('href').slice(1)), heading.slug);
});

for (const [provider, globalName] of [['twikoo', 'twikoo'], ['waline', 'Waline']]) {
    test(`${provider} mounts once across DOM readiness and page readiness`, async () => {
        const raw = await readFile(`src/components/comment/${provider}.astro`, 'utf8');
        const script = raw.match(/<script is:inline define:vars=\{\{ config \}\}>([\s\S]*?)<\/script>/)[1];
        const listeners = new Map();
        let element = {}, calls = 0;
        const context = vm.createContext({ config: {}, [globalName]: { init: async () => { calls++; } },
            window: { location: { pathname: '/posts/test/' }, addEventListener() {} },
            document: { readyState: 'loading', getElementById: () => element,
                addEventListener: (event, handler) => listeners.set(event, handler) },
            setTimeout, clearTimeout, console });
        vm.runInContext(script, context);
        listeners.get('DOMContentLoaded')();
        listeners.get('twilight:page:loaded')();
        await Promise.resolve();
        assert.equal(calls, 1);
        element = {};
        listeners.get('twilight:page:loaded')();
        await Promise.resolve();
        assert.equal(calls, 2);
        if (provider === 'waline') assert.match(raw, /waline\.umd\.js/);
    });
}

test('analytics credentials stay in server requests and only validated counts leave the client', async () => {
    let requests = 0;
    const stats = createUmamiStatsClient({ baseUrl: 'https://api.example.test', websiteId: 'site', apiKey: 'SECRET_CANARY' }, async (url, options) => {
        requests++;
        assert.equal(options.headers.Authorization, 'Bearer SECRET_CANARY');
        assert.equal(url.searchParams.get('url'), '/posts/test/');
        return { ok: true, json: async () => ({ pageviews: { value: 12 }, visitors: 7, visits: -4, token: 'SECRET_CANARY' }) };
    });
    const values = await Promise.all([stats('/posts/test/'), stats('/posts/test/')]);
    assert.equal(requests, 1);
    assert.deepEqual(values[0], { pageviews: 12, visitors: 7, visits: 0 });
    assert.ok(!JSON.stringify(values).includes('SECRET_CANARY'));
    const failed = createUmamiStatsClient({ baseUrl: 'https://api.example.test', websiteId: 'site', apiKey: 'secret' }, async () => { throw new Error('network'); });
    assert.equal(await failed(), null);
});

test('archive retains January 1 in a negative UTC offset', async () => {
    const source = await readFile('src/components/archivePanel.svelte', 'utf8');
    const format = source.match(/function formatDate\([\s\S]*?\n}/)[0];
    const program = `${stripTypeScriptTypes(format)}\nconsole.log(formatDate('2025-01-01T00:00:00Z'));`;
    assert.equal(execFileSync(process.execPath, ['-e', program], { encoding: 'utf8', env: { ...process.env, TZ: 'America/Los_Angeles' } }).trim(), '01-01');
    assert.match(source, /published\.getUTCFullYear\(\)/);
});

test('CLI creates a draft bundle, preserves YAML titles and refuses overwrites or traversal', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'blog-post-regression-'));
    try {
        const file = createPost('folder/A # title.mdx', root, new Date(2026, 9, 22));
        assert.equal(path.relative(root, file).replace(/\\/g, '/'), 'src/content/posts/folder/A # title/index.mdx');
        const data = yaml.load((await readFile(file, 'utf8')).split('---')[1]);
        assert.equal(data.title, 'A # title');
        assert.equal(data.draft, true);
        assert.equal(data.comment, false);
        assert.throws(() => createPost('folder/A # title.md', root), /already exists/);
        assert.throws(() => createPost('../escape', root));
    } finally { await rm(root, { recursive: true }); }
});

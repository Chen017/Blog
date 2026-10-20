import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root = process.cwd();
const site = path.join(root, '.astro/editor-save-site');
await fs.mkdir(site, { recursive: true });
for (const folder of ['src', 'public']) await fs.cp(path.join(root, folder), path.join(site, folder), { recursive: true });
for (const file of ['package.json', 'astro.config.mjs', 'svelte.config.js', 'tsconfig.json', 'postcss.config.mjs', 'twilight.config.yaml']) await fs.copyFile(path.join(root, file), path.join(site, file));
await fs.cp(path.join(root, '.astro/cms-stage1/src/content'), path.join(site, 'src/content'), { recursive: true });
const article = path.join(site, 'src/content/posts/stage1-image-upload-check/index.md');
// Publish the synthetic article only in this isolated build, never the real content tree.
await fs.writeFile(article, (await fs.readFile(article, 'utf8')).replace('draft: true', 'draft: false').replace('coverInContent: false', 'coverInContent: true'));
execFileSync(process.execPath, [path.join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', site], { stdio: 'inherit' });
for (const [slug, marker] of [
    ['to-feel-not-fight', 'PLAIN'], ['happy-new-year-2026', 'SONG'],
    ['full-platform-music-players-cloud-local', 'MDX'],
]) {
    const html = await fs.readFile(path.join(site, `dist/posts/${slug}/index.html`), 'utf8');
    assert.ok(html.includes(`STAGE1_${marker}_OK`));
    if (marker === 'SONG') { assert.match(html, /data-song-card/); assert.match(html, /spoiler/); }
    if (marker === 'MDX') assert.match(html, /Salt Player 1/);
}
const created = await fs.readFile(path.join(site, 'dist/posts/stage1-image-upload-check/index.html'), 'utf8');
assert.match(created, /普通图文测试/);
assert.match(created, /cms-upload-test/);
console.log('Saved rich text, song, MDX and newly uploaded cover all build successfully.');

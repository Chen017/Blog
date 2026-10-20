import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { marked } from 'marked';

// Run from the repository root, after the isolated browser editing checks.
const root = process.cwd();
const evidence = path.join(root, 'audit/2026-10-20/implementation');
const hashes = JSON.parse(await fs.readFile(path.join(evidence, 'content-hashes-before.json'), 'utf8'));
const preserved = [], archived = [], removed = [];
for (const [original, hash] of Object.entries(hashes)) {
    const file = original.replaceAll('\\', '/');
    let target = file;
    if (/^src\/content\/(albums|diary|projects)\//.test(file)) {
        await assert.rejects(fs.access(path.join(root, file)), { code: 'ENOENT' });
        removed.push(file);
        continue;
    }
    if (/^src\/content\/posts\/(?:draft\.md|encryption\.md|mermaids\.md|videos\.md|guide\/)/.test(file)) {
        target = file.replace('src/content/posts/', 'tests/fixtures/content/');
        archived.push(file);
    } else preserved.push(file);
    const current = createHash('sha256').update(await fs.readFile(path.join(root, target))).digest('hex');
    assert.equal(current, hash, `Content changed: ${file}`);
}

const split = text => {
    const normalized = text.replaceAll('\r\n', '\n');
    const match = normalized.match(/^---\n([\s\S]*?)\n---\n/);
    return { data: yaml.load(match[1]), body: normalized.slice(match[0].length) };
};
const samples = [];
for (const [slug, ext, marker] of [
    ['to-feel-not-fight', 'md', 'PLAIN'],
    ['happy-new-year-2026', 'md', 'SONG'],
    ['full-platform-music-players-cloud-local', 'mdx', 'MDX'],
]) {
    const relative = `src/content/posts/${slug}/index.${ext}`;
    const original = split(await fs.readFile(path.join(root, relative), 'utf8'));
    const saved = split(await fs.readFile(path.join(root, '.astro/cms-stage1', relative), 'utf8'));
    assert.match(saved.body, new RegExp(`STAGE1_${marker}_OK`));
    const body = saved.body.replace(/\n*STAGE1_[A-Z_]+\s*/g, '').trim();
    if (marker === 'PLAIN') assert.equal(marked.parse(body), marked.parse(original.body.trim()), `Rendered Markdown changed: ${slug}`);
    else assert.equal(body, original.body.trim(), `Unexpected body conversion: ${slug}`);
    for (const key of Object.keys(original.data)) {
        assert.deepEqual(saved.data[key], original.data[key], `${slug}: changed ${key}`);
    }
    const refs = [...saved.body.matchAll(/!\[[^\]]*\]\(([^)]+)\)|^import\s+\w+\s+from\s+['"]([^'"]+)['"]/gm)].map(m => m[1] || m[2]);
    for (const ref of refs.filter(ref => !/^(https?:|\/)/.test(ref))) {
        await fs.access(path.join(root, '.astro/cms-stage1/src/content/posts', slug, ref));
    }
    samples.push({ slug, mode: marker === 'PLAIN' ? 'rich' : 'source', bodyExactExceptMarker: body === original.body.trim(), renderedPlainMarkdownUnchanged: marker === 'PLAIN' ? true : null, originalFieldsPreserved: true, relativeImageReferencesResolved: refs.length });
}
const newDir = path.join(root, '.astro/cms-stage1/src/content/posts/stage1-image-upload-check');
const created = split(await fs.readFile(path.join(newDir, 'index.md'), 'utf8'));
assert.equal(created.data.draft, true);
assert.equal(created.data.cover, 'cms-upload-test.png');
assert.equal((await fs.stat(path.join(newDir, created.data.cover))).size, 68);
const result = { preservedFiles: preserved.length, archivedFiles: archived.length, removedExampleFiles: removed.length, skillsFiles: preserved.filter(file => file.startsWith('src/content/skills/')).length, samples, newArticle: { folderCreated: true, draftDefaultTrue: true, entryRelativeCover: true, uploadedImageBytes: 68 } };
await fs.writeFile(path.join(evidence, 'content-and-editor-results.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

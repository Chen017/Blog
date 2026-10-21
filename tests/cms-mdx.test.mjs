import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as model from '../src/cms/mdx-document.js';
import { parseDocument, replaceProse, replaceImage, appendProse } from '../src/cms/mdx-document.js';

const original = (await readFile(new URL('../src/content/posts/full-platform-music-players-cloud-local/index.mdx', import.meta.url), 'utf8')).replace(/^---[\s\S]*?---\r?\n/, '');
test('the real MDX article has editable prose and all image groups without executing imports', () => {
    const document = parseDocument(original);
    assert.equal(document.error, null);
    const images = document.segments.filter(segment => segment.type === 'images');
    assert.equal(images.flatMap(segment => segment.images).length, 12);
    assert.equal(images.filter(segment => segment.images.length === 2).length, 2);
    assert.equal(document.segments.filter(segment => segment.type === 'protected').length, 0);
    assert.equal(document.segments.filter(segment => segment.end > segment.start).map(segment => segment.raw).join(''), original);
    for (const [index, segment] of document.segments.entries()) {
        if (segment.type === 'prose') assert.equal(replaceProse(document, index, segment.raw.trim()), original);
    }
});

test('editing one prose block preserves imports and every JSX image layout verbatim', () => {
    const document = parseDocument(original);
    const index = document.segments.findIndex(segment => segment.type === 'prose');
    const segment = document.segments[index];
    const changed = replaceProse(document, index, `${segment.raw.trim()}\n\nAdded **paragraph** with {literal braces}.`);
    assert.match(changed, /Added \*\*paragraph\*\* with \\\{literal braces\\\}/);
    assert.equal(changed.slice(0, segment.start), original.slice(0, segment.start));
    assert.ok(changed.endsWith(original.slice(segment.end)));
    assert.deepEqual(parseDocument(changed).segments.filter(segment => segment.type === 'images').map(segment => segment.raw), document.segments.filter(segment => segment.type === 'images').map(segment => segment.raw));
});

test('replacing one reused image makes its own import and leaves the other occurrence alone', () => {
    const document = parseDocument(original);
    const index = document.segments.findIndex(segment => segment.images?.some(image => image.src === './image1.png'));
    const changed = replaceImage(document, index, 0, { src: 'new photo.png', alt: 'A "new" image & notes' });
    assert.match(changed, /^import cmsImage1 from "\.\/new photo.png";/);
    assert.equal((changed.match(/src=\{muslyImg.src\}/g) || []).length, 1);
    assert.match(changed, /src=\{cmsImage1.src\}/);
    assert.match(changed, /alt="A &quot;new&quot; image &amp; notes"/);
    const parsed = parseDocument(changed);
    assert.equal(parsed.error, null);
    assert.ok(parsed.segments.some(segment => segment.images?.some(image => image.src === './new photo.png')));
    assert.throws(() => replaceImage(document, index, 0, { src: 'javascript:alert(1)' }), /链接/);
    const linked = replaceImage(document, index, 0, { src: 'https://example.com/photo.jpg?width=800&quality=90' });
    assert.equal(parseDocument(linked).segments[index].images[0].src, 'https://example.com/photo.jpg?width=800&quality=90');
    assert.equal(parseDocument(linked).segments.filter(segment => segment.type === 'code').map(segment => segment.raw).join(''), document.segments.filter(segment => segment.type === 'code').map(segment => segment.raw).join(''));
});

test('unknown JSX, exports and inline expressions remain protected, including code-looking prose', () => {
    const source = 'export const value = 1;\n\nBefore\n\n<Card value={value} />\n\nText {value}\n\n```jsx\n<img src={x.src} />\n```\n';
    const document = parseDocument(source);
    assert.equal(document.error, null);
    assert.equal(document.segments.filter(segment => segment.type === 'protected').length, 2);
    assert.ok(document.segments.some(segment => segment.type === 'prose' && segment.raw.includes('```jsx')));
    assert.equal(document.segments.map(segment => segment.raw).join(''), source);
    assert.equal(parseDocument(appendProse('')).error, null);
    assert.ok(parseDocument('import nope from ;').error);
});

test('rich text keeps a newly entered paragraph and literal code-like words', async () => {
    const context = vm.createContext({ window: {}, CMS: { getWidget: () => ({}) }, createClass: definition => definition });
    vm.runInContext(await readFile(new URL('../public/admin/mdx-editor.js', import.meta.url), 'utf8'), context);
    const definition = context.window.createBlogMdxEditor(model, {});
    const editor = { ...definition, props: { value: '# Title\n\nText\n', onChange(value) { editor.props.value = value; } },
        setState(update) { this.state = { ...this.state, ...update }; } };
    editor.state = editor.getInitialState();
    editor.changeProse(0, '# Title\n\nText\n\n');
    assert.equal(editor.proseDrafts[0], '# Title\n\nText\n\n');
    editor.changeProse(0, '# Title\n\nText\n\nNew paragraph');
    assert.match(editor.props.value, /Text\n\nNew paragraph/);
    assert.equal(editor.isValid(), true);
    const plain = parseDocument('Start\n');
    const changed = replaceProse(plain, 0, 'import notes\n\n<Card> and {braces} are literal text.\n\n`{code}`');
    assert.equal(parseDocument(changed).error, null);
    assert.match(changed, /&#105;mport notes/);
    assert.match(changed, /&lt;Card&gt;/);
    assert.match(changed, /`\{code\}`/);
});

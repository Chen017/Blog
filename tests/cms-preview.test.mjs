import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { parsePreview, notice, lyrics, math, safeUrl, mediaPath } from '../src/cms/preview-model.js';
import { parseDocument } from '../src/cms/mdx-document.js';
import { createMermaidRenderer } from '../src/cms/mermaid-preview.js';

test('preview identifies nested extensions, preserves ordinary Markdown and ignores code examples', () => {
    const input = '# Title\n\nOrdinary ![image](photo.jpg).\n\n> [!TIP]\n> **Read** $x^2$ and :spoiler[hidden].\n\n$$\n\\frac{1}{2}\n$$\n\n```mermaid\ngraph LR\n A-->B\n```\n\n```md\n:::song{title="Example"}\n$$literal$$\n```';
    const blocks = parsePreview(input);
    assert.equal(blocks.filter(block => block.type === 'component').length, 3);
    assert.ok(blocks[0].value.includes('![image](photo.jpg)'));
    assert.ok(blocks.at(-1).value.includes(':::song'));
    const alert = notice(blocks.find(block => block.node?.type === 'blockquote').node);
    assert.equal(alert.kind, 'tip');
    assert.equal(alert.children[0].children[1].type, 'strong');
    assert.equal(notice({ type: 'blockquote', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Normal quote' }] }] }), null);
});

test('all five notice styles and directive labels are recognized without rewriting source', () => {
    for (const name of ['note', 'tip', 'important', 'warning', 'caution']) {
        const source = `:::${name}[Custom title]\nContent\n:::\n\n> [!${name.toUpperCase()}]\n> More content`;
        const nodes = parsePreview(source).filter(block => block.type === 'component').map(block => notice(block.node));
        assert.equal(nodes.length, 2);
        assert.ok(nodes.every(node => node.kind === name));
        assert.equal(nodes[0].title.children[0].value, 'Custom title');
        assert.equal(nodes[1].children[0].children[0].value, 'More content');
    }
});

test('song preview reads fenced or plain lyrics and keeps their text safe', () => {
    for (const fence of ['', '```lrc\n']) {
        const source = `:::song{title="Song" artist="Artist" cover="https://example.com/cover.jpg" audio="/song.mp3"}\n${fence}[ar:Artist]\n[00:01.20][00:03.40]First lyric\n[00:05.00]<img onerror="bad()">\nPlain lyric\n${fence ? '```\n' : ''}:::`;
        const node = parsePreview(source).find(block => block.type === 'component').node;
        assert.equal(node.attributes.audio, '/song.mp3');
        assert.equal(lyrics(node, source), 'First lyric\n<img onerror="bad()">\nPlain lyric');
    }
    assert.equal(safeUrl('javascript:bad()'), '');
    assert.equal(safeUrl('java\nscript:bad()'), '');
    assert.equal(safeUrl('data:text/html,bad'), '');
    assert.equal(safeUrl('https://example.com/a photo.jpg'), 'https://example.com/a photo.jpg');
});

test('KaTeX renders equations, contains invalid input and does not trust HTML commands', () => {
    assert.match(math('\\frac{1}{2} + x^2', true).html, /katex-display/);
    assert.match(math('x^2', false).html, /katex/);
    const invalid = math('\\frac{', true);
    assert.ok(invalid.error);
    assert.equal(invalid.value, '\\frac{');
    assert.ok(!math('\\href{javascript:alert(1)}{bad}', false).html.includes('href="javascript:'));
});

test('shared uploaded audio and covers resolve from the media store before deployment', () => {
    assert.equal(mediaPath('/assets/media/song.wav', '/assets/media'), 'song.wav');
    assert.equal(mediaPath('/assets/media/a%20photo.jpg?v=2', '/assets/media/'), 'a photo.jpg');
    assert.equal(mediaPath('https://example.com/song.mp3', '/assets/media'), 'https://example.com/song.mp3');
    assert.equal(mediaPath('/assets/images/avatar.jpg', '/assets/media'), '/assets/images/avatar.jpg');
});

test('MDX preview permits known Markdown syntax while JSX and expressions remain protected', () => {
    const source = 'import Card from "./Card.astro";\n\n$$\nx^2\n$$\n\n:spoiler[secret]\n\n:::song{title="Song"}\nLyrics\n:::\n\nText {danger()}\n\n<Card />';
    const segments = parseDocument(source).segments;
    assert.ok(segments.find(segment => segment.name === 'math').previewable);
    assert.ok(segments.find(segment => segment.name === 'song').previewable);
    assert.ok(!segments.find(segment => segment.raw.includes('{danger()}')).previewable);
    assert.ok(!segments.find(segment => segment.name === 'Card').previewable);
});

test('Mermaid is lazy, serial, cancellable and recovers after syntax or loading errors', async () => {
    let loads = 0, active = 0, maxActive = 0, settings;
    const render = createMermaidRenderer(async () => {
        loads++;
        return { default: { initialize: value => { settings = value; }, render: async (_id, source) => {
            active++; maxActive = Math.max(active, maxActive);
            await Promise.resolve(); active--;
            if (source === 'broken') throw Error('Invalid graph');
            return { svg: `<svg>${source}</svg>` };
        } } };
    });
    assert.equal(loads, 0);
    assert.equal(await render('cancelled', () => false), null);
    assert.equal(loads, 0);
    const results = await Promise.allSettled([render('first'), render('broken'), render('last')]);
    assert.equal(maxActive, 1);
    assert.equal(results[1].status, 'rejected');
    assert.equal(results[2].value, '<svg>last</svg>');
    assert.equal(settings.securityLevel, 'strict');
    assert.equal(settings.suppressErrorRendering, true);
    let attempts = 0;
    const retry = createMermaidRenderer(async () => { if (!attempts++) throw Error('Unavailable'); return { initialize() {}, render: async () => ({ svg: '<svg />' }) }; });
    await assert.rejects(retry('graph'), /Unavailable/);
    assert.equal(await retry('graph'), '<svg />');
});

async function controls(runtime) {
    const definitions = [], timers = new Map(); let timerId = 0;
    const context = vm.createContext({ window: {}, createClass: value => { definitions.push(value); return value; },
        h: (type, props, ...children) => ({ type, props, children }),
        setTimeout: callback => { timers.set(++timerId, callback); return timerId; }, clearTimeout: id => timers.delete(id) });
    vm.runInContext(await fs.readFile(new URL('../public/admin/preview.js', import.meta.url), 'utf8'), context);
    context.window.createBlogPreview(runtime, { preview: 'NativeMarkdown' }, 'AssetBoundary');
    const instance = (definition, props) => {
        const item = { ...definition, props, updates: 0, setState(value) { this.updates++; this.state = { ...this.state, ...value }; } };
        item.state = item.getInitialState?.() || {};
        return item;
    };
    return { definitions, timers, instance };
}

test('diagram edits discard stale results and unmount cancels pending work', async () => {
    const pending = [];
    const { definitions, timers, instance } = await controls({ renderMermaid: () => new Promise(resolve => pending.push(resolve)) });
    const diagram = instance(definitions[1], { source: 'old graph' });
    diagram.componentDidMount();
    const first = [...timers.values()][0](); timers.clear();
    diagram.props = { source: 'new graph' }; diagram.componentDidUpdate({ source: 'old graph' });
    pending.shift()('<svg>old</svg>'); await first;
    assert.equal(diagram.state.svg, '');
    const second = [...timers.values()][0](); timers.clear();
    pending.shift()('<svg>new</svg>'); await second;
    assert.equal(diagram.state.svg, '<svg>new</svg>');
    diagram.schedule(); const updates = diagram.updates;
    diagram.componentWillUnmount();
    assert.equal(timers.size, 0);
    assert.equal(diagram.updates, updates);
});

test('song preview has play/pause only and stops audio when navigating away', async () => {
    const { definitions, instance } = await controls({});
    const song = instance(definitions[2], { title: 'Song', artist: 'Artist', audio: '/song.wav', cover: '/cover.jpg', lyrics: 'Lyrics' });
    let paused = true, plays = 0, pauses = 0;
    song.audio = { get paused() { return paused; }, play: async () => { plays++; paused = false; }, pause: () => { pauses++; paused = true; } };
    song.componentDidMount();
    await song.toggle(); await song.toggle();
    assert.equal(plays, 1); assert.equal(pauses, 1);
    const tree = song.render();
    const all = item => typeof item === 'object' && item ? [item, ...item.children.flat(Infinity).flatMap(all)] : [];
    const nodes = all(tree);
    assert.equal(nodes.filter(node => node.type === 'button').length, 1);
    assert.equal(nodes.find(node => node.type === 'audio').props.controls, undefined);
    assert.equal(nodes.filter(node => node.type === 'input').length, 0);
    song.componentWillUnmount(); assert.equal(pauses, 2);
});

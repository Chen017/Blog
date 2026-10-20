import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const context = vm.createContext({});
vm.runInContext(await readFile(new URL('../public/admin/components.js', import.meta.url), 'utf8'), context);
const { block, songs, apply } = context.BlogComponents;
const song = { title: 'A "Song" & {夜}', artist: "Artist's name", cover: '/assets/media/cover.png', audio: 'https://resource.etalib.space/music.mp3', lyrics: '[00:01.00] First line\n[00:02.00] 第二句', lyricOffset: '-0.2' };

test('song form escapes attributes and can read its own output without losing lyrics', () => {
    const output = block('song', song);
    assert.match(output, /&quot;Song&quot;/);
    assert.match(output, /&#123;夜&#125;/);
    const parsed = songs(output)[0];
    assert.equal(parsed.editable, true);
    for (const [key, value] of Object.entries(song)) assert.equal(parsed.data[key], value, key);
});
test('editing a song changes only that card and refuses stale article offsets', () => {
    const body = `Before\n\n${block('song', song)}\n\nAfter\n\n${block('song', { ...song, title: 'Second' })}\n`;
    const selected = songs(body)[0];
    const updated = apply(body, block('song', { ...selected.data, title: 'Updated' }), selected);
    assert.equal(songs(updated).length, 2);
    assert.equal(songs(updated)[0].data.title, 'Updated');
    assert.equal(songs(updated)[1].data.title, 'Second');
    assert.match(updated, /^Before\n\n/); assert.match(updated, /\n\nAfter\n\n/);
    assert.throws(() => apply('Changed header\n' + body, block('song', song), selected), /正文中的卡片已改变/);
});
test('song examples inside code fences are not offered as editable cards', () => {
    const example = `~~~md\n${block('song', song)}\n~~~\n\n${block('song', { ...song, title: 'Real' })}\n`;
    assert.equal(songs(example).length, 1);
    assert.equal(songs(example)[0].data.title, 'Real');
    const extra = songs(':::song{title="A" cover="/a" audio="/b" custom="keep &amp; me"}\nLyrics\n:::')[0];
    assert.equal(songs(block('song', { ...extra.data, artist: 'B' }))[0].data.extraAttributes.custom, 'keep & me');
});
test('existing fenced LRC is shown as lyrics and its wrapper survives a title edit', () => {
    const input = block('song', { ...song, lyricsFence: '```' });
    const parsed = songs(input)[0].data;
    assert.equal(parsed.lyrics, song.lyrics);
    assert.equal(parsed.lyricsFence, '```');
    assert.match(block('song', { ...parsed, title: 'New title' }), /```lrc\n\[00:01.00\]/);
});
test('component forms reject missing media and malformed delimiters', () => {
    assert.throws(() => block('song', { ...song, audio: '' }), /音频/);
    assert.throws(() => block('song', { ...song, cover: 'cover.png' }), /https/);
    assert.throws(() => block('song', { ...song, audio: 'javascript:alert(1)' }), /https/);
    assert.throws(() => block('song', { ...song, lyrics: 'text\n::: \ntext' }), /歌词/);
    assert.throws(() => block('song', { ...song, lyricOffset: 'no' }), /偏移/);
    assert.throws(() => block('math', { text: '$$\nx\n$$' }), /分隔符/);
});
test('common forms emit native image, admonition, spoiler, formula and diagram syntax', () => {
    assert.equal(block('image', { image: 'photo (1).png', alt: 'My [photo]' }), '![My \\[photo\\]](photo%20%281%29.png)');
    assert.equal(block('note', { text: 'First\nSecond', noteType: 'tip' }), '> [!TIP]\n> First\n> Second');
    assert.equal(block('math', { text: 'E=mc^2' }), '$$\nE=mc^2\n$$');
    assert.equal(block('mermaid', { text: 'graph LR\n A-->B' }), '```mermaid\ngraph LR\n A-->B\n```');
    assert.equal(block('spoiler', { text: 'Keep [brackets]' }), ':spoiler[Keep \\[brackets\\]]');
});

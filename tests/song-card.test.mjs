import test from 'node:test';
import assert from 'node:assert/strict';
import { SongCardComponent } from '../src/plugins/rehype-component-song-card.mjs';

const find = (node, tag) => node.tagName === tag ? node : node.children?.map(child => find(child, tag)).find(Boolean);
test('song audio keeps external URLs and labels supported uploads with their actual media type', () => {
    for (const [audio, type] of [
        ['https://resource.etalib.space/song.mp3?key=example', 'audio/mpeg'],
        ['/assets/media/upload.wav', 'audio/wav'],
        ['/assets/media/upload.m4a', 'audio/mp4'],
        ['https://resource.etalib.space/stream?id=1', undefined],
    ]) {
        const source = find(SongCardComponent({ cover: '/cover.png', audio }, []), 'source');
        assert.equal(source.properties.dataSrc, audio);
        assert.equal(source.properties.type, type);
    }
});

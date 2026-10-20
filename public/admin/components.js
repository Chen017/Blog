/* Shared, dependency-free serializers for the writing forms. */
(() => {
    const decode = value => value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
        const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
        if (named[entity]) return named[entity];
        const number = entity.toLowerCase().startsWith('&#x') ? parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1));
        return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : entity;
    });
    const attribute = value => String(value || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('{', '&#123;').replaceAll('}', '&#125;').replace(/[\r\n]+/g, ' ');
    const literal = value => String(value || '').replace(/([\\[\]_*{}<>`])/g, '\\$1').replace(/[\r\n]+/g, ' ');
    const required = (value, label) => {
        if (!String(value || '').trim()) throw new Error(`请填写${label}。`);
        return String(value).trim();
    };
    const mediaUrl = (value, label, relative = false) => {
        const url = required(value, label);
        if (/^https:\/\//i.test(url) || (/^\/(?!\/)/.test(url) && !/[\\]/.test(url))) return url;
        if (relative && !/^[a-z][a-z\d+.-]*:|^\/\/|[\\]/i.test(url)) return url;
        throw new Error(`${label}请使用 https 链接，或通过“选择/上传”添加文件。`);
    };
    function song(data) {
        const title = required(data.title, '歌曲名');
        const artist = required(data.artist, '歌手');
        const cover = mediaUrl(data.cover, '封面');
        const audio = mediaUrl(data.audio, '音频');
        const offset = Number(data.lyricOffset ?? 0.35);
        if (!Number.isFinite(offset)) throw new Error('歌词偏移请填写数字，单位为秒。');
        const lyrics = String(data.lyrics || '').replaceAll('\r\n', '\n').trim();
        if (/^\s*:{3,}\s*$/m.test(lyrics)) throw new Error('歌词不能单独包含一行 :::。');
        const extras = data.extraAttributes || {};
        const attributes = { ...extras, title, artist, cover, audio, lyricOffset: String(offset) };
        const header = Object.entries(attributes).map(([key, value]) => {
            if (!/^[\w-]+$/.test(key)) throw new Error('音乐卡片包含无法编辑的属性，请使用源码修改。');
            return `${key}="${attribute(value)}"`;
        }).join(' ');
        const content = data.lyricsFence ? `${data.lyricsFence}lrc\n${lyrics}\n${data.lyricsFence}` : lyrics;
        return `:::song{${header}}\n${content}\n:::`;
    }
    function songs(body = '') {
        // Skip examples inside fenced code; keep character ranges so updates touch only one card.
        const lines = [...body.matchAll(/[^\n]*(?:\n|$)/g)].filter(line => line[0]);
        const cards = [];
        let fence = null;
        for (let i = 0; i < lines.length; i++) {
            const text = lines[i][0].replace(/\r?\n$/, '');
            const marker = text.match(/^\s*(`{3,}|~{3,})/);
            if (marker) {
                if (!fence) fence = marker[1];
                else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
                continue;
            }
            if (fence) continue;
            const header = text.match(/^(:{3,})song\{(.*)\}\s*$/);
            if (!header) continue;
            let end = i + 1;
            while (end < lines.length && lines[end][0].trim() !== header[1]) end++;
            if (end === lines.length) continue;
            const attrs = {}, expression = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
            let match;
            while ((match = expression.exec(header[2]))) {
                attrs[match[1]] = decode(match[2] ?? match[3] ?? match[4]);
            }
            // Unsupported attribute forms stay editable in source instead of losing information.
            const valid = header[2].replace(expression, '').trim() === '';
            const start = lines[i].index;
            const stop = lines[end].index + lines[end][0].replace(/\r?\n$/, '').length;
            const { title, artist, cover, audio, lyricOffset, 'lyric-offset': legacyOffset, ...extraAttributes } = attrs;
            const lyrics = lines.slice(i + 1, end).map(line => line[0]).join('').trim();
            const lrc = lyrics.match(/^(`{3,}|~{3,})lrc\s*\n([\s\S]*?)\n\1$/);
            cards.push({ start, end: stop, original: body.slice(start, stop), editable: valid,
                data: { title: title || '', artist: artist || '', cover: cover || '', audio: audio || '',
                    lyricOffset: lyricOffset ?? legacyOffset ?? '0.35', lyrics: lrc ? lrc[2] : lyrics, lyricsFence: lrc ? lrc[1] : '', extraAttributes } });
            i = end;
        }
        return cards;
    }
    function block(kind, data) {
        if (kind === 'song') return song(data);
        if (kind === 'image') {
            const src = mediaUrl(data.image, '图片', true).replaceAll(' ', '%20').replaceAll('(', '%28').replaceAll(')', '%29');
            return `![${literal(data.alt)}](${src})`;
        }
        const text = required(data.text, kind === 'spoiler' ? '折叠文字' : '内容').replaceAll('\r\n', '\n');
        if (kind === 'note') {
            const type = ['note', 'tip', 'important', 'warning', 'caution'].includes(data.noteType) ? data.noteType : 'note';
            return `> [!${type.toUpperCase()}]\n${text.split('\n').map(line => `> ${line}`).join('\n')}`;
        }
        if (kind === 'spoiler') return `:spoiler[${literal(text)}]`;
        if (kind === 'math') {
            if (/^\s*\$\$\s*$/m.test(text)) throw new Error('只需填写公式内容，不要填写 $$ 分隔符。');
            return `$$\n${text}\n$$`;
        }
        if (kind === 'mermaid') {
            const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map(match => match[0].length));
            const fence = '`'.repeat(longest + 1);
            return `${fence}mermaid\n${text}\n${fence}`;
        }
        throw new Error('请选择一种组件。');
    }
    function apply(body = '', value, selected) {
        if (!selected) return `${body.trimEnd()}${body.trim() ? '\n\n' : ''}${value}\n`;
        if (body.slice(selected.start, selected.end) !== selected.original) throw new Error('正文中的卡片已改变，请重新选择这张音乐卡片再修改。');
        return body.slice(0, selected.start) + value + body.slice(selected.end);
    }
    globalThis.BlogComponents = { block, songs, apply };
})();

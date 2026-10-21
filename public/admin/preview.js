/* global createClass, h */
window.createBlogPreview = (runtime, markdown, AssetBoundary) => {
    const labels = { note: '说明', tip: '提示', important: '重要', warning: '警告', caution: '注意' };
    let activeAudio;
    const Spoiler = createClass({
        getInitialState() { return { revealed: false }; },
        shouldComponentUpdate() { return true; },
        render() {
            return h('button', { type: 'button', className: `blog-preview-spoiler${this.state.revealed ? ' is-revealed' : ''}`,
                'aria-expanded': this.state.revealed, title: '点击或悬停查看隐藏文字',
                onClick: () => this.setState({ revealed: !this.state.revealed }) },
                h('span', { className: 'blog-preview-spoiler__text' }, this.props.children));
        },
    });
    const Diagram = createClass({
        getInitialState() { return { svg: '', error: '', loading: true }; },
        shouldComponentUpdate() { return true; },
        componentDidMount() { this.mounted = true; this.revision = 0; this.schedule(); },
        componentDidUpdate(previous) { if (previous.source !== this.props.source) this.schedule(); },
        componentWillUnmount() { this.mounted = false; this.revision++; clearTimeout(this.timer); },
        schedule() {
            clearTimeout(this.timer);
            const revision = ++this.revision;
            const source = this.props.source;
            this.setState({ svg: '', error: '', loading: true });
            this.timer = setTimeout(async () => {
                const current = () => this.mounted && this.revision === revision;
                try {
                    const svg = await runtime.renderMermaid(source, current);
                    if (current()) this.setState({ svg: svg || '', loading: false });
                } catch (error) {
                    if (current()) this.setState({ error: `图表暂时无法显示：${error.message || '请检查 Mermaid 语法或重试。'}`, loading: false });
                }
            }, 300);
        },
        render() {
            return h('section', { className: 'blog-preview-diagram', 'aria-label': 'Mermaid 图表', 'aria-busy': this.state.loading },
                this.state.loading && h('p', { role: 'status' }, '正在绘制图表…'),
                this.state.svg && h('div', { className: 'blog-preview-diagram__svg', dangerouslySetInnerHTML: { __html: this.state.svg } }),
                this.state.error && h('div', {}, h('p', { role: 'alert', className: 'blog-preview-error' }, this.state.error),
                    h('pre', {}, this.props.source), h('button', { type: 'button', onClick: this.schedule }, '重新绘制')));
        },
    });
    const Song = createClass({
        getInitialState() { return { playing: false, error: '' }; },
        shouldComponentUpdate() { return true; },
        componentDidMount() { this.mounted = true; },
        componentDidUpdate(previous) {
            if (previous.audio !== this.props.audio) this.setState({ playing: false, error: '' });
        },
        componentWillUnmount() {
            this.mounted = false;
            this.audio?.pause();
            if (activeAudio === this.audio) activeAudio = null;
        },
        setAudio(node) {
            if (!node) {
                this.audio?.pause();
                if (activeAudio === this.audio) activeAudio = null;
            }
            this.audio = node;
        },
        async toggle() {
            const audio = this.audio;
            if (!audio || !this.props.audio) return;
            if (!audio.paused) { audio.pause(); return; }
            if (activeAudio && activeAudio !== audio) activeAudio.pause();
            activeAudio = audio;
            this.setState({ error: '' });
            if (audio.error) audio.load();
            try { await audio.play(); }
            catch {
                if (this.mounted && this.audio === audio) this.setState({ playing: false, error: '音频暂时无法播放，请检查链接或文件后重试。' });
            }
        },
        render() {
            const { title, artist, cover, audio, lyrics } = this.props;
            return h('section', { className: 'blog-preview-song', 'aria-label': `音乐卡片：${title}` },
                h('div', { className: 'blog-preview-song__header' },
                    cover && h('img', { src: cover, alt: `${title} · 封面`, className: 'blog-preview-song__cover' }),
                    h('div', {}, h('h3', {}, title || '未填写歌名'), h('p', {}, artist || '未填写歌手'),
                        h('button', { type: 'button', disabled: !audio, onClick: this.toggle }, this.state.playing ? '暂停试听' : '播放试听'))),
                h('audio', { key: audio, src: audio || undefined, preload: 'none', ref: this.setAudio,
                    onPlay: () => { if (this.mounted) this.setState({ playing: true }); },
                    onPause: () => { if (this.mounted) this.setState({ playing: false }); },
                    onEnded: () => { if (this.mounted) this.setState({ playing: false }); },
                    onError: () => { if (this.mounted) this.setState({ playing: false, error: '音频暂时无法播放，请检查链接或文件后重试。' }); } }),
                this.state.error && h('p', { role: 'alert', className: 'blog-preview-error' }, this.state.error),
                h('div', { className: 'blog-preview-song__lyrics' }, lyrics || '暂无歌词'));
        },
    });

    return createClass({
        shouldComponentUpdate() { return true; },
        asset(value, name) {
            const path = runtime.safeUrl(value);
            if (!path) return '';
            const field = this.props.field?.get('fields')?.find(field => field.get('name') === name) || this.props.field;
            return String(this.props.getAsset(path, field));
        },
        native(value, key) {
            return h(markdown.preview, { ...this.props, key, value,
                getAsset: (path, field) => this.props.getAsset(path, field) });
        },
        node(node, key) {
            const nested = () => (node.children || []).map((child, index) => this.node(child, `${key}-${index}`));
            const notice = runtime.notice(node);
            if (notice) return h('aside', { key, className: `blog-preview-notice blog-preview-notice--${notice.kind}` },
                h('div', { className: 'blog-preview-notice__title' }, notice.title ? this.node(notice.title, `${key}-title`) : labels[notice.kind]),
                notice.children.map((child, index) => this.node(child, `${key}-${index}`)));
            if (node.type === 'math' || node.type === 'inlineMath') {
                const result = runtime.math(node.value, node.type === 'math');
                return result.error ? h('span', { key, role: 'alert', className: 'blog-preview-error', title: result.error }, '公式格式有误：', result.value)
                    : h(node.type === 'math' ? 'div' : 'span', { key, className: 'blog-preview-math', dangerouslySetInnerHTML: { __html: result.html } });
            }
            if (node.type === 'code' && node.lang?.toLowerCase() === 'mermaid') return h(Diagram, { key, source: node.value });
            if (/Directive$/.test(node.type) && node.name === 'spoiler') return h(Spoiler, { key }, nested());
            if (node.type === 'containerDirective' && node.name === 'song') {
                const data = node.attributes || {};
                return h(AssetBoundary, { key, getAsset: this.props.getAsset, watchKey: `${data.cover}|${data.audio}`, render: getAsset => {
                    const asset = (value, name) => {
                        const path = runtime.safeUrl(value);
                        const field = this.props.field?.get('fields')?.find(field => field.get('name') === name) || this.props.field;
                        const resolved = path ? getAsset(runtime.mediaPath(path, field?.get('public_folder')), field) : null;
                        return resolved && resolved.path !== 'empty.svg' && resolved.file?.name !== 'empty.svg' ? String(resolved) : '';
                    };
                    return h(Song, { title: data.title, artist: data.artist, cover: asset(data.cover, 'component_cover'),
                        audio: asset(data.audio, 'component_audio'), lyrics: runtime.lyrics(node, this.props.value) });
                } });
            }
            if (node.type === 'text') return node.value;
            if (node.type === 'inlineCode') return h('code', { key }, node.value);
            if (node.type === 'break') return h('br', { key });
            if (node.type === 'thematicBreak') return h('hr', { key });
            if (node.type === 'code') return h('pre', { key }, h('code', {}, node.value));
            if (node.type === 'image') return h('img', { key, src: this.asset(node.url), alt: node.alt || '', title: node.title || undefined });
            if (node.type === 'link') {
                const href = runtime.safeUrl(node.url, true);
                return href ? h('a', { key, href, title: node.title || undefined, target: '_blank', rel: 'noopener noreferrer' }, nested()) : h('span', { key }, nested());
            }
            if (node.type === 'list') return h(node.ordered ? 'ol' : 'ul', { key, start: node.ordered ? node.start : undefined }, nested());
            if (node.type === 'listItem') return h('li', { key }, node.checked != null && h('input', { type: 'checkbox', checked: node.checked, readOnly: true, tabIndex: -1 }), nested());
            if (node.type === 'table') return h('div', { key, className: 'blog-preview-table' }, h('table', {},
                (node.children || []).map((row, index) => h(index === 0 ? 'thead' : 'tbody', { key: index }, h('tr', {},
                    row.children.map((cell, col) => h(index === 0 ? 'th' : 'td', { key: col }, (cell.children || []).map((child, i) => this.node(child, `${key}-${index}-${col}-${i}`)))))))));
            const tags = { paragraph: 'p', strong: 'strong', emphasis: 'em', delete: 'del', blockquote: 'blockquote' };
            if (tags[node.type] || node.type === 'heading') return h(tags[node.type] || `h${node.depth}`, { key }, nested());
            // HTML, unfamiliar directives and reference constructs keep Decap's
            // sanitized renderer. Source code is never executed in the preview.
            return this.native(this.props.value.slice(node.position?.start.offset || 0, node.position?.end.offset || 0), key);
        },
        render() {
            try {
                return h('div', { className: 'blog-preview-markdown' }, runtime.parsePreview(this.props.value || '').map((block, index) =>
                    block.type === 'markdown' ? this.native(block.value, index) : this.node(block.node, index)));
            } catch { return this.native(this.props.value || '', 'fallback'); }
        },
    });
};

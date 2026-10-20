/* global CMS, createClass, h, BlogComponents */
(() => {
    // A plain Markdown serializer cannot round-trip directives, JSX or math.
    const needsSource = value => /(^\s*(?:import|export)\s|^\s*:{2,}|^>\s*\[!|:[\w-]+\\?\[|^\s*(?:`{3,}|~{3,})\s*(?:mermaid|math)\b|^\s*\$\$|\$[^\n]+\$|<\/?[A-Za-z][^>]*>)/m.test(value || '');
    const markdown = CMS.getWidget('markdown');
    const SafeMarkdown = createClass({
        getInitialState() {
            return { source: this.props.field.get('force_raw') || needsSource(this.props.value), kind: 'song',
                song: { title: '', artist: '', cover: '', audio: '', lyrics: '', lyricOffset: '0.35' },
                selected: null, image: '', alt: '', text: '', noteType: 'note', error: '', notice: '', revision: 0 };
        },
        handleChange(value) {
            if (needsSource(value) && !this.state.source) this.setState({ source: true });
            this.props.onChange(value);
        },
        shouldComponentUpdate() {
            // Decap's wrapper otherwise updates only when the body changes,
            // leaving embedded image/file controls unaware of media selections.
            return true;
        },
        isValid() {
            return this.control?.isValid ? this.control.isValid() : true;
        },
        changeSong(name, value) {
            this.setState({ song: { ...this.state.song, [name]: value }, error: '', notice: '' });
        },
        selectSong(event) {
            const card = BlogComponents.songs(this.props.value).find(card => String(card.start) === event.target.value);
            this.setState({ selected: card || null, error: '', notice: '',
                song: card ? card.data : { title: '', artist: '', cover: '', audio: '', lyrics: '', lyricOffset: '0.35' } });
        },
        insertComponent() {
            try {
                const { kind, song, selected, image, alt, text, noteType } = this.state;
                if (kind === 'song' && selected && !selected.editable) throw new Error('这张卡片包含特殊属性，请直接使用源码修改。');
                const block = BlogComponents.block(kind, kind === 'song' ? song : { image, alt, text, noteType });
                const next = BlogComponents.apply(this.props.value, block, kind === 'song' ? selected : null);
                const nextCard = kind === 'song' ? (selected ? BlogComponents.songs(next).find(card => card.start === selected.start) : BlogComponents.songs(next).at(-1)) : null;
                this.setState({ source: this.state.source || kind !== 'image', selected: nextCard, error: '', revision: this.state.revision + 1,
                    notice: selected && kind === 'song' ? '音乐卡片已更新，请点击页面顶部“发布”保存。' : '已插入正文末尾，可在正文中移动位置；请点击页面顶部“发布”保存。' });
                this.props.onChange(next);
            } catch (error) {
                this.setState({ error: error.message, notice: '' });
            }
        },
        mediaField(name, label, value, onChange) {
            const field = this.props.field.get('fields')?.find(field => field.get('name') === name);
            if (!field) return null;
            const widget = CMS.getWidget(field.get('widget'));
            return h('fieldset', { className: 'blog-tools__media', key: name },
                h('legend', {}, label),
                h('input', { type: 'text', 'aria-label': `${label}地址`, value, placeholder: '选择/上传文件，或填写 https 链接', onChange: event => onChange(event.target.value) }),
                h(widget.control, { ...this.props, forID: `${this.props.forID}-${name}`, field, value, onChange }),
            );
        },
        componentForm() {
            const { kind, song, selected, error, notice } = this.state;
            const cards = BlogComponents.songs(this.props.value);
            const input = (label, name, value, options = {}) => {
                const { multiline, ...attributes } = options;
                return h('label', { className: 'blog-tools__field', key: name }, label,
                    h(multiline ? 'textarea' : 'input', { type: options.type || 'text', rows: multiline ? 6 : undefined,
                        value, ...attributes, onChange: event => name.startsWith('song.') ? this.changeSong(name.slice(5), event.target.value) : this.setState({ [name]: event.target.value, error: '', notice: '' }) }));
            };
            return h('details', { className: 'blog-tools' },
                h('summary', {}, '常用组件'),
                h('p', { className: 'blog-tools__hint' }, '填写表单后点“插入到正文末尾”或“更新音乐卡片”，最后点页面顶部“发布”。'),
                h('label', { className: 'blog-tools__field' }, '组件类型', h('select', { value: kind,
                    onChange: event => this.setState({ kind: event.target.value, selected: null, error: '', notice: '', text: '' }) },
                    [['song', '音乐卡片'], ['image', '图片'], ['note', '提示框'], ['spoiler', '折叠文字（spoiler）'], ['math', '公式'], ['mermaid', 'Mermaid 图表']].map(([value, label]) => h('option', { value, key: value }, label)))),
                kind === 'song' && h('div', {},
                    h('label', { className: 'blog-tools__field' }, '新建或修改', h('select', { value: selected ? String(selected.start) : '', onChange: this.selectSong },
                        h('option', { value: '' }, '新建音乐卡片'),
                        cards.map((card, index) => h('option', { value: String(card.start), key: card.start }, `${index + 1}. ${card.data.title || '未命名歌曲'} — ${card.data.artist || '未填写歌手'}`)))),
                    input('歌曲名', 'song.title', song.title), input('歌手', 'song.artist', song.artist),
                    this.mediaField('component_cover', '歌曲封面', song.cover, value => this.changeSong('cover', value)),
                    this.mediaField('component_audio', '歌曲音频', song.audio, value => this.changeSong('audio', value)),
                    input('歌词（支持带时间戳的 LRC，可留空）', 'song.lyrics', song.lyrics, { multiline: true }),
                    input('歌词偏移（秒）', 'song.lyricOffset', song.lyricOffset, { type: 'number', step: '0.01' }),
                    h('p', { className: 'blog-tools__hint' }, '封面和音频可直接上传，也可继续使用你现有的 resource.etalib.space 链接。'),
                    h('div', { className: 'blog-tools__song-preview' }, h('strong', {}, song.title || '歌曲名'), ' · ', song.artist || '歌手',
                        h('p', {}, song.lyrics.split('\n').find(line => line.trim())?.replace(/^\[[^\]]*\]\s*/, '') || '暂无歌词')),
                ),
                kind === 'image' && h('div', {}, this.mediaField('component_image', '正文图片', this.state.image, value => this.setState({ image: value })), input('图片说明', 'alt', this.state.alt)),
                kind === 'note' && h('label', { className: 'blog-tools__field' }, '提示类型', h('select', { value: this.state.noteType, onChange: event => this.setState({ noteType: event.target.value }) },
                    [['note', '说明'], ['tip', '提示'], ['important', '重要'], ['warning', '警告'], ['caution', '注意']].map(([value, label]) => h('option', { value, key: value }, label)))),
                !['song', 'image'].includes(kind) && input(kind === 'math' ? 'LaTeX 公式（不含 $$）' : kind === 'mermaid' ? 'Mermaid 内容（不含代码围栏）' : '内容', 'text', this.state.text, { multiline: true }),
                error && h('p', { role: 'alert', className: 'blog-tools__error' }, error),
                notice && h('p', { role: 'status', className: 'blog-tools__notice' }, notice),
                h('button', { type: 'button', className: 'blog-tools__insert', onClick: this.insertComponent }, selected && kind === 'song' ? '更新音乐卡片' : '插入到正文末尾'),
            );
        },
        render() {
            const source = this.state.source || this.props.field.get('force_raw') || needsSource(this.props.value);
            const available = this.props.field.get('modes') || this.props.field.keySeq().take(0).concat(['rich_text', 'raw']).toList();
            const modes = source ? available.filter(mode => mode === 'raw') : available;
            const field = this.props.field.set('modes', modes).set('sanitize_preview', true);
            return h('div', {},
                this.componentForm(),
                source && h('p', { style: { color: '#52636f', fontSize: '13px', marginBottom: '8px' } }, '此文章包含高级语法，使用源码编辑以保留原有内容；最终效果以博客页面为准。'),
                // Recreate CodeMirror/Slate after a form insertion; these editors keep
                // their own document and do not always adopt external value changes.
                h(markdown.control, { ...this.props, key: `${source ? 'source' : 'standard'}-${this.state.revision}`, field,
                    ref: control => { this.control = control; }, onChange: this.handleChange }),
            );
        },
    });
    CMS.registerWidget('safe-markdown', SafeMarkdown, markdown.preview);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    CMS.init(local ? { config: { local_backend: { url: 'http://127.0.0.1:8081/api/v1' } } } : {});
})();

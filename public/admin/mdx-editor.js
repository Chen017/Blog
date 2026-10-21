/* global CMS, createClass, h */
window.createBlogMdxEditor = (model, AssetBoundary) => {
    const markdown = CMS.getWidget('markdown');
    return createClass({
        getInitialState() { return { error: '', notice: '', editingImage: null, imageDraft: null, revision: 0 }; },
        shouldComponentUpdate() { return true; },
        componentWillReceiveProps(next) {
            if (next.value !== this.props.value && next.value !== this.lastEmitted) {
                this.proseDrafts = {};
                this.setState({ revision: this.state.revision + 1 });
            }
        },
        isValid() { return this.state.error ? { error: { type: 'CUSTOM', message: this.state.error } } : true; },
        change(mutation, rebuild = false) {
            try {
                const document = model.parseDocument(this.props.value || '');
                const next = mutation(document);
                if (rebuild) this.proseDrafts = {};
                this.lastEmitted = next;
                this.setState({ error: '', revision: this.state.revision + (rebuild ? 1 : 0) });
                this.props.onChange(next);
                return true;
            } catch (error) { this.setState({ error: error.message }); return false; }
        },
        changeProse(index, value) {
            // Keep the exact rich-editor value (including a newly typed empty
            // paragraph) separate from MDX's surrounding layout whitespace.
            this.proseDrafts = { ...this.proseDrafts, [index]: value };
            this.change(document => model.replaceProse(document, index, value));
        },
        renderImage(segment, index, image, imageIndex) {
            const id = `${index}-${imageIndex}`;
            const editing = this.state.editingImage === id;
            const draft = this.state.imageDraft || image;
            const field = this.props.field.get('fields').find(field => field.get('name') === 'component_image');
            return h('figure', { key: id, className: 'blog-mdx__image' },
                h(AssetBoundary, { getAsset: this.props.getAsset, watchKey: image.src, render: getAsset => h('img', { src: String(getAsset(image.src, field)), alt: image.alt }) }),
                h('button', { type: 'button', className: 'blog-tools__mode', 'aria-expanded': editing,
                    onClick: () => this.setState({ editingImage: editing ? null : id, imageDraft: { src: image.src, alt: image.alt }, notice: '' }) }, `${editing ? '收起' : '编辑'}图片 ${imageIndex + 1}`),
                editing && h('div', {},
                    this.props.mediaField('component_image', '替换图片', draft.src,
                        value => this.setState({ imageDraft: { ...draft, src: value } }), `mdx-image-${id}`),
                    h('label', { className: 'blog-tools__field' }, '图片说明', h('input', { type: 'text', value: draft.alt,
                        onChange: event => this.setState({ imageDraft: { ...draft, alt: event.target.value } }) })),
                    h('button', { type: 'button', className: 'blog-tools__insert', onClick: () => {
                        if (this.change(document => model.replaceImage(document, index, imageIndex, draft), true)) {
                            this.setState({ editingImage: null, notice: '图片已更新，请点击顶部“发布”保存。' });
                        }
                    } }, '应用图片修改')),
            );
        },
        render() {
            const document = model.parseDocument(this.props.value || '');
            if (document.error) return h('div', { role: 'alert', className: 'blog-tools__error' }, document.error, '。可切换到源码检查，原内容仍然保留。');
            const field = this.props.field.set('modes', this.props.field.keySeq().take(0).concat(['rich_text']).toList());
            return h('div', { className: 'blog-mdx' },
                h('p', { className: 'blog-tools__hint' }, '直接编辑文字；点“编辑图片”可替换图片和修改说明。原有图片布局与导入由后台保留。新增图片可用上方“常用组件”。'),
                this.state.error && h('p', { role: 'alert', className: 'blog-tools__error' }, this.state.error),
                this.state.notice && h('p', { role: 'status', className: 'blog-tools__notice' }, this.state.notice),
                document.segments.map((segment, index) => {
                    if (segment.type === 'space' || segment.type === 'code') return null;
                    if (segment.type === 'images') return h('section', { key: index, className: 'blog-mdx__images', 'aria-label': `图片区块 ${index + 1}` },
                        h('p', { className: 'blog-tools__hint' }, segment.images.length > 1 ? `图片组 · ${segment.images.length} 张（保留原布局）` : '图片'),
                        h('div', { className: segment.images.length > 1 ? 'blog-mdx__grid' : '' }, segment.images.map((image, imageIndex) => this.renderImage(segment, index, image, imageIndex))));
                    if (segment.type === 'protected') return h('details', { key: index, className: 'blog-mdx__protected' },
                        h('summary', {}, `自定义区块 · ${segment.name}（已保留）`),
                        h('p', { className: 'blog-tools__hint' }, '这部分保持原样；歌曲等常用组件可以通过上方表单修改。'), h('pre', {}, segment.raw));
                    return h('section', { key: index, className: 'blog-mdx__prose', 'aria-label': `文字区块 ${index + 1}` },
                        h(markdown.control, { ...this.props, key: `${index}-${this.state.revision}`, field,
                            value: this.proseDrafts?.[index] ?? segment.raw.trim(), forID: `${this.props.forID}-prose-${index}`,
                            onChange: value => this.changeProse(index, value) }));
                }),
                h('button', { type: 'button', className: 'blog-tools__insert', onClick: () => this.change(document => model.appendProse(document.source), true) }, '添加文字区块'),
                h('details', { className: 'blog-mdx__protected' }, h('summary', {}, '高级代码（通常无需修改）'),
                    h('pre', {}, document.segments.filter(segment => segment.type === 'code').map(segment => segment.raw).join('\n\n') || '没有需要手动管理的导入。')),
            );
        },
    });
};

/* Presentation only: fields stay mounted and keep their original frontmatter names. */
(() => {
    const names = ['updated', 'coverInContent', 'pinned', 'draft', 'lang', 'routeName', 'comment', 'encrypted', 'password', 'copyProtection'];
    let group, queued = false, route = location.hash;
    const refresh = () => {
        queued = false;
        const fields = names.map(name => document.querySelector(`label[for^="${name}-field-"]`)?.closest('[aria-label$=" field"]')).filter(Boolean);
        if (!fields.length) { group = null; return; }
        if (!group || group.first !== fields[0] || !group.header.isConnected) {
            group?.header.remove();
            const header = document.createElement('div');
            header.className = 'blog-advanced';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'blog-advanced__toggle';
            const status = document.createElement('span');
            status.className = 'blog-advanced__status';
            header.append(button, status);
            fields[0].before(header);
            group = { first: fields[0], header, button, status, open: false };
            button.addEventListener('click', () => { group.open = !group.open; refresh(); });
        }
        if (route !== location.hash) { route = location.hash; group.open = false; }
        const label = group.open ? '▾ 收起高级设置' : '▸ 展开高级设置';
        if (group.button.textContent !== label) group.button.textContent = label;
        group.button.setAttribute('aria-expanded', String(group.open));
        const draft = document.querySelector('[id^="draft-field-"]')?.getAttribute('aria-checked') === 'true';
        const text = draft ? '当前为草稿，保存后不会公开' : '当前为公开文章';
        if (group.status.textContent !== text) group.status.textContent = text;
        fields.forEach(field => { field.classList.add('blog-advanced__field'); field.hidden = !group.open; });
    };
    const observer = new MutationObserver(() => {
        if (!queued) { queued = true; requestAnimationFrame(refresh); }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-checked'] });
})();

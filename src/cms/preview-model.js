import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import katex from 'katex';

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).use(remarkMath);
export const noticeKinds = ['note', 'tip', 'important', 'warning', 'caution'];
const children = node => node.children || [];

export function notice(node) {
    if (node.type === 'containerDirective' && noticeKinds.includes(node.name)) {
        const label = node.children[0]?.data?.directiveLabel ? node.children[0] : null;
        return { kind: node.name, title: label, children: label ? node.children.slice(1) : node.children };
    }
    if (node.type !== 'blockquote') return null;
    const paragraph = node.children[0], text = paragraph?.children?.[0];
    const match = text?.type === 'text' && text.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\r?\n|$)/i);
    if (!match) return null;
    const remaining = [{ ...text, value: text.value.slice(match[0].length) }, ...paragraph.children.slice(1)];
    return { kind: match[1].toLowerCase(), children: [
        ...(remaining.some(node => node.type !== 'text' || node.value) ? [{ ...paragraph, children: remaining }] : []),
        ...node.children.slice(1),
    ] };
}

const extended = node => notice(node) || ['math', 'inlineMath'].includes(node.type)
    || node.type === 'code' && node.lang?.toLowerCase() === 'mermaid'
    || /Directive$/.test(node.type) && ['song', 'spoiler'].includes(node.name)
    || children(node).some(extended);

// Ordinary Markdown still uses Decap's native preview and image resolver. Only
// blocks containing the supported extensions need the custom node renderer.
export function parsePreview(source = '') {
    const tree = parser.parse(source), blocks = [];
    let cursor = 0;
    for (const node of tree.children) {
        if (!extended(node)) continue;
        const start = node.position.start.offset, end = node.position.end.offset;
        if (start > cursor) blocks.push({ type: 'markdown', value: source.slice(cursor, start) });
        blocks.push({ type: 'component', node });
        cursor = end;
    }
    if (cursor < source.length) blocks.push({ type: 'markdown', value: source.slice(cursor) });
    return blocks;
}

export function safeUrl(value, link = false) {
    const url = String(value || '').trim();
    if (!url || /[\u0000-\u001f\u007f\\]/.test(url) || url.startsWith('//')) return '';
    const scheme = url.match(/^([a-z][\w+.-]*):/i)?.[1].toLowerCase();
    return !scheme || ['https', 'http', ...(link ? ['mailto', 'tel'] : [])].includes(scheme) ? url : '';
}

export function mediaPath(value, publicFolder) {
    const folder = typeof publicFolder === 'string' ? publicFolder.replace(/\/$/, '') : '';
    // Resolve shared uploads from Git/the draft media store, rather than
    // requesting a public URL that may not exist until the next deployment.
    if (/^\/(?!\/)/.test(folder) && value.startsWith(`${folder}/`)) {
        const relative = value.slice(folder.length + 1).split(/[?#]/, 1)[0];
        try { return decodeURIComponent(relative); } catch { return relative; }
    }
    return value;
}

export function math(value, displayMode) {
    try {
        return { html: katex.renderToString(value, { displayMode, throwOnError: true, trust: false, strict: 'ignore' }) };
    } catch (error) { return { error: `公式暂时无法显示：${error.message}`, value }; }
}

export function lyrics(node, source) {
    const text = item => typeof item.value === 'string' ? item.value : children(item).map(text).join('');
    let value = children(node).map(text).join('\n');
    if (source && node.position) {
        const lines = source.slice(node.position.start.offset, node.position.end.offset).split(/\r?\n/).slice(1);
        if (/^\s*:{3,}\s*$/.test(lines.at(-1))) lines.pop();
        value = lines.join('\n').trim();
        const fenced = value.match(/^(`{3,}|~{3,})lrc\s*\n([\s\S]*?)\n\1$/);
        if (fenced) value = fenced[2];
    }
    return value.split(/\r?\n/)
        .filter(line => !/^\s*\[(?:ar|ti|al|by|offset|length):/i.test(line))
        .map(line => line.replace(/^\s*(?:\[\d{1,3}[:：]\d{2}(?:[.:]\d+)?\])+\s*/, '')).join('\n').trim();
}

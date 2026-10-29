import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';

const parser = unified().use(remarkParse).use(remarkDirective).use(remarkMath).use(remarkMdx);
const markdownParser = unified().use(remarkParse);
const start = node => node.position.start.offset;
const end = node => node.position.end.offset;
const children = node => node.children || [];
const attributes = node => node.attributes || [];
const attr = (node, name) => attributes(node).find(item => item.type === 'mdxJsxAttribute' && item.name === name);
const isSpecial = node => /^mdx|Directive$/.test(node.type) || ['math', 'inlineMath', 'imageReference', 'definition'].includes(node.type)
    || children(node).some(isSpecial);
const containsMdx = node => /^mdx/.test(node.type) || children(node).some(containsMdx);

function image(node, imports) {
    if (node.type !== 'mdxJsxFlowElement' || !['img', 'Image'].includes(node.name) || children(node).length) return null;
    const source = attr(node, 'src');
    const alt = attr(node, 'alt');
    if (!source || (alt && typeof alt.value !== 'string')) return null;
    let path = source.value;
    if (typeof path !== 'string') {
        const expression = path?.data?.estree?.body?.[0]?.expression;
        if (expression?.type === 'Identifier') path = imports.get(expression.name);
        else {
            if (expression?.type !== 'MemberExpression' || expression.computed || expression.object?.type !== 'Identifier'
            || expression.property?.name !== 'src') return null;
            path = imports.get(expression.object.name);
        }
    }
    if (typeof path !== 'string' || /^(?:javascript|data):/i.test(path)) return null;
    return { start: start(node), end: end(node), src: path, alt: alt?.value || '', source, originalSource: attr(node, 'data-src'), component: node.name, altAttribute: alt };
}

function imageGroup(node, imports) {
    const single = image(node, imports);
    if (single) return [single];
    if (node.type !== 'mdxJsxFlowElement' || node.name !== 'div' || !children(node).length) return null;
    // Preserve layout attributes verbatim; never evaluate JSX, event handlers or expressions.
    const images = children(node).filter(item => item.type !== 'text' || item.value.trim()).map(item => image(item, imports));
    return images.length && images.every(Boolean) ? images : null;
}

export function parseDocument(source = '') {
    try {
        const tree = parser.parse(source);
        const imports = new Map();
        for (const node of tree.children.filter(node => node.type === 'mdxjsEsm')) {
            for (const statement of node.data?.estree?.body || []) {
                if (statement.type !== 'ImportDeclaration' || !/\.(?:avif|gif|jpe?g|png|svg|webp|tiff?)$/i.test(statement.source.value)) continue;
                for (const specifier of statement.specifiers) {
                    if (specifier.type === 'ImportDefaultSpecifier') imports.set(specifier.local.name, statement.source.value);
                }
            }
        }
        const segments = [];
        let cursor = 0;
        const prose = until => {
            if (until <= cursor) return;
            const raw = source.slice(cursor, until);
            segments.push({ type: raw.trim() ? 'prose' : 'space', start: cursor, end: until, raw });
        };
        for (const node of tree.children) {
            if (!isSpecial(node)) continue;
            prose(start(node));
            const images = imageGroup(node, imports);
            segments.push({ type: node.type === 'mdxjsEsm' ? 'code' : images ? 'images' : 'protected',
                name: node.name || node.type, start: start(node), end: end(node), raw: source.slice(start(node), end(node)), images,
                previewable: !containsMdx(node) });
            cursor = end(node);
        }
        prose(source.length);
        if (!segments.some(segment => segment.type !== 'space' && segment.type !== 'code')) {
            segments.push({ type: 'prose', start: source.length, end: source.length, raw: '' });
        }
        return { source, segments, error: null };
    } catch (error) {
        return { source, segments: [], error: `暂时无法解析这段 MDX：${error.reason || error.message}` };
    }
}

function apply(source, edits) {
    return [...edits].sort((a, b) => b.start - a.start).reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), source);
}

// Rich-text input is prose. Escape literal braces only in text nodes, leaving
// fenced/inline code untouched, so writing {notes} cannot create executable MDX.
function proseForMdx(value) {
    const edits = [];
    const walk = node => {
        if (node.type === 'html') {
            edits.push({ start: start(node), end: end(node), text: value.slice(start(node), end(node)).replace(/</g, '&lt;').replace(/>/g, '&gt;') });
        } else if (node.type === 'text') {
            const raw = value.slice(start(node), end(node));
            const text = raw.replace(/(?<!\\)([{}])/g, '\\$1').replace(/(^|\n)([ \t]*)(import|export)(?=\s)/g,
                (_match, line, spaces, word) => `${line}${spaces}${word === 'import' ? '&#105;' : '&#101;'}${word.slice(1)}`);
            if (raw !== text) edits.push({ start: start(node), end: end(node), text });
        }
        children(node).forEach(walk);
    };
    walk(markdownParser.parse(value));
    return apply(value, edits);
}

export function replaceProse(document, index, value) {
    const segment = document.segments[index];
    if (segment?.type !== 'prose') throw new Error('这段内容不是普通正文，请重新打开文章后再试。');
    if (value.trim() === segment.raw.trim()) return document.source;
    const prefix = segment.raw.match(/^\s*/)[0];
    const suffix = segment.raw.match(/\s*$/)[0];
    const text = proseForMdx(value).trim();
    const next = apply(document.source, [{ start: segment.start, end: segment.end, text: prefix + text + (suffix || '\n\n') }]);
    const parsed = parseDocument(next);
    if (parsed.error) throw new Error('这段文字包含特殊 MDX 语法，请通过“常用组件”插入组件，或切换源码检查。');
    return next;
}

const quote = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, ' ');

export function replaceImage(document, index, imageIndex, change) {
    const target = document.segments[index]?.images?.[imageIndex];
    if (!target) throw new Error('图片位置已改变，请重新选择图片。');
    const edits = [];
    if ('src' in change && change.src !== target.src) {
        const path = String(change.src).trim();
        if (!path || /^(?:[a-z][\w+.-]*:)/i.test(path) && !/^https?:\/\//i.test(path)) throw new Error('请选择图片，或填写 http / https 图片链接。');
        let value;
        if (/^(?:https?:\/\/|\/)/i.test(path)) value = `"${quote(path)}"`;
        else {
            if (!/\.(?:avif|gif|jpe?g|png|svg|webp|tiff?)$/i.test(path)) throw new Error('请选择完整的图片文件名，例如 photo.jpg。');
            let number = 1;
            while (new RegExp(`\\bcmsImage${number}\\b`).test(document.source)) number++;
            const name = `cmsImage${number}`;
            const importPath = path.startsWith('.') ? path : `./${path}`;
            const lineEnding = document.source.includes('\r\n') ? '\r\n' : '\n';
            edits.push({ start: 0, end: 0, text: `import ${name} from ${JSON.stringify(importPath)};${lineEnding}${lineEnding}` });
            value = target.component === 'Image' ? `{${name}}` : `{${name}.src}`;
        }
        edits.push({ start: start(target.source), end: end(target.source), text: `src=${value}` });
        if (target.originalSource) {
            const original = target.component === 'Image' && value.startsWith('{') ? value.replace(/}$/, '.src}') : value;
            edits.push({start:start(target.originalSource),end:end(target.originalSource),text:`data-src=${original}`});
        }
    }
    if ('alt' in change && change.alt !== target.alt) {
        const text = `alt="${quote(change.alt)}"`;
        if (target.altAttribute) edits.push({ start: start(target.altAttribute), end: end(target.altAttribute), text });
        else edits.push({ start: end(target.source), end: end(target.source), text: ` ${text}` });
    }
    return apply(document.source, edits);
}

export function appendProse(source) {
    return `${source.trimEnd()}\n\n在这里写内容。\n`;
}

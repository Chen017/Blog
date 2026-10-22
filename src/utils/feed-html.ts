import path from 'node:path';
import { parse } from 'node-html-parser';
import sanitizeHtml from 'sanitize-html';

export function feedAssetPath(filePath: string, source: string): string {
    const decoded = decodeURI(source.split(/[?#]/, 1)[0]);
    return '/' + path.posix.normalize(path.posix.join(path.posix.dirname(filePath.replace(/\\/g, '/')), decoded)).replace(/^\.\//, '');
}

export function cleanFeedHtml(source: string, site: URL, postPath: string): string {
    const html = parse(source);
    html.querySelectorAll('script,style,button,.song-card__player,[data-lrc-source]').forEach(node => node.remove());
    for (const element of html.querySelectorAll('[src],[href]')) {
        for (const attribute of ['src', 'href']) {
            const value = element.getAttribute(attribute);
            if (value) {
                try { element.setAttribute(attribute, new URL(value, new URL(postPath, site)).href); }
                catch { element.removeAttribute(attribute); }
            }
        }
        // A single absolute source works across feed readers with limited srcset support.
        element.removeAttribute('srcset');
    }
    return sanitizeHtml(html.toString(), {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt', 'title', 'width', 'height'] },
    });
}

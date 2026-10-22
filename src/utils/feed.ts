import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getImage } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { parse } from 'node-html-parser';
import FeedBody from '@components/feedBody.astro';
import { getPostUrl } from './url';
import { cleanFeedHtml, feedAssetPath } from './feed-html';
import mdxRenderer from '@astrojs/mdx/server.js';

const images = import.meta.glob<{ default: ImageMetadata }>('/src/content/**/*.{avif,gif,jpeg,jpg,png,svg,tiff,webp}');
const cache = new Map<string, Promise<string>>();
let container: ReturnType<typeof AstroContainer.create>;

export function renderFeedContent(post: CollectionEntry<'posts'>, site: URL): Promise<string> {
    if (post.data.encrypted || post.data.draft) return Promise.resolve('');
    const key = `${site.href}:${post.id}`;
    if (!cache.has(key)) cache.set(key, (async () => {
        container ||= AstroContainer.create().then(instance => {
            instance.addServerRenderer({ renderer: mdxRenderer });
            return instance;
        });
        const postPath = getPostUrl(post);
        const raw = await (await container).renderToString(FeedBody, {
            props: { post }, request: new Request(new URL(postPath, site)),
        });
        const html = parse(raw);
        for (const image of html.querySelectorAll('img[src]')) {
            const source = image.getAttribute('src')!;
            if (source.startsWith('/') || /^[a-z][\w+.-]*:/i.test(source)) continue;
            const file = post.filePath && images[feedAssetPath(post.filePath, source)];
            if (file) image.setAttribute('src', (await getImage({ src: (await file()).default })).src);
        }
        return cleanFeedHtml(html.toString(), site, postPath);
    })());
    return cache.get(key)!;
}

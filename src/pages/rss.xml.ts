import type { APIContext } from 'astro';
import type { RSSFeedItem } from '@astrojs/rss';
import rss from '@astrojs/rss';
import { siteConfig } from '@/config';
import { getSortedPosts } from '@utils/post';
import { getCategoryPathLabel } from '@utils/category';
import { getPostUrl } from '@utils/url';
import { renderFeedContent } from '@utils/feed';

export async function GET(context: APIContext) {
    if (!context.site) throw new Error('site not set');
    const posts = (await getSortedPosts()).filter(post => !post.data.encrypted && !post.data.draft);
    const items: RSSFeedItem[] = [];
    for (const post of posts) {
        const category = getCategoryPathLabel(post.data.category);
        items.push({
            title: post.data.title, description: post.data.description,
            pubDate: post.data.published, link: getPostUrl(post),
            categories: category ? [category] : [],
            content: await renderFeedContent(post, context.site),
        });
    }
    return rss({ title: siteConfig.title, description: siteConfig.subtitle || 'No description',
        site: context.site, items, customData: `<language>${siteConfig.lang}</language>` });
}

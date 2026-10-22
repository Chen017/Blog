import type { APIContext } from "astro";
import { siteConfig, profileConfig } from "@/config";
import { getSortedPosts } from "@utils/content";
import { getCategoryPathParts } from "@utils/category";
import { getPostUrl } from "@utils/url";
import { renderFeedContent } from "@utils/feed";


function escapeXml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function wrapCdata(value: string) {
    return value.replace(/]]>/g, "]]]]><![CDATA[>");
}

export async function GET(context: APIContext) {
    if (!context.site) {
        throw Error("site not set");
    }

    // Use the same ordering as site listing (pinned first, then by published desc)
    // 过滤掉加密文章和草稿文章
    const posts = (await getSortedPosts()).filter((post) => !post.data.encrypted && post.data.draft !== true);

    // 创建Atom feed头部
    let atomFeed = `<?xml version="1.0" encoding="utf-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
        <title>${escapeXml(siteConfig.title)}</title>
        <subtitle>${escapeXml(siteConfig.subtitle || "No description")}</subtitle>
        <link href="${escapeXml(context.site.href)}" rel="alternate" type="text/html"/>
        <link href="${escapeXml(new URL("atom.xml", context.site).href)}" rel="self" type="application/atom+xml"/>
        <id>${escapeXml(context.site.href)}</id>
        <updated>${new Date().toISOString()}</updated>
        <language>${escapeXml(siteConfig.lang)}</language>`;

    for (const post of posts) {
        const postUrl = new URL(getPostUrl(post), context.site).href;
        const content = await renderFeedContent(post, context.site);

        atomFeed += `
        <entry>
            <title>${escapeXml(post.data.title)}</title>
            <link href="${escapeXml(postUrl)}" rel="alternate" type="text/html"/>
            <id>${escapeXml(postUrl)}</id>
            <published>${post.data.published.toISOString()}</published>
            <updated>${post.data.updated?.toISOString() || post.data.published.toISOString()}</updated>
            <summary>${escapeXml(post.data.description || "")}</summary>
            <content type="html"><![CDATA[${wrapCdata(content)}]]></content>
            <author>
                <name>${escapeXml(profileConfig.name)}</name>
            </author>`;
        // 添加分类标签
        const categoryParts = getCategoryPathParts(post.data.category);
        if (categoryParts && categoryParts.length > 0) {
            for (let i = 0; i < categoryParts.length; i++) {
                const term = categoryParts.slice(0, i + 1).join(" / ");
                atomFeed += `
            <category term="${escapeXml(term)}"></category>`;
            }
        }
        atomFeed += `
            </entry>`;
    }

    // 关闭Atom feed
    atomFeed += `
        </feed>`;

    return new Response(atomFeed, {
        headers: {
            "Content-Type": "application/atom+xml; charset=utf-8",

        },
    });
}

import yaml from "js-yaml";

import type {
    SiteConfig,
    NavbarLink,
    NavbarConfig,
    SidebarConfig,
    ProfileConfig,
    PostConfig,
    ParticleConfig,
    Favicon,
} from "./types/config";
import { LinkPreset } from "./types/config";
import rawConfig from "../twilight.config.yaml?raw";

type FaviconInput = Favicon | string;

type ConfigFile = {
    site: SiteConfig;
    umami: {
        enabled: boolean;
        apiKey?: string;
        websiteId?: string;
        baseUrl: string;
        scripts?: string;
    };
    navbar: {
        links: Array<NavbarLink | LinkPreset | string>;
    };
    sidebar: SidebarConfig;
    profile: ProfileConfig;
    post: PostConfig;
    particle: ParticleConfig;
};

const config = yaml.load(rawConfig) as ConfigFile;
if (config.umami.apiKey) {
    throw new Error('Move umami.apiKey out of twilight.config.yaml into the build environment variable UMAMI_API_KEY.');
}

const normalizeFavicons = (favicons: FaviconInput[] | undefined): Favicon[] =>
    (favicons ?? [])
        .map((favicon) =>
            typeof favicon === "string" ? { src: favicon } : favicon,
        )
        .filter(
            (favicon): favicon is Favicon =>
                typeof favicon.src === "string" && favicon.src.length > 0,
        );

const linkPresetNameMap: Record<string, LinkPreset> = {
    Home: LinkPreset.Home,
    Archive: LinkPreset.Archive,
    Skills: LinkPreset.Skills,
    About: LinkPreset.About,
    Friends: LinkPreset.Friends,
};

const normalizeNavbarLink = (
    link: NavbarLink | LinkPreset | string,
): NavbarLink | LinkPreset => {
    if (typeof link === "string") {
        const preset = linkPresetNameMap[link];
        if (preset === undefined) {
            throw new Error(`Unknown LinkPreset: ${link}`);
        }
        return preset;
    }
    if (typeof link === "number") {
        return link;
    }
    const children = link.children?.map(normalizeNavbarLink);
    return children ? { ...link, children } : link;
};

const normalizeNavbarLinks = (links: Array<NavbarLink | LinkPreset | string>) =>
    links.map(normalizeNavbarLink);

const resolvedPostConfig: PostConfig = {
    ...config.post,
    comment: {
        ...config.post.comment,
        provider: config.post.comment.provider
            ?? (config.post.comment.waline ? "waline" : undefined)
            ?? (config.post.comment.twikoo ? "twikoo" : undefined),
        waline: config.post.comment.waline
            ? {
                ...config.post.comment.waline,
                lang: config.post.comment.waline.lang ?? config.site.lang,
            }
            : undefined,
        twikoo: config.post.comment.twikoo
            ? {
                ...config.post.comment.twikoo,
                lang: config.post.comment.twikoo.lang ?? config.site.lang,
            }
            : undefined,
    },
};

// 站点配置
export const siteConfig: SiteConfig = {
    ...config.site,
    favicon: normalizeFavicons(config.site.favicon),
};

// Umami统计配置
export const umamiConfig = {
    enabled: config.umami.enabled,
    baseUrl: config.umami.baseUrl,
    websiteId: config.umami.websiteId || (config.umami.scripts || '').match(/data-website-id="([^"]+)"/)?.[1] || '',
    scripts: import.meta.env.UMAMI_TRACKING_CODE ?? config.umami.scripts,
} as const;

// 导航栏配置
export const navbarConfig: NavbarConfig = {
    links: normalizeNavbarLinks(config.navbar.links),
};

// 侧边栏配置
export const sidebarConfig: SidebarConfig = config.sidebar;

// 资料配置
export const profileConfig: ProfileConfig = config.profile;

// 文章配置
export const postConfig: PostConfig = resolvedPostConfig;

// 粒子特效配置
export const particleConfig: ParticleConfig = config.particle;

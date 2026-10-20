import type {
    WALLPAPER_FULLSCREEN,
    WALLPAPER_BANNER,
    WALLPAPER_NONE
} from "@constants/constants";

// Favicon 配置
export type Favicon = {
    src: string;
    theme?: "light" | "dark";
    sizes?: string;
};

// 站点配置
export type SiteConfig = {
    // 站点 URL (以斜杠结尾) 
    siteURL: string;
    // 站点标题
    title: string;
    // 站点副标题
    subtitle: string;
    // 站点关键词，用于生成 <meta name="keywords">
    keywords?: string[];
    // 语言配置
    lang: "en";
    // 时区配置
    timeZone: -12 | -11 | -10 | -9 | -8 | -7 | -6 | -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    // 字体配置
    font: {
        [key: string]: {
            // 字体源 (字体 CSS 链接 | 字体文件路径)
            src: string;
            // 字体名 (font-family)
            family: string;
        };
    };
    // 主题色配置
    themeColor: {
        // 主题色的默认色相 (0-360)
        hue: number;
    };
    // 壁纸配置
    wallpaper: {
        // 模式
        mode: "fullscreen" | "banner" | "none";
        src: // 图片源配置 (fullscreen 和 banner 模式共享) 
        | string
        | string[]
        | {
            desktop?: string | string[];
            mobile?: string | string[];
        };
        // 壁纸位置，等同于 object-position
        position?: "top" | "center" | "bottom";
        // 轮播配置 (fullscreen 和 banner 模式共享)
        carousel?: {
            // 为多张图片启用轮播，否则随机显示一张图片
            enable: boolean;
            // 轮播间隔时间 (s) 
            interval: number;
            // 启用 Ken Burns 效果
            kenBurns?: boolean;
        };
        // Banner 模式专属配置
        banner?: {
            homeText?: {
                // 在主页显示文本
                enable: boolean;
                // 主标题
                title?: string;
                // 副标题
                subtitle?: string | string[]; // 支持单个字符串或字符串数组
                // 副标题打字机效果
                typewriter?: {
                    // 启用副标题打字机效果
                    enable: boolean;
                    // 打字速度 (ms)
                    speed: number;
                    // 删除速度 (ms)
                    deleteSpeed: number;
                    // 完全显示后的暂停时间 (ms)
                    pauseTime: number;
                };
            };
            // 横幅图片来源文本
            credit?: {
                // 显示横幅图片来源文本
                enable: boolean;
                // 要显示的来源文本
                text: string;
                // (可选) 原始艺术品或艺术家页面的 URL 链接
                url?: string;
            };
            // 导航栏配置
            navbar?: {
                // 导航栏透明模式
                transparentMode?: "semi" | "full" | "semifull";
            };
            // 水波纹效果配置
            waves?: {
                // 启用水波纹效果
                enable: boolean;
                // 启用性能模式 (简化波浪效果以提升性能)
                performanceMode?: boolean;
            };
        };
        // Fullscreen 模式专属配置
        fullscreen?: {
            // 层级
            zIndex?: number;
            // 壁纸透明度，0-1 之间
            opacity?: number;
            // 背景模糊程度 (px)
            blur?: number;
            // 导航栏透明模式
            navbar?: {
                transparentMode?: "semi" | "full" | "semifull";
            };
        };
    };
    // Favicon 配置
    favicon: Favicon[];
    // OpenGraph 配置
    generateOgImages: boolean;
};

export type WALLPAPER_MODE =
    | typeof WALLPAPER_FULLSCREEN
    | typeof WALLPAPER_BANNER
    | typeof WALLPAPER_NONE;

export enum LinkPreset {
    Home = 0,
    Archive = 1,
    Skills = 3,
    About = 8,
    Friends = 9,
}

export type NavbarLink = {
    // 链接名称
    name: string;
    // 链接
    url: string;
    // 是否为外部链接
    external?: boolean;
    // 链接图标
    icon?: string;
    // 中转页描述
    description?: string;
    // 子链接，可以是NavbarLink或LinkPreset
    children?: (NavbarLink | LinkPreset)[];
};

// 导航栏配置
export type NavbarConfig = {
    // 链接配置
    links: (NavbarLink | LinkPreset)[]; // 支持多级菜单
};

export type WidgetComponentType =
    | "profile"
    | "categories"
    | "statistics"
    | "toc"
    | "custom";

export type WidgetComponentConfig = {
    // 组件类型
    type: WidgetComponentType;
    // 启用该组件
    enable: boolean;
    // 组件位置
    position: "top" | "sticky"; // 顶部固定区域或粘性区域
    // 自定义内联样式
    style?: string;
    // 页面可见性配置
    visibility?: {
        // 匹配模式：'include' (包含), 'exclude' (排除)
        mode: "include" | "exclude";
        // 页面路径匹配规则列表 (支持正则字符串)
        paths: string[];
    };
    // 响应式配置
    responsive?: {
        // 在指定设备上隐藏
        hidden?: ("mobile" | "tablet" | "desktop")[];
        // 折叠阈值
        collapseThreshold?: number;
    };
    // 目录深度 (仅用于 toc 和 categories 组件)
    depth?: number;
    // 自定义属性
    customProps?: Record<string, any>;
};

// 资料配置
export type ProfileConfig = {
    // 头像配置
    avatar?: string;
    // 信息配置
    name: string;
    // 简介配置
    bio?: string;
    // 链接配置
    links: {
        name: string;
        url: string;
        icon: string;
    }[];
};

// 侧边栏配置
export type SidebarConfig = {
    // 侧边栏组件配置列表
    components: {
        left: WidgetComponentConfig[];
        right: WidgetComponentConfig[];
    };
};


// 评论服务提供商
export type CommentProvider = "waline" | "twikoo";

// 文章配置
export type PostConfig = {
    // 文章卡片配置
    card?: {
        // 封面配置
        cover: {
            // 封面位置 ("left" | "right")
            side: "left" | "right";
            // 封面宽度
            width: string;
            // 封面上是否显示文字 (标题、标签、摘要)
            showContent: boolean;
            // 无指定封面时是否显示默认封面
            showDefaultCover: boolean;
        };
        // 标题大小 (Tailwind 文本大小类，例如 "text-3xl")
        titleSize: string;
    };
    // 显示“上次编辑”卡片
    showLastModified: boolean;
    // 代码高亮配置
    expressiveCode: {
        // 主题
        theme: string;
    };
    // 评论配置
    comment: {
        // 启用评论功能
        enable: boolean;
        // 评论服务提供商（不指定时自动检测已配置的服务）
        provider?: CommentProvider;
        // Waline 评论系统配置
        waline?: {
            // 服务端地址
            serverURL: string;
            // 语言
            lang?: string;
            // 每页评论数
            pageSize?: number;
            // 是否启用表情反应
            reaction?: boolean | string[];
            // 必填项
            requiredMeta?: ("nick" | "mail" | "link")[];
        };
        // Twikoo 评论系统配置
        twikoo?: {
            // 环境 ID
            envId: string;
            // 地域
            region?: string;
            // 语言
            lang?: string;
        };
    };
};

// 粒子特效配置
export type ParticleConfig = {
    // 启用粒子特效
    enable: boolean;
    // 粒子数量
    particleNum: number;
    // 粒子越界限制次数，-1为无限循环
    limitTimes: number;
    // 粒子尺寸配置
    size: {
        // 粒子最小尺寸倍数
        min: number;
        // 粒子最大尺寸倍数
        max: number;
    };
    // 粒子透明度配置
    opacity: {
        // 粒子最小不透明度
        min: number;
        // 粒子最大不透明度
        max: number;
    };
    // 粒子移动速度配置
    speed: {
        // 水平移动速度
        horizontal: {
            // 最小值
            min: number;
            // 最大值
            max: number;
        };
        // 垂直移动速度
        vertical: {
            // 最小值
            min: number;
            // 最大值
            max: number;
        };
        // 旋转速度
        rotation: number;
        // 消失速度
        fadeSpeed: number;
    };
    // 粒子层级
    zIndex: number;
};

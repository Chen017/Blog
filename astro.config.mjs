import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import svelte, { vitePreprocess } from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import mdx from "@astrojs/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components"; /* Render the custom directive content */
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive"; /* Handle directives */
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";

import { buildTimeConfig, siteConfig } from "./src/config.ts";
import { pluginCollapseButton } from "./src/plugins/expressive-code/collapse-button.ts";
import { pluginCopyButton } from "./src/plugins/expressive-code/copy-button.js";
import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge.ts";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { SongCardComponent } from "./src/plugins/rehype-component-song-card.mjs";
import { rehypeLazyLoadMedia } from "./src/plugins/rehype-lazy-load-media.mjs";
import { rehypeMermaid } from "./src/plugins/rehype-mermaid.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkMermaid } from "./src/plugins/remark-mermaid.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";


// https://astro.build/config
export default defineConfig({
    output: "static",
    outDir: "./dist",
    site: siteConfig.siteURL,
    base: "/",
    trailingSlash: "always",
    // Preserve Astro 5/6 inline whitespace while upgrading the compiler.
    compressHTML: true,
    devToolbar: {
        enabled: false,
    },
    image: {
        remotePatterns: [{ protocol: "https", hostname: "raw.githubusercontent.com", pathname: "/Chen017/komari-emerald-suite/main/docs/ecosystem.png" }],
    },
    fonts: [
        { name: "Voyage Sans", cssVariable: "--font-voyage-sans", provider: fontProviders.local(), fallbacks: ["Arial"], optimizedFallbacks: true,
          options: { variants: [400, 500, 600].map(weight => ({ src: ["./src/assets/fonts/VoyageSans-Latin.woff2"], weight, style: "normal" })) } },
        { name: "Instrument Serif", cssVariable: "--font-voyage-serif", provider: fontProviders.local(), fallbacks: ["Georgia"], optimizedFallbacks: true,
          options: { variants: [
            { src: ["./src/assets/fonts/InstrumentSerif-Latin.woff2"], weight: 400, style: "normal" },
            { src: ["./src/assets/fonts/InstrumentSerif-Latin-Italic.woff2"], weight: 400, style: "italic" },
          ] } },
        { name: "MiSans Latin", cssVariable: "--font-misans-latin", provider: fontProviders.local(), fallbacks: [], optimizedFallbacks: false,
          options: { variants: [
            { src: ["./src/assets/fonts/MiSansLatin-Regular.woff2"], weight: 400, style: "normal" },
            { src: ["./src/assets/fonts/MiSansLatin-Semibold.woff2"], weight: 600, style: "normal" },
          ] } },
    ],
    integrations: [
        expressiveCode({
            themes: ["github-light", "github-dark"],
            themeCSSSelector: (theme) => `[data-theme="${theme}"]`,
            plugins: [
                pluginCollapsibleSections(),
                pluginLineNumbers(),
                pluginCollapseButton(),
                pluginCopyButton(),
                pluginLanguageBadge(),
            ],
            defaultProps: {
                wrap: true,
                overridesByLang: {
                    shellsession: {
                        showLineNumbers: false,
                    },
                },
            },
            styleOverrides: {
                codeBackground: "var(--codeblock-bg)",
                borderRadius: "0.75rem",
                borderColor: "none",
                codeFontSize: "0.875rem",
                codeFontFamily:
                    "'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                codeLineHeight: "1.5rem",
                frames: {
                    editorBackground: "var(--codeblock-bg)",
                    terminalBackground: "var(--codeblock-bg)",
                    terminalTitlebarBackground: "var(--codeblock-bg)",
                    editorTabBarBackground: "var(--codeblock-bg)",
                    editorActiveTabBackground: "none",
                    editorActiveTabIndicatorBottomColor: "var(--primary)",
                    editorActiveTabIndicatorTopColor: "none",
                    editorTabBarBorderBottomColor: "var(--codeblock-bg)",
                    terminalTitlebarBorderBottomColor: "none",
                    copyButtonBackground: "var(--btn-regular-bg)",
                    copyButtonBackgroundHover: "var(--btn-regular-bg-hover)",
                    copyButtonBackgroundActive: "var(--btn-regular-bg-active)",
                    copyButtonForeground: "var(--btn-content)",
                },
                textMarkers: {
                    delHue: 0,
                    insHue: 180,
                    markHue: 250,
                },
            },
            frames: {
                showCopyToClipboardButton: false,
            },
        }),
        mdx(),
        icon({
            include: {
                "fa6-brands": ["*"],
                "fa6-regular": ["*"],
                "fa6-solid": ["*"],
                mdi: ["*"],
            },
        }),
        svelte({
            preprocess: vitePreprocess(),
        }),
        sitemap(),
    ],
    markdown: {
        processor: unified({
        remarkPlugins: [
            remarkMath,
            remarkReadingTime,
            remarkExcerpt,
            remarkGithubAdmonitionsToDirectives,
            remarkDirective,
            remarkSectionize,
            parseDirectiveNode,
            remarkMermaid,
        ],
        rehypePlugins: [
            rehypeKatex,
            rehypeSlug,
            rehypeMermaid,
            [
                rehypeComponents,
                {
                    components: {
                        song: SongCardComponent,
                        note: (x, y) => AdmonitionComponent(x, y, "note"),
                        tip: (x, y) => AdmonitionComponent(x, y, "tip"),
                        important: (x, y) => AdmonitionComponent(x, y, "important"),
                        caution: (x, y) => AdmonitionComponent(x, y, "caution"),
                        warning: (x, y) => AdmonitionComponent(x, y, "warning"),
                    },
                },
            ],
            [
                rehypeAutolinkHeadings,
                {
                    behavior: "append",
                    properties: {
                        className: ["anchor"],
                    },
                    content: {
                        type: "element",
                        tagName: "span",
                        properties: {
                            className: ["anchor-icon"],
                            "data-pagefind-ignore": true,
                        },
                        children: [
                            {
                                type: "text",
                                value: "#",
                            },
                        ],
                    },
                },
            ],
            rehypeLazyLoadMedia,
        ],
        }),
    },
    vite: {
        plugins: [
            tailwindcss(),
            {
                name: "twilight-build-config",
                config(_config, { command }) {
                    // Keep YAML edits live in dev; publish only parsed data.
                    if (command === "build") {
                        return { define: { __TWILIGHT_CONFIG__: JSON.stringify(buildTimeConfig) } };
                    }
                },
            },
        ],
        build: {
            cssCodeSplit: true,
            rolldownOptions: {
                output: { minify: { compress: { dropConsole: true, dropDebugger: true } } },
                onwarn(warning, warn) {
                    // temporarily suppress this warning
                    if (
                        warning.message.includes("is dynamically imported by") &&
                        warning.message.includes("but also statically imported by")
                    ) {
                        return;
                    }
                    warn(warning);
                },
            },
        },
    },
    build: {
        inlineStylesheets: "auto",
    },
});

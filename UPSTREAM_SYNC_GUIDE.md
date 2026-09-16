# UPSTREAM_SYNC_GUIDE.md

> **Attention AI Assistant / Developer**:  
> This repository is a personalized fork of upstream [Spr-Aachen/Twilight](https://github.com/Spr-Aachen/Twilight).  
> Before pulling, cherry-picking, or upgrading code from upstream, you **MUST** read and adhere to this document. Do **NOT** blindly merge or overwrite files.

---

## 1. Core Architectural Differences Overview

| Feature / Area | Upstream (Twilight) | This Repository (Chen017/Blog) | Action on Upstream Upgrade |
| :--- | :--- | :--- | :--- |
| **Song / Music Card** | Standard `:::music` component (Meting API, basic lyrics) | Custom `:::song` component (`rehype-component-song-card.mjs`) with **adaptive background color extraction**, **Gaussian blur**, and animated dual-line lyrics. Dual-registered in `astro.config.mjs`. | **PRESERVE** `:::song` and its styling in `markdown.css`. Dual-track support for `:::music` is permitted. |
| **Color Theme** | Theme switcher (Light / Dark / System) with client toggle | **Forced Dark Mode** in `base.astro` to eliminate flash of unstyled light content (FOUC). Theme is locked to `github-dark`. | **PRESERVE** forced dark mode in `base.astro`. Do not restore light mode switcher buttons. |
| **Multi-Language / Translation** | Edge/client translation scripts (`translate.js`, `translator.svelte`, language switchers) | Clean single-language setup (`en`). Translation modules and scripts were removed to streamline bundle size. | **IGNORE** upstream translation additions or fixes. Do not re-add `translator.svelte` or `translate.js`. |
| **Friends vs Links** | Displays "Friends" / "友链", pointing to `/friends/` | Front-end display text is **"Links"** with subtitle **"My other websites"**, while URL routing remains `/friends/`. | **PRESERVE** "Links" text in `link-presets.ts`, `en.ts`, and `twilight.config.yaml`. |
| **Analytics** | Configurable via `twilight.config.yaml` / `.env` | Directly injected Umami script in `base.astro` (`https://cloud.umami.is/script.js`). | **PRESERVE** direct script tag in `base.astro`. |
| **Typography** | External web fonts | Local self-hosted **MiSans** font (`public/MiSans/`). | **PRESERVE** local font files and config. |
| **Sidebar Directory Tree** | Upstream added `directoryTree.svelte` / `directory.astro` | Not wanted / redundant with Categories & Tags. Kept in codebase but **disabled** from sidebar. | **DO NOT ENABLE** in `twilight.config.yaml` (`sidebar.components.left`). |
| **Statistics Charts (ECharts)** | Official upstream layout | Upstream bugfix applied: ECharts instance disposal on theme lifecycle in `statistics.svelte`. | **PRESERVE** user's `dispose()` lifecycle code in `statistics.svelte`. |

---

## 2. What to STRICTLY PRESERVE (Never Overwrite)

1. **`src/plugins/rehype-component-song-card.mjs`** & **`src/styles/markdown.css` (`.song-card` styles)**
   - The user wrote extensive adaptive color calculation (canvas pixel sampling, contrast/luminance adjustments) and lyric animation styles.
   - Any upstream changes to `rehypeComponents` in `astro.config.mjs` must retain:
     ```javascript
     song: SongCardComponent,
     music: MusicCardComponent,
     ```

2. **The "Friend to Link" Customization**
   - In `src/constants/link-presets.ts`:
     - `description: "My other websites"`
   - In `src/i18n/languages/en.ts`:
     - `[Key.friends]: "Links"`
   - In `twilight.config.yaml`:
     - Navbar entry displays `Links` with description `My other websites` and URL `/friends/`.
   - Never revert this wording back to "Friends".

3. **Forced Dark Mode in `src/layouts/base.astro`**
   - The head script initializes dark mode immediately before paint:
     ```javascript
     document.documentElement.classList.add('dark');
     document.documentElement.setAttribute("data-theme", "github-dark");
     localStorage.setItem("theme", "dark");
     ```
   - Do not replace with upstream's light/dark dynamic detection that causes white flash.

4. **Direct Analytics Injection**
   - In `src/layouts/base.astro`:
     ```html
     <script defer src="https://cloud.umami.is/script.js" data-website-id="6f7ec1f7-de68-4a99-9eaf-3e395237e061"></script>
     ```

5. **`src/content/` Directory**
   - All posts under `src/content/posts/`, `src/content/friends/` (`alist.json`, `note.json`), `about.md`, and custom wallpaper images.
   - Do not pull sample posts, sample friends (`astro.json`, `twilight-docs.json`), or upstream demo wallpapers.

6. **`statistics.svelte` ECharts Instance Disposal**
   - The user fixed a theme-switch memory leak and chart render issue by explicitly calling `instance.dispose()` before re-initializing charts. Do not overwrite with upstream's un-disposed version.

---

## 3. What to IGNORE from Upstream

When scanning upstream commits or PRs, completely skip:
- ❌ **Translation features / Edge Translator**: Anything modifying `src/plugins/translate.js`, `src/components/navbar/translator.svelte`, or multi-language switcher dropdowns.
- ❌ **Traditional Chinese / extra i18n locales**: The site is intentionally single-language (`en`).
- ❌ **Upstream Demo Content**: Never sync `src/content/` files from upstream.
- ❌ **Decap/Pages CMS additions**: Unless explicitly asked by the repository owner.

---

## 4. What is WELCOME to Adopt from Upstream

These types of upstream improvements are encouraged:
- 🟢 **Performance optimizations**: Media lazy-loading plugins (`rehype-lazy-load-media.mjs`), fast DOM-ready loading screen dismissal (`waitForAllResources: false`), Vite build optimizations (CSS split, esbuild minification, console removal).
- 🟢 **Feed / SEO / Bug fixes**: RSS/Atom XML escaping fixes, special character CDATA wrapping, frontmatter schema coercions (`z.coerce.string()`).
- 🟢 **Page transition fixes**: Swup persistence and layout jump fixes.
- 🟢 **Optional modular plugins**: Comment providers (Twikoo/Waline adapters), copy protection components, Markdown admonitions (`:::tip`, `:::warning`).

---

## 5. Standard Upgrade & Verification Procedure

When performing an upstream update, follow these steps in order:

### Step 1: Safety Backup Branch
Always create a restore point before touching files:
```bash
git checkout -b backup-before-upstream-upgrade
git checkout main
```

### Step 2: Inspection
Check upstream commits since the last merge/sync:
```bash
git log HEAD..upstream/main --oneline
```
Identify commits by category:
- **Adopt**: Performance, bugfixes, Feed fixes.
- **Adapt**: Markdown components, layouts (verify against user's custom CSS/scripts).
- **Ignore**: Translations, demo content, theme toggle restorations.

### Step 3: Conflict Check & Application
Apply updates selectively (via cherry-pick, patch, or manual porting). Never run a raw `git merge upstream/main` without inspecting every conflicting file.

### Step 4: Verification Commands
Run the Astro type checker and build test:
```bash
# 1. Type and template diagnostics (must pass with 0 errors)
pnpm check

# 2. Production build test (all pages, MDX, RSS/Atom, and Pagefind search index)
pnpm build
```

### Step 5: Sanity Checks on Output (`.vercel/output/static/` or `dist/`)
- Check `/friends/index.html`: Title must be `Links`, subtitle `My other websites`.
- Check `/about/index.html` or post with `:::song`: Verify song card markup (`data-song-card="true"`).
- Check `index.html`: Verify `<html class="... dark">` and direct Umami script.

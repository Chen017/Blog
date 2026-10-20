# Blog

A CMS integrated static blog template built with Astro framework and based on [Upstream](https://github.com/Spr-Aachen/Twilight)

[**🖥️ Live Demo**](https://www.etalib.space)
[**📝 Documentation**](https://docs.twilight.spr-aachen.com/en)

## ✨ Features

Based on upstream, I have added some modifications and new features: 

1. **Music card**
   Feature **Gaussian blur**, **color picking**, **lyric scrolling vivid animation**, **song covers**, **customizable playback bars**. See the specific effects on [demo](https://www.etalib.space/about/)

   ![](image.png)

2. Remove translation and theme

3. Change `Friend` to `Link`

4. Optimize the Skill Cards

5. Media lazy loading
   Integrated automated lazy loading for images, videos, and iframes across markdown and MDX.

6. Disable Exhibition
   Disabled the exhibition module, closed the navigation entry point, and prevented its page and associated resources from loading.

## 💻 Configuration

1. **Clone the repository:**
   ```bash
   git clone
   cd Blog
   ```

2. **Install dependencies:**
   ```bash
   # Install pnpm if not already installed
   npm install -g pnpm
   pnpm install
   ```

3. **Configure your blog:**
   - [Customize blog settings](https://docs.twilight.spr-aachen.com/en/config/core) inside `twilight.config.yaml`
   - [Support CMS functionality](https://docs.twilight.spr-aachen.com/en/config/cms) inside `.env`
   - [Support Umami analytics](https://docs.twilight.spr-aachen.com/en/config/analytics) inside `.env`
   - [Manage site content](https://docs.twilight.spr-aachen.com/en/config/content) inside `src/content`

4. **Start the development server:**
   ```bash
   pnpm dev
   ```



## ⚡ Commands

| Command                     | Action                        |
|:----------------------------|:------------------------------|
| ~~`pnpm lint`~~             | ~~Check and fix code issues~~ |
| ~~`pnpm format`~~           | ~~Format code with Biome~~    |
| `pnpm check`                | Run Astro error checking      |
| `pnpm dev`                  | Start local dev server        |
| `pnpm build`                | Build site to `./dist/`       |
| `pnpm preview`              | Preview build locally         |
| `pnpm astro ...`            | Run Astro CLI commands        |
| `pnpm new-post <filename>`  | Create a new blog post        |


## 🙏 Acknowledgements
[Upstream](https://github.com/Spr-Aachen/Twilight)


---

## 📝 Writing & Maintenance

This blog is independently maintained. The sections above introduce its custom features; the following sections cover the current writing dashboard and maintenance workflow.

### Write and publish online

Open [the writing dashboard](https://www.etalib.space/admin/) and sign in with your GitHub account. Complete the authorization on your first visit.

1. Choose **文章** to create a Markdown article, or **MDX 文章** for content that uses imports and custom layouts.
2. Fill in the title, publication date, summary, and category. Upload the cover and body images directly in the editor.
3. Use **常用组件** for music cards, images, admonitions, spoilers, formulas, and Mermaid diagrams. Music cards support both uploads and existing external audio links; external audio does not need to be downloaded into the repository.
4. Keep **草稿** enabled and click **发布 → 立即发布** to save a draft. Turn **草稿** off before publishing an article publicly.

Online saves commit to `main` and trigger GitHub Actions deployment. A saved article appears on the website after deployment succeeds. Existing advanced Markdown and MDX use source editing to preserve their syntax; the final rendering is shown on the blog.

See [CMS_SETUP.md](CMS_SETUP.md) for the complete writing guide, music-card editing, and GitHub login configuration.

### Write locally

Requires Node.js 22.22+ and pnpm 10.29.2.

```bash
pnpm install
pnpm cms:local
```

Open <http://127.0.0.1:4321/admin/>. Local saves write articles and images into this checkout; they do not automatically commit or push to GitHub. Synchronize changes from GitHub before continuing locally after an online edit.

### Maintain and verify

```bash
pnpm check
pnpm test:unit
pnpm test:markdown
pnpm build
```

Run a normal build after the Markdown integration checks so temporary test pages stay out of the release. The production output is `dist/`, including the Pagefind search index.

- [MAINTENANCE.md](MAINTENANCE.md): retained features and maintenance boundaries.
- [CMS_SETUP.md](CMS_SETUP.md): writing, media uploads, authentication, and deployment.
- [Cleanup and CMS delivery report](audit/2026-10-20/DELIVERY.md): implementation and validation details.

OAuth credentials are stored in GitHub Actions encrypted Secrets and delivered to the server's `.env`. Keep local credentials out of Git. The existing VPS deployment uses Docker, Nginx, and GitHub Actions.

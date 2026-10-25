# Blog

[English](README.md) | [简体中文](README.zh-CN.md)

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

## 🙏 Acknowledgements
[Upstream](https://github.com/Spr-Aachen/Twilight)


---

## 📝 Writing & Maintenance

This blog is independently maintained. The sections above introduce its custom features; the following sections cover the current writing dashboard and maintenance workflow.

### Write and publish online

Open [the writing dashboard](https://www.etalib.space/admin/) and sign in with your GitHub account. Complete the authorization on your first visit. The dashboard interface currently uses Chinese labels; the steps below describe their functions in English.

1. Select the **articles** collection to create a Markdown article, or the **MDX articles** collection for content that uses imports and custom layouts.
2. Fill in the title, publication date, summary, and category. Upload the cover and body images directly in the editor.
3. Use the **common component forms** for music cards, images, admonitions, spoilers, formulas, and Mermaid diagrams. Music cards support both uploads and existing external audio links; external audio does not need to be downloaded into the repository.
4. Keep the **draft** switch enabled and choose **Publish → Publish now** to save a draft. Turn the draft switch off before publishing an article publicly.

Online saves commit to `main` and trigger GitHub Actions deployment. A saved article appears on the website after deployment succeeds. Existing advanced Markdown and MDX use source editing to preserve their syntax; the final rendering is shown on the blog.

See [CMS_SETUP.md](CMS_SETUP.md) (Chinese) for the complete writing guide, music-card editing, and GitHub login configuration.

### Write locally

Requires Node.js 22.22+ and pnpm 10.29.2.

```bash
pnpm install
pnpm cms:local
```

Open <http://127.0.0.1:4321/admin/>. Local saves write articles and images into this checkout; they do not automatically commit or push to GitHub. Synchronize changes from GitHub before continuing locally after an online edit.

### Maintain and verify

Blog settings live in `twilight.config.yaml`, site content in `src/content`, and writing-dashboard collections in `public/admin/config.yml`. See [CMS_SETUP.md](CMS_SETUP.md) for the current authentication and deployment configuration.

```bash
pnpm check
pnpm test:unit
pnpm test:markdown
pnpm build
```

Run a normal build after the Markdown integration checks so temporary test pages stay out of the release. The production output is `dist/`, including the Pagefind search index.

- [MAINTENANCE.md](MAINTENANCE.md): retained features and maintenance boundaries.
- [CMS_SETUP.md](CMS_SETUP.md): writing, media uploads, authentication, and deployment.

`src/`, `public/`, `cms/`, `scripts/`, and `tests/` contain maintained project files. `dist/`, `.astro/`, and `.vercel/` are generated output or local caches and can be removed when not in use. One-off investigation reports and logs stay out of Git.

OAuth credentials are stored in GitHub Actions encrypted Secrets and delivered to the server's `.env`. Keep local credentials out of Git. The existing VPS deployment uses Docker, Nginx, and GitHub Actions.

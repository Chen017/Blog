# Etalib's Space

A personal static blog built with Astro, independently maintained from [Spr-Aachen/Twilight](https://github.com/Spr-Aachen/Twilight).

[Website](https://www.etalib.space) · [Writing setup](CMS_SETUP.md) · [Maintenance](MAINTENANCE.md)

## Run locally

Requires Node.js 22.22+ and pnpm 10.29.2.

```sh
pnpm install
pnpm dev
```

For the writing interface with a local file backend:

```sh
pnpm cms:local
```

Open <http://127.0.0.1:4321/admin/>. Online GitHub login requires the one-time setup in [CMS_SETUP.md](CMS_SETUP.md).

## Retained features

- Markdown and MDX, code controls, math, Mermaid and custom directives.
- Custom song cards with synchronized lyrics, adaptive colors and blur.
- Chinese writing interface with image/audio uploads and forms for song cards and common components.
- Categories, archive, search, feeds, About, Links and Skills.
- Optional Twikoo/Waline comments, passwords, copy restrictions and OG images.
- Fixed dark interface, local MiSans fonts and responsive images.
- Static VPS deployment through Docker, Nginx and GitHub Actions.

New articles use `src/content/posts/<slug>/index.md` or `index.mdx`; images live beside the article. Settings are in `twilight.config.yaml`. Credentials stay in the VPS `.env`.

## Verify and build

```sh
pnpm check
pnpm test:unit
pnpm test:markdown
pnpm build
```

The final build writes `dist`, generates Pagefind and checks retained features and removed routes. Deployment mirrors file deletions while preserving server credentials.

## Credits

Derived from [Twilight](https://github.com/Spr-Aachen/Twilight). Built with [Astro](https://astro.build), [Decap CMS](https://decapcms.org) and [MiSans](https://hyperos.mi.com/font/). Original attribution and license are retained.

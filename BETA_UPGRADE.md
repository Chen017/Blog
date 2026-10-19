Beta branch: `codex/beta-astro7`.

This branch is for local verification and GitHub review only. The VPS deployment
workflow has been deliberately removed at the owner's request. Do not deploy or
merge this branch into main without a separate review. Main's existing deployment
workflow and server are unchanged.

The deployment target is static HTML in `dist/`, served by the existing nginx
Docker image. Pagefind must be generated inside `dist/pagefind/`, regardless of
CI environment variables or a local `.vercel` cache directory.

Verification commands:

- `pnpm test:unit`
- `pnpm check`
- `pnpm build` (includes output checks)
- `pnpm preview`

Keep the forced dark theme, MiSans, custom song cards, Links wording, posts,
disabled tags/translation, and direct Umami script. Typography, images, CSS
delivery, statistics presentation, loading animation timing and visual motion
design are reserved for a later user-reviewed UI pass.

Migration checkpoints:

- Astro 5 static build: checks passed, Pagefind generated in `dist/pagefind`.
- Astro 6.4.8: 0 errors / 0 warnings; static build and output assertions passed.
- Astro 7.4.0: 0 errors / 0 warnings; static build and output assertions passed.
- Use the official Unified processor for both Markdown and MDX, retain HTML
  whitespace handling, and use Vite 8's supported build options.
- Reviewed upstream `19ddef2`. Existing media/feed fixes are retained; remove
  the upstream's unused date schema, without bringing back translation, light
  mode, demonstration content, CMS additions, or layout changes.

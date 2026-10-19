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

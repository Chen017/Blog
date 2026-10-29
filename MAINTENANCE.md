# Personal blog maintenance

This is an independently maintained Astro blog derived from Spr-Aachen/Twilight. Do not sync upstream automatically. Keep the existing license and attribution.

## Retained behavior

- Preserve published articles, their URLs, relative images, About and Links (`/friends/`).
- Keep the six personal Skills records and `/skills/`, even though it is not in the primary navigation.
- Preserve `:::song`, including adaptive colors, background blur, timed lyrics and playback controls. Upstream music and GitHub cards have been removed.
- Keep math, Mermaid, admonitions, spoilers, image lightboxes and code controls.
- Keep both Twikoo and Waline, per-article comments, password protection, copy restrictions and optional OG images. Retaining a capability does not require enabling it globally.
- Use the fixed dark interface, local DM Sans and Instrument Serif for Latin text, explicit system fallbacks for Chinese, current photographic sky, vector stars and responsive layout. Preserve the explicit Umami tracking script. Font provenance and licenses are documented in `src/assets/fonts/README.md`.
- Preserve VPS Docker deployment, Pagefind generation, cache rules and BuildKit cache pruning.

## Writing

The editor is at `/admin/`. Plain Markdown supports rich text and source editing. Articles containing directives, JSX, imports, math or Mermaid are opened in source mode. MDX supports protected visual prose and Astro Image editing. The common-component forms insert images, song cards, admonitions, spoilers, display math and Mermaid. Inserting an advanced component switches to source mode. Before typing advanced syntax manually, switch to source mode first.

Song forms can update one existing card without rewriting the rest of the article. Song assets upload to `public/assets/media` with site-root URLs; ordinary images remain beside the article. Keep the nested helper fields in the CMS body configuration: Decap uses these field identities to resolve media paths. Helpers are temporary form state, not extra article frontmatter.

The editor preview does not reproduce the complete Astro rendering pipeline. Validate advanced content with the real site build. Do not introduce a parser that silently rewrites custom syntax.

Posts live in `src/content/posts/<slug>/index.md` or `index.mdx`, with images beside the article. Preserve existing paths. New content defaults to a draft. Local editing writes files without committing or pushing; the online GitHub backend commits to `main`, triggering deployment.

Keep functional article fields in the schema. Unreferenced tags/attribution metadata may remain in historical Markdown, but must not restore the removed tag interface, filtering or hydrated payloads. Interface labels stay in the small English dictionary; runtime language switching is absent.

## Verification

- `pnpm check`
- `pnpm type-check` uses the same Astro-aware checker, including `.astro` imports.
- `pnpm test:unit`
- `pnpm test:markdown` exercises temporary Markdown and MDX, then removes the fixtures.
- `pnpm build` generates `dist`, Pagefind and validates required/removed paths.

After `test:markdown`, run a normal build before packaging so temporary test pages cannot enter the release. Integration fixtures are created and removed by the test runner.

Keep regression coverage for canonical article routes, empty encryption passwords and public excerpts, escaped TOC/JSON-LD content, MDX rendering and relative images, single comment initialization, and image lightboxes after decryption. Use the maintained tests for verification; historical one-off probe scripts are not regression test entrypoints.

## Build output and performance

The production site is static and generated in `dist/`. `.astro/` is Astro's generated cache and type data; `.vercel/` is not used by the current VPS deployment. These directories can be deleted while development and preview servers are stopped, then recreated by the relevant tools. Keep installed dependencies in `node_modules/` for local development. One-off reports, screenshots, probe scripts and logs do not belong in the maintained source tree; historical reports remain recoverable from Git history.

Parse `twilight.config.yaml` at production build time through the `twilight-build-config` Vite plugin. Keep the YAML fallback for Astro configuration loading and development updates, so browsers do not download the YAML parser. Keep the configuration validation and normalization paths shared.

Preserve responsive AVIF/WebP pictures, eager high-priority loading for the banner, deferred post covers, and interaction-triggered search loading. Only the interface Regular and display Italic Latin subsets are preloaded. Do not restore the complete Chinese font to the active font stack; its public URL remains available for compatibility. Cache hashed `/_astro/` assets for one year with `immutable`, revalidate HTML, and keep Pagefind entry files uncached so new deployments use the matching index.

The image postprocessor selects AVIF only when every responsive size is smaller than WebP. Deferred covers start loading within 350px of the viewport and fade in after decoding; keep no-JavaScript, missing IntersectionObserver, failure and reduced-motion fallbacks. Navigation icons use local SVG data, and Skills uses the shared static layout.

Measure performance changes with repeated comparisons under the same browser and network settings. Distinguish observed paint and presentation timing from Lighthouse's simulated metrics; resource-size reductions do not imply an equal loading-time or score improvement.

See [CMS_SETUP.md](CMS_SETUP.md) for writing and GitHub login setup. OAuth credentials are delivered from encrypted repository Secrets into the VPS `.env`, never browser files or the image build context. The deploy check verifies the auth route when credentials are configured.

## Optional analytics counts

The existing tracking script stays independent of the optional count display. When `umami.enabled` is enabled, set `umami.baseUrl` (for Cloud: `https://api.umami.is`) and `umami.websiteId` in the YAML. Supply `UMAMI_API_KEY` only to the build environment or local ignored `.env`; a nonempty YAML `apiKey` is rejected. Counts update on each build. API failures show the unavailable message, and credentials and raw API responses never become browser payloads.

Docker builds can receive the optional key as a BuildKit secret: `docker build --secret id=umami_api_key,env=UMAMI_API_KEY -f dockerfile .`. The default Compose deployment leaves this optional count integration unconfigured. Do not pass secrets through build arguments or commit them in the site configuration.

`pnpm new-post <slug[.md|.mdx]>` creates a draft at `src/content/posts/<slug>/index.md` or `index.mdx`; publishing requires explicitly changing `draft` to false. Encrypted articles require a nonblank password both when saved in the CMS and when built. Keep automatic excerpts out of their public cards.

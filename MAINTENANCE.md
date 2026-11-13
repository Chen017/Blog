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

Posts live in `src/content/posts/<slug>/index.md` or `index.mdx`, with images beside the article. Preserve existing paths. New Markdown and MDX articles in the web CMS default to public (`draft: false`); use the draft switch to save them privately. The `pnpm new-post` CLI still creates drafts, and existing posts retain their saved draft state. Local editing writes files without committing or pushing; the online GitHub backend commits to `main`, triggering deployment.

Keep functional article fields in the schema. Unreferenced tags/attribution metadata may remain in historical Markdown, but must not restore the removed tag interface, filtering or hydrated payloads. Interface labels stay in the small English dictionary; runtime language switching is absent.

## Verification

- Use Node.js **24.13.0** and the package's Corepack-managed **pnpm 10.29.2** to reproduce CI. The supported Node minimum remains in `package.json`.
- `corepack enable`, then `pnpm install --frozen-lockfile`. Use `pnpm dev` for authoring, `pnpm cms:local` for local CMS editing. Development search intentionally reports unavailable; test Pagefind in the production preview.
- `pnpm type-check` runs the Astro-aware checker, including `.astro` imports. `pnpm check` is an alias; do not run both in CI.
- `pnpm test:unit`
- `pnpm test:markdown` exercises temporary Markdown and MDX, then removes the fixtures.
- `pnpm build` generates `dist`, Pagefind and validates required/removed paths.
- `pnpm exec playwright install chromium` once, then `pnpm test:browser` against that normal build. The runner starts and stops its own production preview on port 4321; stop other servers on this port first.

After `test:markdown`, run a normal build before packaging so temporary test pages cannot enter the release. Integration fixtures are created and removed by the test runner.
Run integration and production builds **sequentially**, with browser tests after the final build. Browser tests never build implicitly. `pnpm verify:build` rechecks existing output without rebuilding. `pnpm lint` and `pnpm format` **write source files**; they are not read-only verification commands.

[Browser testing guide](tests/browser/README.md) covers the matrix, natural animation observations, compositor screenshots, baseline review and failure artifacts. Run all these checks for upgrades to Astro, Svelte, browser revisions, assets or lifecycle code; for focused iteration use `pnpm test:motion` and Playwright's `--project` / `--grep`, then complete the delivery gate. Keep performance measurements separate from correctness tests.

Keep regression coverage for canonical article routes, empty encryption passwords and public excerpts, escaped TOC/JSON-LD content, MDX rendering and relative images, single comment initialization, and image lightboxes after decryption. Use the maintained tests for verification; historical one-off probe scripts are not regression test entrypoints.

## Build output and performance

The production site is static and generated in `dist/`. `.astro/` is Astro's generated cache and type data; `.vercel/` is not used by the current VPS deployment. These directories can be deleted while development and preview servers are stopped, then recreated by the relevant tools. Keep installed dependencies in `node_modules/` for local development. One-off reports, screenshots, probe scripts and logs do not belong in the maintained source tree; historical reports remain recoverable from Git history.

Parse `twilight.config.yaml` at production build time through the `twilight-build-config` Vite plugin. Keep the YAML fallback for Astro configuration loading and development updates, so browsers do not download the YAML parser. Keep the configuration validation and normalization paths shared.

Preserve responsive AVIF/WebP pictures, eager high-priority loading for the banner, deferred post covers, and interaction-triggered search loading. The shared layout currently preloads three local Latin files: interface Regular and display Regular/Italic. Font definitions live in `astro.config.mjs` and preload selection in `src/layouts/home.astro`; verify emitted preload links when changing either. Do not restore the complete Chinese font to the active font stack; its public URL remains available for compatibility. Cache hashed `/_astro/` assets for one year with `immutable`, revalidate HTML, and keep Pagefind entry files uncached so new deployments use the matching index.

About keeps its photo in the CMS-editable `src/content/about.md`. `rehype-lazy-load-media.mjs` gives local About photos responsive widths and eager loading. `site.ts` stages the placeholder on after-swap if its module is already loaded and on first initialization otherwise. Dimensions reserve the photo area through decode or failure. An already complete image bypasses the reveal. The lightbox requests the largest responsive source on demand. Article images retain their existing loading behavior.

The image postprocessor selects AVIF only when every responsive size is smaller than WebP. Deferred covers start loading within 350px of the viewport and fade in after decoding; keep no-JavaScript, missing IntersectionObserver, failure and reduced-motion fallbacks. Navigation icons use local SVG data, and Skills uses the shared static layout.

Measure performance changes with repeated comparisons under the same browser and network settings. Distinguish observed paint and presentation timing from Lighthouse's simulated metrics; resource-size reductions do not imply an equal loading-time or score improvement.

See [CMS_SETUP.md](CMS_SETUP.md) for writing and GitHub login setup. OAuth credentials are delivered from encrypted repository Secrets into the VPS `.env`, never browser files or the image build context. The deploy check verifies the auth route when credentials are configured.

## Optional analytics counts

The existing tracking script stays independent of the optional count display. When `umami.enabled` is enabled, set `umami.baseUrl` (for Cloud: `https://api.umami.is`) and `umami.websiteId` in the YAML. Supply `UMAMI_API_KEY` only to the build environment or local ignored `.env`; a nonempty YAML `apiKey` is rejected. Counts update on each build. API failures show the unavailable message, and credentials and raw API responses never become browser payloads.

GitHub Actions passes the optional key from repository secrets to the build step as `UMAMI_API_KEY`. The VPS Docker deployment serves the pre-built `dist/` directly through nginx. Do not pass secrets through build arguments or commit them in the site configuration.

`pnpm new-post <slug[.md|.mdx]>` creates a draft at `src/content/posts/<slug>/index.md` or `index.mdx`; publishing requires explicitly changing `draft` to false. Encrypted articles require a nonblank password both when saved in the CMS and when built. Keep automatic excerpts out of their public cards.

## Module map and documentation ownership

| Location | Responsibility / maintenance contract |
| --- | --- |
| `src/layouts/home.astro`, `grid.astro`; `src/components/site/` | Shared shell, ClientRouter, header/footer/backdrop; `home.astro` is also used by interior layouts. Initial inline preparation must run before module startup. |
| `src/pages/`, `src/content/` | Static routes and authored content. Writing is `/archive/`; Links is `/friends/`. Preserve `/skills/`, article URLs and aliases. |
| `src/scripts/voyage.ts`, `heading-motion.ts`, `site.ts` | Home interaction/motion, non-hero heading motion, interior enhancement respectively. See lifecycle below. |
| `src/utils/page-lifecycle.ts`, `panel-lifecycle.ts`, `scroll-controls.ts`, `lazy-resource.ts` | Shared events, panel cleanup/focus, article scrolling and demand-loaded resources. Reuse these helpers. |
| `src/styles/voyage.css`, `interior.css`, `transition.css` | Shared Voyage composition, reading surfaces and system motion fallback. Later rules include intentional compatibility constraints; order is significant. |
| `src/plugins/`, `src/components/common/` | Real Markdown/MDX rendering, code controls, image/media and protected-content capabilities. Validate via integration builds, not only editor preview. |
| `src/cms/`, `public/admin/`, `cms/` | Editor parsing/preview, Decap forms and server-side OAuth. Configuration and operation belong in `CMS_SETUP.md`. |
| `scripts/`, `tests/` | Build/image/output validation and unit tests; `tests/browser/` owns production browser verification and reviewed PNG baselines. |
| `.github/workflows/`, Docker/Nginx configuration | Validation, tested static artifact transport, VPS serving and authentication proxy. |

`README.md` / `README.zh-CN.md` are entry points. `AGENTS.md` is the contributor delivery gate, `DESIGN_SYSTEM.md` the visual contract, this file the implementation/operations guide, `CMS_SETUP.md` the writing/auth guide. Keep command and workflow details here or in the browser guide and link to them instead of copying divergent instructions. Update affected documentation with code changes; state uncertainty rather than documenting an inferred browser guarantee.

## Motion ownership and historical regressions

Baseline for this maintenance pass: [`06fbecd`](https://github.com/Chen017/Blog/commit/06fbecd63ecb79bec5e98c59b39d7db134b5ad0b). Historical PR descriptions contain superseded experiments; follow the final code and decisions below.

1. `NavigationMotion.astro` is a single early inline coordinator. `astro:before-preparation` increments the generation and clears stale identities/flags. Direction follows `Home → Writing → Links → About`; articles belong to Writing. The outgoing header keeps its own `aria-current`; incoming server HTML supplies the new selection.
2. `astro:before-swap` sets **incoming-document** flags before snapshot capture, publishes transition promises and aborts outgoing page work. A normal-motion, previously opened, non-article, hash-free Home return receives `data-voyage-return-prepared`.
3. `voyage.ts` is the **only Home hero animation owner**. Its after-swap initialization restores filters/order/source/scroll and immediately installs both return animations from the CSS-prepared poses. Remove preparation only after both `fill:both` effects exist. Generic `heading-motion.ts` deliberately excludes the hero and handles other headings on page-load.
4. Transition completion clears coordinator-owned fold flags and reveals deferred writing sections. Home interactions and heavier interior enhancements wait separately for completion. Generation, AbortController, connected-root and transition-identity checks reject obsolete results, including rapid A→B→A with the same pathname.

| Effect | Delay + duration | Initial pose |
| --- | --- | --- |
| First Home `Etalib’s` | 450 + 1800ms | opacity .45, blur 3px, Y 12px |
| First Home `Space.` | 550 + 2100ms | opacity .45, blur 3px, Y 18px |
| First Home horizon | 450 + 2300ms | opacity .4, Y 15px |
| Returning `Etalib’s` | 110 + 580ms | opacity .45, blur 3px, Y 12px |
| Returning `Space.` | 190 + 820ms | Y 8px, rotation −2°, unchanged opacity |

Initial CSS is not redundant with WAAPI: it covers the interval before the effect exists. The first-session marker stays until the longest opening animation settles; completed filled effects are then released. The inline 5-second fallback keeps content readable if initialization fails. Opening eligibility also depends on URL hash, history state, visibility and system motion. A genuinely fresh browser context is required to reproduce a first visit.
The fallback timer belongs to the initial document and is cancelled on before-swap; its listener is also removed when the timer fires. Astro reuses the HTML element, so an uncancelled initial timer can clear **incoming** preparation while a slow new module is still loading. Preserve the original 5-second recovery for a broken first load without letting it mutate a later page.

The hero adds 68% neutral white light to the **real sky** with `plus-lighter`; fallback/reduced-transparency rules remain intentional. Adding a stacking context between sky and glyphs can break this even if the computed blend mode is unchanged. The `.nv-page` context contains both foreground and backdrop. The Home-only `::view-transition-new(root)` opacity override still suppresses the historical luminance discontinuity, and its exclusions protect paired article titles and motion preferences. Planet grain must remain rendered during transitions.

Main tabs use the original 280ms Astro full-width slides with the original root fades and Home title timing. Before swap, `NavigationMotion.astro` passes the outgoing sky image's already loaded `currentSrc` to the incoming root. A darkened copy fills the transition group behind both moving snapshots. This only paints a background on the native compositor pseudo-element, so the Home hero, its blend context and the Astro fallback keep their original behavior. Generation-guarded settlement clears the temporary source. Links and Writing use the browser's default document overscroll.

The shared search header and input are outside the results scroller. Keep Pagefind results, status, and retry inside it and preserve panel focus restoration. The archive period menu shares the CSS disclosure chevron with Home ordering while keeping its native details and existing chart data.

Article-title morphs are a separate 620ms transition. `voyage:source` pairs one card/title with its route, origin history index and target scroll; shared names must stay unique. Restore filter/order before source lookup and scroll instantly before capture, then restore keyboard focus without scrolling. Similar scroll calculations in the coordinator and Home initializer occur at different lifecycle phases. The pending target survives click-time and teardown saves. Return only the selected/already-loaded covers eagerly; preserve other lazy covers.

`stopMotion(false)` on abort/pagehide intentionally preserves outgoing parallax until snapshot capture; preference/visibility changes reset it. Touch does not imitate a fine pointer. Persisted pageshow refreshes state/preferences without rerunning the opening. Page-specific styles remain Astro-owned: carrying outgoing interior CSS into Home was removed to prevent leakage.

| History / reason | Regression protection |
| --- | --- |
| [PR #7](https://github.com/Chen017/Blog/pull/7): competing hero observers restarted `Space.`; outgoing menu was highlighted too early | Sole hero owner; opening marker lifetime; server-rendered current state; `test:motion`, browser fresh opening and directed navigation. |
| [PR #8](https://github.com/Chen017/Blog/pull/8): independent hero snapshot was the wrong approach; hiding grain caused a planet boundary discontinuity | No separate hero capture or transition-time grain hiding; browser filmstrip pixels and natural grain observations. |
| [PR #9](https://github.com/Chen017/Blog/pull/9), `fa04cbe`: departure changed hero blend to normal; incoming root fade caused a bright handoff | Preserve additive blend and narrowly scoped full-opacity Home root; departure/return filmstrips. Never restore the global normal-blend override. |
| [PR #10](https://github.com/Chen017/Blog/pull/10), then `9d1e49f`, `bd42d99`, `bed59ba`, `c44a311` | The original post-transition nod was superseded: one-way `Space.` entrance, pre-snapshot staging and concurrent slide/title motion. |
| `1227bfd`, `21433e3`, `d5a8f3f`, `06fbecd` | Both Home lines use the approved stagger and prepared first poses; browser staging, natural-frame continuity and effect-count assertions. |
| Maintenance browser reproduction: Firefox Enter produced a trusted click with `detail:1`, `pointerType:""` | Detect non-pointer activation using the empty PointerEvent pointer type as well as zero detail. Preserve focused-anchor checks; mouse/touch must not acquire keyboard-return focus. Covered by paired keyboard/pointer entry-history browser scenarios. |
| First cloud run: the initial 5s timer cleared incoming preparation before a delayed page-load; a slow-module browser test reproduced it locally | Cancel the initial fallback at before-swap, retain its direct-load recovery and listener cleanup. Do not extend the delay to move the same race later. |
| Main-menu snapshots exposed the plain root canvas during the full-width slide | Reuse the loaded sky as the transition group's background. Assert the original directions and timing and check the formerly blank interval in the Writing-to-Links compositor frame. |

## CI/CD and recovery

`validate.yml` runs on PRs to main, weekly (Monday 04:20 Singapore), manual dispatch and reusable calls. It uses Windows 2025 for the committed screenshot renderer, Node/pnpm from the verification section and lockfile-frozen dependencies. PRs cancel obsolete runs. Each run executes unit → type → Markdown/MDX integration → **normal production build** → browser tests. It installs Chromium for four widths; weekly/manual extended runs add Firefox and WebKit behavior checks. CI uses one browser worker: an initial two-worker cloud run showed simultaneous long touch/navigation stalls, so native captures are serialized instead of hiding them behind longer timeouts. No browser test rebuilds the site. Astro asset cache is optional; correctness never depends on a cache hit.

`deploy.yml` runs on every push to main, including online CMS commits. It compares the last successful deployment commit with the current commit, including deleted and renamed paths. This ensures a later article update cannot bypass validation for a failed or cancelled code deployment. When deployment history is unavailable or the prior commit is not an ancestor, full validation is required. Only Markdown/MDX and supported media under `src/content/posts/`, and supported media under `public/assets/images/` or `public/assets/media/`, qualify for the content-only path. This includes shared media at those paths; MDX can contain executable components, so changes there receive the same reduced checks as other articles. Mixed changes, unsupported extensions, empty diffs, missing history and non-fast-forward pushes use full validation. Update `scripts/classify-deploy.mjs` and its tests when upload locations or policies change.

Content-only pushes skip the validation job, install frozen dependencies on Ubuntu, and run the normal production build and output verification before deployment. Code and other changes call the complete validation workflow on Windows. Both paths upload their resulting `validated-dist` artifact; the deploy job consumes it without rebuilding and packages it with committed source. A failed build or full validation blocks deployment. PR checks remain full validation regardless of paths. Weekly and manual extended checks remain unchanged.

Existing SCP/SSH, preserved `.env`, Docker/Nginx deployment, optional OAuth health check and image/BuildKit pruning remain in place. Main deployments are serialized with a queue of up to 100 pending runs; the Actions API requires `actions: read` to find the last successful deployment. Runs beyond that queue limit are cancelled and must be retried. There is no tag or GitHub Release step. Required repository Secrets remain `HOST`, `USERNAME`, `PORT`, `SSH_KEY`; optional counts use `UMAMI_API_KEY`; OAuth requires `OAUTH_GITHUB_CLIENT_ID` and `OAUTH_GITHUB_CLIENT_SECRET` together. Browser reports and failure diagnostics are retained for 7 days; the deployment artifact for 1 day. These are diagnostics/artifacts, not public hosting or releases.

The first GitHub run after a CI change must be checked in Actions: local validation does not prove runner font availability, account permissions, repository required-check settings or live VPS behavior. Branch protection is managed in repository settings, not these YAML files. Prefer requiring the validation check before merging; branch policy is not changed automatically by this project. A weekly failure reports through normal GitHub Actions notifications; it cannot undo an earlier deployment.

| Symptom | Investigation / recovery |
| --- | --- |
| Remote-image dimension/build failure | Check the exact article image URL and network access. The current build infers dimensions for some external covers; it therefore still depends on those hosts. Retry after recovery; do not bypass output verification. |
| Temporary regression articles in preview | Stop preview, complete/inspect `test:markdown` cleanup, then run a normal `pnpm build`. Do not package its integration output. |
| Port 4321 already in use | Stop the existing dev/preview process. Browser tests deliberately refuse server reuse to avoid testing a stale/dev build. |
| Screenshot failure | Read HTML report and expected/actual/diff, engine/OS and lockfile. Check local font/photo loads and animation timing before any baseline update. See browser guide. |
| Motion timing/flaky retry | Inspect motion JSON, trace and filmstrip. CI treats a passing retry as a failure too; do not dismiss intermittence as success. |
| Search unavailable | Development intentionally has no index. In production verify `dist/pagefind/`, network failures and Retry. Keep Pagefind entry files revalidated. |
| Deploy skipped / artifact missing | Check validation first. Check the classification and selected build or validation job; only a successful selected path uploads `validated-dist`. Do not rebuild on the VPS to bypass the gate. |
| SCP/SSH/OAuth health failure | Inspect the named Actions step, connectivity/Secrets, server disk space, Docker logs and `.env`; never paste credentials into logs. Existing deployment is not transactional: the remote rsync may already have changed files. |
| Need to roll back production | Revert to a known-good committed revision through main and let the same gates rebuild/deploy it. Confirm home/search/OAuth routes after deployment. The workflow does not currently provide an atomic release-directory rollback. |

## Review coverage and remaining maintenance debt

This pass examines shared navigation/motion/state restoration, their callers and CSS/history in depth; build/test/CI and deployment transport are reviewed for the validation path. Rendering features and CMS interfaces are sampled through existing unit/integration tests. Auth/OAuth security, every authored document, production host configuration and dependency vulnerability analysis are not a comprehensive security audit. Generated output, binaries, vendored libraries and licensed fonts are not edited.

Preserve the current runtime while adding safeguards. Splitting the early inline coordinator, consolidating CSS layers or unifying scroll calculations are future changes requiring their own measured browser baseline; code volume alone is not evidence of redundancy. Current risks are: external covers needed at build time, a monolithic inline cache/lifecycle coordinator, source-pattern tests with limited compositor evidence, and non-atomic VPS replacement. Browser probes and screenshots reduce regression risk but cannot certify every GPU or Safari/iOS device. Upgrade one dependency/ownership boundary at a time; keep lockfile and browser snapshots reviewed together. Do not revive removed feed/theme/tag/music-card systems from outdated upstream documentation.

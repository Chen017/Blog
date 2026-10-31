# Voyage navigation baseline and regression protocol

Snapshot: `241fee6f78d96574663faa59bb3aaec41252846b` (Astro 7.4.0). This is a **test protocol**, not a claim that browser measurements were collected. Keep `DESIGN_SYSTEM.md`, `MAINTENANCE.md`, and `AGENTS.md` authoritative.

## Local checks (run sequentially)

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test:unit
pnpm test:markdown
pnpm build
pnpm lint:check
pnpm test:motion
pnpm preview
```

`test:markdown` and `build` both touch `dist/`; never run them in parallel. `lint:check` is non-mutating, unlike `pnpm lint`. A warning from existing lint must be distinguished from new regressions.

## Browser acceptance matrix

Use the same Chrome version, device, network profile, cache state, and deployed build before/after changes. Record a video, Performance trace, network HAR, console errors and computed style snapshots; repeat at least three times. `ClientRouter` fallback and reduced-motion must also be checked.

| Path | Mandatory invariant |
| --- | --- |
| Home → Writing / Links / About | 280ms directional slide; stable header/search; active tab correct; no blank frame |
| Writing ↔ Links ↔ About | Navigation direction follows tab ordering; native/head styles correct |
| Any inner page → Home | No blank lower half, no duplicate folded-section reveal; stars resume |
| Home card → Post → browser Back | Selected title morphs ~620ms; return focus/scroll correct; only relevant deferred cover eagerly decoded |
| Archive item → Post → Back | Title is tightly matched; filters and scroll retained |
| Post → previous/next post | Correct direction, no unrelated shared-title match |
| Rapid repeated nav / cancelled transitions | No stale `data-voyage-*` flags, outdated callbacks or errors |
| Initial direct Home / refresh / hash entry | Entrance only when intended; anchor navigation intact |
| Keyboard / reduced motion / disabled JS | Focus restoration, no movement when requested, article and cards readable |
| Narrow/desktop and History BFCache | Responsive layout, no duplicate listeners or lost persisted widgets |
| Modal search / Fancybox / music / TOC / decrypted content | Survive navigation; no duplicate initialization |
| CSS ownership | Home-only bundle does not inherit inner-page stylesheet from ClientRouter navigation |
| Prefetch | No 503 on deployed CDN; cached HTML matches deployment and query semantics |

## Measurements to capture (do not fabricate values)

- Home ↔ inner-page transition: screenshot boundaries, long animation frames, major paints, JS tasks.
- Home ↔ Post: selected title bounding rect before/after, number of `deferred-cover` templates unfolded, eager image requests, image decode time.
- `document.styleSheets` URLs before/after Home → Post → Home (and multiple cycles); compare computed values for hero image, typography and pseudo-elements.
- Navigation Fetch: URLs, status/redirect/header semantics, HTML freshness after deployment, transfer and cache hit counts.
- Visual quality: screenshots at 320px, 570px, 820px, 1440px; keyboard, touch and `prefers-reduced-motion`.

## Release rules

1. Do not merge based solely on a green Node mock suite. Only a browser can validate transition paint/compositing and layout.
2. Preserve the 620ms entry-title morph, 280ms menu transitions, existing content and reduced-motion behavior unless an explicit design change is approved.
3. Each phase PR must document tests actually run versus tests awaiting the maintainer; do not label unexecuted checks as passed.
4. The five phase PRs are stacked; **merge them in order** and retarget each successor to `main` after its predecessor lands.

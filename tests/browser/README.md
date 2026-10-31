# Production browser regression tests

Start with [MAINTENANCE.md](../../MAINTENANCE.md) for setup, ownership/history,
build order, CI/deployment and troubleshooting. [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md)
remains the visual contract. This guide owns browser commands and evidence only.

## Reproduce

Use Node 24.13.0, pnpm 10.29.2 and frozen dependencies. After `pnpm test:markdown`,
always run `pnpm build` before testing. Do not run either build while preview is
using `dist`. Stop any server on port 4321; the test runner owns its preview.

```sh
pnpm exec playwright install chromium
pnpm test:browser
pnpm test:browser --project=desktop --grep 'both return'
pnpm test:browser --project=phone --headed
pnpm test:browser:report
```

To run additional engines locally:

```powershell
pnpm exec playwright install firefox webkit
$env:BROWSER_MATRIX = 'extended'
pnpm test:browser
Remove-Item Env:BROWSER_MATRIX
```

On POSIX systems use `BROWSER_MATRIX=extended pnpm test:browser`. Functional tests
can run anywhere with `--grep-invert 'composition|filmstrip|opening pixels'`;
committed goldens intentionally use Windows. Do not generate Linux/macOS goldens
and claim they validate the Windows CI renderer.

| Project | Viewport | Input / scope |
| --- | --- | --- |
| desktop | 1440×900 | Fine pointer, keyboard, full behavior and compositor filmstrips |
| phone | 390×844 | Touch, keyboard, behavior and four resting page screenshots |
| tablet | 768×1024 | Touch, keyboard, behavior and four resting page screenshots |
| narrow | 320×740 | Touch, keyboard, behavior and four resting page screenshots |
| firefox, webkit | 1440×900 | Extended behavior checks; golden pixels stay in Chromium |

Projects emulate input and viewport; they are not physical phones or a Safari
installation. Native View Transition checks require engine support and assert
that a real transition was observed. A separate fallback test disables that API.
Headless/virtual GPU results cannot establish all physical GPU/OS behavior.

## What the tests observe

- `navigation.spec.mjs`: every directed main-tab pair; title/current state/header
  position and overflow; keyboard and touch; real Pagefind failure/retry and
  focus; filtered/sorted article history and keyboard versus pointer source return; rapid
  interrupted anchors; live reduced-motion changes; unavailable APIs/storage;
  content without JavaScript.
  It also verifies failed speculative HTML warming recovers and Chromium's
  emulated reduced-transparency preference uses readable solid lettering.
- `motion.spec.mjs`: actual native WAAPI effects and computed starting poses,
  effect counts and original opening/return timing; rAF samples during natural
  return animation; no downward restart; return effects created before native
  transition completion; actual directional slide effects and their duration.
- `visual.spec.mjs`: production viewport PNGs and selected compositor frames.
  Real native animations are paused/searched at selected times for repeatable
  screenshots; they are not replaced by mocked animations. Natural playback is
  tested separately so seeking cannot hide a late-start bug.
  Writing captures the masthead, hiding its changing entry-count kicker; Home
  hides only the tiny changing counts. New articles therefore do not require
  approving design baselines. Build/behavior tests check real counts and entries.
- `fixtures.mjs`: wraps native `Element.animate` / `startViewTransition` to
  observe effects and lifecycle timing while preserving their returned native
  objects. The recorder is test-only and never enters the production bundle.

External analytics/media requests are fulfilled empty to isolate optional
third-party availability. Local production scripts, fonts, background photography
and Pagefind remain real. Expected search failures are injected only within that
scenario. Resting screenshots pause infinite star twinkle at a fixed phase and
decode the real sky; they do not hide the hero, background, texture or blend.
Animation screenshots explicitly use `animations: 'allow'`: Playwright's default
animation disabling would fast-forward the finite effects being protected.

Timing/effect assertions alone cannot prove real additive compositing, so both
natural samples and raster comparisons are required. A picture alone cannot
prove correct event ordering. Native back/forward is exercised, but no test
claims a confirmed persisted BFCache hit without observing one. Source-pattern
unit tests remain useful for hard-to-trigger branches, not as visual proof.

## Baseline review

Goldens live in `snapshots/win32/<project>/`. CI uses Windows 2025 and the exact
Playwright/browser versions from the lockfile. OS fonts, browser versions and
renderer differences can affect pixels; a runner/browser upgrade needs a review
of the images, not a larger tolerance to hide changes. The small pixel tolerance
allows raster noise; no masks cover critical lettering or sky.

```sh
pnpm test:browser:update
pnpm test:browser
```

Use the update command only for a deliberate, reviewed visual change. Inspect
the expected/actual/diff images and the complete changed PNG set. The update
command establishes references, it does not prove that they are correct. Review
title pre-poses, simultaneous slide/title movement, real-sky color, the planet
surface and handoff to live DOM. Preserve the original PNGs when debugging a
failure. Never accept baselines generated by a broken/missing font/photo load.

CI uses `updateSnapshots: 'none'`; no automated run approves its own new images.
One retry collects evidence, and `failOnFlakyTests` keeps passing retries from
turning an intermittent regression green. Do not disable a failing engine/test
merely to unblock deployment; investigate and document any unavoidable gap.

## Failure evidence and maintenance

Actions uploads `browser-report-<run>-<attempt>` for 7 days. Download it and open
the extracted `playwright-report/index.html` via `pnpm exec playwright show-report
<report-directory>`. Expected/actual/diff PNGs, retained video and traces are
linked from the report. `browser-diagnostics` contains uncaught errors, failed
requests, native animation calls, lifecycle events and natural frame poses.
Use `pnpm exec playwright show-trace <trace.zip>` to inspect timing and requests.
Reports can contain page/article content; do not publish them to unrelated hosts.

When a behavior changes, update its browser test and the motion decision table
in `MAINTENANCE.md` if applicable. For an animation change, run a focused natural
timeline scenario and compositor screenshots before the full matrix. When a
snapshot fails, first distinguish a real regression from a missing font/photo,
wrong production build, different renderer or an unstable capture. Keep every
remaining unverified device/deployment claim explicit in the delivery report.

API references: [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots),
[screenshot animation handling](https://playwright.dev/docs/api/class-page#page-screenshot),
[CI setup](https://playwright.dev/docs/ci-intro),
[trace viewer](https://playwright.dev/docs/trace-viewer-intro).

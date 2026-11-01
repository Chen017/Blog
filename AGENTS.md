# Frontend design contract

Read [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) before changing any public page,
component, layout, typography, or motion. It defines the site's Voyage language.
Reuse shared site chrome and tokens; do not introduce a page-specific visual
system. Preserve authored content and existing site capabilities.

Validate relevant pages at phone, tablet, and desktop widths and test keyboard,
reduced motion, browser return navigation, and failure states. Run the project's
pnpm unit, Markdown/MDX integration, type, and production build checks before
delivery. Integration tests and production builds both write dist: run them
sequentially. Retain theme/upstream attribution and local font licenses.

Read [MAINTENANCE.md](MAINTENANCE.md) for module ownership, motion history and
deployment constraints. Run `pnpm test:browser` against the normal production
build; [tests/browser/README.md](tests/browser/README.md) explains the browser
matrix, animation probes, screenshots and diagnostics. Source-pattern unit
tests alone do not establish visual correctness. Never update screenshot
baselines just to make a failing test pass; inspect actual/expected/diff images.

Keep Home title motion exclusively in `voyage.ts`. Incoming CSS preparation,
after-swap title animation and post-transition interaction setup serve different
lifecycle phases. Preserve the narrowly scoped Home root opacity fix, real-sky
additive blending, planet grain and generation/abort guards. Consult the motion
decision history before simplifying these paths.

Changes to architecture, lifecycle, dependencies, commands, tests or deployment
must update the affected maintenance/test documentation in the same change.
Report checks actually run, browser/viewport coverage and remaining limitations.

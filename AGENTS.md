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

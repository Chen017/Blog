# CMS defaults, preview and publishing regression

- Failure reproduced from production run 39520522630 (commit 410bc48): Astro generated all 26 pages and Pagefind indexed 17 pages, then the assertion `Process card covers at build time` rejected the Test article's external cover.
- Build verification now supports external and public covers, verifies generated local assets exist, and retains responsive-size checks for optimized covers. Public image URLs may contain escaped names and query strings.
- New Markdown and MDX entries default to comments, password protection, copy restrictions, pinning and cover-in-body off. Draft stays on. Existing content is unchanged.
- Every article opens Markdown; plain articles can explicitly switch to rich text. Advanced syntax stays protected in source mode.
- Reproduced the About preview's empty SVG despite the original image being present. Direct native Markdown preview rendering avoids Decap's widget memoization after assets finish loading. The preview still sanitizes Markdown HTML.
- Browser verification used an isolated copy under `.astro/cms-fixes` with the official local proxy. No production article was edited.
- About image automatically loaded at its real 8182-pixel width, without modifying its Markdown. See `about-image-preview.png`.
- Uploaded avatar.jpg into a new draft, inserted it through the component form, typed more Markdown, switched to rich text and back, and saved. Preview loaded the real 432-pixel image. Saved image is beside index.md, all switches have expected defaults, and body text survives. See `new-post-markdown-preview.png`.
- Unit tests: 26 passed. Astro check: 0 errors, 0 warnings, 24 hints. Full static build with the user's unchanged Test article passed.

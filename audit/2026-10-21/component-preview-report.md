# Component previews in the writing dashboard

- Added right-hand previews for all five notice styles, spoiler text, inline/block KaTeX equations, Mermaid diagrams and basic song cards. Ordinary Markdown and MDX use the same preview renderer. Arbitrary JSX and expressions remain protected.
- Existing image previews and production article styles/players are unchanged. The native Markdown preview remains responsible for ordinary Markdown blocks and images.
- Song cards show cover, title, artist, static lyrics and one play/pause button. No seek bar, volume control, lyric synchronization or animation is included. Playback does not start automatically and is stopped when its component unmounts. Shared uploads resolve through Decap's configured media store, so new audio and covers can be previewed before deployment. External HTTPS media URLs remain direct links.
- KaTeX uses the project's existing package and deploys its CSS/fonts with the dashboard. Mermaid 11.17.2 is loaded on demand from the built site, serializes rendering, debounces edits and ignores stale results. Syntax errors stay within the affected preview and later diagrams continue rendering. Loading errors can be retried.
- Browser testing used the production static build at localhost:4322 and the official local backend with an isolated content copy under `.astro/cms-visual`. No production article was edited or published.
- Verified all five notice styles, clickable spoiler, inline and display equations, and six diagram types (flowchart, sequence, pie, class, state and Gantt) in both Markdown and MDX. Invalid diagram/math input did not interrupt other content; removing it restored all six diagrams.
- A locally generated quiet WAV file played successfully and the button changed to pause. Cover and both static lyric lines displayed correctly. The initial failed test exposed a public-media-path lookup issue; resolving configured shared paths through the media store fixed it.
- Updated a song through the MDX form and saved the isolated fixture. Compared the saved body against the original: import, JSX image, prose, notices, equations and all six diagrams were preserved; only the song header changed.
- Automated unit suite: 42 passed. Astro check: 0 errors, 0 warnings, 24 hints. Production build and static-output verification passed.
- Screenshots: `components-math-notice-preview.png` and `components-music-preview.png`.
- README files, production articles, OAuth credentials and deployed full song-player behavior were not modified.

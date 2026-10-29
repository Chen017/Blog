# Voyage — design language

This is the design contract for Etalib’s Space. Apply it to **every public page**,
including articles, archive, About, Links, Skills, feeds, pagination, and errors.
The homepage is the visual reference, not an isolated theme. Changes to this
contract must be intentional and reflected in shared components first.

## Creative direction

The site is a personal place for mathematics, computer science, music, and life.
It should feel like quietly observing a very large sky. Its personality comes
from the author's actual writing, images, and small mathematical annotations.
It is neither a spacecraft dashboard nor a company landing page.

Design from the reader's purpose, in this order:

1. What is the person here to read, find, or do?
2. What hierarchy makes that task obvious without explanation?
3. Where can the author's own content give the composition character?
4. What movement explains an action or a change of state?
5. What can be removed without losing meaning or atmosphere?

Keep a strong focal point and quiet margins. Use asymmetry deliberately, with
the overall composition still balanced. Do not fill empty space simply because
it is available. Avoid invented coordinates, system statuses, marketing slogans,
uniform glowing panels, arbitrary gradients, and repeated pairs of hero CTAs.

## Shared foundations

- Midnight background: `#080c17`; raised surface: `#111a2b`.
- Primary text: warm ivory `#f0eef0`; secondary text: `#a9b4cb`.
- Seafoam accent: `#abdcd1`, used sparingly for focus, current state, and fine light.
- Borders: neutral blue-grey at low opacity, normally one pixel.
- Background photography supplies atmosphere; crisp vector stars supply detail.
  Never blur an entire page or enlarge a small bitmap to fake sharpness.
- Homepage display lettering takes its local color from the actual backdrop,
  following the author's lock-screen reference. Add neutral white light using
  `mix-blend-mode: plus-lighter` and a 68% white fill; keep intermediate ancestors
  free of isolated stacking contexts so the real sky reaches the glyphs. Red sky
  must remain red-tinted, blue sky blue-tinted, and moving scenery must change
  the fill naturally. Never simulate this with a fixed blue or purple gradient.
  Keep contours sharp, with only a fine neutral edge highlight. Fall back to
  ordinary 72% translucent white when additive compositing is unsupported, and
  opaque neutral light grey for reduced transparency. This treatment belongs to
  large hero lettering, not article text or controls; no resting text blur or
  costly live backdrop filter is needed.
- DM Sans is the interface and reading face. Instrument Serif is for short
  expressive phrases and display accents. Code and formulae keep their dedicated
  fonts. Fonts are hosted locally; avoid adding font requests per page.
- Body copy: 16–18px, line height 1.75–1.9, reading measure about 44rem.
- Interface labels and meaningful metadata: at least 11px. Editable controls:
  16px on small screens. Never create hierarchy by making useful text illegible.
- Use a consistent spacing rhythm: 4, 8, 12, 16, 24, 32, 48, 64px.
- Public interface text is English. Authored article text, lyrics, and embedded
  images retain their original language. Use editorial display titles for the
  English interface; do not silently rewrite the author's prose.

## Page composition

| Page | Main purpose | Composition |
| --- | --- | --- |
| Home | Introduce the place and invite reading | Centered offset display type, low planetary horizon, small peripheral code/math/binary-star notes; all published entries remain directly discoverable. |
| Article | Read and move through a text | A centered masthead spans the reading composition above the body/outline grid. Long titles use smaller type and balanced wrapping (about 42px maximum; 28–32px on phones), never an oversized five-line poster squeezed beside the outline. Body and outline begin together; the narrow outline stays sticky on wide screens and becomes an accessible panel on small screens. Clear metadata, a calm reading field and complete adjacent-entry titles support reading. |
| Archive | Find a particular entry | Strong editorial heading, explicit category controls, chronological groups, complete titles and dates. A compact list belongs here rather than replacing the homepage's image cards. |
| About | Meet the author through chosen material | Generous image presentation, a personal heading, original writing and music; no fabricated biography or personality claims. |
| Links | Choose a destination | Distinct, legible destination cards with real images, descriptions and clearly external links. Stable order unless the author explicitly chooses otherwise. |
| Skills | Understand actual experience | Group real skills and levels, show factual duration, keep one restrained visual system. Do not turn self-reported levels into invented precision or competitive scores. |
| Feeds | Subscribe | A visible feed URL, one copy action with honest feedback, explanation and recent entries. RSS/Atom XML behavior stays intact. |
| Error | Recover | Quiet planetary/typographic composition, a clear explanation, a direct route home or to the archive. Do not animate an error into a spectacle. |
| Writing room | Author and edit | A branded night frame around a neutral editing canvas. Retain the established authoring language and controls; do not override generated third-party component selectors. |

The header, search, motion preference, footer, typography, focus treatment and
link behavior must be shared across pages. The article body must not inherit
the homepage's oversized display type or cinematic card overlays.
Articles without section headings use a centered single reading column; never
reserve an empty outline column simply because the page is an article.
The article's "All writing" link returns to the homepage's full writing section
at `/#nv-writing`. The chronological archive remains a separate destination.

## Choosing interface patterns

- Use a normal link for navigation and a native button for an action.
- Use underlined text filters for categories; a native select for ordering.
- Use cinematic image cards to browse writing visually; use chronological rows
  to locate entries by date. Neither should truncate essential titles.
- Use a raised, opaque panel for search, menus, or transient controls. Reserve
  subtle translucency for decorative layers where contrast remains predictable.
- Use an unobtrusive border or spacing for ordinary structural groups. Do not
  put every paragraph, metadata item, and navigation link in its own card.
- Show actual loading, empty, failure, retry and success states. Restore focus
  when closing a panel with Escape. Hidden panels must be inert.
- Touch targets should be at least 44×44px, even when the visible icon is smaller.
- Code copy, image viewing, songs, diagrams, encrypted content, aliases and feeds
  are site capabilities, not decorative details. A redesign must preserve them.

## Motion vocabulary

Apple's principles of purposeful, continuous, responsive motion inform the
behavior. These are **website-specific choices**, not claimed Apple presets or
web equivalents of private native APIs. Prefer CSS, Web Animations, Astro's
static rendering and native document transitions over a new animation framework.

| Trigger | Motion | Timing and reason |
| --- | --- | --- |
| Press a button | 1px displacement or a very small scale change | 80–140ms; immediate acknowledgment without a rubbery bounce. |
| Hover/focus a reading card | Lift ≤3px, image scale ≤1.035, subtle arrow shift | Surface 300–500ms; image 800–1100ms. Suggest depth without tilting the text. |
| Open/close a panel | Opacity with a small directional translation, no layout jump | 160–220ms, ease-out on entrance; keep focus and hit testing synchronized. |
| Filter or sort entries | Short local opacity/translation of the changed results | 250–380ms; stagger ≤25–30ms and cap the total delay. Do not animate unrelated content. |
| Move between pages | Native cross-document transition when supported | About 200ms. Navigation must work immediately without it; avoid transitions that hide content pending JavaScript. |
| Explicitly replay the homepage opening | Display text settles and the horizon becomes clear | 1400–1900ms; deliberate and finite. Never force this sequence on every visit. |
| Move a fine pointer over the hero | Small eased displacement of distant scenery | A few pixels, 1200–1600ms response. Text remains stable. No touch-pointer imitation. |
| Activate the two-star ornament | One complete shared orbit | About 2400ms, then rest. The ornament does not run an endless loop. |
| Change a formula/code view | Update the selected representation and its accessible label | Immediate or a short local transition. Mathematical meaning must stay correct. |
| Copy a link/code or submit a form | Clear text feedback and a recoverable failure state | Feedback is explicit; motion is optional and never the only indication. |

Use `cubic-bezier(.2,.8,.2,1)` for responsive local settling and
`cubic-bezier(.16,.8,.2,1)` for slower decorative settling. Avoid overshoot on
reading surfaces, simultaneous floating cards, flashing stars, cursor trails,
automatic sound, long scroll hijacks, and continuous JavaScript animation loops.

## Preferences and lifecycle

`prefers-reduced-motion` is an upper bound: stop parallax, orbit/replay, animated
reordering and document transitions. A manual pause also stops current finite
animations, and its preference follows the visitor across pages. Never reset
the paused preference because the visitor has merely navigated to a page or
selected a filter. Preserve the state when returning through browser history.

Reduced transparency uses solid surfaces. Text, actions and selected states
must remain understandable without transparency, color, hover, or animation.
Pause media and clean up transient viewers/panels on navigation. Returning from
the back/forward cache must not duplicate handlers or leave controls inert.

## Delivery gate

For each upgrade, inspect the relevant page in its real production build at
320px, a typical phone width, tablet width, and desktop width. Check wrapping,
focus, touch targets, keyboard dismissal, loading/failure states, and motion
preferences. Keep published content readable without JavaScript; enhance rather
than rebuild the document on the client. Use responsive local assets, lazy
below-fold media, and on-demand heavy features. Keep theme/upstream attribution.

Run unit, Markdown/MDX integration, type and production-build checks; validate
all routes and internal links. Verify the deployed page, not just the source or
the workflow status. A page is complete only when its presentation **and** its
existing functions conform to this document.

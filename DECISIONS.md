# Decisions

Architecture decision records, newest last. Each one says what was decided, what else was
considered, and what it costs. A decision is changed by adding a new record that supersedes
it, not by editing the old one.

## ADR-001: Astro as the framework

**Status:** accepted, 2026-11-11

**Context.** The site is mostly content (four project chapters, an about section) with a few
heavy interactive pieces: canvas simulations, a three.js hero and scroll-staged scenes. It
has no accounts, no database and no server-side logic.

**Decision.** Astro with TypeScript, React for interactive islands, Tailwind CSS v4 for
styling.

**Considered.**

- _Next.js._ Better known on job postings, and React throughout. But it is built for
  server-rendered applications, and a static Next.js page still ships the React runtime and a
  router to every visitor. Here that is weight with no feature behind it.
- _Plain Vite + React._ Fine for the interactive parts, but every page would be a client-side
  render, which costs first paint and SEO for a site whose job is to be read fast.

**Consequences.** Pages ship as HTML and CSS; JavaScript loads only for the islands that need
it, and only when they need it (`client:visible`). React still covers the interactive work.
Astro is less familiar to some reviewers, which this record exists to explain.

## ADR-002: Art direction "Final Cut"

**Status:** accepted, 2026-11-11

**Context.** The site has to prove front-end and design-engineering skill, since the projects
it presents are mostly backend, systems and local AI. Three concepts were produced from a
written brief (see `docs/art-direction/`).

**Decision.** Concept A, _Final Cut_: the site as a short film in a widescreen frame, with
letterbox bars, slug lines and hard cuts between per-project color worlds. Each project scene
holds one small simulation of what the project really does. Two borrowings:

- From concept B, _Meridian_: operable interface cards for the projects that are interfaces
  (Bifrost's diff card, Cougar Connect's search).
- From concept C, _Constellation_: a point field in the hero, upgraded to real 3D with
  three.js (depth, pointer and tilt parallax, a scroll-driven break-apart into the first
  scene). It is confined to the hero.

**Considered.** B alone read as a Stripe imitation and was the least cinematic. C alone had the
highest ceiling but the highest cost, the highest phone-GPU risk, and a template that every
future project would struggle to fill.

**Consequences.** Most of the site is CSS, DOM and canvas 2D, which keeps it fast and makes
the chapter template easy to extend. The 3D hero is the one expensive piece; it loads after
first paint, falls back to 2D on weak devices and to a still frame under reduced motion.

## ADR-003: Desktop-first, mobile supported

**Status:** accepted, 2026-11-11

**Decision.** Design for desktop first. Phones are a supported addition: everything must look
right and work by touch, but the cinematic staging (pinned scenes, 3D) is tuned for large
screens and simplifies on small ones.

**Consequences.** CI runs the end-to-end suite at a desktop size and a phone size, so mobile
regressions are caught even though mobile is not the design target.

## ADR-004: Projects as content files

**Status:** accepted, 2026-11-11

**Decision.** Each project is one Markdown file in `src/content/projects/`, validated by a
schema in `src/content.config.ts`. The chapter template renders whatever the collection holds,
in `order`.

**Consequences.** Adding a project means adding one file (plus its simulation, when it has
one). The schema rejects a project with a malformed color, missing links or more than four
headline numbers at build time, so a bad entry fails CI instead of shipping.

## ADR-005: Color worlds and credit live in the content files

**Status:** accepted, 2026-11-11. Amends ADR-004.

**Decision.** Each project file holds its full color world (fill, on-fill, text and tint for
dark and light, optional secondary), a `credit` of `solo` or `team`, and its scene copy
(`slug`, `headline`, `logline`, `pin`). `WorldStyles.astro` generates the CSS from the
collection. The schema computes WCAG contrast and fails the build when a world's text pairs
are under 4.5:1.

**Considered.** Worlds in a CSS file keyed by project id: simpler today, but a new project
would touch two files and lose the build-time contrast check.

**Consequences.** A new project is still one file. A badly chosen color cannot ship. The
light theme's tokens exist but no toggle ships yet; it is a later, additive change.

## ADR-006: Hero: five dot-lattice plates, CSS still, CSS sticky pin, three.js off the critical path

**Status:** accepted, 2026-11-12. Refines ADR-002 (the hero) and amends design-system spec 4.4,
4.5 and 7. Full direction: `docs/hero/HERO-SPEC.md` ("Five plates").

**Context.** ADR-002 asked for a point field in the hero, upgraded to real 3D with three.js,
loaded after first paint. A free-floating particle cloud reads as a template, and the name has
to stay legible, selectable text that is the page's LCP. The hand-off contract also called for
AVIF/WebP stills of the settled field, a GSAP-pinned hero and a 1.5 device-pixel-ratio cap on
phones; building the prototype showed each of those had a better answer.

**Decision.**

- The name is five flat plates stacked in depth, each a full copy of LUIS ZARATE as a lattice
  of small square dots on an opaque card (off-white in front, one project color per plate
  behind). The lattice is sampled from the laid-out `h1`, so plate 0 is registered to it at
  every size. Colors come only from the tokens and world variables, at run time.
- The still is CSS: four dotted copies inside the `h1`, behind its text. It serves reduced
  motion, no-JS, weak devices and any failure.
- The hero pins with CSS `position: sticky` in a wrapper twice the frame tall, under the same
  media query as before. No GSAP in the hero.
- three.js is imported by one file, `render-gl.ts`, with named imports, after `load` and idle,
  and only on the full tier. A 2D canvas renderer covers weak and WebGL-less devices. The
  budget (three.js chunk under 140 KB gzip, hero code under 8 KB, nothing on the critical
  path) is enforced by `npm run check:budget` in CI.
- Tests reach WebGL through `?hero=gl` and `?hero=2d`, which exist only in dev and in builds
  made with `PUBLIC_HERO_TEST_HOOKS=1`; the budget check fails if they ever ship.

**Considered.**

- _Raster stills (AVIF/WebP)._ A `cover` image of the settled field cannot stay registered
  with a fluid `h1`: the page would show two misaligned names, or hide the real one. CSS is
  exact at every size, costs no bytes or requests, and follows the theme.
- _GSAP ScrollTrigger pin._ Works, but adds about 27 KB gzip before the first scroll, a
  pin-spacer and main-thread scrubbing; sticky is compositor-driven and the hero needs no
  other GSAP feature.
- _Raw WebGL2 instead of three.js._ The scene is two draws of one buffer, about 3 KB instead of
  about 127 KB. Rejected because ADR-002 names three.js and it is a resume keyword; the weight
  is kept off the critical path instead.

**Consequences.** First paint is the plain `h1`, so Lighthouse sees text, not a canvas. The
site carries a pinned dependency on three (exact version, re-measured on upgrade). The still
is part of the design and is checked against the live rest pose by `npm run hero:still`.
Timecode and scene tracking treat `main > .hero-pin` as section 0, because a sticky section's
own position moves while it is pinned.

**Amendments (design review, approved by Luis).** The fan is one lattice column per plate (rest
fan 16 px desktop, 12 px phone; at most about 29 px and 22 px with the pointer), so
`--hero-step` is 3 px / 4 px. The front plate is drawn solid (dot = pitch), amending the
"dotted at rest" open question: only the four colored plates stay dotted. On phones the hero is
at most 37.5rem tall, so a tall screen does not leave empty ground above the name. Visibility is
read from the hero's rect every frame rather than from an IntersectionObserver, whose batched
callbacks could leave the field stranded after a quick scroll out and back.

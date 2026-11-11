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

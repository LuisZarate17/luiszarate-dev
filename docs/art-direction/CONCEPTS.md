# Portfolio art direction: three concepts

Live preview of all three: `concepts.html` in this folder. Read time: about 10 minutes.

## Shared decisions (true in every concept)

**Color worlds.** Four hues spread around the wheel so no two chapters can be confused, each taken from the project itself.

| Project        | World         | Fill      | Text on dark | Text on light | Dark tint | Light tint | Why                                                                               |
| -------------- | ------------- | --------- | ------------ | ------------- | --------- | ---------- | --------------------------------------------------------------------------------- |
| LabQ           | Sodium amber  | `#F59E1B` | `#FFB648`    | `#8F5400`     | `#1A1206` | `#FFF3DC`  | The orange line of its own Grafana dashboard; lab warning-light colour            |
| Bifrost        | Frost         | `#7FD6EE` | `#A5E6F7`    | `#0B6B86`     | `#071419` | `#E4F5FA`  | Ice, with a faint aurora violet (`#B9A9FF`) as the only secondary, for the bridge |
| Cougar Connect | Crimson       | `#C8102E` | `#FF6B81`    | `#A60F2D`     | `#1A070B` | `#FBE8EB`  | WSU crimson, as in the app's own header                                           |
| Mastery Pilot  | Indigo-violet | `#6C5CE7` | `#A99CFF`    | `#4B3BC4`     | `#0E0B1F` | `#EDEAFF`  | The app's own indigo, pushed toward violet so it separates from Bifrost           |

A world is five tokens (`--a`, `--at`, `--on`, `--tint`, plus one optional secondary). A chapter sets `data-world`; nothing else in the chapter names a colour. Fill colours are never used for body text; the "text on" values all clear 4.5:1 on their base. A fifth project picks a free hue (green around `#3FB68B` and magenta are open).

**Content order (all concepts).** Hero → 4 chapters → How it was built → About/contact. A chapter always answers, in this order: what it is (one line), the wow moment, three numbers, stack, links (repo, live demo, decisions). Recruiters get the first three in the pinned view; reviewers get depth in a "Details" expander (stack, decisions, credit line). Credit lines are fixed copy: Cougar Connect "2024 team project with Jonah Jellison and Cameron; 2026 solo: secrets removed, Postgres, tests + CI, deployed, connections/messaging/notifications redesigned"; Mastery Pilot "team capstone; 62 solo commits after".

**Performance floor (all concepts).** HTML + CSS + type render first and are complete without JS. Every wow moment has a static final-state frame as its first paint; the interactive layer hydrates when the chapter is within one viewport. Animations run only while on screen (IntersectionObserver) and pause on `visibilitychange`.

---

## A. Final Cut

The site is a short film in a widescreen frame: letterbox bars, screenplay slug lines, hard cuts between project colour worlds. Inside each scene sits one small, runnable simulation of what the project actually does.

**Type.** Display: Big Shoulders Display 900/700, uppercase, tight (0.8–0.9 line-height), used only for titles and big numbers. Body: Hanken Grotesk 400/600. Mono: JetBrains Mono for slug lines, timecode, counters, code. The condensed face gives title-card scale without eating phone width ("ZARATE" fits at 84px on a 390px screen).

**Base palette.** Dark (default): bg `#0B0B0D`, surface `#151518`, text `#F2EFE9`, muted `#A19D96`, line `#2B2B30`, letterbox `#000000`. Light: bg `#F4F4F2`, surface `#FFFFFF`, text `#111113`, muted `#5C5C61`, line `#D6D6D2`, letterbox stays `#111113`. Each scene's stage is flooded with the world's tint; the accent appears on the slug line, the big number and the active control only.
**World transitions.** A hard cut: a full-frame block in the text colour wipes across in 700ms and the world swaps underneath at the midpoint. No cross-fades anywhere; a film cuts.

**Motion language.** One easing for everything staged: `cubic-bezier(.77,0,.18,1)`, 500–700ms. Scroll advances scenes; within a pinned scene, scroll scrubs at most one thing. What moves: the wipe, the title card numbers, the simulation. What never moves: body text, nav, the letterbox bars, the timecode position. No parallax, no floating, no hover lifts.

**Hero.** Desktop: black bars top and bottom with "LUIS ZARATE · REEL 2026" and a running timecode; inside the frame, the name at ~200px in two lines, the slug "INT. PORTFOLIO — FULL-STACK ENGINEER", and to the right a title card that cycles the four headline numbers (50 → 1, 1 model, 2024 → 2026, 508 tests) with a cut every 3s; a four-button scene strip along the bottom of the frame doubles as the nav. 390px: bars shrink to 40px, the name stacks at ~84px and fills the width, the title card sits under it, scene strip becomes a 2×2 grid of 44px+ buttons. Everything is in the first screen.

**Wow moment per project.**

- **LabQ: "Fifty bookings. One slot."** A canvas with 50 request dots, a dashed constraint line and one slot. Two buttons: run without the constraint (all 50 land, counter reads confirmed 50, overlapping pairs 1,225) and with it (1 lands, 49 bounce off as hollow 409s, pairs 0). A third "deadlock" replay shows the 99-deadlock run as dots locked in a ring, then the row-lock fix as a queue. Built in the preview.
- **Bifrost: "Nothing is written until you say so."** A cut-in of Mimir's edit card: the real `greet` → `welcome` diff types in line by line; Apply writes it, Undo plays the same frames backwards (byte for byte). Beside it a three-way split-screen shows Vidar, Mimir, Hugin all drawing from one pulsing "local model" bar, with a GPU memory meter (8.7 / 16.0 GB).
- **Cougar Connect: "Before / after."** A split-screen wipe the visitor drags (or taps either side of): 2024 team build on the left, 2026 solo rebuild on the right, with a ledger of the changes ticking over as the divider moves (hardcoded secrets → env, SQL Server → Postgres, 0 tests → xUnit + CI, localhost → Render). The credit line is on screen the whole time.
- **Mastery Pilot: "It asks."** The real transcript (2x + 6 = 14) plays as subtitles at the bottom of the frame, one step per tap; the visitor can tap the wrong answer ("20") and get the tutor's actual next question, not the answer. Each tutor line ends with its citation chip (`algebra_linear_equations.md`).

**Chapter template.** `Scene` component with six slots: slug line (location = the technology: "INT. POSTGRES 17 — READ COMMITTED"), title (≤4 words, two lines), one-paragraph logline, the simulation slot (any component that exposes `play()`, `reset()` and a static final frame), three numbers, a details drawer. A new project supplies: a world (5 tokens), the copy, and one simulation. If no simulation is ready, the slot takes a framed screenshot with a caption and the chapter still works.

**How it was built.** Presented as the film's end credits crossed with a call sheet. A horizontal timeline of the real git history: lanes are worktrees, dots are commits, merges are PRs; tap a PR dot to open its card (title, which model did it, CI result). "Crew" lists the orchestrator model and each subagent with what it was delegated. ADRs are numbered "script notes" in a short list. All data is generated at build time from `git log` and the PR list, so it is true and never hand-maintained.

**About/contact.** A final quiet scene on the base colour: a 96px round photo, three sentences, then email (as selectable text with a copy button), GitHub, LinkedIn, resume PDF. The bars close to black as the last cut.

**Mobile, touch, reduced motion, performance.**

- Pinning: scenes pin only at ≥900px. On phones each scene is a normal block and the simulation plays on a button tap; no scroll-jacking.
- LabQ race: canvas 2D, 50 dots, trivial on any GPU. Reduced motion: both end states shown side by side as static frames with counters.
- Bifrost diff: DOM. Reduced motion: the diff appears complete; Apply/Undo switch instantly.
- Cougar split: drag works with pointer events; arrow keys and two buttons do the same. Reduced motion: two stacked stills labelled 2024 and 2026.
- Mastery transcript: tap to advance; reduced motion shows the full transcript.
- Cuts: under reduced motion the wipe is replaced by an instant swap. Timecode stops.

**Build cost and risk.** Lowest of the three. All CSS, DOM and canvas 2D; no three.js. Roughly: frame + template 3 days, four simulations 1–2 days each, "How it was built" 2 days. Most likely to go wrong: (1) scroll-pinned scenes on iOS Safari (address-bar resize, sticky inside overflow), mitigated by not pinning on phones; (2) the film conceit tipping into costume. Keep it to bars, slug lines and cuts; no film grain, no clapperboards, no "directed by".

---

## B. Meridian

A bright, precise product page in the Stripe tradition where one living gradient ribbon carries the colour: all four hues in the hero, one hue per chapter. The wow moments are working pieces of each product's interface that the visitor can operate.

**Type.** Display: Bricolage Grotesque 700 with tight tracking (−0.03em), sentence case. Body: Figtree 400/600. Mono: Geist Mono. Friendlier and more "product" than A.

**Base palette.** Light (default here): bg `#FBFCFE`, surface `#FFFFFF`, ink `#0A1A2F`, muted `#506178`, line `#DFE6EF`. Dark: bg `#0A1220`, surface `#111C2E`, text `#EAF1FA`, muted `#93A4BA`, line `#24344E`. The navy ink instead of black is what keeps four saturated hues from looking like a toy.
**World transitions.** The ribbon is one WebGL fragment shader (fbm noise warping a 4-stop gradient) fixed behind the page. Its four colour stops are uniforms; as a chapter enters, the stops interpolate in OKLCH over ~40% of a viewport of scroll, so amber melts into frost rather than cutting.

**Motion language.** Soft and continuous: `cubic-bezier(.2,.7,.2,1)`, 300–800ms. The gradient always drifts slowly and leans toward the pointer or last touch. Cards rise 12px into place once. What never moves: text blocks, numbers, nav. Nothing rotates in 3D.

**Hero.** Desktop: a skewed ribbon of amber → crimson → violet → frost across the top third; under it on clean white, "I build the system, and the proof that it works." at ~68px, a two-line sub, and four project chips each with its dot and one number. 390px: ribbon is 110px tall, headline ~34px in four lines, chips wrap two per row. The headline and chips are all visible in the first screen.

**Wow moment per project.**

- **LabQ:** a live "status page" card. A load dial the visitor drags from 1 to 50 concurrent bookings; a bar chart of confirmed vs refused updates as they drag, with a toggle for "constraint on/off", and a p95 sparkline that drops from 21.78 to 9.91 ms when they switch the index on. Links to the real public Grafana dashboard.
- **Bifrost:** Mimir's edit card, working: the real diff, Apply edit, Deny, Undo. Built in the preview. A second card is Hugin's terminal with a typed `hugin -p` run ending in "check passed (exit 0, 19.6 s)".
- **Cougar Connect:** the real search box, working on the 9 mock profiles from the screenshots: type "Seattle" or "2020" and results filter across name, year, city, major and company; "Connect" flips to "Pending". A "live demo" button with the ~50s cold-start note.
- **Mastery Pilot:** a working mini chat with scripted branches from the real transcript plus the teacher-dashboard row that lights an intervention flag when the visitor fails the three-question quiz on purpose.

**Chapter template.** Two columns: left is eyebrow (name · stack), a claim-style headline, a paragraph, three numbers, links; right is one "product card" slot (a DOM component on a raised surface) that overlaps the chapter's ribbon. A new project supplies a world, copy and one card. Alternating sides per chapter. Simplest template of the three to fill.

**How it was built.** A changelog-style page section in the same card language: a branch graph card (worktrees as lanes), a "who did what" table (orchestrator, subagents, model per task), PR cards with CI badges, ADR cards. Clean and credible, least theatrical.

**About/contact.** A single card on the base: 88px photo, short bio, contact rows with copy buttons, resume link. The ribbon returns in all four hues behind it.

**Mobile, touch, reduced motion, performance.**

- Gradient: one full-screen quad shader at half resolution, capped at 30fps on phones; if WebGL is unavailable or the device reports low memory, a static CSS multi-stop gradient with the same colours. Reduced motion: the static gradient, colour still changes per chapter with an instant swap.
- All four cards are DOM with real buttons and inputs, so touch and keyboard work natively. Reduced motion changes nothing about them except removing the rise-in.
- Columns stack to one, card under the text. Cheapest concept on phone GPUs after A.

**Build cost and risk.** Low to medium. One ~80-line shader (no three.js needed; raw WebGL or OGL at ~8KB), everything else DOM. Roughly: shell + shader 3 days, four cards 1–2 days each. Most likely to go wrong: (1) it reads as a Stripe imitation, which a hiring manager will recognise in two seconds; (2) "cinematic" is the weakest here, since it is a very good product page rather than a staged experience; (3) text over a moving gradient loses contrast, which is why the ribbon is kept out from under body text.

---

## C. Constellation

One field of points lives behind the whole site and re-forms into each project's shape as you scroll: a graph, a collapse to one, a bridge, a staircase. The type stays quiet and literary so the field is the only loud thing on screen.

**Type.** Display: Fraunces 300 with its italic for one emphasised word per headline. Body: Albert Sans 400/600. Mono: IBM Plex Mono. A light serif against particles is the deliberate risk: it reads as considered rather than "tech demo".

**Base palette.** Dark (default): bg `#05060A`, surface `#0D1017`, text `#E9ECF2`, muted `#8F96A6`, line `#1E232F`. Light: bg `#EEF0F3`, surface `#F8F9FB`, text `#0C0E13`, muted `#575E6D`, line `#D0D5DD` (points drawn in the "text on light" accent). The field glows in the world's accent; a radial wash of the world's tint sits behind it.
**World transitions.** The points never disappear. Between chapters each point travels to its position in the next shape while its colour interpolates; mid-scroll the field is a loose cloud in a blend of both hues.

**Motion language.** Spring physics, not easing curves: points are pulled to targets with damping, repelled by the pointer, scattered by a tap. Scroll position drives the morph progress directly (scrubbed, not triggered). What never moves: all text, which sits in a fixed left column and changes by cross-fade only.

**Hero.** Desktop: near-black; ~20,000 points (three.js, GPU-instanced) drift as a slow cloud on the right two-thirds and briefly resolve into the initials "LZ" before loosening; left, "Systems you can _watch_ working." in Fraunces 300 at ~66px, name and role in mono above. Moving the cursor parts the field. 390px: headline first, then a 280px-tall field of ~3,000 points under it; drag parts it, tap scatters it; vertical scroll is never captured (`touch-action: pan-y`).

**Wow moment per project.**

- **LabQ:** the field arranges as 50 bright points rushing one slot. Scroll forward and all 50 pile in (the slot overloads and flares amber); keep scrolling and the constraint appears as a ring, 49 points are held on it and one sits at the centre.
- **Bifrost:** the field freezes into an arched bridge of ice-coloured points with a faint aurora shimmer; three brighter clusters on the span are Vidar, Mimir and Hugin, all fed by one stream from a single source point (the one local model). Tapping a cluster opens that tool's screenshot.
- **Cougar Connect:** the field becomes the alumni graph in crimson: hubs and strands. Tap a hub to "send a connection request"; a strand draws to it and the unread badge appears.
- **Mastery Pilot:** the field forms a staircase; each tap lights the next step and the matching transcript line appears (first step? → subtract 6 → 2x = 8 → x = 4). The field never jumps to the top, which is the Socratic point.

**Chapter template.** Each chapter registers: a world, a `shape(i) → [x,y,z]` function for the field, copy for the fixed column, and an optional tap behaviour. That is powerful but it is the hardest slot to fill: every new project needs a shape that reads in under two seconds, and some projects will not have one.

**How it was built.** The field becomes the commit graph of the site's own repo: worktrees as parallel strands, the orchestrator as a hub, subagents as satellites labelled with their model, merges as strands joining. Scrolling plays the history forward. A plain list of PRs and ADRs sits in the text column for people who want to read.

**About/contact.** The field relaxes to a thin horizon line. 96px photo, bio, contact links on the surface colour.

**Mobile, touch, reduced motion, performance.**

- three.js (~150KB gzipped with tree-shaking) loads after first paint; until then, and on any failure, each chapter shows a pre-rendered SVG still of its shape.
- Point count scales: 20k desktop, 3–5k phone, DPR capped at 1.5; frame-time watchdog halves the count if it sees sustained <45fps.
- Reduced motion: no morphing and no drift; each chapter shows its shape as a still and tabs switch between them. Tap behaviours still change state instantly.
- Risk on phones is real: a fixed full-screen canvas under scrolling text is the pattern most likely to stutter on mid-range Android.

**Build cost and risk.** Highest. three.js, custom vertex shader for morphing, shape authoring, scroll scrubbing, fallbacks: 2–3 weeks to do well, and it only impresses if done well. Most likely to go wrong: (1) shapes that look like generic particle fog instead of the thing they stand for; (2) phone performance; (3) the plexus-particle look is itself a known portfolio cliché, so it needs the project-specific behaviours to justify it; (4) recruiters may never interact and just see dots.

---

## Recommendation

Build **A, Final Cut**, with two borrowings. It is the only concept where the frame is cinematic and quiet and the wow is the project's real behaviour made runnable, which is exactly the brief and the best evidence of design-engineering skill for someone whose other work is backend. It needs no WebGL to function, so the phone experience is the full experience, and its template degrades gracefully when a future project has no simulation yet. Borrow from C one WebGL moment, in the hero only: the name assembled from a point field in the four world colours, loaded after first paint with the static title as fallback. That gives the Lusion-style opening without betting the site on it. Borrow from B the operable interface cards (Mimir's diff, Cougar Connect's search) as the simulations for the two projects that are interfaces rather than systems. Dark base by default, with the light base kept as a token swap.

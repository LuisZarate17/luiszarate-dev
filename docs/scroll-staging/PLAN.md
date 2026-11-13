# Phase 6 plan: scroll staging

Status: **draft for Luis to review**. Written by the orchestrator. Fable's budget for the week
is spent, so this plan rests on the design spec (4.4, 4.6) and Fable's phase 5 notes, not a
new Fable pass.

## Goal

On a large desktop screen, a project scene that opts in holds in the frame for a short stretch
of scroll, and that scroll drives its simulation from start to end. Everywhere else (phones,
tablets, short windows, touch, reduced motion, an open drawer), scenes stay ordinary blocks,
exactly as today. Pinning is the "cinematic" part of _Final Cut_; it must never trap or confuse
anyone.

## What the spec already fixes (4.4)

- Pinning only when `(min-width: 1024px) and (min-height: 760px) and (pointer: fine) and
(prefers-reduced-motion: no-preference)`, the scene opts in (`pin: true`), its content fits
  in `--frame-h`, and its drawer is closed.
- Hold for 75% of `--frame-h` of extra scroll; scroll drives only the simulation's `progress`
  0 → 1. Nothing else in the scene moves.
- Opening the drawer releases the pin. Native scroll only, no snapping, no smooth-scroll.

## Three decisions this plan proposes

**1. CSS sticky, not GSAP (amends spec 4.4; new ADR-007).** The hero already pins with
`position: sticky` in a wrapper taller than the frame (ADR-006), which costs no bytes and runs
on the compositor. Doing the same for scenes keeps one pinning model for the whole site and
avoids about 27 KB gzip of GSAP and ScrollTrigger. Progress is
`(frame top − wrapper top) / (wrapper height − scene height)`, read once per animation frame
while the scene is in view, as the hero does. The drawer releases the pin by removing the
wrapper's `is-pinned` class (the extra height collapses), with no `refresh()` to call.
_Cost:_ "GSAP ScrollTrigger" leaves the resume keyword list. three.js stays.

**2. Fit before pin.** Fable measured every scene taller than one 1440 × 900 frame (the
simulation column alone is about 580 px), so the bottom bar covers stat captions today. The
spec's "content fits `--frame-h`" rule would refuse to pin any of them. So the first PR of the
phase is layout only, with no pinning:

- cap each stage at 2:1 on desktop
- tighten the controls, readout and caption stack
- let the stats sit beside the simulation, not under it, where width allows

A test asserts every scene fits 1440 × 900 and 1280 × 800.

**3. Which scenes pin.** All four simulations already accept `setProgress`. Proposed:

| Scene          | Pins? | What the scroll drives                                                                          |
| -------------- | ----- | ----------------------------------------------------------------------------------------------- |
| LabQ           | Yes   | Without → with: the 50 land, the pairs counter cuts to 1,225, then the constraint turns 49 back |
| Cougar Connect | Yes   | The divider sweeps 2024 → 2026, rows flipping as it passes; the most natural fit for scroll     |
| Bifrost        | No    | Apply and Undo are choices the visitor makes; scrubbing them would fake a decision              |
| Mastery Pilot  | No    | Its point is that the visitor gives the answers; scroll would answer for them                   |

Two of four pinned keeps the rhythm: hold, read, hold, read.

## Bridge from scroll to island

An Astro island can't receive a React ref from the page. Each simulation listens for a
`sim:progress` CustomEvent (`detail: { progress }`) on its `figure.sim`, and a `sim:release`
event when the pin ends, which returns it to its normal, interactive state. One small module,
`src/lib/scroll-stage.ts`, does the measuring and dispatching. The simulations need no other
changes.

## PRs

1. **Fit (layout only).** Each scene fits the frame at 1440 × 900 and 1280 × 800, with no
   visual regression on phone. One Sonnet implementer.
2. **Stage (pinning).**
   - the `scroll-stage` module and the wrapper in `Scene.astro`
   - the bridge in LabQ and Cougar Connect, with `pin: true` in their content files
   - ADR-007

   Tests check that pinning is off under each failing media condition and under reduced
   motion, that the drawer releases the pin, that keyboard scroll and focus work while pinned,
   and that the timecode and scene strip still count sections. One Sonnet implementer.

3. **Review.** One `/code-review high` on the two together, plus an orchestrator
   screenshot and recording pass at 1440 × 900, 1280 × 800 and 1024 × 768.

## Risks

- **Safari sticky inside overflow:** the page has no overflow ancestor on scenes today; the
  test asserts it stays that way.
- **Focus and Tab while pinned:** Tab must reach the controls and the links without the scene
  jumping. Tested.
- **The timecode and scene strip treat the hero's wrapper as section 0** (`main > .hero-pin`).
  Scene wrappers need the same selector care.

## Open questions for Luis

1. CSS sticky instead of GSAP: accept losing "GSAP" as a keyword?
2. Pin LabQ and Cougar Connect only, or all four?

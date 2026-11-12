# Hero spec: "Five plates"

Status: ready to build. Sources: ADR-002, `docs/design-system/SPEC.md` (sections 3.4, 3.5, 4, 7, 8),
`docs/art-direction/CONCEPTS.md` (concept C). The working reference is `hero-prototype.html`
next to this file: where prose and prototype disagree, the constants in the prototype's first
script block win, because they were tuned on screen. Section 9 lists every place this spec
departs from the design-system hand-off contract.

Numbers marked _measured_ come from the prototype in headless Chromium (1440 × 900 and
390 × 700) or from an esbuild bundle of three.js.

---

## 1. The idea

The name is not a cloud of particles. It is **five flat plates stacked in depth**, each a full
copy of LUIS ZARATE printed as a lattice of small square dots on an opaque card: off-white in
front, then one plate per project in its world color. From straight ahead the plates register
exactly and you see one off-white name; from any other angle the four colored plates slide out
from behind it in equal steps, like color separations pulled out of register.

- **First 3 seconds.** First paint is the real `h1`, solid. When the field is ready the solid
  name **cuts** to the dotted name in one frame (same position, same size, no fade). It holds
  for 240 ms, then the eye moves 5° to the right and 1° up over 1600 ms and the four colors
  slide out from behind the letters. That is the whole opening shot: a name, then the
  discovery that it has depth and that four projects are stacked behind it.
- **Pointer or tilt.** The eye follows the pointer, so the plates fan wider, close, or fan the
  other way. The front plate never moves: it stays glued to where the `h1` is.
- **Scroll.** The name comes apart **by letter and by plate, never into dust**. Each letter of
  each plate is a rigid card that travels toward the camera and passes it, outermost letters
  first, the off-white plate first and the colors after it. The back plate (the first
  project's color, amber for LabQ) does not fly: it flattens into a single line along the
  hero's bottom edge, which is the top edge of scene 1.

Why this is not a particle demo: no point ever moves on its own, there is no randomness, no
lines, no glow, and every frame is still legible type. The plexus look is avoided by
construction (there are no connecting lines anywhere).

---

## 2. Composition

### 2.1 What the points form

Five plates, index `k`:

| k   | Plate     | Color (dark theme)                  | Role                                             |
| --- | --------- | ----------------------------------- | ------------------------------------------------ |
| 0   | Neutral   | `--color-text` `#F2EFE9`            | The name as read at rest; registered to the `h1` |
| 1   | Project 4 | `--w-mastery-pilot-fill` `#6C5CE7`  | Nearest colored plate                            |
| 2   | Project 3 | `--w-cougar-connect-fill` `#C8102E` |                                                  |
| 3   | Project 2 | `--w-bifrost-fill` `#7FD6EE`        |                                                  |
| 4   | Project 1 | `--w-labq-fill` `#F59E1B`           | Back plate; becomes the line into scene 1        |

Plate order is **reverse project `order`**, read from the content collection (pass the ordered
ids as a prop from `Hero.astro`), so the first scene's color is always the back plate. With a
fifth project there are six plates; nothing else changes.

Each plate is the same set of lattice cells. Each cell is drawn twice: a **card** square in
`--color-bg` that fills the cell, and the **dot** on top of it. The card is what makes a plate
opaque, so a nearer plate hides the plates behind it and color shows only where a plate sticks
out past the one in front.

### 2.2 Relation to the real `h1`

- The lattice is sampled from the **laid-out `h1` itself** (section 7.2): same font file, same
  size, same letter positions. Plate 0 sits on the screen plane and is registered to the `h1`
  box to the pixel at every viewport size.
- First paint: `h1` visible, canvas `visibility: hidden`.
- The frame that draws the field for the first time (eye straight ahead, colors hidden) also
  adds `.hero--live`: `h1 { opacity: 0 }` in one step, canvas visible. The `h1` keeps its box
  and stays in the accessibility tree. Nothing is ever animated on the `h1`.
- `.hero--live` is removed (and the `h1` is back, in one step) whenever the canvas stops being
  the picture: fallback to the still, context loss, watchdog step 3.
- Mark up each line as `<span class="hero-line">Luis</span>` (block spans replace the `<br>`).
  The accessible name stays "Luis Zarate".

### 2.3 Camera

All coordinates are CSS pixels in the hero's box, y down. There is no camera object; the
projection is five lines in the vertex shader and the same five lines in TypeScript.

| Quantity            | Value                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| Field of view       | 30° vertical (a long lens: little distortion, slow perspective)                      |
| Eye distance `D`    | `H / 2 / tan(15°)`; 1470 px at H = 788, 1120 px at H = 600                           |
| Vanishing point `C` | Centre of the name's ink box (not the centre of the frame)                           |
| Eye offset `e`      | `(D·tan(yaw), −D·tan(pitch))`, added to `C`                                          |
| Plate depth         | `d_k = D·k·c / (1 − k·c)`, with `c = 2g / (D·tan(5°))`                               |
| Depth range         | at 1440 × 788: 97, 209, 337, 489 px behind the screen plane (_derived_)              |
| Plate scale         | each plate is scaled by `(D + d_k) / D` about `C`, so all five register from `e = 0` |

Projection of a point with home position `h` on plate `k`, eye offset `e`, slab advance `a`
(section 4.5), `w = D + d_k − a`:

```
world  = C + (h − C) · (D + d_k) / D
screen = (C + e) + (world − (C + e)) · D / w
size   = min(40, dot · (D + d_k) / w)          // CSS px; card: size · (g + 0.5) / dot
```

At `a = 0` this reduces to `screen = h + k·c·e`: every plate is a pure translation of the
name, in equal steps. This is an off-axis ("window") projection: the screen plane never moves,
which is what keeps plate 0 registered to the `h1` at every eye position.

`c` is chosen so that at the rest pose (yaw 5°) each plate steps exactly **two lattice
columns** (8 px desktop, 6 px phone). At rest the lattices of all plates therefore coincide.

### 2.4 Framing and safe zones

Layout is the current `HeroStatic` layout (content bottom-left, `align-items: flex-end`), plus
a controls row under the sub-line.

| Element         | 1440 × 788 frame                                  | 390 × 600 frame                          |
| --------------- | ------------------------------------------------- | ---------------------------------------- |
| Slug            | x 80, y 209 to 234                                | x 16, y 168 to 190                       |
| Name (`h1` box) | x 80 to 610, y 248 to 597; 208 px type            | x 16 to 322, y 204 to 406; 120 px type   |
| Sub-line        | x 80, y 612                                       | x 16, y 419 (two lines)                  |
| Pause           | x 80, y 662, 44 px tall (bottom-left of the hero) | x 16, y 490                              |
| Field at rest   | name box + 32 px right, 6 px up                   | name box + 24 px right, 5 px up          |
| Field, max fan  | name box ± 58 px horizontally, ± 14 px vertically | ± 44 px horizontally, ± 11 px vertically |
| Free            | everything right of x 700 and above y 200         | everything above y 160                   |

Positions are _measured_ in the prototype, whose controls block has one extra 38 px row (a
prototype-only readout); in production the block sits about 38 px lower. The fan sizes are
derived from section 2.3.

Rules:

1. Vertical eye travel is capped at ± 2.2° in total (section 4.3), so the fan never reaches
   the slug above the name or the sub-line below it (a 14 to 16 px gap plus about 12 px of
   empty line box above the capitals and below the baseline).
2. On a phone the fan may run off the right edge of the name toward the frame edge; the hero
   has `overflow: clip`, so nothing causes horizontal scroll.
3. **Hero text carries its own ground.** The slug, the sub-line and the Pause button get
   `background: var(--color-bg)` (slug and sub-line: `width: fit-content; padding: 2px 6px;
margin: -2px -6px`). At rest this is invisible. During the break-apart, cards pass behind
   the text and it stays readable, like a subtitle over footage.
4. The title card (spec 7, not built yet) goes in the free area on desktop: right-aligned to
   the container, bottom-aligned with the sub-line. On phones it sits between the sub-line
   and the controls. It also gets the `--color-bg` ground.
5. The canvas fills `.hero-field` (`inset: 0`), never under the bars.

---

## 3. Points

| Tier                      | Lattice pitch `g`   | Dot      | Cells (_measured_) | Points (5 plates) | Draws per frame            |
| ------------------------- | ------------------- | -------- | ------------------ | ----------------- | -------------------------- |
| Full, desktop (≥ 1024)    | 4 px                | 3 px     | 5,351 at 1440      | 26,755            | 2 draw calls (cards, dots) |
| Full, phone (< 1024)      | 3 px                | 2 px     | 3,151 at 390       | 15,755            | 2 draw calls               |
| Lite (2D canvas), desktop | 6 px                | 5 px     | about 2,400        | about 12,000      | about 24,000 `fillRect`    |
| Lite (2D canvas), phone   | 4 px                | 3 px     | about 1,800        | about 9,000       | about 18,000 `fillRect`    |
| Still                     | CSS, pitch 4 / 3 px | 3 / 2 px | none               | none              | none                       |

- **Shape:** square, axis-aligned, hard-edged. `gl.POINTS` with no fragment shaping. Never
  round, never soft.
- **Color distribution:** every plate is the whole name in one flat color. Equal shares on
  purpose: four projects, one name, none ranked above another. The neutral plate is the only
  thing seen head-on, so the hero text is never set in a world color (spec 8, rule 4 holds at
  the registered pose and the hero stays the one place all four meet).
- **Alpha:** 1 everywhere. No transparency, so no sorting.
- **Blending and depth:** `transparent: false`, `depthTest: true`, `depthWrite: true`, normal
  blending. Two passes over the same geometry: cards (color `--color-bg`, depth pushed back by
  1 unit, `autoClear` on), then dots (`autoClear` off, same depth buffer). No additive
  blending anywhere: additive is glow.
- **Color handling:** pass the token values to the shader as raw sRGB and write them straight
  to `gl_FragColor`. No tone mapping and no colorspace chunk, so `#F59E1B` on canvas equals
  `#F59E1B` in CSS (_measured_: canvas pixel `245, 158, 27`).
- **Renderer:** `antialias: false`, `alpha: true`, clear color transparent,
  `powerPreference: "high-performance"`.
- **Device pixel ratio:** `max(1, min(2, floor(devicePixelRatio)))` on every device. Whole
  numbers only: at 1.5 a 3 px pitch lands on 4.5 device pixels and the lattice beats visibly
  (seen in the prototype). This replaces the 1.5 phone cap; see section 9.
- **Point size clamp:** 40 CSS px for dots. Check `gl.ALIASED_POINT_SIZE_RANGE[1]`; if it is
  under `60 × dpr`, lower the clamp to fit.
- **Letter seams:** a cell belongs to one glyph only, and a cell whose left neighbour belongs
  to a different glyph is dropped, so adjacent letters never fuse.
- No bloom, glow, fog, lines, trails or depth-of-field.

---

## 4. Motion

Easing: `--ease-cut` only (read it from the token; fallback `cubic-bezier(0.77, 0, 0.18, 1)`).
Pointer smoothing is an exponential approach (no overshoot), which is damping, not a spring.

### 4.1 Intro

Clock starts at the first rendered frame and only advances while the field is running.

| Time (ms)   | What happens                                                                           |
| ----------- | -------------------------------------------------------------------------------------- |
| 0           | Cut: `h1` off, canvas on, eye straight ahead (`yaw 0°, pitch 0°`). One off-white name  |
| 0 to 240    | Hold                                                                                   |
| 240 to 1840 | `yaw 0° → 5°`, `pitch 0° → 1°`, eased with `--ease-cut`. Colors slide out to the right |
| 1840 on     | Idle drift, starting from the same pose with zero velocity                             |

The intro plays once per page load. It does not replay on return to the hero.

### 4.2 Idle drift

```
yaw(t)   = 1.5° + 3.5° · cos(2π · t / 26 s)      // 5° → −2° → 5°
pitch(t) = 0.25° + 0.75° · cos(2π · t / 34 s)    // 1° → −0.5° → 1°
```

`t` is time since the end of the intro. About every 26 s the plates pass through register (all
color tucks behind the name) and open again. That slow breath is the only self-motion.

### 4.3 Pointer parallax

- Listen for `pointermove` on `.hero` (all pointer types). `x, y` are normalised to −1..1
  across the hero box.
- Adds `yaw += 4° · x`, `pitch −= 1.2° · y` to the pose. Totals: yaw −6° to 9°, pitch within
  ± 2.2°.
- Smoothing: `value += (target − value) · (1 − exp(−dt / 180 ms))`.
- `pointerleave` and `pointercancel` set the target back to 0 (the fan eases home).
- Touch: a horizontal drag across the hero moves the fan; vertical drags scroll the page
  (`touch-action: pan-y`), and the browser's `pointercancel` releases the fan.
- Keyboard: parallax has no keyboard equivalent and needs none; the idle drift shows the same
  range without input. Pause is the keyboard-operable control.

### 4.4 Device tilt

- **Use it only where it needs no permission.** If
  `typeof DeviceOrientationEvent.requestPermission === "function"` (iOS), do not ask and do
  not listen. A permission dialog in the first second of a portfolio costs more than tilt is
  worth; iOS gets drift and drag.
- Elsewhere (Android), below 1024 px wide: `x = clamp((gamma − gamma0) / 15°)`,
  `y = clamp((beta − beta0) / 15°)`, fed into the same target as the pointer. The baseline is
  the first reading and re-centres slowly (`baseline += (reading − baseline) · 0.004` per
  event) so a resting hand becomes neutral.

### 4.5 Scroll break-apart

One scrubbed value, `p` in 0..1, linear in scroll. No easing on `p` itself.

**Where `p` comes from**

| Case                                                    | Layout                                                                                                                             | `p`                                        |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Pinning allowed (the media query in spec 4.4, verbatim) | `.hero-pin` wrapper `height: calc(var(--frame-h) * 2)`; `.hero` is `position: sticky; top: var(--bar-top); height: var(--frame-h)` | `scrollY / (wrapper height − hero height)` |
| Phones, tablets, short windows                          | No wrapper height, no sticky. The hero scrolls away normally                                                                       | `scrollY / (0.85 · hero height)`           |
| Reduced motion, still tier                              | No wrapper height, no sticky                                                                                                       | unused                                     |

On phones the name comes apart while the hero is leaving the frame: by the time 85% of it has
scrolled off, the cards are gone and the line sits on the hero's bottom edge, directly above
scene 1 as it arrives. Scroll is never captured or delayed.

**What moves** (per point; `rank` is the glyph's rank by distance of its centroid from `C`,
farthest = 0, so outer letters leave first and the letters nearest the vanishing point fill
the frame last)

| Plates   | Rule                                                                                                                                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 to 3   | `delay = 0.03 + 0.028 · rank + 0.07 · k`; `T = clamp((p − delay) / 0.48)`; advance toward the eye `a = D · (1 − exp(−3.7 · T)) · (D + d_k) / D`. Magnification is `exp(3.7 · T)`: constant perceived speed, 40× at `T = 1`, where the point is culled                                                         |
| 4 (back) | Does not advance. `t = smoothstep(0.35, 0.95, p)`; `screen = mix(screen, (frac · W, H − dot / 2), t)`; `frac` is the cell's left-to-right rank among all cells, 0..1. Result at `p = 1`: an unbroken line, `dot` px tall, across the full width of the hero's bottom edge (_measured_: 1440 of 1440 px amber) |

Last card gone at `p = 0.97`. At `p = 1` the hero shows the slug, the sub-line, Pause and the
line; the name has left through the camera. Pointer parallax stays active during the scrub.

Reference frames (prototype, 1440 × 900): `p = 0.25` outer letters lifting off, name still
readable; `p = 0.5` to `0.6` colored letter cards crossing the frame at 3× to 10×; `p = 0.75`
last frost cards leaving, amber three-quarters flattened; `p = 1` line only.

### 4.6 Pause

- Ghost button, first item in the controls row, bottom-left. Label "Pause"; when paused the
  label is "Play". A plain `<button>`; no `aria-pressed` (the label carries the state).
- Paused: the clock stops (no drift, intro frozen where it is), pointer and tilt are ignored,
  the title card stops. The field holds its current pose.
- Scroll still drives `p` while paused. Scroll is the visitor's own input, and freezing it
  would leave a pinned frame that does nothing.
- Hidden in the still tier (nothing moves).

### 4.7 Running, visibility, resize

- The frame loop runs only while: not paused **and** `document.visibilityState === "visible"`
  **and** the hero is at least 60% in view (spec 4.5).
- Below 60% in view the loop stops, but a frame is still drawn for every `scroll` event while
  any part of the hero intersects the viewport (needed for the unpinned break-apart). Coalesce
  to one `requestAnimationFrame` per event burst.
- `visibilitychange` to hidden: cancel the frame, drop the last timestamp. To visible: resume;
  the first `dt` is 0 so the clock does not jump. Clamp every `dt` to 64 ms.
- Re-sample the lattice (section 7.2) when the `h1`'s box changes: `ResizeObserver` on
  `.hero-inner`, plus `resize` debounced 150 ms. Ignore height-only window changes under
  120 px (mobile browser chrome). Re-sampling keeps the clock and `p`.
- `webglcontextlost`: `preventDefault()`, remove `.hero--live`, show the still. On
  `webglcontextrestored`, rebuild and cut back.
- `themechange`: re-read the tokens into the uniforms and redraw.

---

## 5. Fallback tiers

`pickTier(env)` is a pure function, evaluated once before anything heavy loads.

| Order | Check                                                                                                                             | Tier      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1     | `prefers-reduced-motion: reduce`                                                                                                  | **still** |
| 2     | `navigator.connection?.saveData === true`                                                                                         | **still** |
| 3     | `hardwareConcurrency ≤ 2`, or `deviceMemory ≤ 1` (when defined)                                                                   | **still** |
| 4     | No WebGL2: `document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true })` returns null or throws | **lite**  |
| 5     | `hardwareConcurrency ≤ 4` **and** `deviceMemory ≤ 4` (when defined; undefined does not count as weak)                             | **lite**  |
| 6     | Otherwise                                                                                                                         | **full**  |

The WebGL probe **must use a throwaway canvas**. A failed WebGL attempt on the real canvas
blocks `getContext("2d")` on it afterwards and three.js logs console errors (both seen in the
prototype). three.js is imported only after the tier is known to be `full`.

| Tier      | Shows                                                                                                                                                                                       | Loads                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **full**  | Everything in sections 2 to 4, WebGL                                                                                                                                                        | hero code + three.js   |
| **lite**  | The same picture and motion from the same `project()` function, drawn with `fillRect` back plate first (card pass, then dot pass, per plate), coarser lattice (section 3), capped at 30 fps | hero code only         |
| **still** | The real `h1`, solid, with the four colored plates fanned behind it at the rest pose, drawn in CSS (section 6). No canvas, no pin, no Pause                                                 | nothing beyond the CSS |

**Frame-time watchdog** (full and lite; starts after the intro; ignores frames after a
`visibilitychange` or resize): mean `dt` over a rolling 90-frame window.

| Step | Trigger                                                 | Action                                                                                          |
| ---- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1    | full: mean > 24 ms for two consecutive windows          | DPR to 1, rebuild                                                                               |
| 2    | full: still > 24 ms for two more windows                | Lattice to the lite pitch (6 / 4 px), rebuild                                                   |
| 3    | full: still > 32 ms; lite: mean > 45 ms for two windows | Cut to the still tier: remove `.hero--live`, add `.hero--still`, stop the loop, release the pin |

Steps only go down, once each, and the result is not stored between visits.

Reduced motion is always the still, including when the preference changes mid-session
(`onReducedMotionChange`: tear down to the still, or start the island).

---

## 6. Still frames

### 6.1 The still is CSS (proposed change, see section 9)

The still is four `<i>` elements inside the `h1`, behind its text, each printing the name
through `::before { content: attr(data-t) }` with a dot pattern clipped to the glyphs:

```css
.hero-plates i {
  position: absolute;
  inset: 0;
  white-space: pre;
  color: transparent;
  background:
    conic-gradient(from 270deg at var(--hero-dot) var(--hero-dot), var(--c) 90deg, transparent 0) 0
      0 / var(--hero-pitch) var(--hero-pitch),
    var(--color-bg);
  -webkit-background-clip: text;
  background-clip: text;
  transform: translate(calc(var(--k) * var(--hero-step)), calc(var(--k) * var(--hero-step) * -0.2));
}
```

- `--hero-pitch / --hero-dot / --hero-step`: `3px / 2px / 6px` below 64rem, `4px / 3px / 8px`
  from 64rem. `--k` is 1..4 and `--c` the world color, nearest plate last in DOM order.
  Add these three tokens to `tokens.css`.
- Markup: `<span class="hero-plates" aria-hidden="true">` with one
  `<i data-t="LUIS&#10;ZARATE">` per project, generated from the collection. The `h1` gets
  `position: relative; z-index: 0; width: max-content; max-width: 100%`; the plates sit at
  `z-index: -1` inside it. Pseudo-element text is not in the accessibility tree and not
  matched by find-in-page.
- Shown when: `@media (prefers-reduced-motion: reduce)`, inside `<noscript>`, and whenever the
  island adds `.hero--still`. Hidden otherwise (`display: none`), so motion-capable visitors
  see the plain `h1` until the cut.
- It is the same pose as the end of the intro (eye 5° right, 1° up), so the still is the
  intro's final frame with solid ink on the front plate.

Why CSS and not the AVIF/WebP pairs in spec 7: a raster of the settled field placed with
`object-fit: cover` cannot stay registered with a fluid `h1` (the name is 557 px at 1440 and
321 px at 390, positioned by flex layout), so the page would either show two misaligned names
or have to hide the real `h1` behind a picture of it. The CSS still is registered at every
size by construction, costs 0 bytes and 0 requests, follows the theme tokens with no second
set of files, and needs no build step. _Measured:_ it renders identically in layout to the
live rest pose at 1440 and 390.

### 6.2 Keeping the still honest: `scripts/hero-still.mjs`

A reproducible check, not an asset pipeline. `npm run hero:still`:

1. Builds, serves `dist/` with `astro preview`, opens Chromium through Playwright.
2. At 1440 × 900 (DPR 2) and 390 × 700 (DPR 3): loads `/?hero=rest`, a query the island
   honours only in preview and dev builds, which draws one frame at the rest pose with
   `p = 0` and stops; then loads the page again with `reducedMotion: "reduce"`.
3. Screenshots `.hero` in both states to `tests/e2e/__screenshots__/hero-rest-{desktop,phone}.png`
   and `hero-still-{desktop,phone}.png`.
4. Fails if the colored area of the two differs by more than 12% (count pixels within 24 of
   each world fill in RGB, compare counts and bounding boxes within 2 px).

If Luis rejects the change in 6.1, the same script produces the contract's files instead:
screenshot the `?hero=rest` canvas with the `h1` hidden at 2880 × 1576 and 1170 × 1560, encode
with `sharp` (already in `node_modules` through Astro) to
`public/hero/still-{desktop,phone}-dark.{avif,webp}`, AVIF quality 50, WebP quality 70, and
fail the script over 120 KB / 60 KB. Do not build both.

---

## 7. Architecture

### 7.1 Files

| File                                 | What it is                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `src/components/hero/Hero.astro`     | Replaces `HeroStatic.astro`. Markup (section 7.5), scoped CSS, the still, a `<script>` that boots the island |
| `src/components/hero/hero-island.ts` | Orchestration: tier, sampling, loop, input, pause, watchdog, teardown. No three.js import at top level       |
| `src/components/hero/render-gl.ts`   | The only file that imports `three`. Loaded with `await import("./render-gl")`                                |
| `src/components/hero/render-2d.ts`   | Lite renderer                                                                                                |
| `src/lib/hero/constants.ts`          | Every number in this spec, named                                                                             |
| `src/lib/hero/tier.ts`               | `pickTier(env)`, `pickDpr(devicePixelRatio)`                                                                 |
| `src/lib/hero/lattice.ts`            | `cellsFromAlpha`, `rankGlyphs`, `buildPoints`                                                                |
| `src/lib/hero/project.ts`            | `plateDepth`, `projectPoint`, `fanStep`                                                                      |
| `src/lib/hero/timeline.ts`           | `cubicBezier`, `poseAt(clockMs, pointer)`, `progressFromScroll`                                              |
| `src/lib/hero/watchdog.ts`           | `createWatchdog(thresholds)` returning `push(dt) → action`                                                   |
| `scripts/hero-still.mjs`             | Section 6.2                                                                                                  |
| `scripts/check-budget.mjs`           | Section 7.6                                                                                                  |

This is a plain TypeScript island, not React: there is no component state worth a framework
and React would add to the hero's JS for nothing. Boot it from an Astro `<script>`:
`requestIdleCallback(start, { timeout: 2000 })` after `load` (fallback `setTimeout(start, 200)`),
which is the `client:idle` behaviour the contract asks for.

Both renderers implement `{ setField(field, dpr), draw(field, eye, p), dispose() }`.

### 7.2 Text to points (in the island; the DOM part is not pure)

1. `await document.fonts.load('900 1em "Big Shoulders Display"', "LUISZARTE")`, then
   `document.fonts.ready`; time out after 3 s and stay on the `h1`.
2. Measure: hero rect, `h1` rect, computed font size. For each `.hero-line`: the baseline, from
   a zero-size `inline-block` probe appended to the line (its bottom edge is the baseline);
   for each character, its left edge from a `Range` rect. Draw each glyph separately with
   `fillText(char, left, baseline)`, so kerning and the −0.01em tracking come from the
   browser's own layout.
3. Origin `(ox, oy) = round(h1.left − hero.left), round(h1.top − hero.top)`. Offscreen canvas of
   `ceil(w / g) + 2` by `ceil(h / g) + 2` pixels, transform scaled by `1 / g`: each pixel's
   alpha is that cell's ink coverage.
4. `cellsFromAlpha(alpha, cols, rows, glyphIndex, owner)`: keep cells with alpha ≥ 128, one
   glyph per cell, drop a cell whose left neighbour has another owner.
5. Point position: `(ox + i·g + dot/2, oy + j·g + dot/2)`, which puts dots on whole pixels.
6. `buildPoints` writes one interleaved `Float32Array`, 5 floats per point per plate:
   `x, y, k, delay, frac`.

### 7.3 Unit tests (Vitest, no browser)

| Function                     | Assert                                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pickTier`                   | Each row of the table in section 5, including undefined `deviceMemory` and reduced motion winning                                                              |
| `pickDpr`                    | 1 → 1, 1.5 → 1, 2 → 2, 2.625 → 2, 3 → 2                                                                                                                        |
| `cubicBezier`                | 0 → 0, 1 → 1, monotonic, value at 0.5 within 0.001 of the CSS curve                                                                                            |
| `poseAt`                     | 0° at 0 and 240 ms; 5° / 1° at 1840 ms; continuous at 1840 ms; pointer adds 4° / 1.2° at the extremes                                                          |
| `plateDepth`, `projectPoint` | `e = 0` maps every plate onto its home position; at yaw 5° plate `k` is shifted exactly `2·g·k`; plate 0 never moves for any `e`; size equals `dot` at `p = 0` |
| `projectPoint`               | Culled at `T ≥ 1`; back plate at `p = 1` is at `(frac·W, H − dot/2)`                                                                                           |
| `cellsFromAlpha`             | Threshold; single ownership; seam column dropped between touching glyphs                                                                                       |
| `rankGlyphs`                 | Farthest centroid gets rank 0; ties stable                                                                                                                     |
| `progressFromScroll`         | Clamped 0..1 for pinned and unpinned distances; 0 when distance is 0                                                                                           |
| `createWatchdog`             | Fires each step once, in order, only after two consecutive slow windows                                                                                        |

### 7.4 End-to-end tests (Playwright, both projects)

Headless Chromium has no hardware GL: add `?hero=gl` (preview and dev only) to skip
`failIfMajorPerformanceCaveat`, and launch with `--use-gl=swiftshader --enable-unsafe-swiftshader`.

1. **Desktop:** after load, `.hero--live` appears within 5 s; a `canvas` is visible in
   `.hero-field`; `page.getByRole("heading", { level: 1, name: "Luis Zarate" })` still
   resolves; the `h1`'s computed opacity is `0`.
2. **Non-blank:** with the lite tier forced (`?hero=2d`), read the canvas back and assert more
   than 1,000 opaque pixels. (A WebGL canvas reads back empty without
   `preserveDrawingBuffer`; for the WebGL tier compare a screenshot of `.hero` against the
   page background instead.)
3. **No console errors or page errors** on load, after scrolling to the end of the hero, and
   with each forced tier.
4. **Reduced motion:** no `.hero--live`; canvas not visible; `h1` opacity `1`; `.hero-plates`
   displayed; Pause not in the accessibility tree; the hero wrapper is one frame tall.
5. **Pause by keyboard:** Tab to "Pause", press Enter, label becomes "Play"; two screenshots
   of `.hero` 600 ms apart are identical; Enter again and they differ within 3 s.
6. **Scroll, desktop:** scroll to the end of the pin; the bottom row of `.hero` is the first
   project's fill across at least 95% of its width; scene 1's top edge is at the hero's
   bottom edge.
7. **Phone:** `document.documentElement.scrollWidth === innerWidth`; the hero is not sticky;
   scrolling 85% of the hero's height leaves no card pixels in the visible part of the canvas.
8. **No JavaScript** (context with `javaScriptEnabled: false`): `h1` visible, plates
   displayed.
9. `frame.spec.ts` and `scene.spec.ts` keep passing: the pin wrapper changes scene offsets,
   so check the timecode and current-scene logic against the taller hero.

### 7.5 Markup

```html
<div class="hero-pin">
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-field" aria-hidden="true"><canvas></canvas></div>
    <div class="hero-inner">
      <Slug loc="INT. PORTFOLIO — FULL-STACK ENGINEER" />
      <h1 id="hero-title" class="font-display text-hero uppercase">
        <span class="hero-plates" aria-hidden="true"><i data-t="LUIS&#10;ZARATE"></i> × 4</span>
        <span class="hero-line">Luis</span> <span class="hero-line">Zarate</span>
      </h1>
      <p class="hero-sub text-lead">…</p>
      <div class="hero-controls"><button class="btn btn--ghost" type="button">Pause</button></div>
    </div>
  </section>
</div>
```

`.hero` adds `overflow: clip`. No ancestor of the sticky hero may set `overflow` to anything
but `visible` or `clip`.

### 7.6 JavaScript budget

| Chunk                        | Budget (gzip) | Basis                                                                                |
| ---------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| three.js (`render-gl` chunk) | **140 KB**    | _Measured_ with esbuild, minified: 132.4 KB for three 0.187.0 (116.8 KB for 0.160.0) |
| Hero code (island, 2D, lib)  | **8 KB**      | The whole prototype file, CSS and markup included, is 9.8 KB gzipped                 |
| GSAP in the hero             | **0**         | The pin is CSS sticky (section 9)                                                    |

How to stay there:

- Named imports only, from `"three"`, and only these: `WebGLRenderer`, `Scene`, `Camera`,
  `Points`, `BufferGeometry`, `InterleavedBuffer`, `InterleavedBufferAttribute`,
  `ShaderMaterial`, `Vector2`, `Color`. Nothing from `three/examples`, `three/addons` or
  `three/webgpu`. No `PointsMaterial`, no controls, no loaders, no post-processing.
- Pin the version in `package.json` (exact, no caret); re-measure on upgrade.
- `scripts/check-budget.mjs` runs after `build`: gzip every file in `dist/_astro/`, find the
  chunk containing `WebGLRenderer`, fail over 140 KB; fail if any chunk referenced by the
  page's initial HTML contains it. Add it to CI next to `lhci`.
- Lighthouse stays ≥ 0.9 because nothing here is on the critical path: the `h1` is the LCP
  element and is plain text, three.js is requested after `load` and idle, and the still costs
  no bytes. Keep the lattice sampling under 50 ms (it is 11 small `getImageData` reads).

---

## 8. Do / don't

1. **Do** keep every point on its letter. **Don't** scatter, jitter, explode or randomise;
   there is no `Math.random` in the hero.
2. **Do** draw flat, opaque, square dots. **Don't** add glow, bloom, fog, additive blending,
   soft or round sprites, trails or connecting lines.
3. **Do** keep plate 0 registered to the `h1` in every state. **Don't** move, scale or fade
   the `h1`; it is either there or not, in one step.
4. **Do** let color appear only through depth. **Don't** tint the front plate, pulse colors,
   or reorder plates for effect; order comes from project `order`.
5. **Do** make scroll the only thing that takes the name apart, mapped linearly. **Don't**
   capture, smooth or delay scroll, and don't pin outside the spec 4.4 media query.
6. **Do** end on the line. **Don't** leave stray cards on screen at `p = 1` or add a second
   effect after it.
7. **Do** read every color from tokens and world variables at run time. **Don't** write a hex
   value in the hero's code (the prototype does, because it is a single file).
8. **Do** treat the still as a designed frame. **Don't** show an empty hero, a spinner, a
   blurred placeholder or a low-resolution canvas while loading: the `h1` is the loading state.
9. **Do** keep the hero's text on its own ground. **Don't** let cards run behind bare text,
   and don't put the field under the bars.
10. **Do** stop when asked: Pause, hidden tab, reduced motion, a slow device. **Don't** ask
    for a device-motion permission.

---

## 9. Changes to the design-system spec

| #   | Spec today                                                                           | Change                                                                                                  | Why                                                                                                         |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | 7, Still frame: AVIF + WebP rasters, 2880 × 1576 and 1170 × 1560, one pair per theme | The still is CSS inside the `h1` (section 6.1). No image files                                          | A `cover` raster cannot stay registered with a fluid `h1`; CSS is exact at every size, 0 bytes, theme-aware |
| 2   | 7, Loading: "the still stays until the first rendered frame"                         | The solid `h1` stays until the first rendered frame; the still is for reduced motion, no-JS and failure | The first live frame is the registered name, so the cut is `h1` → field with nothing in between             |
| 3   | 7, Canvas: DPR capped at 1.5 on phones                                               | `max(1, min(2, floor(dpr)))` everywhere                                                                 | A 3 px lattice at 1.5 gives uneven dots; the phone canvas at 2× is 0.94 MP, a fifth of the desktop one      |
| 4   | 4.4: GSAP `ScrollTrigger` pins the hero                                              | The hero pins with CSS `position: sticky` in a 2× wrapper, same media query, same 100% hold             | Compositor-driven, no pin-spacer, and the hero ships no GSAP (about 27 KB gzip saved before first scroll)   |
| 5   | 4.5: animated pieces run only while ≥ 60% in view                                    | Self-motion needs ≥ 60%; scroll-driven frames draw while any part of the hero is in view                | The unpinned break-apart happens while the hero is leaving                                                  |
| 6   | 7, Colors: world fills plus `--color-text`                                           | Add `--color-bg`, used for the opaque card behind each dot                                              | Without cards, far plates show through the gaps of near ones and the name turns to noise (prototype v1)     |
| 7   | 7, Real text: slug and sub-line are bare text                                        | Slug, sub-line, Pause and title card get a `--color-bg` ground in the hero                              | Cards pass behind them during the break-apart                                                               |
| 8   | Appendix A                                                                           | Add `--hero-pitch`, `--hero-dot`, `--hero-step`                                                         | Rule 8.12: no one-off sizes in components                                                                   |

Unchanged and respected: container, layering, z-index, `.hero--live` semantics, no bloom, glow
or fog, `touch-action: pan-y`, three.js only inside the island after first paint, pointer and
tilt move the field only, one scrubbed property, visible Pause bottom-left, reduced motion is
always the still.

---

## 10. Open for Luis

1. **CSS still instead of raster stills** (change 1). Recommended. The fallback route is in 6.2.
2. **No tilt on iOS** (section 4.4). Recommended: never show a motion-permission prompt.
3. **three.js for one draw call.** The scene is two draws of one buffer; raw WebGL2 would be
   about 3 KB instead of about 132 KB. ADR-002 names three.js and it is a resume keyword, so
   this spec keeps it and keeps it off the critical path. Say so if the weight matters more.
4. **The name is dotted at rest**, so it is a little less bright than the solid `h1`. That is
   the look. If it should be heavier, raise the dot from `g − 1` toward `g`; do not add a
   solid layer.

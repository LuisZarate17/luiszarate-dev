# Final Cut design system: implementation spec

Status: ready to build. Source: ADR-002, ADR-003, `docs/art-direction/CONCEPTS.md` (concept A).
Every value here is final unless listed in section 10 (open questions). Where this spec differs
from the concept, section 9 says what changed and why.

Numbers marked _measured_ were computed from the shipped font files (`@fontsource` 5.3.0) and
from the WCAG 2.x relative-luminance formula, not estimated.

Reference viewports: **desktop 1440 × 900**, **phone 390 × 844**. These match the Playwright
projects closely enough (1440 × 900, Pixel 7 at 412 wide).

---

## 0. Decisions at a glance

| Topic            | Decision                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonts            | Big Shoulders Display 700/900, Hanken Grotesk 400/600, JetBrains Mono 400. Five latin woff2 files, 77 KB total                                    |
| Theme            | Dark by default for everyone. Light is a user toggle (`data-theme="light"` on `<html>`, saved in `localStorage`). OS preference is not followed   |
| Worlds           | Full world lives in each project's content file; the layout generates CSS keyed by `data-world="<project id>"`; contrast is checked at build time |
| Motion signature | One wipe: a text-colored block crosses the frame in 700 ms and the state swaps at 350 ms. Used for discrete jumps only                            |
| Scroll           | Native scroll everywhere. Scenes abut with a hard edge. Pinning is opt-in per scene and desktop-only                                              |
| Layout           | 12 columns, 1280 max, scene is 6 + 6 (claim and credits left, simulation and numbers right) at desktop; one column on phones                      |
| Bars             | Fixed, never move. Desktop 56 / 56 px. Phone 44 top / 56 bottom; the bottom bar is the scene nav                                                  |

---

## 1. Type

### 1.1 Packages and files

Install exactly these three packages and import exactly these five stylesheets (in
`src/styles/global.css`, before the token file). Nothing else is shipped.

| Role    | Package                             | Imports                          | woff2 size     |
| ------- | ----------------------------------- | -------------------------------- | -------------- |
| Display | `@fontsource/big-shoulders-display` | `latin-700.css`, `latin-900.css` | 14.4 + 14.0 KB |
| Body    | `@fontsource/hanken-grotesk`        | `latin-400.css`, `latin-600.css` | 13.5 + 13.8 KB |
| Mono    | `@fontsource/jetbrains-mono`        | `latin-400.css`                  | 21.2 KB        |

- Static files, not the variable packages: two weights per family is smaller than one variable
  file, and no weight is animated.
- Preload two files only, in `Base.astro`: Big Shoulders Display 900 and Hanken Grotesk 400
  (import the woff2 with `?url`, emit `<link rel="preload" as="font" type="font/woff2" crossorigin>`).
- `font-synthesis: none` on `html`. There is no italic and no weight outside the table; if a
  design needs emphasis, use Hanken 600.
- The latin subsets contain `×`, `·`, `—`, `–`, `−`, `…` and curly quotes. They do **not**
  contain `→` or `↗` (_measured_). Arrows are never typed as text in display or body copy;
  see the Stat block and Links components for the inline SVG replacements.

### 1.2 Families and fallback stacks

```
--font-display: "Big Shoulders Display", "Big Shoulders Fallback", "Arial Narrow", Impact, sans-serif;
--font-sans:    "Hanken Grotesk", "Hanken Fallback", system-ui, -apple-system, "Segoe UI", sans-serif;
--font-mono:    "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
```

The two `Fallback` families are metric-matched `@font-face` rules over local Arial (appendix
A.2) so the swap does not shift layout. Where Arial is absent (Android) the stack falls
through to the next family.

### 1.3 Scale

Fluid between 390 and 1440 px viewport width; clamped outside that range.

| Token          | 390 px | 1440 px | `font-size` value                                       | Family, weight | Line height | Tracking | Case       |
| -------------- | ------ | ------- | ------------------------------------------------------- | -------------- | ----------- | -------- | ---------- |
| `text-hero`    | 120    | 208     | `clamp(5rem, min(30.77vw, 5.4571rem + 8.381vw), 13rem)` | Display 900    | 0.8         | -0.01em  | Uppercase  |
| `text-title`   | 52     | 88      | `clamp(3.25rem, 2.4143rem + 3.4286vw, 5.5rem)`          | Display 900    | 0.86        | 0        | Uppercase  |
| `text-stat`    | 44     | 72      | `clamp(2.75rem, 2.1rem + 2.6667vw, 4.5rem)`             | Display 700    | 0.9         | 0        | Uppercase  |
| `text-heading` | 28     | 40      | `clamp(1.75rem, 1.4714rem + 1.1429vw, 2.5rem)`          | Display 700    | 1           | 0.01em   | Uppercase  |
| `text-strip`   | 18     | 18      | `1.125rem`                                              | Display 700    | 1           | 0.04em   | Uppercase  |
| `text-lead`    | 18     | 22      | `clamp(1.125rem, 1.0321rem + 0.381vw, 1.375rem)`        | Sans 400       | 1.45        | 0        | Sentence   |
| `text-body`    | 16     | 17      | `clamp(1rem, 0.9768rem + 0.0952vw, 1.0625rem)`          | Sans 400       | 1.6         | 0        | Sentence   |
| `text-small`   | 14     | 14      | `0.875rem`                                              | Sans 400       | 1.5         | 0        | Sentence   |
| `text-control` | 16     | 16      | `1rem`                                                  | Sans 600       | 1           | 0        | Sentence   |
| `text-slug`    | 12     | 14      | `clamp(0.75rem, 0.7036rem + 0.1905vw, 0.875rem)`        | Mono 400       | 1.5         | 0.1em    | Uppercase  |
| `text-meta`    | 12     | 12      | `0.75rem`                                               | Mono 400       | 1.4         | 0.12em   | Uppercase  |
| `text-code`    | 13     | 14      | `clamp(0.8125rem, 0.7893rem + 0.0952vw, 0.875rem)`      | Mono 400       | 1.6         | 0        | As written |

Intermediate sizes for checking: `text-title` is 65 px at 768 and 74 px at 1024; `text-hero`
is 152 px at 768 and 173 px at 1024. Below 390 the hero follows `30.77vw` (98 px at 320) so
"ZARATE" never overflows.

Short desktop viewports: under `(min-width: 1024px) and (max-height: 859px)` override
`--text-title: 4.5rem` (72 px), `--text-stat: 3.5rem` (56 px), `--spacing-scene: 2rem`.

### 1.4 Where each role is used

| Token          | Used for                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------ |
| `text-hero`    | The name in the hero (`h1`). Nowhere else                                                  |
| `text-title`   | Scene titles, and the `h2` of "How it was built" and "Contact"                             |
| `text-stat`    | Stat values; the hero title-card number                                                    |
| `text-heading` | Project-name kicker above a scene title; `h3` in "How it was built"                        |
| `text-strip`   | Scene names in the bottom bar (15 px on phones, see Scene strip)                           |
| `text-lead`    | Scene logline; the hero sub-line                                                           |
| `text-body`    | All running text, drawer content                                                           |
| `text-small`   | Stat labels, captions, the credit statement                                                |
| `text-control` | Button and summary labels                                                                  |
| `text-slug`    | Slug lines                                                                                 |
| `text-meta`    | Bar text, timecode, scene numbers, stack list, badges, form/axis labels inside simulations |
| `text-code`    | Code, diffs, terminal lines                                                                |

### 1.5 Rules

- **Measure.** Body and lead text: `max-width: 62ch`. Small text: `max-width: 72ch`. Titles:
  `text-wrap: balance`. Body: `text-wrap: pretty`.
- **Title copy.** At most 4 words, 2 lines, **14 characters per line** including spaces and
  punctuation. _Measured_: 14 average capitals are 583 px at 88 px (column is 628) and 345 px
  at 52 px (phone column is 358). Break lines with an explicit `<br>`.
- **Stat copy.** A stat value is at most 6 glyphs (`26.9×`, `50 → 1`, `508`). Longer values
  are rewritten or moved into the label.
- **Numerals.** Big Shoulders Display has proportional figures and no `tnum` feature
  (_measured_: `1` is 0.27em, `0` is 0.51em). Anything that ticks, counts or aligns in a column
  (timecode, simulation counters, tables) is set in Mono or Sans (Hanken's figures are all
  0.56em) with `font-variant-numeric: tabular-nums`. Display type is for static values only.
- **Case.** Display and Mono labels are uppercase via CSS (`text-transform`), never typed in
  capitals in the content files. Sans is always sentence case. No italics anywhere.
- **Minimum size.** Nothing below 12 px.

---

## 2. Color

### 2.1 Base tokens

| Token                                 | Dark                  | Light                 | Use                                                                           |
| ------------------------------------- | --------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `--color-bg`                          | `#0B0B0D`             | `#F4F4F2`             | Page and non-project sections. A scene overrides it with its tint             |
| `--color-surface`                     | `#151518`             | `#FFFFFF`             | Raised panels: simulation stage, cards, drawer. Overridden in a scene         |
| `--color-text`                        | `#F2EFE9`             | `#111113`             | All primary text, ghost borders, the wipe block                               |
| `--color-muted`                       | `#A19D96`             | `#5C5C61`             | Secondary text and labels                                                     |
| `--color-line`                        | `#2B2B30`             | `#D6D6D2`             | Decorative hairlines and dividers only. Overridden in a scene                 |
| `--color-line-strong`                 | `#7A766F`             | `#7C7C77`             | Borders that carry meaning (inputs, disabled controls). Overridden in a scene |
| `--color-focus`                       | `#F2EFE9`             | `#111113`             | Focus ring                                                                    |
| `--color-bar`                         | `#000000`             | `#111113`             | Letterbox bars (dark in both themes)                                          |
| `--color-bar-text`                    | `#A19D96`             | `#C9C6BF`             | Resting text in the bars                                                      |
| `--color-bar-strong`                  | `#F2EFE9`             | `#F2EFE9`             | Hover and focus text in the bars; focus ring in the bars                      |
| `--color-accent`                      | = text                | = text                | Neutral default. A scene sets it to its world text color                      |
| `--color-fill`                        | = text                | = text                | Neutral default. A scene sets it to its world fill                            |
| `--color-on-fill`                     | = bg                  | = bg                  | Text on `--color-fill`                                                        |
| `--color-secondary`                   | = accent              | = accent              | Optional second world color (Bifrost only today)                              |
| `--color-add-bg` / `--color-add-text` | `#12331F` / `#8FE0AE` | `#E2F6EA` / `#14663A` | Added diff lines. Always paired with a leading `+`                            |
| `--color-del-bg` / `--color-del-text` | `#3A1A22` / `#FF9AA8` | `#FDE8EA` / `#9B1C2C` | Removed diff lines. Always paired with a leading `-`                          |

Base contrast (_measured_):

| Pair                                 | Dark  | Light |
| ------------------------------------ | ----- | ----- |
| text on bg                           | 17.14 | 17.13 |
| text on surface                      | 15.88 | 18.86 |
| muted on bg                          | 7.28  | 6.04  |
| muted on surface                     | 6.75  | 6.65  |
| line-strong on bg (non-text, need 3) | 4.35  | 3.81  |
| line-strong on surface (non-text)    | 4.03  | 4.19  |
| bar-text on bar                      | 7.78  | 11.06 |
| bar-strong on bar                    | 18.30 | 16.43 |
| add-text on add-bg                   | 8.85  | 6.22  |
| del-text on del-bg                   | 7.73  | 6.90  |
| on-fill on fill (neutral default)    | 17.14 | 17.13 |

`--color-line` is 1.2 to 1.5:1 by design; it never carries meaning on its own.

### 2.2 Theme mechanism

- `<html data-theme="dark">` is in the markup. An inline script in `<head>` (before CSS paints)
  reads `localStorage.getItem("theme")`; if it is `"light"` it sets `data-theme="light"`. It
  does **not** read `prefers-color-scheme`.
- **Why a toggle and not the OS preference:** the art direction is a film in a dark room, and
  the site's first impression is the product. Following the OS would hand the secondary look
  to every visitor whose system is light. A toggle still serves people who read better on
  light, and it proves the token system works.
- The toggle is a button in the top bar (section 5.1). It is rendered with `hidden` and
  un-hidden by script, so without JavaScript the site is dark and shows no dead control.
- Toggling runs the scene-cut wipe and swaps `data-theme` at the midpoint (instant under
  reduced motion), then dispatches `document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }))`
  so canvases can re-read tokens.
- `color-scheme` is set per theme. `<meta name="theme-color">` is the bar color: `#000000`
  dark, `#111113` light, updated on toggle.
- `@media (prefers-contrast: more)`: `--color-muted` becomes `--color-text`; `--color-line`
  becomes `--color-line-strong`.

### 2.3 Color worlds

A world is 6 required hex values plus an optional secondary pair. Source values:

| World id         | Fill      | On-fill   | Text on dark | Text on light | Tint dark | Tint light | Secondary dark / light |
| ---------------- | --------- | --------- | ------------ | ------------- | --------- | ---------- | ---------------------- |
| `labsq`          | `#F59E1B` | `#1A1206` | `#FFB648`    | `#8F5400`     | `#1A1206` | `#FFF3DC`  | none                   |
| `bifrost`        | `#7FD6EE` | `#071419` | `#A5E6F7`    | `#0B6B86`     | `#071419` | `#E4F5FA`  | `#B9A9FF` / `#5A45B8`  |
| `cougar-connect` | `#C8102E` | `#FFFFFF` | `#FF6B81`    | `#A60F2D`     | `#1A070B` | `#FBE8EB`  | none                   |
| `mastery-pilot`  | `#6C5CE7` | `#FFFFFF` | `#A99CFF`    | `#4B3BC4`     | `#0E0B1F` | `#EDEAFF`  | none                   |

The world id is the content entry id (the file name without `.md`).

Inside `[data-world]` the base tokens are re-pointed, so components never branch on world:

| Token inside a scene  | Dark theme                                  | Light theme                             |
| --------------------- | ------------------------------------------- | --------------------------------------- |
| `--color-bg`          | tint dark                                   | tint light                              |
| `--color-surface`     | `color-mix(in srgb, tint 94%, #F2EFE9)`     | `color-mix(in srgb, tint 45%, #FFFFFF)` |
| `--color-line`        | `color-mix(in srgb, tint 84%, #F2EFE9)`     | `color-mix(in srgb, tint 84%, #111113)` |
| `--color-line-strong` | `color-mix(in srgb, tint 50%, #F2EFE9)`     | `color-mix(in srgb, tint 50%, #111113)` |
| `--color-accent`      | text on dark                                | text on light                           |
| `--color-secondary`   | secondary dark, else accent                 | secondary light, else accent            |
| `--color-fill`        | fill                                        | fill                                    |
| `--color-on-fill`     | on-fill                                     | on-fill                                 |
| `--color-accent-bar`  | text on dark (bars are dark in both themes) | text on dark                            |

`--color-text`, `--color-muted` and `--color-focus` are not changed by a world.

Resolved values, for reference and for tests:

| World            | Surface dark | Surface light | Line dark | Line light | Line-strong dark | Line-strong light |
| ---------------- | ------------ | ------------- | --------- | ---------- | ---------------- | ----------------- |
| `labsq`          | `#271F14`    | `#FFFAEF`     | `#3D352A` | `#D9CFBC`  | `#868078`        | `#888278`         |
| `bifrost`        | `#152125`    | `#F3FAFD`     | `#2D373A` | `#C2D1D5`  | `#7C8281`        | `#7A8386`         |
| `cougar-connect` | `#271518`    | `#FDF5F6`     | `#3D2C2F` | `#D6C6C8`  | `#867B7A`        | `#867C7F`         |
| `mastery-pilot`  | `#1C192B`    | `#F7F6FF`     | `#322F3F` | `#CAC7D9`  | `#807D84`        | `#7F7E89`         |

### 2.4 World contrast (_measured_; every text pair the system allows)

Dark theme:

| Pair                                     | labsq       | bifrost     | cougar-connect | mastery-pilot | Need |
| ---------------------------------------- | ----------- | ----------- | -------------- | ------------- | ---- |
| text on tint                             | 16.15       | 16.29       | 16.96          | 16.84         | 4.5  |
| text on scene surface                    | 14.16       | 14.34       | 15.16          | 14.96         | 4.5  |
| muted on tint                            | 6.87        | 6.93        | 7.21           | 7.16          | 4.5  |
| muted on scene surface                   | 6.02        | 6.10        | 6.45           | 6.36          | 4.5  |
| accent on tint                           | 10.62       | 13.59       | 7.11           | 8.18          | 4.5  |
| accent on scene surface                  | 9.31        | 11.96       | 6.36           | 7.26          | 4.5  |
| accent on base bg `#0B0B0D`              | 11.27       | 14.29       | 7.18           | 8.32          | 4.5  |
| accent-bar on bar `#000000`              | 12.04       | 15.26       | 7.67           | 8.89          | 4.5  |
| on-fill on fill                          | 8.64        | 11.36       | 5.88           | 4.86          | 4.5  |
| tint on accent (pressed control)         | 10.62       | 13.59       | 7.11           | 8.18          | 4.5  |
| secondary on tint / scene surface        | n/a         | 9.07 / 7.98 | n/a            | n/a           | 4.5  |
| line-strong on tint / surface (non-text) | 4.74 / 4.16 | 4.78 / 4.21 | 4.75 / 4.25    | 4.77 / 4.24   | 3    |
| fill on tint (non-text)                  | 8.64        | 11.36       | 3.31           | 3.98          | 3    |

Light theme:

| Pair                                     | labsq       | bifrost     | cougar-connect | mastery-pilot | Need |
| ---------------------------------------- | ----------- | ----------- | -------------- | ------------- | ---- |
| text on tint                             | 17.16       | 16.83       | 16.03          | 16.00         | 4.5  |
| text on scene surface                    | 18.12       | 17.88       | 17.57          | 17.59         | 4.5  |
| muted on tint                            | 6.05        | 5.93        | 5.65           | 5.64          | 4.5  |
| muted on scene surface                   | 6.39        | 6.30        | 6.20           | 6.20          | 4.5  |
| accent on tint                           | 5.56        | 5.41        | 6.54           | 6.54          | 4.5  |
| accent on scene surface                  | 5.87        | 5.75        | 7.17           | 7.19          | 4.5  |
| accent on base bg `#F4F4F2`              | 5.55        | 5.51        | 6.99           | 7.01          | 4.5  |
| accent-bar on bar `#111113`              | 10.81       | 13.71       | 6.89           | 7.98          | 4.5  |
| on-fill on fill                          | 8.64        | 11.36       | 5.88           | 4.86          | 4.5  |
| tint on accent (pressed control)         | 5.56        | 5.41        | 6.54           | 6.54          | 4.5  |
| secondary on tint / scene surface        | n/a         | 6.29 / 6.68 | n/a            | n/a           | 4.5  |
| line-strong on tint / surface (non-text) | 3.47 / 3.66 | 3.46 / 3.67 | 3.43 / 3.76    | 3.39 / 3.73   | 3    |
| fill on tint (non-text)                  | **1.95**    | **1.47**    | 5.00           | 4.12          | 3    |

Consequences of the two failing cells and of crimson fill on its dark surface (2.96):

1. **Fill is never text and never the only edge.** Any element painted with `--color-fill`
   also has `border: 1px solid var(--color-accent)`.
2. **Meaningful marks use accent, not fill.** Dots, lines, bars and icons in simulations are
   drawn in `--color-accent` (or `--color-text`). Fill is for areas that carry on-fill text
   (primary button, the one occupied "slot") and nothing else.
3. Accent is used for: the slug line, the project kicker, pressed and current controls,
   simulation marks, link underlines. It is not used for body text, stats or titles.

### 2.5 How a scene sets its world, and where worlds live

- Markup: `<section class="scene" data-world={entry.id}>`. `data-world` is also put on each
  scene-strip item so it can show its own accent. Nothing else names a color.
- Sections without a world (hero, How it was built, Contact) simply omit the attribute and get
  the neutral defaults.
- **Schema change (recommended, needs an ADR-004 addendum):** replace `color` with a `world`
  object in `src/content.config.ts`. Reasons: ADR-004 promises that a project is one file;
  AGENTS.md says project colors come from the content files; and the schema can then reject a
  world that fails contrast.

  ```ts
  const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
  world: z.object({
    fill: hex,
    onFill: hex,
    textDark: hex,
    textLight: hex,
    tintDark: hex,
    tintLight: hex,
    secondaryDark: hex.optional(),
    secondaryLight: hex.optional(),
  });
  ```

  Add a `superRefine` that computes WCAG contrast and fails the build unless: `onFill`/`fill`,
  `textDark`/`tintDark`, `textDark`/`#000000`, `textLight`/`tintLight` are each ≥ 4.5; the
  same for the secondary pair when present; and both or neither secondary values are given.

- **Generation:** one Astro component, `src/components/WorldStyles.astro`, rendered in the
  `<head>` of `Base.astro`. It reads the collection and emits a single `<style>` with the
  per-world block of appendix A.4 (raw `--w-<id>-*` values on `:root`, then
  `[data-world="<id>"]` mapping them to `--wd-*`). The static mechanism (A.3) lives in
  `src/styles/tokens.css`. The four blocks in A.4 are the expected output, to be asserted in a
  test; they are not hand-maintained CSS.
- **A fifth project:** add its content file with a `world`. Pick a free hue (green near
  `#3FB68B` and magenta are open), keep tint-dark lightness near the others (relative
  luminance under 0.012), and let the build check contrast. No CSS, component or config edit.
- Simulations that draw on canvas read colors with
  `getComputedStyle(sceneEl).getPropertyValue("--color-accent")` and re-read on `themechange`.

---

## 3. Space and layout

### 3.1 Spacing

Base unit 4 px (`--spacing: 0.25rem`). Only these steps are used:

| Step | 1   | 2   | 3   | 4   | 6   | 8   | 10  | 12  | 16  | 24  | 32  |
| ---- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| px   | 4   | 8   | 12  | 16  | 24  | 32  | 40  | 48  | 64  | 96  | 128 |

Named fluid spacings:

| Token               | 390 px | 1440 px | Value                                       | Use                           |
| ------------------- | ------ | ------- | ------------------------------------------- | ----------------------------- |
| `--spacing-margin`  | 16     | 80      | `clamp(1rem, -0.4857rem + 6.0952vw, 5rem)`  | Page side margin              |
| `--spacing-gutter`  | 16     | 24      | `clamp(1rem, 0.8143rem + 0.7619vw, 1.5rem)` | Column gap                    |
| `--spacing-scene`   | 32     | 48      | `clamp(2rem, 1.6286rem + 1.5238vw, 3rem)`   | Scene top and bottom padding  |
| `--spacing-section` | 64     | 128     | `clamp(4rem, 2.5143rem + 6.0952vw, 8rem)`   | Padding of non-scene sections |

### 3.2 Breakpoints

| Name | Min width | What changes                                                          |
| ---- | --------- | --------------------------------------------------------------------- |
| base | 0         | Phone layout: 4 columns, one-column scenes, phone bars                |
| `sm` | 640       | 8 columns; stats go three-across; buttons sit in a row                |
| `lg` | 1024      | 12 columns; two-column scenes; desktop bars; pinning becomes possible |
| `xl` | 1280      | No layout change; reserved                                            |

Tablets (640 to 1023) get the one-column scene with wider measure. That is deliberate.

### 3.3 Grid

| Viewport | Columns | Gutter | Side margin | Content width                          | Column width |
| -------- | ------- | ------ | ----------- | -------------------------------------- | ------------ |
| 1440     | 12      | 24     | 80          | 1280 (max, `--container-frame: 80rem`) | 84.67        |
| 1024     | 12      | 20.8   | 54.6        | 914.8                                  | 57.2         |
| 768      | 8       | 18.9   | 39          | 690                                    | 69.7         |
| 390      | 4       | 16     | 16          | 358                                    | 77.5         |

- The container is `width: min(100% - 2 * margin, 80rem); margin-inline: auto`. Above 1440 the
  content stays 1280 wide and centered; scene backgrounds are full-bleed.
- Side padding is always `max(var(--spacing-margin), env(safe-area-inset-left))` and the same
  on the right.

### 3.4 The frame

- The frame is the viewport minus the two fixed bars. It is **not** forced to 2.39:1; at
  1440 × 900 it is 1440 × 788 (1.83:1) and on a phone it is taller than wide. The site
  therefore never prints an aspect ratio (the placeholder's "2.39 : 1" label goes).
- Tokens:

  | Token          | Phone (< 1024)                                                 | Desktop (≥ 1024) |
  | -------------- | -------------------------------------------------------------- | ---------------- |
  | `--bar-top`    | `calc(2.75rem + env(safe-area-inset-top, 0px))` (44 + inset)   | `3.5rem` (56)    |
  | `--bar-bottom` | `calc(3.5rem + env(safe-area-inset-bottom, 0px))` (56 + inset) | `3.5rem` (56)    |
  | `--frame-h`    | `calc(100svh - var(--bar-top) - var(--bar-bottom))`            | same             |

- `body` has `padding-top: var(--bar-top); padding-bottom: var(--bar-bottom)`.
  `html` has `scroll-padding-top: var(--bar-top)` and `scroll-behavior: auto`.
- Use `svh`, never `vh` or `dvh`, so the frame does not resize when a mobile browser's chrome
  collapses.
- Radius: `--radius-sm: 2px` (badges), `--radius-md: 4px` (controls, panels). The frame, bars
  and scenes are square. No other radii, no shadows.

### 3.5 z-index scale

| Token        | Value | Layer                                                        |
| ------------ | ----- | ------------------------------------------------------------ |
| `--z-below`  | -1    | Hero canvas or still, inside the hero's own stacking context |
| `--z-base`   | 0     | Scene content                                                |
| `--z-raised` | 10    | Sticky or overlapping pieces inside a scene                  |
| `--z-wipe`   | 40    | The cut wipe (covers the frame, sits under the bars)         |
| `--z-bars`   | 50    | Letterbox bars                                               |
| `--z-skip`   | 60    | Skip link when focused                                       |

Each scene and the hero set `isolation: isolate`, so nothing inside can climb over the bars.

---

## 4. Motion

### 4.1 Tokens

| Token          | Value                            | Use                                                                  |
| -------------- | -------------------------------- | -------------------------------------------------------------------- |
| `--ease-cut`   | `cubic-bezier(0.77, 0, 0.18, 1)` | Everything staged: the wipe, drawer reveal, simulations' eased steps |
| `--ease-ui`    | `linear`                         | Color changes on hover and press                                     |
| `--dur-ui`     | `120ms`                          | Color, background and border changes on controls                     |
| `--dur-reveal` | `500ms`                          | Drawer reveal; staged steps inside simulations                       |
| `--dur-cut`    | `700ms`                          | The wipe, end to end                                                 |
| `--dur-card`   | `3000ms`                         | Hold time of each hero title-card number                             |

There are no other durations or easings. No springs, no bounces, no `ease-in-out` defaults.

### 4.2 The scene cut (wipe)

- Element: one `<div class="wipe" aria-hidden="true">` per page, `position: fixed`,
  `inset: var(--bar-top) 0 var(--bar-bottom) 0`, `background: var(--color-text)`,
  `z-index: var(--z-wipe)`, `pointer-events: none`, resting at `translateX(-101%)`.
- Keyframes (each segment eased with `--ease-cut`):

  | Time          | Offset     | `transform`            |
  | ------------- | ---------- | ---------------------- |
  | 0 ms          | 0%         | `translateX(-101%)`    |
  | 315 ms        | 45%        | `translateX(0)`        |
  | 315 to 385 ms | 45% to 55% | `translateX(0)` (hold) |
  | 700 ms        | 100%       | `translateX(101%)`     |

- The state swap happens at **350 ms** (50%), while the frame is fully covered. Drive it from
  the Web Animations API (`el.animate(keyframes, { duration: 700 })`) and schedule the swap
  from the same clock, not from a separate CSS class and timer.
- Always left to right. Always the full frame. Never more than one at a time: a request that
  arrives during a cut replaces the pending target and does not restart the wipe.
- **When it runs:** scene-strip navigation, the home link, any in-page anchor jump between
  sections, and the theme toggle. The swap is: instant scroll to the target
  (`scrollTo({ behavior: "instant" })`), then focus moves to the target heading.
- **When it does not run:** native scrolling. Adjacent scenes abut with no gap, gradient or
  blend, so scrolling past a boundary is a hard horizontal edge between two worlds. At the
  moment that edge crosses the middle of the frame, the current-scene state (strip, timecode
  label) swaps instantly.

### 4.3 What moves, what never moves

| Moves                                                           | Never moves                                               |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| The wipe                                                        | Letterbox bars and everything in them (position and size) |
| Simulations, inside their stage                                 | Body text, titles, slugs, stats                           |
| The hero point field                                            | Navigation items (state changes are instant swaps)        |
| The hero title card (hard swap every 3 s, no tween)             | Page background (no parallax, no drifting layers)         |
| Timecode digits (text change only)                              | Controls on hover or press (color only, no transform)     |
| Drawer content, uncovered by a clip (the text itself stays put) | Anything on scroll-into-view (no fade-up, no stagger)     |
| One scrubbed property in a pinned scene                         | Cursor, scrollbar, scroll speed (all native)              |

Hover and press change `color`, `background-color` and `border-color` over `--dur-ui`. No
`transform`, `opacity`, `filter` or `box-shadow` transitions on controls.

### 4.4 Scroll staging

- Native scroll only. No smooth-scroll library, no scroll snapping, no programmatic scrolling
  except the instant jump inside a cut.
- GSAP is `gsap` core plus `ScrollTrigger`, imported only by the islands that pin or scrub,
  set up inside `gsap.matchMedia()`.
- **Pinning is allowed only when all of these are true:**
  `(min-width: 1024px) and (min-height: 760px) and (pointer: fine) and (prefers-reduced-motion: no-preference)`,
  **and** the scene opts in (`pin: true`, which it may do only if its simulation accepts a
  scrubbed `progress`), **and** the scene's content height is ≤ `--frame-h` when measured, and
  its drawer is closed. If any condition fails the scene is an ordinary block.
- A pinned scene holds for **75% of `--frame-h`** of extra scroll (`end: "+=75%"`,
  `scrub: true`, `pin: true`, `anticipatePin: 1`). During the hold, scroll drives exactly one
  thing: the simulation's `progress` from 0 to 1. Nothing else in the scene changes.
- The hero may pin for 100% of `--frame-h` under the same media query; its one scrubbed thing
  is the field's break-apart.
- Opening a drawer in a pinned scene kills that scene's pin and calls
  `ScrollTrigger.refresh()`.
- Phones and tablets never pin. Simulations there play on a button tap.

### 4.5 Running and pausing

- Animated pieces run only while at least 60% in view (IntersectionObserver) and pause on
  `visibilitychange`. Each simulation plays once on entry on desktop, then waits for input; on
  phones it waits for a tap.
- Anything that moves by itself for more than 5 seconds (hero field, hero title card) has a
  visible Pause control.

### 4.6 Reduced motion (`prefers-reduced-motion: reduce`)

| Motion                    | Fallback                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Scene-cut wipe            | No wipe. Instant jump and instant state swap. Focus still moves to the target                                               |
| Theme toggle              | Instant swap                                                                                                                |
| Pinning and scrubbing     | Off. Scenes are ordinary blocks                                                                                             |
| Simulations               | The static final frame is shown; state buttons switch between end states instantly; step-through simulations show all steps |
| Hero point field          | The still frame (section 7)                                                                                                 |
| Hero title card           | No cycling: the four numbers are shown as a static list                                                                     |
| Timecode                  | Updates only when the current scene changes (shows that scene's start time)                                                 |
| Drawer reveal             | Content appears at once                                                                                                     |
| Control color transitions | Kept (120 ms color change is not motion)                                                                                    |

The check is done in CSS where possible and through one shared helper
(`src/lib/motion.ts`, exporting `prefersReducedMotion()` and a change listener) in islands.

---

## 5. Components

Class names below are the contract for tests and for the hero phase. Engineers may add
Tailwind utilities, but colors and type come from tokens only.

### 5.1 Frame (letterbox bars and timecode)

Two fixed bars. Both are an always-dark scope: inside `.frame-bar` the tokens are re-pointed
(`--color-bg: var(--color-bar)`, `--color-text: var(--color-bar-strong)`,
`--color-muted: var(--color-bar-text)`, `--color-focus: var(--color-bar-strong)`,
`--color-line: #2B2B30`) in both themes. Strip items that carry `data-world` keep these bar
values and take only their accent from the world (appendix A.3).

| Part         | Desktop (≥ 1024)                                                                          | Phone (< 1024)                                 |
| ------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Top bar      | `<header class="frame-bar frame-bar--top">`, 56 px, padding-inline 24                     | 44 px + top safe area, padding-inline 16       |
| Top left     | Home link: `LUIS ZARATE · REEL 2026` (`text-meta`, bar-text)                              | Home link: `LUIS ZARATE` (44 px tall hit area) |
| Top right    | Timecode, then theme toggle, gap 24                                                       | Timecode, then theme toggle (44 × 44), gap 8   |
| Bottom bar   | `<nav class="frame-bar frame-bar--bottom" aria-label="Scenes">`, 56 px, padding-inline 24 | 56 px + bottom safe area, padding-inline 8     |
| Bottom left  | Scene strip (5.5)                                                                         | Scene strip, full width                        |
| Bottom right | Scene counter `01 / 06` (`text-meta`, bar-text, `aria-hidden`)                            | Omitted                                        |

- Both bars are `position: fixed`, full width, `z-index: var(--z-bars)`, background
  `--color-bar`, no border, no shadow. They do not hide, shrink or change on scroll, at any
  size.
- Bar side padding is `max(<value above>, env(safe-area-inset-left/right))`.
- **Timecode.** Format `HH:MM:SS:FF` at 24 frames per second, `text-meta`,
  `font-variant-numeric: tabular-nums`, fixed width `11ch`, `aria-hidden="true"`. It is driven
  by scroll, not by a clock: the page has 7 sections (hero plus six), each worth 30 seconds, so
  the hero starts at `00:00:00:00`, scene 01 at `00:00:30:00`, and the end of the page is
  `00:03:30:00`. Within a section it advances linearly with scroll progress. Updated at most
  once per animation frame, only while scrolling. Server-rendered value: `00:00:00:00`.
- **Theme toggle.** `<button type="button" class="theme-toggle" hidden>`; visible label is the
  theme it switches to (`LIGHT` in dark theme, `DARK` in light theme), `text-meta`;
  `aria-label="Use light theme"` / `"Use dark theme"`. Rest: bar-text. Hover and focus:
  bar-strong. Minimum hit area 44 × 44.
- **Home link.** Rest: bar-text. Hover and focus: bar-strong. Runs a cut to the top.

### 5.2 Slug line

- Markup: `<p class="slug"><span class="slug-no">SC 01</span> <span class="slug-loc">INT. POSTGRES 17 — READ COMMITTED</span></p>`.
- Type `text-slug`. `slug-no` is `--color-muted`; `slug-loc` is `--color-accent`. The two are
  separated by a middle dot rendered in CSS (`.slug-loc::before { content: "· " }`).
- Copy rule: `INT.` or `EXT.`, then the location (the technology or environment the project
  lives in), an em dash, then the condition. At most 48 characters after the scene number.
  One line at desktop; may wrap to two on phones.
- Numbering: hero has no number (its slug is `INT. PORTFOLIO — FULL-STACK ENGINEER`); projects
  are `SC 01` to `SC 04` by `order`; How it was built is `SC 05`; Contact is `SC 06`.
- It is a paragraph, not a heading.

### 5.3 Scene cut

Behavior and timing are in 4.2. Component contract:

- One module, `src/lib/cut.ts`, exporting `cutTo(target: HTMLElement | "top", options?: { onSwap?: () => void })`.
  It owns the single `.wipe` element.
- At the swap it scrolls instantly, calls `onSwap`, then focuses the target's heading
  (`tabindex="-1"`, `focus({ preventScroll: true })`) and updates the URL hash with
  `history.replaceState`.
- States: idle; covering (0 to 315 ms); covered (315 to 385 ms, swap at 350); uncovering
  (385 to 700 ms). Input is not blocked; a second request re-targets.
- Without JavaScript, strip links are plain anchors and the browser jumps (headings have
  `scroll-margin-top: var(--bar-top)` via `scroll-padding-top`).

### 5.4 Scene (chapter template)

`<section class="scene" id={id} data-world={id} aria-labelledby="{id}-title">`, background
`--color-bg` (the tint), `min-height: var(--frame-h)`, padding-block `--spacing-scene`,
`isolation: isolate`. The inner container is the page grid.

Slots, in DOM order, inside three wrappers. This is also the phone order and the tab order.

| #   | Wrapper           | Slot         | Element                                                                                                                                    | Type, color                                             |
| --- | ----------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| 1   | `div.scene-head`  | Slug         | `p.slug` (5.2)                                                                                                                             | `text-slug`                                             |
| 2   |                   | Credit badge | `p.credit-badge` (5.9)                                                                                                                     | `text-meta`                                             |
| 3   |                   | Title        | `h2#{id}-title` containing `span.scene-kicker` (project name) and `span.scene-title` (the claim), with a visually hidden `: ` between them | kicker `text-heading`, accent; title `text-title`, text |
| 4   |                   | Logline      | `p.scene-logline`, one paragraph, at most 160 characters                                                                                   | `text-lead`, text, max 62ch                             |
| 5   | `div.scene-proof` | Simulation   | `figure.sim` (below)                                                                                                                       |                                                         |
| 6   |                   | Numbers      | `dl.stats` (5.7), 0 to 3 items                                                                                                             |                                                         |
| 7   | `div.scene-meta`  | Stack        | `ul.stack` with a visually hidden "Stack" label; items separated by `·` in CSS                                                             | `text-meta`, muted                                      |
| 8   |                   | Links        | `div.scene-links`: live demo, repository (5.6)                                                                                             | `text-control`                                          |
| 9   |                   | Credit line  | `p.credit` (5.9)                                                                                                                           | `text-small`, text                                      |
| 10  |                   | Drawer       | `details.drawer` (5.8)                                                                                                                     |                                                         |

**Layout at 1440 × 900** (frame 1440 × 788, inner height 692 after 48 px padding, 12 columns).
Grid areas: `"head proof" "meta proof"`, rows `auto 1fr`, column gap = gutter, row gap 24.

| Area    | Columns | Width | Contents, top to bottom (gap)                                                                                                                   | Height |
| ------- | ------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `head`  | 1 to 6  | 628   | Slug with the credit badge right-aligned on the same line (21) · 12 · kicker (40) · 8 · title, 2 lines (151) · 24 · logline, up to 3 lines (96) | 352    |
| `meta`  | 1 to 6  | 628   | Stack list, up to 2 lines (34) · 24 · links row (48) · 16 · credit line, up to 4 lines (84) · 16 · drawer bar (48)                              | 270    |
| `proof` | 7 to 12 | 628   | Simulation stage 628 × 419 (3:2) · 12 · controls (48) · 8 · caption (21) · 24 · stats, three across (115)                                       | 647    |

Left column totals 646 px (352 + 24 + 270) and the right 647 px, both inside 692, with every
slot at its longest allowed content. `meta` is aligned to the bottom of its row
(`align-self: end`) so the drawer bar and the stats share a baseline. The grid is vertically
centered in the scene when the frame is taller than the content (`align-content: center`).
There is no divider between the columns.

When the drawer is open the left column grows and the scene extends below the frame;
`scene-proof` becomes `position: sticky; top: calc(var(--bar-top) + var(--spacing-scene)); align-self: start`
so the simulation stays in view beside the details.

Tab order at desktop is head, simulation controls, links, drawer. That is the intended reading
sequence (claim, proof, then where to go next), so DOM order is not rearranged for desktop.

**Layout at 390** (one column, 358 wide, natural height, never pinned):

| Order | Slot          | Size and spacing                                                                                                                                                 |
| ----- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Slug          | Up to 2 lines of 12 px                                                                                                                                           |
| 2     | Credit badge  | Own row, 8 below the slug                                                                                                                                        |
| 3     | Kicker, title | Kicker 28 px, 16 below the badge; title 52 px, 8 below the kicker, 2 lines (89)                                                                                  |
| 4     | Logline       | 18 px, 16 below the title                                                                                                                                        |
| 5     | Simulation    | 24 below; stage 358 × 268 (4:3) for canvas, auto height with `min-height: 268px` for DOM cards; controls stacked full width, 12 below the stage; caption 8 below |
| 6     | Stats         | 32 below; stacked rows (5.7)                                                                                                                                     |
| 7     | Stack         | 24 below; wraps                                                                                                                                                  |
| 8     | Links         | 24 below; each button full width, 48 tall, 8 apart                                                                                                               |
| 9     | Credit line   | 16 below                                                                                                                                                         |
| 10    | Drawer        | 16 below; bar full width; panel opens under it                                                                                                                   |

From 640 to 1023 the phone order is kept; stats go three across and buttons sit in a row.

**Simulation slot** (`figure.sim`):

- Stage: `div.sim-stage`, background `--color-surface`, `border: 1px solid var(--color-line)`,
  `border-radius: var(--radius-md)`, `overflow: hidden`, `aspect-ratio: 4 / 3` below 1024 and
  `3 / 2` from 1024. Canvas inside is `display: block; width: 100%; height: 100%`.
- **Static final frame:** the stage is server-rendered with the simulation's end state as
  inline SVG or DOM (`div.sim-still`), drawn with tokens so it themes. This is the first
  paint, the no-JavaScript view and the reduced-motion view. Hydration replaces it in place
  with no size change. If a project has no simulation yet, the still is a screenshot
  (1256 × 942, AVIF with WebP fallback, `object-fit: cover`, subject kept inside the central
  3:2 band, `loading="lazy"`, real `alt`) and the scene is complete.
- Controls: `div.sim-controls`, a wrapping row of buttons (5.6) and an optional
  `div.sim-readout` (`aria-live="polite"`, labels in `text-meta` muted, values in Sans 600
  16 px with tabular figures, accent color).
- Caption: `figcaption`, `text-small`, muted, one sentence saying what the visitor is seeing.
- Component contract: `play()`, `reset()`, optional `setProgress(0..1)` (required for a scene
  that pins), a `still` render, and a text alternative (`role="img"` plus `aria-label` on a
  canvas; real controls for DOM cards).
- The simulation is the only place in a scene where B's operable cards appear (Bifrost diff
  card, Cougar Connect search). They sit on `--color-surface` inside the stage and use the same
  buttons, inputs and tokens; they bring no styling of their own.

**States of the scene:** default; current (it crosses the frame's middle; only the strip
reflects this); pinned (4.4); drawer open (pin released, scene grows).

### 5.5 Scene strip (navigation)

`<ol class="strip">` inside the bottom bar, one `<li>` per section after the hero, each an
`<a href="#{id}" data-world={id?}>` with `span.strip-no` and `span.strip-name`. Items:
`01 LABSQ`, `02 BIFROST`, `03 COUGAR CONNECT`, `04 MASTERY PILOT` (from the collection, by
`order`), then `05 BUILD`, `06 CONTACT`.

| Property        | Desktop (≥ 1024)                                             | Phone (< 1024)                                                                                               |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Layout          | Row, items sized to content, each 56 tall, padding-inline 16 | Grid. The current item is `1fr`; every other item is 44 wide. All 56 tall                                    |
| Number          | `text-meta`, bar-text                                        | `text-meta` at 14 px, bar-text, centered                                                                     |
| Name            | `text-strip` (18 px), bar-text, 8 right of the number        | Shown for the current item only, Display 700 at 15 px, tracking 0.02em. Others keep the name visually hidden |
| Accessible name | "Scene 1: LabsQ" (`aria-label`)                              | Same                                                                                                         |

States:

| State          | Treatment                                                                                                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rest           | Number and name in bar-text (7.78:1 dark, 11.06:1 light)                                                                                                                                                                                       |
| Hover          | Number and name in bar-strong                                                                                                                                                                                                                  |
| Focus-visible  | Focus ring (6.1) in bar-strong, `outline-offset: -4px` so it stays inside the bar                                                                                                                                                              |
| Current        | `aria-current="true"`; name and number in `--color-accent-bar` (bar-strong for items without a world); a 2 px bar of the same color along the item's top edge (`box-shadow: inset 0 2px 0 currentColor`). The 2 px bar is the non-color signal |
| Active (press) | Background `var(--color-line)` while pressed (`#2B2B30` inside the bars)                                                                                                                                                                       |

Behavior: click or Enter calls `cutTo`. The current item is tracked with an
IntersectionObserver whose root margin collapses the frame to its horizontal midline. State
changes are instant; on phones the grid re-flows instantly when the current item changes
(no transition). The strip never scrolls horizontally: at 360 px wide the phone grid is
5 × 44 + 124 px.

### 5.6 Buttons and links

All buttons: height 48, padding-inline 20, `border-radius: var(--radius-md)`, `text-control`,
1 px border, `transition: color, background-color, border-color var(--dur-ui) var(--ease-ui)`,
`cursor: pointer`. Icons are 16 px inline SVG in `currentColor`, 8 from the label. At most one
primary per scene: the live demo if the project has one, otherwise the repository.

| Variant | Rest                                                               | Hover                                                       | Active (pressed down)                                           | Disabled (`aria-disabled="true"`)                                                             |
| ------- | ------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Primary | bg `--color-fill`, text `--color-on-fill`, border `--color-accent` | bg `--color-text`, text `--color-bg`, border `--color-text` | bg `--color-accent`, text `--color-bg`, border `--color-accent` | bg transparent, text and dashed border `--color-line-strong`, `cursor: not-allowed`, no hover |
| Ghost   | bg transparent, text and border `--color-text`                     | bg `--color-text`, text `--color-bg`                        | bg `--color-accent`, text `--color-bg`, border `--color-accent` | Same as primary disabled                                                                      |

- **Toggle buttons** (simulation modes, `aria-pressed`): unpressed is Ghost. Pressed
  (`aria-pressed="true"`) is bg `--color-accent`, text `--color-bg`, border `--color-accent`,
  plus a 8 × 8 px square in `currentColor` before the label (the non-color signal).
- **Focus-visible** (all variants): the ring in 6.1. No color change on focus alone.
- **Disabled** controls stay focusable and say why in their label (for example "Live demo:
  none"). Prefer omitting the control over disabling it.
- **Text link** (inline, in running text): color inherits; `text-decoration: underline`,
  `text-decoration-thickness: 1px`, `text-underline-offset: 0.2em`,
  `text-decoration-color: var(--color-accent)`. Hover: color `--color-accent`, thickness 2 px.
  Active: color `--color-text`, thickness 2 px. Visited: unchanged. The underline is always
  present; color is never what marks a link.
- **External links** get a 12 px up-right arrow SVG after the label and
  `rel="noopener noreferrer"`. They open in the same tab.
- Contrast: primary rest is the on-fill/fill row of 2.4 (4.86 minimum); hover is text/bg
  (16.00 minimum); active and pressed are the tint-on-accent row (5.41 minimum); ghost rest is
  text on tint (16.00 minimum).

### 5.7 Stat / number block

- Markup: `<dl class="stats">`, each item a `<div class="stat">` with `<dt>` (label) and `<dd>`
  (value); the value is shown above the label with `flex-direction: column-reverse`.
- Value: `text-stat`, `--color-text`. Label: `text-small`, `--color-muted`, max 26 characters
  per line, at most 3 lines. Each item has `border-top: 1px solid var(--color-line)` and
  `padding-top: 12px`; value to label gap 8.
- Desktop and ≥ 640: `grid-template-columns: repeat(3, minmax(0, 1fr))`, gap = gutter. With
  fewer than three stats the remaining cells stay empty; items do not stretch.
- Phone: one item per row, `grid-template-columns: 7rem 1fr`, value left, label right,
  baseline-aligned, 12 px padding-block, a line between rows.
- Arrow values: a value written `50 → 1` in the content file is split on `→` and rendered as
  `<span>50</span><svg class="stat-arrow" aria-hidden="true">…</svg><span class="sr-only"> to </span><span>1</span>`.
  The arrow is a 0.5em-wide, 2 px-stroke line arrow in `currentColor`, 0.15em margin each side.
- Zero stats: the block is not rendered and the spacing above it collapses. A stat is never
  invented to fill the row (see open question 1).
- Stats are static. They do not count up.

### 5.8 Details drawer

- Native disclosure: `<details class="drawer">` with `<summary>`. No JavaScript is needed to
  open it, find-in-page opens it, and it is announced as expanded or collapsed.
- It is the last item of `scene-meta`, full width of that column (628 at 1440, 358 at 390).
- **Bar** (the `<summary>`): height 48, `display: flex; justify-content: space-between; align-items: center`,
  `border-top` and `border-bottom` 1 px `--color-line`, no side borders, no radius. Left:
  "Details" in `text-control`, then `STACK · DECISIONS · NOTES` in `text-meta` muted, 12 to
  its right (hidden below 640). Right: `+` when closed, `−` (U+2212) when open, in
  `text-control`, set by `details[open] > summary::after`. The default marker is removed
  (`list-style: none` and `::-webkit-details-marker { display: none }`).

  | State         | Treatment                                                    |
  | ------------- | ------------------------------------------------------------ |
  | Rest          | Transparent background, text `--color-text`                  |
  | Hover         | Background `--color-surface`                                 |
  | Active        | Background `--color-line`                                    |
  | Focus-visible | Focus ring (6.1)                                             |
  | Open          | `−` marker; the bar's bottom border is replaced by the panel |

- **Panel:** `div.drawer-panel`, padding-block 24, `border-bottom: 1px solid var(--color-line)`.
  Groups are stacked, 24 apart, at every width. Each group is headed by an `h3` in Sans 600 at
  `text-body` size: **Stack** (full list with one-line reasons), **Decisions** (two to four
  short items, linking to the repo's docs), **Notes** (anything else true and useful). Body in
  `text-body`, max 62ch.
- Open motion: the panel takes its full height at once and its content is uncovered top to
  bottom with `clip-path: inset(0 0 100% 0)` to `inset(0)` (`animate-reveal`: `--dur-reveal`,
  `--ease-cut`). Closing is instant. Reduced motion: no clip animation.
- The credit line is **not** inside the drawer.
- Opening it in a pinned scene releases the pin (4.4). At desktop the simulation column
  becomes sticky (5.4).

### 5.9 Credit line

Two parts, both always visible, in every scene, at every width. Neither is truncated,
line-clamped, collapsed, put in a tooltip or moved into the drawer.

| Part      | Element          | Content                                                                                   | Style                                                                                                                                                                     |
| --------- | ---------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Badge     | `p.credit-badge` | `SOLO PROJECT` or `TEAM PROJECT`                                                          | `text-meta`; padding 4 × 8; `border-radius: var(--radius-sm)`. Solo: 1 px border `--color-line-strong`, text `--color-muted`. Team: 1 px border and text `--color-accent` |
| Statement | `p.credit`       | A mono label `CREDIT` (`text-meta`, muted) followed by the project's `role` text verbatim | `text-small`, `--color-text` (not muted), max 72ch                                                                                                                        |

- The badge is next to the slug (same row at desktop, the row below on phones), so a team
  project is identified before the title is read. The words carry the meaning; the accent
  border is reinforcement.
- The statement comes from the content file's `role` and is written against the project's own
  README. It states what Luis built in plain verbs.
- Schema addition: `credit: z.enum(["solo", "team"])`, so the badge is data, not a guess from
  the `role` string.
- In "How it was built", the same badge and statement pattern credits the models that did the
  work.

### 5.10 Small shared pieces

| Piece       | Spec                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Kicker      | Project name, `text-heading`, `--color-accent`, 8 above the title                                             |
| Stack list  | `text-meta`, muted, items separated by `·` with 8 each side, wraps; no pills or chips                         |
| Code / diff | `text-code` on `--color-surface`; added and removed lines use the add/del tokens and a leading `+` or `-`     |
| Text input  | Height 48, bg `--color-surface`, border 1 px `--color-line-strong`, `text-body`, radius md; focus ring as 6.1 |
| Divider     | 1 px `--color-line`. Never thicker                                                                            |
| `.sr-only`  | Standard visually-hidden utility (Tailwind's `sr-only`)                                                       |

---

## 6. Accessibility

### 6.1 Focus ring

`:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 3px; }`, no
transition, never removed. `--color-focus` equals the text color, so the ring is 16.00:1 or
better against every page, tint and surface background in both themes, and 16.43:1 or better
in the bars. Because of the 3 px offset the ring is always drawn on the background, not on a
fill. Elements flush with a bar or the viewport edge use `outline-offset: -4px`.

### 6.2 Targets

- Every interactive element has a hit area of at least **44 × 44 px**. Buttons are 48 tall;
  strip items are 56 tall and at least 44 wide.
- Inline text links in running text are exempt from 44 px but keep at least 24 px of line
  height.
- At least 8 px between adjacent targets.

### 6.3 Page structure

DOM order, which is also tab order:

1. `<a class="skip-link" href="#main">Skip to content</a>`
2. `<header class="frame-bar frame-bar--top">` (banner): home link, timecode (hidden from
   assistive tech), theme toggle
3. `<nav class="frame-bar frame-bar--bottom" aria-label="Scenes">`: the strip
4. `<main id="main" tabindex="-1">`: hero, four scenes, How it was built, Contact
5. `<footer>` (contentinfo): one line inside the last section's container: copyright year,
   link to this site's source

Headings:

| Level | Content                                                                                  |
| ----- | ---------------------------------------------------------------------------------------- |
| `h1`  | "Luis Zarate" (hero). Exactly one                                                        |
| `h2`  | One per scene: "LabsQ: Fifty bookings. One slot." pattern; "How it was built"; "Contact" |
| `h3`  | Drawer groups (Stack, Decisions, Notes); sub-sections of How it was built                |

No level is skipped. Slug lines, kickers outside the `h2`, badges and stat values are not
headings. Each `section` is labelled by its heading (`aria-labelledby`).

### 6.4 Skip link

First element in `<body>`. Visually hidden until focused; on focus it is
`position: fixed; top: calc(var(--bar-top) + 8px); left: 16px; z-index: var(--z-skip)`,
styled as a Primary button with the neutral tokens (bg `--color-text`, text `--color-bg`,
17.13:1). It moves focus to `#main`.

### 6.5 Color is never the only signal

| Meaning              | Color cue        | Non-color cue                                                    |
| -------------------- | ---------------- | ---------------------------------------------------------------- |
| Which project        | World tint       | Scene number, project name in the heading and the strip          |
| Current scene        | Accent           | `aria-current`, 2 px top bar on the item, name shown (phone)     |
| Pressed toggle       | Accent fill      | `aria-pressed`, square marker before the label                   |
| Link                 | Accent underline | The underline itself                                             |
| Added / removed line | Green / red      | Leading `+` / `-`                                                |
| Team project         | Accent badge     | The words "Team project" and the credit statement                |
| Simulation outcomes  | Accent vs muted  | Shape (filled vs hollow marks), text labels and the live readout |
| Disabled             | Lower contrast   | Dashed border, `aria-disabled`, label says why                   |

### 6.6 Other requirements

- Keyboard: every simulation is fully operable with Tab, Enter, Space and arrow keys; nothing
  depends on hover or drag alone (a drag always has two buttons or arrow keys that do the
  same).
- Live regions: simulation readouts use `aria-live="polite"`; the hero title card does not
  announce its cycling (the four numbers are also in the DOM as a list).
- `forced-colors: active`: borders already exist on every control, so no extra work beyond
  setting the wipe to `background: CanvasText` and the current strip item's marker to
  `border-top: 2px solid Highlight`.
- Text can be zoomed to 200% without loss; at 400% (320 CSS px) the phone layout applies and
  nothing scrolls horizontally.
- Touch: `touch-action: pan-y` on any canvas so vertical scroll is never captured.

---

## 7. Hero hand-off note

What the design system provides and what the 3D hero must respect.

| Topic       | Contract                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container   | `<section class="hero">`: `min-height: var(--frame-h)`, `position: relative`, `isolation: isolate`, background `--color-bg`, no `data-world`                                                                                                                                                                                                                                                                                     |
| Layering    | `div.hero-field` at `position: absolute; inset: 0; z-index: var(--z-below); pointer-events: none`. It holds the still image and, later, the canvas. All text sits above it at `--z-base`. The field never extends under the bars                                                                                                                                                                                                 |
| Real text   | The `h1`, slug, sub-line and title card are DOM text in tokens and are the first paint. When the field is live and has formed the name, the hero adds `.hero--live`, which sets the `h1` to `opacity: 0` in a single step (no fade); it stays in the accessibility tree and keeps its box                                                                                                                                        |
| Type        | Name: `text-hero`, two lines ("LUIS" / "ZARATE"); _measured_ "ZARATE" is 557 px at 1440 and 321 px at 390. Slug: `text-slug`. Sub-line: `text-lead`. Title-card number: `text-stat` in neutral accent                                                                                                                                                                                                                            |
| Colors      | Clear color transparent (the CSS background shows through). Points: the four world colors plus `--color-text`. Dark theme uses each world's `fill`; light theme uses each world's `textLight` (fills fail 3:1 on the light background). Read them from `--w-<id>-fill` and `--w-<id>-text-light` on `:root`, and re-read on `themechange`. No other colors, no bloom, no glow, no fog                                            |
| Still frame | Pre-rendered image of the settled field, shown before the canvas is ready, on WebGL failure, on weak devices if the 2D fallback is not used, and always under reduced motion. Desktop **2880 × 1576** (the 1440 × 788 frame at 2×); phone **1170 × 1560** (390 × 520 at 3×). AVIF with WebP fallback, one pair per theme, `object-fit: cover`, `alt=""` (decorative; the name is real text). Budget: 120 KB desktop, 60 KB phone |
| Loading     | three.js is imported only inside the hero island, after first paint (`client:idle`); the still stays until the first rendered frame, then is swapped in one step                                                                                                                                                                                                                                                                 |
| Motion      | Pointer and tilt parallax move the field only. Scroll break-apart is the hero's one scrubbed property and follows the pinning rule in 4.4. A visible Pause button (Ghost, bottom-left of the hero) stops the field and the title card                                                                                                                                                                                            |
| Tokens used | `--frame-h`, `--bar-top`, `--bar-bottom`, `--z-below`, `--z-base`, `--ease-cut`, `--dur-card`, `prefersReducedMotion()`, `themechange`, `cutTo()`                                                                                                                                                                                                                                                                                |
| Canvas      | `touch-action: pan-y`; device pixel ratio capped at 1.5 on phones and 2 on desktop                                                                                                                                                                                                                                                                                                                                               |

---

## 8. Do / don't

1. **Do** keep film grammar to four things: bars, slug lines, cuts, timecode. **Don't** add
   film grain, clapperboards, countdown leaders, sprocket holes, "directed by", "starring",
   REC dots, or an aspect-ratio label.
2. **Do** cut. **Don't** cross-fade, fade-in on scroll, stagger letters or slide content in.
   If something appears, it appears; if a jump needs covering, the wipe covers it.
3. **Do** leave the bars alone. **Don't** hide, shrink, blur or animate them, and don't put
   anything in them beyond what 5.1 lists.
4. **Do** let one world own a scene. **Don't** show two world colors in the same scene, use
   gradients between worlds, or use a world color in the hero text, How it was built or
   Contact (the hero field is the only place all four meet).
5. **Do** use accent in exactly these places: slug, kicker, current or pressed control,
   simulation marks, link underline. **Don't** color body text, titles or stats.
6. **Do** use fill only for areas carrying on-fill text, always with an accent border.
   **Don't** set text in a fill color or draw thin marks with it.
7. **Do** use Display type for names, titles and static numbers, in capitals. **Don't** use it
   for sentences, labels under 18 px, or anything that counts or ticks.
8. **Do** keep surfaces flat: 1 px lines, 4 px radius. **Don't** use shadows, glows, glass,
   blur, pills, or radii above 4 px.
9. **Do** use native scroll. **Don't** add smooth-scroll libraries, scroll snapping, parallax,
   custom cursors, or hover-only reveals.
10. **Do** make each simulation show what the project really does, with real values.
    **Don't** add decorative animation, count-up numbers or invented metrics.
11. **Do** show credit in the open: badge by the slug, statement under the links.
    **Don't** move either into the drawer, a tooltip or a footnote, or shorten the statement.
12. **Do** take every color and size from a token. **Don't** write a hex value, a pixel font
    size or a one-off easing in a component; if a token is missing, add it here first.

---

## 9. What changed from the concept, and why

| Concept                                          | Spec                                                                   | Why                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Wipe on every scene change                       | Wipe on discrete jumps; hard edge on native scroll                     | A timed wipe tied to scroll needs scroll-jacking, which the concept itself named as the top iOS risk          |
| All scenes pin at ≥ 900 px                       | Pinning opt-in, ≥ 1024 wide, ≥ 760 tall, fine pointer                  | A pin with nothing to scrub is dead scroll; touch tablets and short windows break pinned layouts              |
| Timecode runs on a clock                         | Timecode follows scroll position                                       | A permanently ticking element is motion the visitor cannot stop; tied to scroll it is also a progress readout |
| Hero name ~84 px at 390                          | 120 px at 390                                                          | Measured: "ZARATE" is 225 px wide at 84 px, 63% of the column. At 120 px it is 321 px and fills it            |
| Scene title up to 92 px, full width; stats below | 88 px in a 6-column text column; simulation and stats in the other six | Measured budget: with every slot at its longest, both columns are 646 px in a 692 px frame at 1440 × 900      |
| Scene strip inside the hero                      | Strip lives in the bottom bar, always present                          | One navigation, in the bar that is already fixed; on phones it is in thumb reach                              |
| Phone bars 40 px                                 | 44 top, 56 bottom                                                      | 40 px cannot hold a 44 px touch target                                                                        |
| "2.39 : 1" label in the bar                      | Removed                                                                | The frame is not 2.39:1; the site only states true things                                                     |
| JetBrains Mono 400 and 600                       | 400 only                                                               | Emphasised counter values use Hanken 600, whose figures are already tabular; saves 22 KB                      |
| A world is 5 tokens                              | 6 required plus an optional pair; surface and lines derived            | Both themes need their own text and tint; deriving the rest keeps a fifth project to 6 values                 |
| Accent fill on active controls                   | Accent text color as the pressed background, fill with a border        | Amber and frost fills are under 2:1 on their light tints; crimson is under 3:1 on its dark surface            |
| Light theme "kept as a token swap"               | User toggle, OS preference not followed                                | See 2.2                                                                                                       |

---

## 10. Open questions for Luis

1. **Cougar Connect has no metrics** and Bifrost has two. The template handles 0 to 3, but the
   scene reads best with three. Real numbers are needed from the repos (for example test
   count, or the before/after ledger items). None will be invented.
2. **Schema change.** This spec replaces `color` with `world` and adds `credit`, plus per-scene
   copy fields the template needs (`slug`, `headline`, `pin`). That amends ADR-004. Approve, or
   keep worlds in a CSS file keyed by id (simpler today, but a new project then touches two
   files and loses the build-time contrast check).
3. **Light theme scope.** A toggle is specified. If light is not worth two extra hero stills
   and a second visual QA pass, it can ship later with no token changes.
4. **Strip labels.** "How it was built" is shortened to `BUILD` in the strip so six items fit
   at 1024 px. The section heading keeps the full name.

---

## Appendix A: token file

Paste A.1 to A.3 into `src/styles/tokens.css`, imported from `src/styles/global.css` after
the font imports. A.4 is generated by `WorldStyles.astro` (2.5). `global.css` becomes:

```css
@import "tailwindcss";
@import "@fontsource/big-shoulders-display/latin-700.css";
@import "@fontsource/big-shoulders-display/latin-900.css";
@import "@fontsource/hanken-grotesk/latin-400.css";
@import "@fontsource/hanken-grotesk/latin-600.css";
@import "@fontsource/jetbrains-mono/latin-400.css";
@import "./tokens.css";
```

### A.1 Tailwind v4 theme

```css
/* `static` emits every token even if no utility uses it yet: canvases and the
   generated world styles read them at run time. */
@theme static {
  /* Remove Tailwind's defaults so only these tokens exist as utilities. */
  --color-*: initial;
  --font-*: initial;
  --text-*: initial;
  --radius-*: initial;
  --shadow-*: initial;
  --ease-*: initial;
  --animate-*: initial;

  /* Color: dark theme values. Light theme and worlds override these below. */
  --color-bg: #0b0b0d;
  --color-surface: #151518;
  --color-text: #f2efe9;
  --color-muted: #a19d96;
  --color-line: #2b2b30;
  --color-line-strong: #7a766f;
  --color-focus: #f2efe9;
  --color-bar: #000000;
  --color-bar-text: #a19d96;
  --color-bar-strong: #f2efe9;
  --color-accent: #f2efe9;
  --color-accent-bar: #f2efe9;
  --color-secondary: #f2efe9;
  --color-fill: #f2efe9;
  --color-on-fill: #0b0b0d;
  --color-add-bg: #12331f;
  --color-add-text: #8fe0ae;
  --color-del-bg: #3a1a22;
  --color-del-text: #ff9aa8;

  /* Type families */
  --font-display:
    "Big Shoulders Display", "Big Shoulders Fallback", "Arial Narrow", Impact, sans-serif;
  --font-sans:
    "Hanken Grotesk", "Hanken Fallback", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;

  /* Type scale: size, then the role's line height, tracking and weight. */
  --text-hero: clamp(5rem, min(30.77vw, 5.4571rem + 8.381vw), 13rem);
  --text-hero--line-height: 0.8;
  --text-hero--letter-spacing: -0.01em;
  --text-hero--font-weight: 900;

  --text-title: clamp(3.25rem, 2.4143rem + 3.4286vw, 5.5rem);
  --text-title--line-height: 0.86;
  --text-title--letter-spacing: 0;
  --text-title--font-weight: 900;

  --text-stat: clamp(2.75rem, 2.1rem + 2.6667vw, 4.5rem);
  --text-stat--line-height: 0.9;
  --text-stat--letter-spacing: 0;
  --text-stat--font-weight: 700;

  --text-heading: clamp(1.75rem, 1.4714rem + 1.1429vw, 2.5rem);
  --text-heading--line-height: 1;
  --text-heading--letter-spacing: 0.01em;
  --text-heading--font-weight: 700;

  --text-strip: 1.125rem;
  --text-strip--line-height: 1;
  --text-strip--letter-spacing: 0.04em;
  --text-strip--font-weight: 700;

  --text-lead: clamp(1.125rem, 1.0321rem + 0.381vw, 1.375rem);
  --text-lead--line-height: 1.45;
  --text-lead--font-weight: 400;

  --text-body: clamp(1rem, 0.9768rem + 0.0952vw, 1.0625rem);
  --text-body--line-height: 1.6;
  --text-body--font-weight: 400;

  --text-small: 0.875rem;
  --text-small--line-height: 1.5;
  --text-small--font-weight: 400;

  --text-control: 1rem;
  --text-control--line-height: 1;
  --text-control--font-weight: 600;

  --text-slug: clamp(0.75rem, 0.7036rem + 0.1905vw, 0.875rem);
  --text-slug--line-height: 1.5;
  --text-slug--letter-spacing: 0.1em;
  --text-slug--font-weight: 400;

  --text-meta: 0.75rem;
  --text-meta--line-height: 1.4;
  --text-meta--letter-spacing: 0.12em;
  --text-meta--font-weight: 400;

  --text-code: clamp(0.8125rem, 0.7893rem + 0.0952vw, 0.875rem);
  --text-code--line-height: 1.6;
  --text-code--font-weight: 400;

  /* Space */
  --spacing: 0.25rem;
  --spacing-margin: clamp(1rem, -0.4857rem + 6.0952vw, 5rem);
  --spacing-gutter: clamp(1rem, 0.8143rem + 0.7619vw, 1.5rem);
  --spacing-scene: clamp(2rem, 1.6286rem + 1.5238vw, 3rem);
  --spacing-section: clamp(4rem, 2.5143rem + 6.0952vw, 8rem);
  --container-frame: 80rem;
  --container-measure: 62ch;
  --container-measure-wide: 72ch;

  /* Shape */
  --radius-sm: 2px;
  --radius-md: 4px;

  /* Motion */
  --ease-cut: cubic-bezier(0.77, 0, 0.18, 1);
  --ease-ui: linear;
  --animate-wipe: wipe 700ms both;
  --animate-reveal: reveal 500ms cubic-bezier(0.77, 0, 0.18, 1) both;

  @keyframes wipe {
    0% {
      transform: translateX(-101%);
      animation-timing-function: cubic-bezier(0.77, 0, 0.18, 1);
    }
    45% {
      transform: translateX(0);
      animation-timing-function: linear;
    }
    55% {
      transform: translateX(0);
      animation-timing-function: cubic-bezier(0.77, 0, 0.18, 1);
    }
    100% {
      transform: translateX(101%);
    }
  }

  @keyframes reveal {
    from {
      clip-path: inset(0 0 100% 0);
    }
    to {
      clip-path: inset(0);
    }
  }
}
```

Utilities this produces, for orientation: `bg-bg`, `bg-surface`, `text-text`, `text-muted`,
`text-accent`, `border-line`, `bg-fill`, `text-on-fill`; `font-display`, `font-sans`,
`font-mono`; `text-hero` … `text-code` (each sets size, line height, tracking and weight);
`px-margin`, `gap-gutter`, `py-scene`, `py-section`; `max-w-frame`, `max-w-measure`;
`rounded-sm`, `rounded-md`; `ease-cut`, `ease-ui`; `animate-wipe`, `animate-reveal`.
Durations and z-index have no Tailwind theme namespace; use `duration-(--dur-ui)` and
`z-(--z-bars)`.

### A.2 Fallback font faces

Metric overrides measured against Arial (Liberation Sans metrics) from the shipped files.

```css
@font-face {
  font-family: "Big Shoulders Fallback";
  font-weight: 900;
  src: local("Arial Bold"), local("Arial-BoldMT"), local("Liberation Sans Bold");
  size-adjust: 72.6%;
  ascent-override: 135.5%;
  descent-override: 29.3%;
  line-gap-override: 0%;
}
@font-face {
  font-family: "Big Shoulders Fallback";
  font-weight: 700;
  src: local("Arial Bold"), local("Arial-BoldMT"), local("Liberation Sans Bold");
  size-adjust: 63.3%;
  ascent-override: 155.4%;
  descent-override: 33.6%;
  line-gap-override: 0%;
}
@font-face {
  font-family: "Hanken Fallback";
  src: local("Arial"), local("ArialMT"), local("Liberation Sans");
  size-adjust: 101.7%;
  ascent-override: 98.4%;
  descent-override: 29.8%;
  line-gap-override: 0%;
}
```

### A.3 Custom properties: themes, frame, motion, world mechanism, base rules

```css
:root {
  color-scheme: dark;

  /* Motion durations (no Tailwind namespace) */
  --dur-ui: 120ms;
  --dur-reveal: 500ms;
  --dur-cut: 700ms;
  --dur-card: 3000ms;

  /* z-index scale */
  --z-below: -1;
  --z-base: 0;
  --z-raised: 10;
  --z-wipe: 40;
  --z-bars: 50;
  --z-skip: 60;

  /* Frame: phone values */
  --bar-top: calc(2.75rem + env(safe-area-inset-top, 0px));
  --bar-bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px));
  --frame-h: calc(100svh - var(--bar-top) - var(--bar-bottom));

  /* World mixing: what a scene's surface and lines are mixed toward */
  --mix-surface-keep: 94%;
  --mix-surface-toward: #f2efe9;
  --mix-line-toward: #f2efe9;
}

@media (min-width: 64rem) {
  :root {
    --bar-top: 3.5rem;
    --bar-bottom: 3.5rem;
  }
}

@media (min-width: 64rem) and (max-height: 859px) {
  :root {
    --text-title: 4.5rem;
    --text-stat: 3.5rem;
    --spacing-scene: 2rem;
  }
}

/* Light theme: a token swap, set by the toggle. */
:root[data-theme="light"] {
  color-scheme: light;
  --color-bg: #f4f4f2;
  --color-surface: #ffffff;
  --color-text: #111113;
  --color-muted: #5c5c61;
  --color-line: #d6d6d2;
  --color-line-strong: #7c7c77;
  --color-focus: #111113;
  --color-bar: #111113;
  --color-bar-text: #c9c6bf;
  --color-bar-strong: #f2efe9;
  --color-accent: #111113;
  --color-accent-bar: #f2efe9;
  --color-secondary: #111113;
  --color-fill: #111113;
  --color-on-fill: #f4f4f2;
  --color-add-bg: #e2f6ea;
  --color-add-text: #14663a;
  --color-del-bg: #fde8ea;
  --color-del-text: #9b1c2c;

  --mix-surface-keep: 45%;
  --mix-surface-toward: #ffffff;
  --mix-line-toward: #111113;
}

/*
 * World mechanism. WorldStyles.astro (A.4) sets --wd-* on [data-world="<id>"].
 * These rules turn them into the tokens components use. Dark is the default.
 */
[data-world] {
  --wd-tint: var(--wd-tint-dark);
  --wd-text: var(--wd-text-dark);
  --wd-secondary: var(--wd-secondary-dark, var(--wd-text-dark));

  --color-bg: var(--wd-tint);
  --color-surface: color-mix(
    in srgb,
    var(--wd-tint) var(--mix-surface-keep),
    var(--mix-surface-toward)
  );
  --color-line: color-mix(in srgb, var(--wd-tint) 84%, var(--mix-line-toward));
  --color-line-strong: color-mix(in srgb, var(--wd-tint) 50%, var(--mix-line-toward));
  --color-accent: var(--wd-text);
  --color-accent-bar: var(--wd-text-dark);
  --color-secondary: var(--wd-secondary);
  --color-fill: var(--wd-fill);
  --color-on-fill: var(--wd-on-fill);
}

:root[data-theme="light"] [data-world] {
  --wd-tint: var(--wd-tint-light);
  --wd-text: var(--wd-text-light);
  --wd-secondary: var(--wd-secondary-light, var(--wd-text-light));
}

/* The bars are dark in both themes: re-point the tokens inside them. */
.frame-bar {
  --color-bg: var(--color-bar);
  --color-surface: var(--color-bar);
  --color-text: var(--color-bar-strong);
  --color-muted: var(--color-bar-text);
  --color-focus: var(--color-bar-strong);
  --color-line: #2b2b30;
  --color-line-strong: #7a766f;
  --color-accent: var(--color-accent-bar);
}

/* Strip items carry data-world for their accent only; they keep the bar's surfaces. */
.frame-bar [data-world] {
  --color-bg: var(--color-bar);
  --color-surface: var(--color-bar);
  --color-line: #2b2b30;
  --color-line-strong: #7a766f;
  --color-accent: var(--wd-text-dark);
}

@media (prefers-contrast: more) {
  :root,
  :root[data-theme="light"] {
    --color-muted: var(--color-text);
  }
  :root,
  :root[data-theme="light"],
  [data-world] {
    --color-line: var(--color-line-strong);
  }
}

@layer base {
  html {
    background: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-sans);
    font-size: 100%;
    font-synthesis: none;
    scroll-behavior: auto;
    scroll-padding-top: var(--bar-top);
    -webkit-text-size-adjust: 100%;
  }
  body {
    min-height: 100svh;
    padding-top: var(--bar-top);
    padding-bottom: var(--bar-bottom);
    font-size: var(--text-body);
    line-height: var(--text-body--line-height);
  }
  :focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
    }
  }
}
```

Note on `@media (prefers-contrast: more)` inside a world: `--color-line-strong` is already
re-pointed by the `[data-world]` rule above it, so the scene picks up its own strong line.

### A.4 The four worlds (generated output of `WorldStyles.astro`)

```css
:root {
  --w-labsq-fill: #f59e1b;
  --w-labsq-on-fill: #1a1206;
  --w-labsq-text-dark: #ffb648;
  --w-labsq-text-light: #8f5400;
  --w-labsq-tint-dark: #1a1206;
  --w-labsq-tint-light: #fff3dc;

  --w-bifrost-fill: #7fd6ee;
  --w-bifrost-on-fill: #071419;
  --w-bifrost-text-dark: #a5e6f7;
  --w-bifrost-text-light: #0b6b86;
  --w-bifrost-tint-dark: #071419;
  --w-bifrost-tint-light: #e4f5fa;
  --w-bifrost-secondary-dark: #b9a9ff;
  --w-bifrost-secondary-light: #5a45b8;

  --w-cougar-connect-fill: #c8102e;
  --w-cougar-connect-on-fill: #ffffff;
  --w-cougar-connect-text-dark: #ff6b81;
  --w-cougar-connect-text-light: #a60f2d;
  --w-cougar-connect-tint-dark: #1a070b;
  --w-cougar-connect-tint-light: #fbe8eb;

  --w-mastery-pilot-fill: #6c5ce7;
  --w-mastery-pilot-on-fill: #ffffff;
  --w-mastery-pilot-text-dark: #a99cff;
  --w-mastery-pilot-text-light: #4b3bc4;
  --w-mastery-pilot-tint-dark: #0e0b1f;
  --w-mastery-pilot-tint-light: #edeaff;
}

[data-world="labsq"] {
  --wd-fill: var(--w-labsq-fill);
  --wd-on-fill: var(--w-labsq-on-fill);
  --wd-text-dark: var(--w-labsq-text-dark);
  --wd-text-light: var(--w-labsq-text-light);
  --wd-tint-dark: var(--w-labsq-tint-dark);
  --wd-tint-light: var(--w-labsq-tint-light);
}

[data-world="bifrost"] {
  --wd-fill: var(--w-bifrost-fill);
  --wd-on-fill: var(--w-bifrost-on-fill);
  --wd-text-dark: var(--w-bifrost-text-dark);
  --wd-text-light: var(--w-bifrost-text-light);
  --wd-tint-dark: var(--w-bifrost-tint-dark);
  --wd-tint-light: var(--w-bifrost-tint-light);
  --wd-secondary-dark: var(--w-bifrost-secondary-dark);
  --wd-secondary-light: var(--w-bifrost-secondary-light);
}

[data-world="cougar-connect"] {
  --wd-fill: var(--w-cougar-connect-fill);
  --wd-on-fill: var(--w-cougar-connect-on-fill);
  --wd-text-dark: var(--w-cougar-connect-text-dark);
  --wd-text-light: var(--w-cougar-connect-text-light);
  --wd-tint-dark: var(--w-cougar-connect-tint-dark);
  --wd-tint-light: var(--w-cougar-connect-tint-light);
}

[data-world="mastery-pilot"] {
  --wd-fill: var(--w-mastery-pilot-fill);
  --wd-on-fill: var(--w-mastery-pilot-on-fill);
  --wd-text-dark: var(--w-mastery-pilot-text-dark);
  --wd-text-light: var(--w-mastery-pilot-text-light);
  --wd-tint-dark: var(--w-mastery-pilot-tint-dark);
  --wd-tint-light: var(--w-mastery-pilot-tint-light);
}
```

The matching content-file front matter, replacing today's `color:` line (LabsQ shown; the
other three use the values in 2.3):

```yaml
credit: solo
world:
  fill: "#F59E1B"
  onFill: "#1A1206"
  textDark: "#FFB648"
  textLight: "#8F5400"
  tintDark: "#1A1206"
  tintLight: "#FFF3DC"
```

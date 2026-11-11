/**
 * WCAG 2.x contrast math and the color-world schema. Pure and Astro-free (no
 * virtual modules), so the content config and the unit tests share it.
 */

import { z } from "astro/zod";

export const WCAG_TEXT_MIN = 4.5;

const HEX = /^#[0-9a-fA-F]{6}$/;

export function parseHex(hex: string): [number, number, number] {
  if (!HEX.test(hex)) throw new Error(`Not a 6-digit hex color: ${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 to 21. Order of the two colors does not matter. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export interface WorldColors {
  fill: string;
  onFill: string;
  textDark: string;
  textLight: string;
  tintDark: string;
  tintLight: string;
  secondaryDark?: string | undefined;
  secondaryLight?: string | undefined;
}

export interface WorldIssue {
  /** Which schema field to attach the issue to. */
  path: keyof WorldColors;
  message: string;
}

type Pair = [foreground: string, background: string, field: keyof WorldColors, label: string];

/** Every text pair a world must satisfy (spec 2.5). */
function pairs(world: WorldColors): Pair[] {
  const list: Pair[] = [
    [world.onFill, world.fill, "onFill", "onFill on fill"],
    [world.textDark, world.tintDark, "textDark", "textDark on tintDark"],
    [world.textDark, "#000000", "textDark", "textDark on the black bar"],
    [world.textLight, world.tintLight, "textLight", "textLight on tintLight"],
  ];
  if (world.secondaryDark !== undefined) {
    list.push(
      [world.secondaryDark, world.tintDark, "secondaryDark", "secondaryDark on tintDark"],
      [world.secondaryDark, "#000000", "secondaryDark", "secondaryDark on the black bar"],
    );
  }
  if (world.secondaryLight !== undefined) {
    list.push([
      world.secondaryLight,
      world.tintLight,
      "secondaryLight",
      "secondaryLight on tintLight",
    ]);
  }
  return list;
}

/** Returns the rule violations of a world; an empty array means the world passes. */
export function worldIssues(world: WorldColors): WorldIssue[] {
  const issues: WorldIssue[] = [];
  if ((world.secondaryDark === undefined) !== (world.secondaryLight === undefined)) {
    issues.push({
      path: world.secondaryDark === undefined ? "secondaryDark" : "secondaryLight",
      message: "Give both secondaryDark and secondaryLight, or neither.",
    });
  }
  for (const [fg, bg, path, label] of pairs(world)) {
    // A malformed value is reported by the hex check; skip the math for it.
    if (!HEX.test(fg) || !HEX.test(bg)) continue;
    const ratio = contrastRatio(fg, bg);
    if (ratio < WCAG_TEXT_MIN) {
      issues.push({
        path,
        message: `${label} is ${ratio.toFixed(2)}:1; needs at least ${WCAG_TEXT_MIN}:1.`,
      });
    }
  }
  return issues;
}

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/**
 * A project's color world (spec 2.5). Contrast is checked at build time: a world
 * whose text pairs fall under 4.5:1 fails the build.
 */
export const worldSchema = z
  .object({
    fill: hex,
    onFill: hex,
    textDark: hex,
    textLight: hex,
    tintDark: hex,
    tintLight: hex,
    secondaryDark: hex.optional(),
    secondaryLight: hex.optional(),
  })
  .superRefine((value, ctx) => {
    for (const issue of worldIssues(value)) {
      ctx.addIssue({ code: "custom", path: [issue.path], message: issue.message });
    }
  });

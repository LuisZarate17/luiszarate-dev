import type { WorldColors } from "./contrast";

export interface WorldEntry {
  /** The content entry id, which is also the `data-world` value. */
  id: string;
  world: WorldColors;
}

/** world field -> CSS name part, in output order. Secondary fields are optional. */
const FIELDS: [keyof WorldColors, string][] = [
  ["fill", "fill"],
  ["onFill", "on-fill"],
  ["textDark", "text-dark"],
  ["textLight", "text-light"],
  ["tintDark", "tint-dark"],
  ["tintLight", "tint-light"],
  ["secondaryDark", "secondary-dark"],
  ["secondaryLight", "secondary-light"],
];

/**
 * The CSS of spec Appendix A.4: raw `--w-<id>-*` values on :root, then one
 * `[data-world="<id>"]` block per world mapping them to `--wd-*`, which the
 * mechanism in tokens.css turns into the tokens components use.
 */
export function worldCss(entries: readonly WorldEntry[]): string {
  const raw: string[] = [];
  const blocks: string[] = [];
  for (const { id, world } of entries) {
    const present = FIELDS.flatMap(([key, name]) => {
      const value = world[key];
      return value === undefined ? [] : [[name, value] as const];
    });
    raw.push(
      present.map(([name, value]) => `  --w-${id}-${name}: ${value.toLowerCase()};`).join("\n"),
    );
    blocks.push(
      `[data-world="${id}"] {\n${present.map(([name]) => `  --wd-${name}: var(--w-${id}-${name});`).join("\n")}\n}`,
    );
  }
  return `:root {\n${raw.join("\n\n")}\n}\n\n${blocks.join("\n\n")}\n`;
}

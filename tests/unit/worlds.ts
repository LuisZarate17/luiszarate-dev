import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { WorldColors } from "../../src/lib/contrast";
import type { WorldEntry } from "../../src/lib/world-css";

const PROJECTS = join(import.meta.dirname, "../../src/content/projects");

/**
 * Reads the real project files (the same front matter Astro validates) without
 * Astro's virtual modules. The world block is flat `key: "#hex"` lines.
 */
export function loadWorlds(): (WorldEntry & { order: number })[] {
  return readdirSync(PROJECTS)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const text = readFileSync(join(PROJECTS, file), "utf8");
      const order = Number(/^order:\s*(\d+)/m.exec(text)?.[1]);
      const block = /^world:\n((?: {2}\S.*\n)+)/m.exec(text)?.[1] ?? "";
      const world: Record<string, string> = {};
      for (const line of block.split("\n")) {
        const m = /^ {2}(\w+):\s*"(#[0-9a-fA-F]{6})"/.exec(line);
        if (m?.[1] && m[2]) world[m[1]] = m[2];
      }
      return { id: file.replace(/\.md$/, ""), order, world: world as unknown as WorldColors };
    })
    .sort((a, b) => a.order - b.order);
}

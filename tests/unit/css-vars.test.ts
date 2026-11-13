import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard: a `var(--name)` whose name is declared nowhere is silently dropped by the browser
 * (this is how an undefined `--world-text` removed whole rules). Every name used in
 * src/**.css and src/**.tsx must be declared in src/styles/**, be one of the generated world
 * properties (src/lib/world-css.ts), or be declared in the same file.
 */
const SRC = join(process.cwd(), "src");

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(path);
  }
  return out;
}

const DECLARED = /(--[a-zA-Z0-9_-]+)\s*:/g;
const USED = /var\(\s*(--[a-zA-Z0-9_-]+)/g;

const declaredIn = (text: string) => [...text.matchAll(DECLARED)].map((m) => m[1] as string);

/** Names written by JavaScript at runtime (style.setProperty), not visible as declarations. */
const RUNTIME: string[] = [];

// The generated world CSS: `--w-<id>-<field>` on :root and `--wd-<field>` per world block.
const worldSource = readFileSync(join(SRC, "lib", "world-css.ts"), "utf8");
const generated = (name: string) => /^--(w|wd)-/.test(name) && worldSource.includes("--wd-");

const global = new Set<string>(RUNTIME);
for (const file of walk(join(SRC, "styles"), [".css"])) {
  for (const n of declaredIn(readFileSync(file, "utf8"))) global.add(n);
}

describe("css custom properties", () => {
  const files = walk(SRC, [".css", ".tsx"]);
  it("scans files", () => expect(files.length).toBeGreaterThan(10));
  it.each(files.map((f) => [f.slice(SRC.length + 1), f] as const))(
    "%s uses only defined variables",
    (_name, file) => {
      const text = readFileSync(file, "utf8");
      const own = new Set(declaredIn(text));
      const missing = [...new Set([...text.matchAll(USED)].map((m) => m[1] as string))].filter(
        (n) => !global.has(n) && !own.has(n) && !generated(n),
      );
      expect(missing).toEqual([]);
    },
  );
});

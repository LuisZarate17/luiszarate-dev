import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { worldCss } from "../../src/lib/world-css";
import { loadWorlds } from "./worlds";

const normalise = (css: string) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};:])\s*/g, "$1")
    .trim()
    .toLowerCase();

/** The expected output: the css block under "A.4" in the spec. */
function appendixA4(): string {
  const spec = readFileSync(join(import.meta.dirname, "../../docs/design-system/SPEC.md"), "utf8");
  const section = spec.slice(spec.indexOf("### A.4"));
  const match = /```css\n([\s\S]*?)```/.exec(section);
  if (!match?.[1]) throw new Error("Appendix A.4 css block not found");
  return match[1];
}

describe("world styles", () => {
  it("generates exactly the CSS of spec Appendix A.4 for the four worlds", () => {
    const css = worldCss(loadWorlds());
    expect(normalise(css)).toBe(normalise(appendixA4()));
  });

  it("keys each block by the entry id", () => {
    const css = worldCss(loadWorlds());
    for (const id of ["labsq", "bifrost", "cougar-connect", "mastery-pilot"]) {
      expect(css).toContain(`[data-world="${id}"]`);
    }
  });

  it("emits secondary values only for worlds that have them", () => {
    const css = worldCss(loadWorlds());
    expect(css.match(/--wd-secondary-dark/g)).toHaveLength(1);
    expect(css).toContain("--w-bifrost-secondary-light: #5a45b8;");
  });
});

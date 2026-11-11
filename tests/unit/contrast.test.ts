import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance, worldIssues, worldSchema } from "../../src/lib/contrast";
import { loadWorlds } from "./worlds";

const round = (n: number) => Number(n.toFixed(2));

describe("contrast math", () => {
  it("has the right luminance at the extremes", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 10);
  });

  it("gives 21:1 for black on white, in either order", () => {
    expect(round(contrastRatio("#000000", "#FFFFFF"))).toBe(21);
    expect(round(contrastRatio("#FFFFFF", "#000000"))).toBe(21);
  });

  it("matches the spec's base measurements", () => {
    expect(round(contrastRatio("#F2EFE9", "#0B0B0D"))).toBe(17.14);
    expect(round(contrastRatio("#A19D96", "#0B0B0D"))).toBe(7.28);
    expect(round(contrastRatio("#111113", "#F4F4F2"))).toBe(17.13);
  });

  it("rejects a malformed hex value", () => {
    expect(() => contrastRatio("#FFF", "#000000")).toThrow();
  });

  // Spec 2.4: accent (text) on tint, dark theme then light theme.
  const accentOnTint: Record<string, [number, number]> = {
    labsq: [10.62, 5.56],
    bifrost: [13.59, 5.41],
    "cougar-connect": [7.11, 6.54],
    "mastery-pilot": [8.18, 6.54],
  };
  const onFill: Record<string, number> = {
    labsq: 8.64,
    bifrost: 11.36,
    "cougar-connect": 5.88,
    "mastery-pilot": 4.86,
  };

  for (const { id, world } of loadWorlds()) {
    it(`${id}: accent on tint matches spec 2.4`, () => {
      const [dark, light] = accentOnTint[id] ?? [];
      expect(round(contrastRatio(world.textDark, world.tintDark))).toBe(dark);
      expect(round(contrastRatio(world.textLight, world.tintLight))).toBe(light);
    });

    it(`${id}: on-fill on fill matches spec 2.4`, () => {
      expect(round(contrastRatio(world.onFill, world.fill))).toBe(onFill[id]);
    });
  }

  it("matches the spec's Bifrost secondary on tint (dark and light)", () => {
    const bifrost = loadWorlds().find((w) => w.id === "bifrost")?.world;
    expect(bifrost).toBeDefined();
    expect(round(contrastRatio(bifrost!.secondaryDark!, bifrost!.tintDark))).toBe(9.07);
    expect(round(contrastRatio(bifrost!.secondaryLight!, bifrost!.tintLight))).toBe(6.29);
  });
});

describe("world schema refine", () => {
  const good = {
    fill: "#F59E1B",
    onFill: "#1A1206",
    textDark: "#FFB648",
    textLight: "#8F5400",
    tintDark: "#1A1206",
    tintLight: "#FFF3DC",
  };

  it("accepts the four real worlds", () => {
    const worlds = loadWorlds();
    expect(worlds.map((w) => w.id)).toEqual([
      "labsq",
      "bifrost",
      "cougar-connect",
      "mastery-pilot",
    ]);
    for (const { id, world } of worlds) {
      const result = worldSchema.safeParse(world);
      expect(result.success, id).toBe(true);
    }
  });

  it("rejects a world whose dark text fails on its tint", () => {
    const result = worldSchema.safeParse({ ...good, textDark: "#3A2A10" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("textDark");
      expect(result.error.issues[0]?.message).toMatch(/needs at least 4\.5:1/);
    }
  });

  it("rejects text that fails on the black bar even when it passes on the tint", () => {
    const issues = worldIssues({ ...good, tintDark: "#FFFFFF", textDark: "#202020" });
    expect(issues.some((i) => i.message.includes("black bar"))).toBe(true);
  });

  it("rejects a failing light text and a failing on-fill", () => {
    expect(worldSchema.safeParse({ ...good, textLight: "#FFB648" }).success).toBe(false);
    expect(worldSchema.safeParse({ ...good, onFill: "#F59E1C" }).success).toBe(false);
  });

  it("requires both secondary values or neither", () => {
    expect(worldSchema.safeParse({ ...good, secondaryDark: "#B9A9FF" }).success).toBe(false);
    expect(worldSchema.safeParse({ ...good, secondaryLight: "#5A45B8" }).success).toBe(false);
    expect(
      worldSchema.safeParse({ ...good, secondaryDark: "#B9A9FF", secondaryLight: "#5A45B8" })
        .success,
    ).toBe(true);
  });

  it("checks a secondary pair that is present", () => {
    const failing = { ...good, secondaryDark: "#2A1F0A", secondaryLight: "#5A45B8" };
    expect(worldSchema.safeParse(failing).success).toBe(false);
  });

  it("rejects a malformed hex value", () => {
    expect(worldSchema.safeParse({ ...good, fill: "orange" }).success).toBe(false);
  });
});

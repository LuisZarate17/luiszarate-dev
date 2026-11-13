import { describe, expect, it } from "vitest";
import { PIN_QUERY as HERO_PIN_QUERY } from "../../src/lib/hero/constants";
import { PIN_QUERY, armShift, canPin, pinProgress } from "../../src/lib/scroll-stage";
import { SECTION_SELECTOR, sectionId } from "../../src/lib/timecode";

describe("scroll stage: arming", () => {
  const ok = { media: true, sceneHeight: 788, frameHeight: 788, drawerOpen: false };

  it("uses the spec 4.4 media query, the same one as the hero", () => {
    expect(PIN_QUERY).toBe(HERO_PIN_QUERY);
    expect(PIN_QUERY).toBe(
      "(min-width: 1024px) and (min-height: 760px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
  });
  it("pins when the media query holds, the scene fits and the drawer is closed", () => {
    expect(canPin(ok)).toBe(true);
    expect(canPin({ ...ok, sceneHeight: 600 })).toBe(true);
  });
  it("allows sub-pixel rounding, not a taller scene", () => {
    expect(canPin({ ...ok, sceneHeight: 788.4 })).toBe(true);
    expect(canPin({ ...ok, sceneHeight: 789 })).toBe(false);
  });
  it("fails on each condition alone", () => {
    expect(canPin({ ...ok, media: false })).toBe(false);
    expect(canPin({ ...ok, drawerOpen: true })).toBe(false);
    expect(canPin({ ...ok, sceneHeight: 900 })).toBe(false);
    expect(canPin({ ...ok, sceneHeight: 0 })).toBe(false);
  });
});

describe("scroll stage: progress", () => {
  const travel = 591; // 75% of a 788 px frame
  it("is 0 until the wrapper reaches the frame's top edge", () => {
    expect(pinProgress(-400, travel)).toBe(0);
    expect(pinProgress(0, travel)).toBe(0);
  });
  it("is linear across the hold and clamps at 1", () => {
    expect(pinProgress(travel / 2, travel)).toBe(0.5);
    expect(pinProgress(travel, travel)).toBe(1);
    expect(pinProgress(travel + 300, travel)).toBe(1);
  });
  it("is 0 when the wrapper adds no scroll (unarmed)", () => {
    expect(pinProgress(100, 0)).toBe(0);
    expect(pinProgress(100, -1)).toBe(0);
    expect(pinProgress(100, NaN)).toBe(0);
  });
});

describe("scroll stage: keeping the scene in place", () => {
  const travel = 591;
  it("does not scroll for a scene below the frame's top edge", () => {
    expect(armShift(true, -300, travel)).toBe(0);
    expect(armShift(false, -300, travel)).toBe(0);
    expect(armShift(true, 0, travel)).toBe(0);
    expect(armShift(false, 0, travel)).toBe(0);
  });
  it("disarming mid-hold gives back the scroll already spent on it", () => {
    expect(armShift(false, 200, travel)).toBe(-200);
  });
  it("disarming after the hold gives back all of it", () => {
    expect(armShift(false, travel, travel)).toBe(-travel);
    expect(armShift(false, 2000, travel)).toBe(-travel);
  });
  it("arming a scene that is already scrolling out lands past its hold", () => {
    expect(armShift(true, 200, travel)).toBe(travel);
    expect(armShift(true, 2000, travel)).toBe(travel);
  });
  it("tolerates a sub-pixel landing when arming", () => {
    expect(armShift(true, 0.6, travel)).toBe(0);
  });
  it("arm then disarm, past the hold, returns to the same scroll position", () => {
    expect(armShift(true, 900, travel) + armShift(false, 900 + travel, travel)).toBe(0);
  });
});

describe("sections with pin wrappers", () => {
  it("counts the hero wrapper, pin wrappers and plain scenes, each once", () => {
    expect(SECTION_SELECTOR.split(", ")).toEqual([
      "main > .hero-pin",
      "main > .scene-pin",
      "main > section",
    ]);
  });
  it("names a section by its id, or by the scene its wrapper holds", () => {
    expect(sectionId({ id: "cougar-connect", dataset: {} })).toBe("cougar-connect");
    expect(sectionId({ id: "", dataset: { scene: "labq" } })).toBe("labq");
    expect(sectionId({ id: "", dataset: {} })).toBeNull();
  });
});

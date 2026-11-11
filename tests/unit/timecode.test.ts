import { describe, expect, it } from "vitest";
import {
  formatTimecode,
  secondsAt,
  sectionIndexAt,
  sectionStartSeconds,
} from "../../src/lib/timecode";

describe("formatTimecode", () => {
  it("formats HH:MM:SS:FF at 24 fps", () => {
    expect(formatTimecode(0)).toBe("00:00:00:00");
    expect(formatTimecode(30)).toBe("00:00:30:00");
    expect(formatTimecode(210)).toBe("00:03:30:00");
    expect(formatTimecode(1 / 24)).toBe("00:00:00:01");
    expect(formatTimecode(1.5)).toBe("00:00:01:12");
    expect(formatTimecode(3661)).toBe("01:01:01:00");
  });
  it("never shows frame 24 or negative time", () => {
    expect(formatTimecode(0.999)).toBe("00:00:00:23");
    expect(formatTimecode(-5)).toBe("00:00:00:00");
  });
});

describe("section position", () => {
  const tops = [0, 1000, 2000, 3000];
  const end = 4000;
  it("finds the current section", () => {
    expect(sectionIndexAt(tops, -10)).toBe(0);
    expect(sectionIndexAt(tops, 999)).toBe(0);
    expect(sectionIndexAt(tops, 1000)).toBe(1);
    expect(sectionIndexAt(tops, 3999)).toBe(3);
  });
  it("is 30 s per section, linear inside", () => {
    expect(secondsAt(tops, end, 0)).toBe(0);
    expect(secondsAt(tops, end, 500)).toBe(15);
    expect(secondsAt(tops, end, 1000)).toBe(30);
    expect(secondsAt(tops, end, 4000)).toBe(120);
  });
  it("scales with however many sections exist", () => {
    const seven = Array.from({ length: 7 }, (_, i) => i * 100);
    expect(formatTimecode(secondsAt(seven, 700, 700))).toBe("00:03:30:00");
    expect(formatTimecode(secondsAt(seven, 700, 100))).toBe("00:00:30:00");
  });
  it("handles an empty page and clamps", () => {
    expect(secondsAt([], 0, 50)).toBe(0);
    expect(secondsAt(tops, end, 9999)).toBe(120);
    expect(sectionStartSeconds([], 5)).toBe(0);
  });
  it("reduced motion shows the start of the current section", () => {
    expect(sectionStartSeconds(tops, 1500)).toBe(30);
    expect(sectionStartSeconds(tops, 3500)).toBe(90);
  });
});

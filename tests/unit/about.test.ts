import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { about } from "../../src/data/about";
import { PLACEHOLDER, encodeAddress, looksLike, sentences } from "../../src/lib/about";

const root = process.cwd();
const read = (...path: string[]) => readFileSync(join(root, ...path), "utf8");

/** Every file under a directory, as paths relative to the repository root. */
function walk(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const decode = (html: string) =>
  html.replace(/<wbr>/g, "").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

describe("bio (src/data/about.ts)", () => {
  it("is three short sentences", () => {
    expect(about.bio).toHaveLength(3);
    for (const sentence of about.bio) {
      expect(sentences(sentence), sentence).toEqual([sentence]);
      expect(sentence.length).toBeLessThanOrEqual(180);
    }
    expect(sentences(about.bio.join(" "))).toHaveLength(3);
  });

  it("states the positioning and names every project on the site, and no other", () => {
    const bio = about.bio.join(" ");
    expect(bio).toContain("full-stack engineer");
    const titles = readdirSync(join(root, "src", "content", "projects"))
      .filter((file) => file.endsWith(".md"))
      .map((file) => read("src", "content", "projects", file).match(/^title: (.+)$/m)?.[1] ?? "");
    expect(titles).toHaveLength(4);
    for (const title of titles) expect(bio).toContain(title);
  });

  it("says solo and team as the content files do", () => {
    const credit = (file: string) =>
      read("src", "content", "projects", file).match(/^credit: (\w+)$/m)?.[1];
    // The second sentence calls LabQ and Bifrost solo, and the other two team builds.
    expect(about.bio[1]).toMatch(/^LabQ and Bifrost are solo projects/);
    expect(about.bio[1]).toMatch(/Cougar Connect.*Mastery Pilot.*team builds/);
    expect(credit("labq.md")).toBe("solo");
    expect(credit("bifrost.md")).toBe("solo");
    expect(credit("cougar-connect.md")).toBe("team");
    expect(credit("mastery-pilot.md")).toBe("team");
    expect(read("src", "content", "projects", "mastery-pilot.md")).toMatch(/capstone \(WSU/);
  });

  it("claims nothing the repository does not record", () => {
    // No dates, durations, employers or degrees: none are in the project files or the log.
    expect(about.bio.join(" ")).not.toMatch(
      /\d{4}|\byears?\b|\bdegree\b|\bgraduat|\bB\.?S\.?\b|\bemploy|\bsenior\b|\bexpert/i,
    );
  });
});

describe("contact details", () => {
  it("has a real address and https profile links", () => {
    expect(about.email).toMatch(/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/);
    expect(about.links.map((link) => link.label)).toEqual(["GitHub", "LinkedIn"]);
    for (const link of about.links) {
      expect(link.href).toMatch(/^https:\/\//);
      expect(link.href.replace(/^https:\/\/(www\.)?/, "")).toBe(link.text);
    }
  });

  it("writes the address as character references that read back exactly", () => {
    const html = encodeAddress(about.email);
    expect(html).not.toContain("@");
    expect(html).not.toContain(about.email);
    expect(html).toMatch(/^(?:(?:<wbr>)?&#\d+;)+$/);
    expect(decode(html)).toBe(about.email);
    expect(html.match(/<wbr>/g)).toHaveLength(1);
  });

  it("is never a mailto link, anywhere in the source", () => {
    for (const file of walk("src").filter((f) => /\.(astro|tsx?|md|css|json)$/.test(f)))
      expect(read(file), file).not.toMatch(/["'`=(]\s*mailto:/i);
  });
});

describe("nothing unfinished ships", () => {
  it("recognises placeholder wording", () => {
    for (const text of ["Lorem ipsum dolor", "Bio coming soon", "TODO: write", "me@example.com"])
      expect(text).toMatch(PLACEHOLDER);
    expect("I'm Luis Zarate, a full-stack engineer.").not.toMatch(PLACEHOLDER);
  });

  it("has no placeholder wording in the section's copy or markup", () => {
    const values = [about.email, ...about.bio, ...about.links.flatMap((l) => Object.values(l))];
    for (const value of values) expect(value).not.toMatch(PLACEHOLDER);
    expect(read("src", "data", "about.ts")).not.toMatch(PLACEHOLDER);
    expect(read("src", "components", "about", "About.astro")).not.toMatch(PLACEHOLDER);
  });

  it("recognises real files by their first bytes", () => {
    const bytes = (...values: number[]) => Uint8Array.from(values);
    const text = (value: string) => Uint8Array.from(value, (c) => c.charCodeAt(0));
    expect(looksLike("pdf", text("%PDF-1.7"))).toBe(true);
    expect(looksLike("pdf", text("<html>"))).toBe(false);
    expect(looksLike("pdf", bytes())).toBe(false);
    expect(looksLike("jpeg", bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
    expect(looksLike("png", bytes(0x89, 0x50, 0x4e, 0x47))).toBe(true);
    expect(looksLike("webp", text("RIFF\0\0\0\0WEBPVP8 "))).toBe(true);
    expect(looksLike("webp", text("RIFF\0\0\0\0WAVEfmt "))).toBe(false);
  });

  // The two optional files. Absent is fine: the section renders without them. Present, each
  // must be the real thing, not an empty or stand-in file.
  it("the photo, when added, is one real image big enough for a 96 px slot at 2x", async () => {
    const dir = join(root, "src", "assets", "about");
    if (!existsSync(dir)) return;
    const files = readdirSync(dir);
    expect(
      files.every((f) => /^photo\.(jpe?g|png|webp)$/.test(f)),
      files.join(", "),
    ).toBe(true);
    expect(files.length).toBeLessThanOrEqual(1);
    for (const file of files) {
      const path = join(dir, file);
      const kind = file.endsWith(".png") ? "png" : file.endsWith(".webp") ? "webp" : "jpeg";
      expect(looksLike(kind, readFileSync(path)), `${file} is not a ${kind} image`).toBe(true);
      expect(statSync(path).size).toBeGreaterThan(4 * 1024);
      const { default: sharp } = await import("sharp");
      const { width = 0, height = 0 } = await sharp(path).metadata();
      expect(Math.min(width, height), `${file} is ${width} x ${height}`).toBeGreaterThanOrEqual(
        192,
      );
    }
  });

  it("the resume, when added, is a real PDF", () => {
    const path = join(root, "public", "resume.pdf");
    if (!existsSync(path)) return;
    expect(looksLike("pdf", readFileSync(path)), "public/resume.pdf is not a PDF").toBe(true);
    expect(statSync(path).size).toBeGreaterThan(8 * 1024);
  });
});

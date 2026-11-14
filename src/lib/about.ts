/**
 * Pure helpers for the last section (`src/components/about/About.astro`): how the address is
 * written into the HTML, and the checks that keep unfinished content from shipping. No DOM, so
 * the unit tests run them directly.
 */

/**
 * Writes text as decimal character references, with a line-break opportunity before the `@`.
 * A browser shows, selects, copies and reads it exactly as the plain text; the page source no
 * longer holds the address as a string a simple harvester matches. It is a speed bump, not a
 * lock: anything that renders the page still sees the address, which is the point of showing it.
 */
export function encodeAddress(address: string): string {
  return [...address]
    .map((char) => `${char === "@" ? "<wbr>" : ""}&#${char.codePointAt(0)};`)
    .join("");
}

/** Wording that marks copy as unfinished. Shipped text must not match (AGENTS.md: real content only). */
export const PLACEHOLDER =
  /lorem|ipsum|placeholder|\btodo\b|\btbd\b|\bfixme\b|coming soon|your (?:name|bio|photo|email)|example\.(?:com|org)|\bxxx+\b|\bjohn doe\b/i;

/** Sentences in a paragraph: runs that end in a full stop, question mark or exclamation mark. */
export function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+(?=\s|$)/g)?.map((s) => s.trim()) ?? [];
}

/** True when the bytes start like a real file of the given kind, not an empty or stand-in file. */
export function looksLike(kind: "pdf" | "jpeg" | "png" | "webp", bytes: Uint8Array): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (kind === "pdf") return ascii(0, 5) === "%PDF-";
  if (kind === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (kind === "png") return ascii(1, 4) === "PNG" && bytes[0] === 0x89;
  return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
}

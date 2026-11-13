/**
 * Reads the decision records out of DECISIONS.md, so the "script notes" list is the file
 * itself and never a second copy. Pure: the page passes the file's text in.
 */
export interface Adr {
  /** `1` for ADR-001. */
  n: number;
  /** `ADR-001` */
  id: string;
  title: string;
  /** `accepted`, from the status line. */
  status: string;
  /** `2026-11-11` */
  date: string;
  /** GitHub's heading anchor for this record. */
  anchor: string;
}

/** The anchor GitHub gives a heading: lower case, punctuation dropped, spaces to hyphens. */
export function githubAnchor(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

export function parseAdrs(markdown: string): Adr[] {
  const adrs: Adr[] = [];
  const heading = /^## (ADR-(\d+)): (.+)$/gm;
  for (const match of markdown.matchAll(heading)) {
    const [line, id, digits, title] = match;
    if (!id || !digits || !title) continue;
    const rest = markdown.slice((match.index ?? 0) + line.length);
    const body = rest.slice(0, rest.search(/^## /m) === -1 ? undefined : rest.search(/^## /m));
    const status = /\*\*Status:\*\*\s*(\w+),\s*(\d{4}-\d{2}-\d{2})/.exec(body);
    adrs.push({
      n: Number(digits),
      id,
      title: title.trim(),
      status: status?.[1] ?? "",
      date: status?.[2] ?? "",
      anchor: githubAnchor(line.replace(/^## /, "")),
    });
  }
  return adrs;
}

/**
 * Bifrost simulation logic (SIM-SPEC section 3): the Mimir edit card as data and a small state
 * machine. The component only renders what this module describes.
 */

export type LineKind = "ctx" | "del" | "add";

export interface DiffLine {
  kind: LineKind;
  /** Line number in the file before the edit; null for an added line. */
  oldNo: number | null;
  /** Line number in the file after the edit; null for a removed line. */
  newNo: number | null;
  text: string;
}

const line = (kind: LineKind, oldNo: number | null, newNo: number | null, text: string) => ({
  kind,
  oldNo,
  newNo,
  text,
});

export const FILE_PATH = "src/main.rs";
export const USER_MESSAGE = "Now rename greet to welcome in src/main.rs, and where it's called.";

/** The twelve diff rows, exactly as in the spec. */
export const DIFF: readonly DiffLine[] = [
  line("ctx", 1, 1, "mod config;"),
  line("ctx", 2, 2, ""),
  line("del", 3, null, "fn greet(name: &str) -> String {"),
  line("add", null, 3, "fn welcome(name: &str) -> String {"),
  line("ctx", 4, 4, '    format!("Hello, {name}!")'),
  line("ctx", 5, 5, "}"),
  line("ctx", 6, 6, ""),
  line("ctx", 7, 7, "fn main() {"),
  line("del", 8, null, '    println!("{}", greet("world"));'),
  line("add", null, 8, '    println!("{}", welcome("world"));'),
  line("ctx", 9, 9, '    println!("listening on {}", config::address());'),
  line("ctx", 10, 10, "}"),
];

export const ROW_COUNT = DIFF.length;
/** One row every 60 ms while the diff types in. */
export const TYPE_INTERVAL_MS = 60;

export const countKind = (diff: readonly DiffLine[], kind: LineKind) =>
  diff.filter((l) => l.kind === kind).length;

/** The header's summary: `+2 −2`. */
export function summary(diff: readonly DiffLine[] = DIFF): string {
  return `+${countKind(diff, "add")} −${countKind(diff, "del")}`;
}

/** The file before the edit: context and removed lines. */
export const sideBefore = (diff: readonly DiffLine[] = DIFF): string[] =>
  diff.filter((l) => l.kind !== "add").map((l) => l.text);

/** The file after the edit: context and added lines. */
export const sideAfter = (diff: readonly DiffLine[] = DIFF): string[] =>
  diff.filter((l) => l.kind !== "del").map((l) => l.text);

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((s, i) => s === b[i]);

/** Apply writes exactly the diff; it refuses a file that is not the one the diff was made for. */
export function applyEdit(file: readonly string[], diff: readonly DiffLine[] = DIFF): string[] {
  if (!same(file, sideBefore(diff))) throw new Error("file does not match the diff");
  return sideAfter(diff);
}

/** Undo restores the backup taken at apply time, so the original comes back unchanged. */
export function undoEdit(applied: readonly string[], backup: readonly string[]): string[] {
  void applied;
  return [...backup];
}

// ---- state machine -------------------------------------------------------------------------

export type Phase = "typing" | "review" | "applied" | "undone" | "declined";

export interface CardState {
  phase: Phase;
  /** Rows typed so far; ROW_COUNT once typing is done. */
  typed: number;
}

export type CardEvent =
  | { type: "play" }
  | { type: "tick" }
  | { type: "apply" }
  | { type: "deny" }
  | { type: "undo" }
  | { type: "replay" }
  | { type: "scrub"; progress: number }
  | { type: "reset" };

/** The still: the Review state, complete. */
export const STILL: CardState = { phase: "review", typed: ROW_COUNT };

export function reduce(state: CardState, event: CardEvent): CardState {
  switch (event.type) {
    case "play":
      return { phase: "typing", typed: 0 };
    case "tick":
      if (state.phase !== "typing") return state;
      return state.typed + 1 >= ROW_COUNT ? STILL : { phase: "typing", typed: state.typed + 1 };
    case "apply":
      return state.phase === "review" ? { phase: "applied", typed: ROW_COUNT } : state;
    case "deny":
      return state.phase === "review" ? { phase: "declined", typed: ROW_COUNT } : state;
    case "undo":
      return state.phase === "applied" ? { phase: "undone", typed: ROW_COUNT } : state;
    case "replay":
      return state.phase === "undone" || state.phase === "declined"
        ? { phase: "typing", typed: 0 }
        : state;
    case "scrub": {
      const typed = Math.round(Math.min(1, Math.max(0, event.progress)) * ROW_COUNT);
      return typed >= ROW_COUNT ? STILL : { phase: "typing", typed };
    }
    case "reset":
      return STILL;
  }
}

export type RowView = "diff" | "plain" | "collapsed";

/** How row `i` is drawn: as a diff row, as plain file text, or collapsed away. */
export function rowView(state: CardState, i: number): RowView {
  const kind = DIFF[i]?.kind ?? "ctx";
  const settled = state.phase === "applied" || state.phase === "undone";
  if (!settled) return "diff";
  if (kind === "ctx") return "plain";
  const kept: LineKind = state.phase === "applied" ? "add" : "del";
  return kind === kept ? "plain" : "collapsed";
}

/** Whether row `i` has been typed yet (rows beyond the count stay hidden, but keep their space). */
export const rowTyped = (state: CardState, i: number) =>
  state.phase !== "typing" || i < state.typed;

export const CHIP: Record<Phase, string> = {
  typing: "Review",
  review: "Review",
  applied: "Applied",
  undone: "Undone",
  declined: "Declined",
};

/** The note under the diff, in Mimir's wording. Empty for Applied and while typing. */
export const NOTE: Record<Phase, string> = {
  typing: "",
  review:
    "Nothing has been changed yet. Applying writes exactly this — and keeps a backup, so it can be undone.",
  applied: "",
  undone: "Undone — the file is back as it was.",
  declined: "You declined. Nothing was written, and the model was told.",
};

export type ButtonId = "apply" | "deny" | "undo" | "replay";

export const BUTTONS: Record<Phase, readonly ButtonId[]> = {
  typing: ["apply", "deny"],
  review: ["apply", "deny"],
  applied: ["undo"],
  undone: ["replay"],
  declined: ["replay"],
};

export const DISK: Record<Phase, string> = {
  typing: "unchanged",
  review: "unchanged",
  applied: "edited",
  undone: "restored, byte for byte",
  declined: "unchanged",
};

/**
 * Mastery Pilot simulation logic (SIM-SPEC section 5): the real transcript and the step state
 * machine. Pure data and functions; the component only renders.
 */
export type Speaker = "student" | "tutor";

export interface TranscriptLine {
  speaker: Speaker;
  text: string;
  /** The real reply ended with this sentence; it is shown as a citation chip. */
  citation?: string;
}

const CITATION = "This is covered in algebra_linear_equations.md.";

/** A real Qwen3-4B session (the tutor's greeting is left out). Verbatim. */
export const TRANSCRIPT: readonly TranscriptLine[] = [
  { speaker: "student", text: "I need help solving 2x + 6 = 14 for x." },
  {
    speaker: "tutor",
    text: "What is the first step you would take to solve the equation 2x + 6 = 14?",
  },
  { speaker: "student", text: "20" },
  {
    speaker: "tutor",
    text: "Subtract 6 from both sides to isolate the term with the variable. What does that give you?",
    citation: CITATION,
  },
  { speaker: "student", text: "Oh, 8." },
  {
    speaker: "tutor",
    text: "You are right! Subtracting 6 from both sides gives you 2x = 8. What is the next step to solve for x?",
    citation: CITATION,
  },
  { speaker: "student", text: "So x is 4?" },
  {
    speaker: "tutor",
    text: "You are right! Dividing both sides by 2 gives you x = 4. What is the next step after finding x = 4?",
    citation: CITATION,
  },
];

export const STEPS = 4;

/** The pause between a student line and the tutor's reply, in ms (SIM-SPEC section 5). */
export const REPLY_PAUSE = 500;

export interface MasteryState {
  /** Exchange 1..4. Exchange n is lines 2n-1 (student) and 2n (tutor). */
  step: number;
  /** Whether the tutor's line of this exchange is out yet. */
  replied: boolean;
  /** False for the still: the whole transcript shows and only Restart is offered. */
  engaged: boolean;
}

/** The still: all eight lines, nothing engaged. */
export const STILL: MasteryState = { step: STEPS, replied: true, engaged: false };

/** Play, or Restart: the first exchange (lines 1 and 2) appears, then it waits. */
export function start(): MasteryState {
  return { step: 1, replied: true, engaged: true };
}

export function isComplete(s: MasteryState): boolean {
  return s.step === STEPS && s.replied;
}

/** The student speaks their next real line; the tutor's reply follows after REPLY_PAUSE. */
export function answer(s: MasteryState): MasteryState {
  if (!s.engaged || s.step >= STEPS || !s.replied) return s;
  return { step: s.step + 1, replied: false, engaged: true };
}

/** The tutor's reply to the line just spoken. */
export function reply(s: MasteryState): MasteryState {
  return s.replied ? s : { ...s, replied: true };
}

export function showAll(): MasteryState {
  return { step: STEPS, replied: true, engaged: true };
}

/** Which of the eight lines are visible. Hidden lines still take their space in the layout. */
export function visibleLines(s: MasteryState): boolean[] {
  const count = (s.step - 1) * 2 + (s.replied ? 2 : 1);
  return TRANSCRIPT.map((_, i) => i < count);
}

/** The student's next real line, or null when the session is over. */
export function nextStudentLine(step: number): string | null {
  const line = TRANSCRIPT[step * 2];
  return line ? line.text : null;
}

/** The main button's label: `Answer "20"`, then `Answer "Oh, 8."`, then `Answer "So x is 4?"`. */
export function answerLabel(step: number): string | null {
  const next = nextStudentLine(step);
  return next === null ? null : `Answer "${next}"`;
}

export function meter(s: MasteryState): string {
  return `${s.step} of ${STEPS}`;
}

/** The readout while stepping: tutor replies shown so far that cite the curriculum, of those shown. */
export function citationsShown(s: MasteryState): { cited: number; replies: number } {
  const visible = visibleLines(s);
  const shown = TRANSCRIPT.filter((l, i) => l.speaker === "tutor" && visible[i]);
  return { cited: shown.filter((l) => l.citation).length, replies: shown.length };
}

/** Tutor replies that cite the curriculum, and all tutor replies. */
export function citationCount(): { cited: number; replies: number } {
  const tutor = TRANSCRIPT.filter((l) => l.speaker === "tutor");
  return { cited: tutor.filter((l) => l.citation).length, replies: tutor.length };
}

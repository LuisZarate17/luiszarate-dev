import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  type Ref,
} from "react";
import {
  BUTTONS,
  CHIP,
  DIFF,
  DISK,
  FILE_PATH,
  NOTE,
  TYPE_INTERVAL_MS,
  USER_MESSAGE,
  STILL_SESSION,
  isPlaying,
  reduceSession,
  rowTexts,
  rowTyped,
  rowView,
  summary,
  type ButtonId,
  type CardEvent,
} from "../../../lib/sim/bifrost";
import { Controls, SimButton } from "../Controls";
import { usePlayOnView, useReducedMotion } from "../hooks";
import { Readout } from "../Readout";
import { SimStage } from "../SimStage";
import type { SimHandle } from "../types";
import "./bifrost.css";

const MARK = { ctx: "", del: "−", add: "+" } as const;
const LABEL: Record<ButtonId, string> = {
  apply: "Apply edit",
  deny: "Deny",
  undo: "Undo",
  replay: "Replay",
};
const EVENT: Record<ButtonId, CardEvent> = {
  apply: { type: "apply" },
  deny: { type: "deny" },
  undo: { type: "undo" },
  replay: { type: "replay" },
};

function Pencil() {
  return (
    <svg
      className="bifrost-icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 13.5 3 10l7.5-7.5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L6 13l-3.5.5Z" />
    </svg>
  );
}

/**
 * The Mimir edit card rebuilt in site tokens. The first render is the Review state, complete
 * (the still, the no-JS view and the reduced-motion view); playing types the diff in, and the
 * buttons below the stage walk Review, Applied, Undone and Declined.
 */
export const BifrostSim = forwardRef(function BifrostSim(_props: object, ref: Ref<SimHandle>) {
  const reduced = useReducedMotion();
  const [session, dispatch] = useReducer(reduceSession, STILL_SESSION);
  const state = session.card;
  const stageRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  const send = useCallback(
    (event: CardEvent) => {
      // Reduced motion: no typing, the end state at once.
      if (reduced && (event.type === "play" || event.type === "replay")) {
        dispatch({ type: "reset" });
      } else dispatch(event);
    },
    [reduced],
  );

  const play = useCallback(() => send({ type: "play" }), [send]);
  usePlayOnView(stageRef, play);

  useImperativeHandle(
    ref,
    () => ({
      play,
      reset: () => dispatch({ type: "reset" }),
      setProgress: (progress: number) => dispatch({ type: "scrub", progress }),
    }),
    [play],
  );

  // Only real play types; a scrubbed frame is held still.
  const typing = isPlaying(state);
  useEffect(() => {
    if (!typing) return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), TYPE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [typing]);

  // Buttons are keyed by position, so Apply, Undo and Replay are one element and keep focus.
  // A button with no successor (Deny) is removed: move focus to the first button then, but
  // only if focus is still in the sim (or lost to the body), never if the visitor moved on.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    const active = document.activeElement;
    const root = controlsRef.current?.closest(".sim") ?? controlsRef.current;
    if (active && active !== document.body && !root?.contains(active)) return;
    controlsRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [state.phase]);

  const press = (id: ButtonId) => {
    moveFocus.current = true;
    send(EVENT[id]);
  };

  const texts = rowTexts(state, session.file);

  return (
    <SimStage
      stageRef={stageRef}
      controls={
        <>
          <div ref={controlsRef}>
            <Controls label="Edit card controls">
              {BUTTONS[state.phase].map((id, i) => (
                <SimButton key={i} onClick={() => press(id)} busy={typing}>
                  {LABEL[id]}
                </SimButton>
              ))}
            </Controls>
          </div>
          <Readout
            items={[
              { label: "state", value: CHIP[state.phase] },
              { label: "file on disk", value: DISK[state.phase] },
            ]}
          />
        </>
      }
    >
      <div className="sim-still bifrost" data-sim-state={state.phase}>
        <p className="bifrost-bubble text-small">{USER_MESSAGE}</p>
        <div className="bifrost-card">
          <div className="bifrost-head">
            <Pencil />
            <span className="bifrost-title">Edit file</span>
            <span className="bifrost-path font-mono">{FILE_PATH}</span>
            <span className="bifrost-sum font-mono">{summary()}</span>
            <span className="bifrost-chip font-mono text-meta uppercase">{CHIP[state.phase]}</span>
          </div>
          <div
            className="bifrost-diff font-mono"
            role="region"
            aria-label={`Diff of ${FILE_PATH}`}
            tabIndex={0}
          >
            {DIFF.map((l, i) => {
              const view = rowView(state, i);
              return (
                <div
                  className="bifrost-row"
                  key={i}
                  data-kind={l.kind}
                  data-view={view}
                  data-typed={rowTyped(state, i) ? "yes" : "no"}
                  aria-hidden={view === "collapsed" || !rowTyped(state, i) ? true : undefined}
                >
                  <span className="bifrost-ln bifrost-old">{l.oldNo ?? ""}</span>
                  <span className="bifrost-ln bifrost-new">{l.newNo ?? ""}</span>
                  <span className="bifrost-mark" aria-hidden="true">
                    {MARK[l.kind]}
                  </span>
                  <span className="bifrost-text">{texts[i]}</span>
                </div>
              );
            })}
          </div>
          <p className="bifrost-note text-small">{NOTE[state.phase]}</p>
        </div>
      </div>
    </SimStage>
  );
});

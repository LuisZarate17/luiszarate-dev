import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  REPLY_PAUSE,
  STEPS,
  STILL,
  TRANSCRIPT,
  answer,
  answerLabel,
  citationCount,
  isComplete,
  meter,
  reply,
  showAll,
  start,
  visibleLines,
  type MasteryState,
} from "../../../lib/sim/mastery";
import { Controls, SimButton } from "../Controls";
import { usePlayOnView, useReducedMotion } from "../hooks";
import { Readout } from "../Readout";
import { SimStage } from "../SimStage";
import type { SimHandle } from "../types";
import "./mastery.css";

/**
 * Mastery Pilot: the visitor steps through a real tutoring session, speaking the student's
 * lines. The first render is the still (all eight lines); unrevealed lines keep their space
 * with `visibility: hidden`, so the stage never changes size.
 */
export const MasterySim = forwardRef<SimHandle>(function MasterySim(_props, handle) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<MasteryState>(STILL);
  const [live, setLive] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const userDriven = useRef(false);

  useEffect(() => setLive(true), []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const set = useCallback((next: MasteryState) => {
    clearTimeout(timer.current);
    setState(next);
  }, []);

  const play = useCallback(() => set(start()), [set]);
  const reset = useCallback(() => set(STILL), [set]);
  const setProgress = useCallback(
    (p: number) => {
      if (p >= 1) return set(showAll());
      if (p <= 0) return set(STILL);
      set({ step: Math.min(STEPS, 1 + Math.floor(p * STEPS)), replied: true, engaged: true });
    },
    [set],
  );
  useImperativeHandle(handle, () => ({ play, reset, setProgress }), [play, reset, setProgress]);
  usePlayOnView(stageRef, play);

  const onAnswer = () => {
    userDriven.current = true;
    const asked = answer(state);
    if (asked === state) return;
    if (reduced) return set(reply(asked));
    set(asked);
    timer.current = setTimeout(() => setState((s) => reply(s)), REPLY_PAUSE);
  };
  const onShowAll = () => {
    userDriven.current = true;
    set(showAll());
  };
  const onRestart = () => {
    userDriven.current = true;
    set(start());
  };

  const done = isComplete(state);
  const visible = visibleLines(state);
  const label = answerLabel(state.step);
  const { cited, replies } = citationCount();

  // The main button leaves at the end of the session; keep the keyboard where it was.
  useEffect(() => {
    if (state.engaged && done && userDriven.current) restartRef.current?.focus();
  }, [state.engaged, done]);

  return (
    <SimStage
      label={done ? "The whole session is shown." : `Exchange ${meter(state)} is shown.`}
      stageRef={stageRef}
      controls={
        <>
          <Controls label="Mastery Pilot controls">
            {live && state.engaged && label !== null && (
              <SimButton onClick={onAnswer} disabled={!state.replied}>
                {label}
              </SimButton>
            )}
            {live && state.engaged && !done && <SimButton onClick={onShowAll}>Show all</SimButton>}
            {live && (
              <button
                type="button"
                className="sim-btn text-control"
                onClick={onRestart}
                ref={restartRef}
              >
                Restart
              </button>
            )}
          </Controls>
          <Readout
            items={
              done
                ? [{ label: "Replies citing the curriculum", value: `${cited} of ${replies}` }]
                : []
            }
          />
        </>
      }
    >
      <div className="sim-still mastery-sim" data-sim-state={state.engaged ? "stepping" : "still"}>
        <p className="mastery-meter font-mono text-meta uppercase" data-testid="mastery-meter">
          {meter(state)}
        </p>
        <ol className="mastery-lines">
          {TRANSCRIPT.map((line, i) => (
            <li
              key={i}
              className="mastery-row"
              data-speaker={line.speaker}
              data-visible={visible[i] ? "true" : "false"}
            >
              <span className="mastery-who font-mono text-meta uppercase">{line.speaker}</span>
              <span className="mastery-text text-small">
                {line.text}
                {line.citation && (
                  <span className="mastery-chip font-mono text-meta">{line.citation}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </SimStage>
  );
});

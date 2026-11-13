import type { ReactNode, Ref } from "react";

interface Props {
  /** Text alternative for the stage: the current end state in words. */
  label: string;
  /** The stage content. Its first render is the still. */
  children: ReactNode;
  /** Controls and readout, drawn below the stage. */
  controls?: ReactNode;
  stageRef?: Ref<HTMLDivElement>;
  /** Marks a canvas stage (`role="img"`); DOM cards leave it off and keep real text. */
  img?: boolean;
}

/** `div.sim-stage` plus the controls beneath it. The island draws both (see SimSlot.astro). */
export function SimStage({ label, children, controls, stageRef, img }: Props) {
  return (
    <>
      <div
        className="sim-stage"
        ref={stageRef}
        {...(img ? { role: "img", "aria-label": label } : { "data-label": label })}
      >
        {children}
      </div>
      {controls}
    </>
  );
}

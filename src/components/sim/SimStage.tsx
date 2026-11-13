import type { ReactNode, Ref } from "react";

interface Props {
  /** Text alternative for a canvas stage (`img`): the current end state in words. DOM cards keep real text and need none. */
  label?: string;
  /** The stage content. Its first render is the still. */
  children: ReactNode;
  /** Controls and readout, drawn below the stage. */
  controls?: ReactNode;
  stageRef?: Ref<HTMLDivElement>;
  /**
   * A polite announcement for screen readers, kept in a visually hidden live region. Pass the
   * text of a settled change (a new tutor line), never per-frame state. DOM cards keep real
   * text, so this is only for what appears without the reader moving.
   */
  announce?: string;
  /** Marks a canvas stage (`role="img"`); DOM cards leave it off and keep real text. */
  img?: boolean;
}

/** `div.sim-stage` plus the controls beneath it. The island draws both (see SimSlot.astro). */
export function SimStage({ label, children, controls, stageRef, img, announce }: Props) {
  return (
    <>
      <div
        className="sim-stage"
        ref={stageRef}
        {...(img ? { role: "img", "aria-label": label } : {})}
      >
        {children}
      </div>
      {announce !== undefined && (
        <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="sim-announce">
          {announce}
        </div>
      )}
      {controls}
    </>
  );
}

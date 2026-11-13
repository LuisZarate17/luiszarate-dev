import { useCallback, useRef, useState } from "react";
import { Controls, SimButton } from "../Controls";
import { usePlayOnView, useReducedMotion } from "../hooks";
import { Readout } from "../Readout";
import { SimStage } from "../SimStage";

/**
 * Test fixture for the simulation slot, not a real simulation. It exists only in builds made
 * with PUBLIC_SIM_PROBE=1 (see registry.ts). The first render is the still ("idle"); playing
 * moves it to "played", and reduced motion starts there.
 */
export function Probe() {
  const reduced = useReducedMotion();
  const [played, setPlayed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const play = useCallback(() => setPlayed(true), []);
  usePlayOnView(ref, play);
  const done = played || reduced;

  return (
    <SimStage
      label={done ? "Probe finished." : "Probe waiting."}
      stageRef={ref}
      controls={
        <>
          <Controls label="Probe controls">
            <SimButton onClick={() => setPlayed(true)} pressed={done}>
              Play probe
            </SimButton>
            <SimButton onClick={() => setPlayed(false)} disabled={!done && !reduced}>
              Reset probe
            </SimButton>
          </Controls>
          <Readout items={[{ label: "state", value: done ? "played" : "idle" }]} />
        </>
      }
    >
      <div className="sim-still" data-sim-state={done ? "played" : "idle"}>
        {done ? "played" : "idle"}
      </div>
    </SimStage>
  );
}

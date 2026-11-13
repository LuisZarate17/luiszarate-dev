import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  CREDIT,
  LEDGER,
  clampPosition,
  commitUrl,
  flippedCount,
  isFlipped,
  positionFromPointer,
  stepPosition,
  tweenPosition,
  valueText,
} from "../../../lib/sim/cougar";
import { DUR } from "../../../lib/sim/timing";
import { Controls, SimButton } from "../Controls";
import { usePlayOnView, useReducedMotion } from "../hooks";
import { Readout } from "../Readout";
import { SimStage } from "../SimStage";
import type { SimHandle } from "../types";
import "./cougar.css";

/** The divider starts at 2026: the still, the no-JS view and the reduced-motion view. */
const STILL = 100;

export const CougarSim = forwardRef<SimHandle>(function CougarSim(_props, ref) {
  const reduced = useReducedMotion();
  const [pos, setPos] = useState(STILL);
  // What the readout announces: it follows the divider only when a move settles, not per frame.
  const [settled, setSettled] = useState(STILL);
  // The slider role exists only once hydrated: before that the handle is inert, so it is not
  // announced or tabbable. Same element and size either way, so nothing shifts.
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(STILL);
  const frame = useRef(0);
  const dragging = useRef(false);

  const stopTween = useCallback(() => {
    cancelAnimationFrame(frame.current);
  }, []);

  const jump = useCallback(
    (p: number) => {
      stopTween();
      const next = clampPosition(p);
      posRef.current = next;
      setPos(next);
      setSettled(next);
    },
    [stopTween],
  );

  const glide = useCallback(
    (from: number, to: number) => {
      stopTween();
      if (reduced || from === to) {
        jump(to);
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const p = tweenPosition(from, to, elapsed);
        posRef.current = p;
        setPos(p);
        if (elapsed >= DUR.cut) {
          jump(to);
          return;
        }
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [jump, reduced, stopTween],
  );

  useEffect(() => stopTween, [stopTween]);

  const play = useCallback(() => {
    posRef.current = 0;
    setPos(0);
    glide(0, 100);
  }, [glide]);

  useImperativeHandle(
    ref,
    () => ({
      play,
      reset: () => jump(STILL),
      setProgress: (p: number) => jump(p * 100),
    }),
    [play, jump],
  );

  usePlayOnView(stageRef, play);

  const move = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = positionFromPointer(clientX, rect.left, rect.width);
    posRef.current = next;
    setPos(next);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    stopTween();
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    move(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) move(e.clientX);
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setSettled(posRef.current);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = stepPosition(posRef.current, e.key);
    if (next === null) return;
    e.preventDefault();
    jump(next);
  };

  const count = flippedCount(pos);
  return (
    <SimStage
      stageRef={stageRef}
      controls={
        <>
          <Controls label="Cougar Connect controls">
            <SimButton onClick={() => glide(posRef.current, 0)} pressed={settled === 0}>
              2024
            </SimButton>
            <SimButton onClick={() => glide(posRef.current, 100)} pressed={settled === 100}>
              2026
            </SimButton>
          </Controls>
          <Readout items={[{ label: "2026 rows shown", value: `${flippedCount(settled)} of 5` }]} />
        </>
      }
    >
      <div className="sim-still cougar" data-sim-state={count}>
        <div className="cougar-heads font-mono text-meta uppercase" aria-hidden="true">
          <span>2024 · team of 3</span>
          <span>2026 · solo</span>
        </div>
        <div className="cougar-body">
          <ol className="cougar-rows">
            {LEDGER.map((row) => {
              const flipped = isFlipped(row, pos);
              return (
                <li className="cougar-row" data-flipped={flipped} key={row.label}>
                  <span className="cougar-label font-mono text-meta uppercase">{row.label}</span>
                  <span className="cougar-cell cougar-before text-small">
                    <span className="cougar-year font-mono text-meta">2024</span>
                    <span className="cougar-mark" aria-hidden="true" />
                    {row.before}
                  </span>
                  <span className="cougar-cell cougar-after text-small">
                    <span className="cougar-year font-mono text-meta">2026</span>
                    <span className="cougar-mark" aria-hidden="true" />
                    {row.after}
                    <span className="cougar-hashes font-mono text-meta">
                      {row.commits.map((c) => (
                        <a key={c.hash} href={commitUrl(c)}>
                          {c.short}
                        </a>
                      ))}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="cougar-track" ref={trackRef}>
            <div className="cougar-line" style={{ left: `${pos}%` }} aria-hidden="true" />
            <div
              className="cougar-handle"
              style={{ left: `${pos}%` }}
              {...(live
                ? {
                    role: "slider",
                    tabIndex: 0,
                    "aria-label": "Compare 2024 and 2026",
                    "aria-orientation": "horizontal" as const,
                    "aria-valuemin": 0,
                    "aria-valuemax": 100,
                    "aria-valuenow": Math.round(pos),
                    "aria-valuetext": valueText(pos),
                    onPointerDown,
                    onPointerMove,
                    onPointerUp: onPointerEnd,
                    onPointerCancel: onPointerEnd,
                    onKeyDown,
                  }
                : {})}
            >
              <span className="cougar-grip" aria-hidden="true" />
            </div>
          </div>
        </div>
        <p className="cougar-credit text-small">{CREDIT}</p>
      </div>
    </SimStage>
  );
});

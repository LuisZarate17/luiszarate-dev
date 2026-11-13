import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controls, SimButton } from "../Controls";
import { usePlayOnView, useReducedMotion } from "../hooks";
import { Readout } from "../Readout";
import { SimStage } from "../SimStage";
import type { SimHandle } from "../types";
import { readWorldColors, type WorldColors } from "../worldColors";
import {
  ARIA_LABEL,
  COUNTER_LABELS,
  END_COUNTERS,
  SEQUENCE_MS,
  countersAt,
  countersList,
  dotsAt,
  makeLayout,
  runDuration,
  sequenceAt,
  staggers,
  type Layout,
  type Run,
} from "../../../lib/sim/labq";
import "./labq.css";

const STAGGER = staggers();
const TALL = makeLayout(306, 400);
const BAND = makeLayout(358, 126);
const HEAD: Record<Run, string> = { without: "Before", with: "After" };
const LONG: Record<Run, string> = {
  without: "Before · without the constraint",
  with: "After · with the constraint",
};

/** One still panel: a run's end state as inline SVG, drawn from the same layout as the canvas. */
function Panel({ run, layout, kind }: { run: Run; layout: Layout; kind: "tall" | "band" }) {
  const small = layout.h < 150;
  const dots = dotsAt(layout, run, Infinity, STAGGER);
  const counts = countersList(END_COUNTERS[run]);
  const { slot } = layout;
  return (
    <svg
      className={`labq-panel labq-panel--${kind}`}
      data-run={run}
      viewBox={`0 0 ${layout.w} ${layout.h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <rect className="labq-frame" x={0.5} y={0.5} width={layout.w - 1} height={layout.h - 1} />
      <text className="labq-t labq-t--head" x={layout.header.x} y={layout.header.y}>
        {HEAD[run]}
      </text>
      <text className={`labq-t${small ? " labq-t--small" : ""}`} x={slot.x} y={layout.slotLabel.y}>
        15:00 – 17:00
      </text>
      <rect className="labq-slot" x={slot.x} y={slot.y} width={slot.w} height={slot.h} />
      {run === "with" && (
        <>
          <line
            className="labq-constraint"
            x1={slot.x}
            y1={slot.y}
            x2={slot.x}
            y2={slot.y + slot.h}
          />
          <text
            className={`labq-t labq-t--accent${small ? " labq-t--small" : ""}`}
            x={layout.constraintLabel.x}
            y={layout.constraintLabel.y}
          >
            reservations_no_overlap
          </text>
          <text
            className={`labq-t${small ? " labq-t--small" : ""}`}
            x={layout.refusalLabel.x}
            y={layout.refusalLabel.y}
          >
            49 × 409
          </text>
        </>
      )}
      {dots.map((d, i) =>
        d.filled ? (
          <circle key={i} className="labq-dot" cx={d.x} cy={d.y} r={layout.r} />
        ) : (
          <circle key={i} className="labq-ring" cx={d.x} cy={d.y} r={layout.r - 0.6} />
        ),
      )}
      {layout.counters.map((c, i) => (
        <g key={i}>
          <text
            className={`labq-t${small ? " labq-t--small" : ""}`}
            x={c.lx}
            y={c.ly}
            textAnchor="start"
          >
            {COUNTER_LABELS[i]}
          </text>
          <text
            className={`labq-v${small ? " labq-v--small" : ""}`}
            x={c.vx}
            y={c.vy}
            textAnchor={c.align}
          >
            {counts[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

interface Frame {
  run: Run;
  t: number;
}

function drawFrame(
  canvas: HTMLCanvasElement,
  colors: WorldColors,
  mono: string,
  sans: string,
  frame: Frame,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = canvas.width / w;
  const l = makeLayout(w, h);
  const { slot } = l;
  const small = h < 150;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.textBaseline = "alphabetic";
  const label = (text: string, p: { x: number; y: number }, color: string, align = "left") => {
    ctx.font = `${small ? 8 : 10}px ${mono}`;
    ctx.fillStyle = color;
    ctx.textAlign = align as CanvasTextAlign;
    ctx.fillText(text, p.x, p.y);
  };
  label(LONG[frame.run].toUpperCase(), l.header, colors.text);
  label("15:00 – 17:00", l.slotLabel, colors.muted);
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(slot.x + 0.5, slot.y + 0.5, slot.w, slot.h);
  ctx.setLineDash([]);
  if (frame.run === "with") {
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(slot.x + 0.5, slot.y);
    ctx.lineTo(slot.x + 0.5, slot.y + slot.h);
    ctx.stroke();
    label("reservations_no_overlap", l.constraintLabel, colors.accent);
    if (frame.t >= runDuration("with")) label("49 × 409", l.refusalLabel, colors.muted);
  }
  for (const d of dotsAt(l, frame.run, frame.t, STAGGER)) {
    ctx.beginPath();
    if (d.filled) {
      ctx.fillStyle = colors.accent;
      ctx.arc(d.x, d.y, l.r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = colors.muted;
      ctx.lineWidth = 1.25;
      ctx.arc(d.x, d.y, l.r - 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const counts = countersList(countersAt(frame.run, frame.t));
  l.counters.forEach((c, i) => {
    label(COUNTER_LABELS[i]?.toUpperCase() ?? "", { x: c.lx, y: c.ly }, colors.muted);
    ctx.font = `600 ${small ? 12 : 15}px ${sans}`;
    ctx.fillStyle = colors.accent;
    ctx.textAlign = c.align === "end" ? "right" : "left";
    ctx.fillText(counts[i] ?? "", c.vx, c.vy);
  });
}

type Settled = Run | null;
const READOUT_LABELS = ["Confirmed", "Refused 409", "Overlapping pairs"];

export const LabQSim = forwardRef<SimHandle>(function LabQSim(_props, handle) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const frame = useRef<Frame>({ run: "with", t: runDuration("with") });
  const colors = useRef<WorldColors | null>(null);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<Run>("with");
  const [picked, setPicked] = useState<Run | null>(null);
  const [settled, setSettled] = useState<Settled>("with");
  const showCanvas = live && !reduced;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    colors.current ??= readWorldColors(stage);
    const style = getComputedStyle(stage);
    const mono = style.getPropertyValue("--font-mono").trim() || "monospace";
    const sans = style.getPropertyValue("--font-sans").trim() || "sans-serif";
    drawFrame(canvas, colors.current, mono, sans, frame.current);
  }, []);

  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    draw();
  }, [draw]);

  // Size the canvas to the stage, redraw on resize and when the theme changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!showCanvas || !canvas || !stage) return;
    colors.current = readWorldColors(stage);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    const theme = new MutationObserver(() => {
      colors.current = readWorldColors(stage);
      draw();
    });
    theme.observe(document.documentElement, { attributes: true });
    void document.fonts?.ready.then(draw);
    return () => {
      ro.disconnect();
      theme.disconnect();
    };
  }, [showCanvas, fit, draw]);

  const stop = useCallback(() => cancelAnimationFrame(raf.current), []);

  /** Runs the sequence (without, hold, with) or a single run; settles the readout at the ends. */
  const animate = useCallback(
    (kind: "sequence" | Run) => {
      stop();
      setLive(true);
      setPicked(null);
      setSettled(null);
      const total = kind === "sequence" ? SEQUENCE_MS : runDuration(kind);
      frame.current = { run: kind === "sequence" ? "without" : kind, t: 0 };
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = Math.min(now - start, total);
        if (kind === "sequence") {
          const f = sequenceAt(elapsed);
          frame.current = { run: f.run, t: f.t };
          setSelected(f.run);
          setSettled(f.holding ? "without" : null);
        } else {
          frame.current = { run: kind, t: elapsed };
        }
        draw();
        if (elapsed < total) raf.current = requestAnimationFrame(step);
        else setSettled(kind === "sequence" ? "with" : kind);
      };
      raf.current = requestAnimationFrame(step);
    },
    [draw, stop],
  );

  const choose = useCallback(
    (run: Run) => {
      setSelected(run);
      if (reduced) {
        stop();
        setPicked(run);
        setSettled(run);
        return;
      }
      frame.current = { run, t: 0 };
      animate(run);
    },
    [reduced, animate, stop],
  );

  const play = useCallback(() => {
    if (reduced) {
      setSelected("with");
      setSettled("with");
      return;
    }
    animate("sequence");
  }, [reduced, animate]);

  const reset = useCallback(() => {
    stop();
    setLive(false);
    setPicked(null);
    setSelected("with");
    setSettled("with");
    frame.current = { run: "with", t: runDuration("with") };
  }, [stop]);

  const setProgress = useCallback(
    (p: number) => {
      stop();
      const elapsed = Math.min(1, Math.max(0, p)) * SEQUENCE_MS;
      const f = sequenceAt(elapsed);
      frame.current = { run: f.run, t: f.t };
      setLive(true);
      setSelected(f.run);
      setSettled(p >= 1 ? "with" : f.holding ? "without" : null);
      draw();
    },
    [draw, stop],
  );

  useImperativeHandle(handle, () => ({ play, reset, setProgress }), [play, reset, setProgress]);
  useEffect(() => stop, [stop]);
  // A live switch to reduced motion drops the animation and shows the end state.
  useEffect(() => {
    if (reduced) stop();
  }, [reduced, stop]);
  usePlayOnView(stageRef, play);

  const shown = settled ?? (reduced ? selected : null);
  const counters = useMemo(
    () => (shown ? countersList(END_COUNTERS[shown]) : ["0", "0", "0"]),
    [shown],
  );
  const state = showCanvas ? (settled ?? "running") : "still";

  return (
    <SimStage
      img
      label={ARIA_LABEL}
      stageRef={stageRef}
      controls={
        <>
          <Controls label="LabQ simulation controls">
            <SimButton onClick={() => choose("without")} pressed={selected === "without"}>
              Without constraint
            </SimButton>
            <SimButton onClick={() => choose("with")} pressed={selected === "with"}>
              With constraint
            </SimButton>
            <SimButton onClick={() => (reduced ? play() : animate("sequence"))}>Replay</SimButton>
          </Controls>
          <Readout
            items={READOUT_LABELS.map((label, i) => ({ label, value: counters[i] ?? "" }))}
          />
        </>
      }
    >
      {showCanvas ? (
        <canvas ref={canvasRef} className="labq-canvas" data-sim-state={state} />
      ) : (
        <div className="labq-still sim-still" data-sim-state={state} data-picked={picked ?? ""}>
          <Panel run="without" layout={TALL} kind="tall" />
          <Panel run="with" layout={TALL} kind="tall" />
          <Panel run="without" layout={BAND} kind="band" />
          <Panel run="with" layout={BAND} kind="band" />
        </div>
      )}
    </SimStage>
  );
});

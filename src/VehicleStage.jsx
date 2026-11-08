import { useEffect, useRef, useState } from "react";
import { VEHICLES, BY_KEY, ORDER, GROUND, VIEW } from "./vehicles";

const SCAN_MESSAGES = [
  "Querying NHTSA vehicle records…",
  "Reading body style…",
  "Reading engine configuration…",
  "Cross-checking trim data…",
  "Finalizing specification…",
];

function Wheel({ cx, cy, r }) {
  const spokes = [0, 72, 144, 216, 288];
  return (
    <g className="wheel">
      <circle cx={cx} cy={cy} r={r} className="tire" />
      <circle cx={cx} cy={cy} r={r * 0.66} className="rim" />
      <g className="spokes" style={{ transformOrigin: cx + "px " + cy + "px" }}>
        {spokes.map((deg) => (
          <line key={deg} x1={cx} y1={cy} x2={cx} y2={cy - r * 0.62} transform={"rotate(" + deg + " " + cx + " " + cy + ")"} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={r * 0.14} className="hub" />
    </g>
  );
}

function VehicleShape({ v }) {
  return (
    <>
      <path d={v.body} className="body" />
      {v.glass.map((d, i) => <path key={"g" + i} d={d} className="glass" />)}
      {v.lines.map((d, i) => <path key={"l" + i} d={d} className="line" />)}
      {v.lights.map((d, i) => <path key={"t" + i} d={d} className="light" />)}
      {v.wheels.map((w, i) => <Wheel key={"w" + i} {...w} />)}
    </>
  );
}

// Small static icon of one body type (used on garage cards).
export function VehicleMini({ type }) {
  const v = BY_KEY[type] || BY_KEY.sedan;
  return (
    <svg className="mini-svg" viewBox={"0 0 " + VIEW.w + " " + (GROUND + 8)} aria-hidden="true">
      <VehicleShape v={v} />
    </svg>
  );
}

/*
  phase:
    idle  - slow ambient cycling
    scan  - fast cycling while the lookup is in flight
    land  - slows down and stops on `target`, then calls onLanded
    done  - parked on `target`
*/
export default function VehicleStage({ phase, target, onLanded, caption }) {
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const idxRef = useRef(0);
  const landedRef = useRef(onLanded);

  useEffect(() => { landedRef.current = onLanded; }, [onLanded]);

  useEffect(() => {
    const n = ORDER.length;
    const go = (i) => { idxRef.current = i; setIdx(i); setTick((t) => t + 1); };

    if (phase === "scan" || phase === "idle") {
      const ms = phase === "scan" ? 170 : 3200;
      const id = setInterval(() => go((idxRef.current + 1) % n), ms);
      return () => clearInterval(id);
    }

    if (phase === "land") {
      const t = Math.max(0, ORDER.indexOf(target || "sedan"));
      const base = idxRef.current;
      const steps = ((t - base + n) % n) + n; // at least one more full lap
      const timers = [];
      let at = 0;
      for (let i = 0; i < steps; i++) {
        const p = (i + 1) / steps;
        at += 100 + 420 * p * p * p; // each flip takes longer than the last
        const next = (base + i + 1) % n;
        timers.push(setTimeout(() => go(next), at));
      }
      timers.push(setTimeout(() => landedRef.current && landedRef.current(), at + 500));
      return () => timers.forEach(clearTimeout);
    }

    if (phase === "done" && target && ORDER.includes(target)) {
      idxRef.current = ORDER.indexOf(target); // so the next scan starts from here
    }
    return undefined;
  }, [phase, target]);

  const parked = phase === "done" && target && ORDER.includes(target);
  const activeKey = ORDER[parked ? ORDER.indexOf(target) : idx];
  const label = BY_KEY[activeKey].label;
  const busy = phase === "scan" || phase === "land";
  const status =
    phase === "scan" ? SCAN_MESSAGES[tick % SCAN_MESSAGES.length]
    : phase === "land" ? "Matching body style…"
    : phase === "done" ? (caption || "Body style matched")
    : "Enter a VIN to identify a vehicle";

  return (
    <div className={"stage " + phase}>
      <div className="stage-sweep" />
      <span className="bracket tl" /><span className="bracket tr" /><span className="bracket bl" /><span className="bracket br" />
      <svg className={"stage-svg" + (busy ? " busy" : "")} viewBox={"0 0 " + VIEW.w + " " + VIEW.h} role="img" aria-label={label + " silhouette"}>
        <ellipse cx={VIEW.w / 2} cy={GROUND + 3} rx="172" ry="4.5" className="shadow" />
        <line x1="14" y1={GROUND} x2={VIEW.w - 14} y2={GROUND} className="ground" />
        {VEHICLES.map((v) => (
          <g key={v.key} className={"veh" + (v.key === activeKey ? " active" : "")}>
            <VehicleShape v={v} />
          </g>
        ))}
      </svg>
      <div className="stage-label">{label}</div>
      <div className={"stage-status" + (busy ? " pulse" : "")}>{status}</div>
    </div>
  );
}

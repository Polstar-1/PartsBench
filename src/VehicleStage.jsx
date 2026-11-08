import { useEffect, useRef, useState } from "react";
import { VEHICLES, BY_KEY, ORDER, GROUND, VIEW } from "./vehicles";

const SCAN_MESSAGES = [
  "Querying NHTSA vehicle records…",
  "Reading body style…",
  "Reading engine configuration…",
  "Cross-checking trim data…",
  "Finalizing specification…",
];

function Wheel({ cx, cy, r, style }) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const pt = (rr, deg) => [cx + rr * Math.sin(rad(deg)), cy - rr * Math.cos(rad(deg))];
  const aero = style === "aero";
  const truck = style === "truck";
  const n = truck ? 6 : 5;
  const step = 360 / n;

  const spokes = [];
  if (!aero) {
    for (let i = 0; i < n; i++) {
      const base = i * step;
      // twin spokes: two thin lines per arm, slightly apart
      [-5, 5].forEach((off) => {
        const [x1, y1] = pt(r * 0.2, base + off * 1.6);
        const [x2, y2] = pt(r * 0.66, base + off);
        spokes.push(<line key={"s" + i + off} x1={x1} y1={y1} x2={x2} y2={y2} className="spoke" />);
      });
    }
  } else {
    // aero cover: short radial slits near the rim
    for (let i = 0; i < 10; i++) {
      const [x1, y1] = pt(r * 0.46, i * 36);
      const [x2, y2] = pt(r * 0.64, i * 36);
      spokes.push(<line key={"a" + i} x1={x1} y1={y1} x2={x2} y2={y2} className="spoke" />);
    }
  }

  const lugs = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(r * 0.2, i * step + step / 2);
    lugs.push(<circle key={"l" + i} cx={x} cy={y} r={r * 0.04} className="lug" />);
  }

  // brake caliper: a short thick arc behind the spokes, upper rear
  const [cx1, cy1] = pt(r * 0.52, 250);
  const [cx2, cy2] = pt(r * 0.52, 300);

  return (
    <g className="wheel">
      <circle cx={cx} cy={cy} r={r} className="tire" />
      <circle cx={cx} cy={cy} r={r * 0.86} className="fine" />
      <circle cx={cx} cy={cy} r={r * 0.7} className="rim" />
      {aero ? <circle cx={cx} cy={cy} r={r * 0.66} className="fine" /> : (
        <>
          <circle cx={cx} cy={cy} r={r * 0.54} className="disc" />
          <path d={"M" + cx1 + " " + cy1 + "A" + r * 0.52 + " " + r * 0.52 + " 0 0 1 " + cx2 + " " + cy2} className="caliper" />
        </>
      )}
      <g className="spokes" style={{ transformOrigin: cx + "px " + cy + "px" }}>
        {spokes}
        {!aero && lugs}
      </g>
      <circle cx={cx} cy={cy} r={r * 0.11} className="hub" />
    </g>
  );
}

function VehicleShape({ v }) {
  return (
    <>
      <path d={v.body} className="body" />
      {v.glass.map((d, i) => <path key={"g" + i} d={d} className="glass" />)}
      {v.fine.map((d, i) => <path key={"f" + i} d={d} className="fine" />)}
      {v.lines.map((d, i) => <path key={"l" + i} d={d} className="line" />)}
      {v.mirror && <path d={v.mirror} className="light" />}
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
      let steps = (t - base + n) % n;
      if (steps < 6) steps += n; // always show a decent run before settling
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

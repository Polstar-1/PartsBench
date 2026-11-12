import { useEffect, useRef, useState } from "react";
import { BY_KEY } from "./vehicles";
import sedanImg from "./assets/cars/sedan.png";
import crossoverImg from "./assets/cars/crossover.png";
import truckImg from "./assets/cars/truck.png";
import evImg from "./assets/cars/ev.png";
import minivanImg from "./assets/cars/minivan.png";

// Line-art pictures. Body types without their own picture borrow the closest one.
const IMG = { sedan: sedanImg, crossover: crossoverImg, truck: truckImg, ev: evImg, minivan: minivanImg };
const ORDER = ["sedan", "crossover", "truck", "ev", "minivan"];
const ALIAS = { suv: "crossover", wagon: "crossover", coupe: "sedan", hatchback: "ev" };
const imgKey = (t) => (IMG[t] ? t : ALIAS[t] || "sedan");
const art = (k) => ({ WebkitMaskImage: "url(" + IMG[k] + ")", maskImage: "url(" + IMG[k] + ")" });

const SCAN_MESSAGES = [
  "Querying NHTSA vehicle records…",
  "Reading body style…",
  "Reading engine configuration…",
  "Cross-checking trim data…",
  "Finalizing specification…",
];

// Small static icon of one body type (used on garage cards).
export function VehicleMini({ type }) {
  return <div className="mini-art" style={art(imgKey(type))} role="img" aria-label="Vehicle" />;
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
      const t = Math.max(0, ORDER.indexOf(imgKey(target || "sedan")));
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

    if (phase === "done" && target) {
      idxRef.current = ORDER.indexOf(imgKey(target)); // so the next scan starts from here
    }
    return undefined;
  }, [phase, target]);

  const parked = phase === "done" && target;
  const activeKey = parked ? imgKey(target) : ORDER[idx];
  const label = BY_KEY[parked ? (BY_KEY[target] ? target : activeKey) : activeKey].label;
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
      <div className={"stage-art" + (busy ? " busy" : "")} role="img" aria-label={label + " outline"}>
        {ORDER.map((k) => (
          <div key={k} className={"veh" + (k === activeKey ? " active" : "")} style={art(k)} />
        ))}
      </div>
      <div className="stage-label">{label}</div>
      <div className={"stage-status" + (busy ? " pulse" : "")}>{status}</div>
    </div>
  );
}

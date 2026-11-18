import { useEffect, useState } from "react";
import { getRecalls } from "./nhtsa";

// NHTSA recall campaigns for a year/make/model. `collapsed` tucks the list behind one tap (used on the Identify screen).
export default function RecallPanel({ vehicle, collapsed = false }) {
  const [state, setState] = useState({ status: "loading", items: [] });

  useEffect(() => {
    let alive = true;
    getRecalls(vehicle.make, vehicle.model, vehicle.year)
      .then((items) => alive && setState({ status: "ok", items }))
      .catch(() => alive && setState({ status: "error", items: [] }));
    return () => { alive = false; };
  }, [vehicle.make, vehicle.model, vehicle.year]);

  if (state.status === "loading") return <p className="hint">Checking NHTSA recall records…</p>;
  if (state.status === "error") return <p className="error-note">Couldn't reach NHTSA's recall database. Try again in a moment.</p>;

  const list = state.items.map((r, i) => (
    <details className="recall" key={r.NHTSACampaignNumber || i}>
      <summary>
        <span className="recall-comp">{r.Component || "Recall"}</span>
        <span className="recall-id">{r.NHTSACampaignNumber}</span>
      </summary>
      {r.Summary && <p><strong>What:</strong> {r.Summary}</p>}
      {r.Consequence && <p><strong>Risk:</strong> {r.Consequence}</p>}
      {r.Remedy && <p><strong>Fix:</strong> {r.Remedy}</p>}
    </details>
  ));

  return (
    <div className="recalls">
      <p className="hint" style={{ marginTop: 0 }}>
        {state.items.length
          ? state.items.length + " recall campaign" + (state.items.length === 1 ? "" : "s") + " on record for the " + vehicle.year + " " + vehicle.make + " " + vehicle.model + "."
          : "No recall campaigns on record for the " + vehicle.year + " " + vehicle.make + " " + vehicle.model + "."}
        {" "}These are by model, not by VIN, so they don't say whether yours was already fixed.{" "}
        <a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noopener noreferrer">Check your VIN at nhtsa.gov/recalls ↗</a>
      </p>
      {collapsed && state.items.length > 0
        ? <details className="recall-all"><summary>Show {state.items.length === 1 ? "the recall" : "all " + state.items.length + " recalls"}</summary>{list}</details>
        : list}
    </div>
  );
}

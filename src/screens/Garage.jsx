import { useEffect, useState } from "react";
import { VehicleMini } from "../VehicleStage";
import { getRecalls } from "../nhtsa";
import { fmtNum } from "../maintenance";

function RecallPanel({ vehicle }) {
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

  return (
    <div className="recalls">
      <p className="hint" style={{ marginTop: 0 }}>
        {state.items.length
          ? state.items.length + " recall campaign" + (state.items.length === 1 ? "" : "s") + " on record for the " + vehicle.year + " " + vehicle.make + " " + vehicle.model + "."
          : "No recall campaigns on record for the " + vehicle.year + " " + vehicle.make + " " + vehicle.model + "."}
        {" "}These are by model, not by VIN, so they don't say whether yours was already fixed.{" "}
        <a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noopener noreferrer">Check your VIN at nhtsa.gov/recalls ↗</a>
      </p>
      {state.items.map((r, i) => (
        <details className="recall" key={r.NHTSACampaignNumber || i}>
          <summary>
            <span className="recall-comp">{r.Component || "Recall"}</span>
            <span className="recall-id">{r.NHTSACampaignNumber}</span>
          </summary>
          {r.Summary && <p><strong>What:</strong> {r.Summary}</p>}
          {r.Consequence && <p><strong>Risk:</strong> {r.Consequence}</p>}
          {r.Remedy && <p><strong>Fix:</strong> {r.Remedy}</p>}
        </details>
      ))}
    </div>
  );
}

function VehicleCard({ v, isActive, onSelect, onUpdate, onRemove, goMaintain, goShop }) {
  const [odo, setOdo] = useState("");
  const [editing, setEditing] = useState(false);
  const [showRecalls, setShowRecalls] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const title = v.nickname || [v.year, v.make, v.model].filter(Boolean).join(" ");
  const sub = [v.nickname ? [v.year, v.make, v.model].filter(Boolean).join(" ") : "", v.trim, v.engine && v.engine !== "Not reported for this VIN" ? v.engine : ""].filter(Boolean).join(" · ");

  function saveOdo() {
    if (odo !== "") onUpdate(v.id, { mileage: Number(odo) });
    setEditing(false);
    setOdo("");
  }

  return (
    <div className={"vcard" + (isActive ? " active" : "")}>
      <div className="vcard-top">
        <div className="vcard-icon"><VehicleMini type={v.bodyType || "sedan"} /></div>
        <div className="vcard-info">
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
          {isActive && <span className="chip chip-active">Active</span>}
        </div>
      </div>

      <div className="vcard-odo">
        <span className="spec-label">Mileage</span>
        {editing ? (
          <span className="odo-edit">
            <input inputMode="numeric" autoFocus value={odo} placeholder={v.mileage != null ? String(v.mileage) : "miles"}
              onChange={(e) => setOdo(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))}
              onKeyDown={(e) => e.key === "Enter" && saveOdo()} />
            <button className="btn-small" onClick={saveOdo}>Save</button>
          </span>
        ) : (
          <span className="odo-view">
            <strong>{v.mileage != null ? fmtNum(v.mileage) + " mi" : "Not set"}</strong>
            <button className="link-btn" onClick={() => setEditing(true)}>Update</button>
          </span>
        )}
      </div>

      <div className="vcard-actions">
        {!isActive && <button className="btn-small" onClick={() => onSelect(v.id)}>Set active</button>}
        <button className="btn-small" onClick={() => { onSelect(v.id); goMaintain(); }}>Maintenance</button>
        <button className="btn-small" onClick={() => { onSelect(v.id); goShop(); }}>Shop parts</button>
        <button className="btn-small" onClick={() => setShowRecalls((s) => !s)}>{showRecalls ? "Hide recalls" : "Recalls"}</button>
      </div>

      {showRecalls && <RecallPanel vehicle={v} />}

      <div className="vcard-foot">
        {v.vin && <span className="vin-tag">{v.vin}</span>}
        {confirmRemove ? (
          <span>
            <button className="link-btn danger" onClick={() => onRemove(v.id)}>Yes, remove</button>
            <button className="link-btn" onClick={() => setConfirmRemove(false)}>Cancel</button>
          </span>
        ) : (
          <button className="link-btn" onClick={() => setConfirmRemove(true)}>Remove</button>
        )}
      </div>
    </div>
  );
}

export default function Garage({ vehicles, activeId, onSelect, onUpdate, onRemove, goIdentify, goMaintain, goShop }) {
  return (
    <>
      <p className="eyebrow">Garage</p>
      <h1 className="page-title">Your garage.</h1>
      <p className="page-sub">Everything you own in one place. Saved on this device.</p>

      {!vehicles.length && (
        <div className="empty-state">
          <p>No vehicles saved yet.</p>
          <button className="btn-primary" onClick={goIdentify}>Add your first vehicle</button>
        </div>
      )}

      {vehicles.map((v) => (
        <VehicleCard key={v.id} v={v} isActive={v.id === activeId}
          onSelect={onSelect} onUpdate={onUpdate} onRemove={onRemove} goMaintain={goMaintain} goShop={goShop} />
      ))}

      {vehicles.length > 0 && (
        <button className="btn-secondary block-btn" onClick={goIdentify}>+ Add another vehicle</button>
      )}
    </>
  );
}

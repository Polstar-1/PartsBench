import { useState } from "react";
import { VehicleMini } from "../VehicleStage";
import RecallPanel from "../RecallPanel";
import { useUnits } from "../useUnits";
import { toDisp, fromInput, fmtDistU, distWord } from "../units";

function VehicleCard({ v, isActive, onSelect, onUpdate, onRemove, goMaintain, goShop }) {
  const [odo, setOdo] = useState("");
  const [editing, setEditing] = useState(false);
  const [showRecalls, setShowRecalls] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const title = v.nickname || [v.year, v.make, v.model].filter(Boolean).join(" ");
  const sub = [v.nickname ? [v.year, v.make, v.model].filter(Boolean).join(" ") : "", v.trim, v.engine && v.engine !== "Not reported for this VIN" ? v.engine : ""].filter(Boolean).join(" · ");

  function saveOdo() {
    if (odo !== "") onUpdate(v.id, { mileage: fromInput(odo) });
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
            <input inputMode="numeric" autoFocus value={odo} placeholder={v.mileage != null ? String(toDisp(v.mileage)) : distWord()}
              onChange={(e) => setOdo(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))}
              onKeyDown={(e) => e.key === "Enter" && saveOdo()} />
            <button className="btn-small" onClick={saveOdo}>Save</button>
          </span>
        ) : (
          <span className="odo-view">
            <strong>{v.mileage != null ? fmtDistU(v.mileage) : "Not set"}</strong>
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

export default function Garage({ vehicles, activeId, onSelect, onUpdate, onRemove, goIdentify, goMaintain, goShop, canAdd = true, goPlans }) {
  useUnits();
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

      <div className="vgrid">
        {vehicles.map((v) => (
          <VehicleCard key={v.id} v={v} isActive={v.id === activeId}
            onSelect={onSelect} onUpdate={onUpdate} onRemove={onRemove} goMaintain={goMaintain} goShop={goShop} />
        ))}
      </div>

      {vehicles.length > 0 && canAdd && (
        <button className="btn-secondary block-btn" onClick={goIdentify}>+ Add another vehicle</button>
      )}
      {vehicles.length > 0 && !canAdd && (
        <p className="info-note" role="note">
          Free accounts hold two vehicles. Premium has no limit, and the vehicles you have stay as they are.{" "}
          <button className="link-btn" onClick={goPlans}>See Premium</button>
        </p>
      )}
    </>
  );
}

import { useState } from "react";
import { planFor, getStatus, latestEntry, todayISO, fmtDate, fmtNum, LEVEL_RANK } from "../maintenance";

function LogForm({ item, vehicle, onSave, onCancel }) {
  const [date, setDate] = useState(todayISO());
  const [miles, setMiles] = useState(vehicle.mileage != null ? String(vehicle.mileage) : "");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  function submit() {
    onSave(item.key, {
      id: Date.now().toString(36),
      date: date || todayISO(),
      mileage: miles === "" ? null : Number(miles),
      cost: cost === "" ? null : Number(cost),
      notes: notes.trim(),
    });
  }

  return (
    <div className="logform">
      <div className="grid2b">
        <div>
          <label htmlFor={"d-" + item.key}>Date done</label>
          <input id={"d-" + item.key} type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor={"m-" + item.key}>Mileage</label>
          <input id={"m-" + item.key} inputMode="numeric" value={miles} placeholder="miles"
            onChange={(e) => setMiles(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))} />
        </div>
      </div>
      <div className="grid2b">
        <div>
          <label htmlFor={"c-" + item.key}>Cost (optional)</label>
          <input id={"c-" + item.key} inputMode="decimal" value={cost} placeholder="$"
            onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, "").slice(0, 8))} />
        </div>
        <div>
          <label htmlFor={"n-" + item.key}>Notes (optional)</label>
          <input id={"n-" + item.key} value={notes} placeholder="brand, who did it…" onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="row">
        <button className="btn-primary block" onClick={submit}>Save entry</button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function IntervalForm({ item, onSave, onReset, onCancel }) {
  const [miles, setMiles] = useState(item.miles ? String(item.miles) : "");
  const [months, setMonths] = useState(item.months ? String(item.months) : "");
  const num = (s) => (s === "" ? null : Number(s));
  return (
    <div className="logform">
      <div className="grid2b">
        <div>
          <label htmlFor={"im-" + item.key}>Every (miles)</label>
          <input id={"im-" + item.key} inputMode="numeric" value={miles} placeholder="none"
            onChange={(e) => setMiles(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))} />
        </div>
        <div>
          <label htmlFor={"it-" + item.key}>Every (months)</label>
          <input id={"it-" + item.key} inputMode="numeric" value={months} placeholder="none"
            onChange={(e) => setMonths(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))} />
        </div>
      </div>
      <div className="row">
        <button className="btn-primary block" onClick={() => onSave(item.key, { miles: num(miles), months: num(months) })}>Save interval</button>
        {item.customized && <button className="btn-secondary" onClick={() => onReset(item.key)}>Reset</button>}
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function Row({ item, vehicle, open, mode, onOpen, onClose, onLog, onDeleteEntry, onSetInterval }) {
  const entries = (vehicle.log || {})[item.key] || [];
  const st = getStatus(item, entries, vehicle.mileage);
  const last = latestEntry(entries);
  const every = [item.miles ? fmtNum(item.miles) + " mi" : "", item.months ? item.months + " mo" : ""].filter(Boolean).join(" / ");

  return (
    <div className={"mrow " + st.level}>
      <button className="mrow-head" onClick={() => (open ? onClose() : onOpen(item.key, entries.length ? "view" : "log"))} aria-expanded={open}>
        <span className={"dot " + st.level} />
        <span className="mrow-main">
          <span className="mrow-title">{item.label}</span>
          <span className="mrow-sub">{st.text}</span>
        </span>
        <span className="mrow-every">{every}</span>
      </button>

      {open && (
        <div className="mrow-body">
          {item.note && <p className="hint" style={{ marginTop: 0 }}>{item.note}</p>}
          {last && <p className="hint">Last done: {last.mileage != null ? fmtNum(last.mileage) + " mi · " : ""}{fmtDate(last.date)}</p>}

          {mode === "log" && <LogForm item={item} vehicle={vehicle} onSave={onLog} onCancel={onClose} />}
          {mode === "interval" && <IntervalForm item={item} onSave={onSetInterval} onReset={(k) => onSetInterval(k, null)} onCancel={onClose} />}
          {mode === "view" && (
            <div className="row">
              <button className="btn-small" onClick={() => onOpen(item.key, "log")}>Log service</button>
              <button className="btn-small" onClick={() => onOpen(item.key, "interval")}>Edit interval</button>
            </div>
          )}
          {mode === "log" && (
            <button className="link-btn" style={{ marginTop: 10 }} onClick={() => onOpen(item.key, "interval")}>Edit interval{item.customized ? " (customized)" : ""}</button>
          )}

          {entries.length > 0 && (
            <div className="history">
              <div className="spec-label" style={{ marginBottom: 6 }}>History</div>
              {[...entries].sort((a, b) => (a.date < b.date ? 1 : -1)).map((e) => (
                <div className="hist-row" key={e.id}>
                  <span>
                    {fmtDate(e.date)}{e.mileage != null ? " · " + fmtNum(e.mileage) + " mi" : ""}{e.cost != null ? " · $" + e.cost : ""}
                    {e.notes ? <em> — {e.notes}</em> : null}
                  </span>
                  <button className="link-btn danger" onClick={() => onDeleteEntry(item.key, e.id)} aria-label="Delete entry">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Maintain({ vehicle, onUpdate, goGarage, goIdentify, saveDraft }) {
  const [openKey, setOpenKey] = useState(null);
  const [mode, setMode] = useState("log");
  const [odo, setOdo] = useState("");

  if (!vehicle) {
    return (
      <>
        <p className="eyebrow">Maintenance</p>
        <h1 className="page-title">Keep it running.</h1>
        <div className="empty-state">
          <p>Add a vehicle to start tracking maintenance.</p>
          <button className="btn-primary" onClick={goIdentify}>Add Your Vehicle</button>
        </div>
      </>
    );
  }

  if (!vehicle.id) {
    return (
      <>
        <p className="eyebrow">Maintenance</p>
        <h1 className="page-title">Keep it running.</h1>
        <div className="empty-state">
          <p>Save your {vehicle.year} {vehicle.make} {vehicle.model} to the garage to track its maintenance.</p>
          <button className="btn-primary" onClick={() => { saveDraft(); goGarage(); }}>Save to Garage</button>
        </div>
      </>
    );
  }

  const plan = planFor(vehicle);
  const rows = plan.map((it) => ({ it, st: getStatus(it, (vehicle.log || {})[it.key], vehicle.mileage) }));
  rows.sort((a, b) => LEVEL_RANK[a.st.level] - LEVEL_RANK[b.st.level]);
  const overdue = rows.filter((r) => r.st.level === "overdue").length;
  const soon = rows.filter((r) => r.st.level === "soon").length;
  const unlogged = rows.filter((r) => r.st.level === "none").length;

  function open(key, m) { setOpenKey(key); setMode(m); }

  function saveOdo() {
    if (odo !== "") onUpdate(vehicle.id, { mileage: Number(odo) });
    setOdo("");
  }

  function logService(key, entry) {
    onUpdate(vehicle.id, (v) => ({
      log: { ...(v.log || {}), [key]: [...((v.log || {})[key] || []), entry] },
      mileage: entry.mileage != null && (v.mileage == null || entry.mileage > v.mileage) ? entry.mileage : v.mileage,
    }));
    setOpenKey(null);
  }

  function deleteEntry(key, id) {
    onUpdate(vehicle.id, (v) => ({ log: { ...(v.log || {}), [key]: ((v.log || {})[key] || []).filter((e) => e.id !== id) } }));
  }

  function setInterval_(key, val) {
    onUpdate(vehicle.id, (v) => {
      const next = { ...(v.intervals || {}) };
      if (val === null) delete next[key]; else next[key] = val;
      return { intervals: next };
    });
    setOpenKey(null);
  }

  const name = vehicle.nickname || [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");

  return (
    <>
      <p className="eyebrow">Maintenance</p>
      <h1 className="page-title">{name}</h1>
      <p className="page-sub">Tap an item to log a service or change its interval.</p>

      <div className="maint-layout">
        <aside className="maint-side">
      <div className="panel">
        <label htmlFor="odo2">Current mileage</label>
        <div className="row">
          <input id="odo2" inputMode="numeric" value={odo}
            placeholder={vehicle.mileage != null ? fmtNum(vehicle.mileage) + " mi" : "Enter miles"}
            onChange={(e) => setOdo(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))}
            onKeyDown={(e) => e.key === "Enter" && saveOdo()} />
          <button className="btn-primary" onClick={saveOdo} disabled={odo === ""}>Update</button>
        </div>
        {vehicle.mileage == null && <p className="hint">Add your mileage so we can work out what's due.</p>}
      </div>

      <div className="summary">
        <span className={"chip " + (overdue ? "chip-overdue" : "chip-quiet")}>{overdue} overdue</span>
        <span className={"chip " + (soon ? "chip-soon" : "chip-quiet")}>{soon} due soon</span>
        <span className="chip chip-quiet">{unlogged} not logged</span>
      </div>

      <p className="info-note">
        These are common starting intervals, not a factory schedule for your exact engine. Your owner's manual always wins. Edit any interval to match it.
      </p>
        </aside>
        <div className="maint-list">
      {rows.map(({ it }) => (
        <Row key={it.key} item={it} vehicle={vehicle}
          open={openKey === it.key} mode={mode}
          onOpen={open} onClose={() => setOpenKey(null)}
          onLog={logService} onDeleteEntry={deleteEntry} onSetInterval={setInterval_} />
      ))}

        </div>
      </div>
    </>
  );
}

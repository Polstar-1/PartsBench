import { useState } from "react";
import { canUsePremium } from "../premium";
import { planFor, getStatus, groupStatus, splitCost, latestEntry, todayISO, fmtDate, fmtNum, estimateMiles, manualLink, LEVEL_RANK } from "../maintenance";

function LogForm({ item, vehicle, onSave, onCancel, wholeSet = 0 }) {
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
          <label htmlFor={"c-" + item.key}>{wholeSet ? "Total cost (optional)" : "Cost (optional)"}</label>
          <input id={"c-" + item.key} inputMode="decimal" value={cost} placeholder="$"
            onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, "").slice(0, 8))} />
        </div>
        <div>
          <label htmlFor={"n-" + item.key}>Notes (optional)</label>
          <input id={"n-" + item.key} value={notes} placeholder="brand, who did it…" onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="row">
        <button className="btn-primary block" onClick={submit}>{wholeSet ? "Save all " + wholeSet : "Save entry"}</button>
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

function ShopLink({ item, onShop, className = "link-btn" }) {
  if (!item.shop || !onShop) return null;
  return <button className={className} onClick={() => onShop(item.shop)}>Shop {item.shop} →</button>;
}

function Row({ item, vehicle, est, open, mode, onOpen, onClose, onLog, onDeleteEntry, onSetInterval, onShop }) {
  const entries = (vehicle.log || {})[item.key] || [];
  const st = getStatus(item, entries, vehicle.mileage, undefined, est);
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
      {!open && (st.level === "overdue" || st.level === "soon") && item.shop && onShop && (
        <div className="mrow-shop"><ShopLink item={item} onShop={onShop} /></div>
      )}

      {open && (
        <div className="mrow-body">
          {item.note && <p className="hint" style={{ marginTop: 0 }}>{item.note}</p>}
          {item.reason && <p className="hint tuned">Adjusted for your vehicle: {item.reason}</p>}
          {last && <p className="hint">Last done: {last.mileage != null ? fmtNum(last.mileage) + " mi · " : ""}{fmtDate(last.date)}</p>}

          {mode === "log" && <LogForm item={item} vehicle={vehicle} onSave={onLog} onCancel={onClose} />}
          {mode === "interval" && <IntervalForm item={item} onSave={onSetInterval} onReset={(k) => onSetInterval(k, null)} onCancel={onClose} />}
          {mode === "view" && (
            <div className="row">
              <button className="btn-small" onClick={() => onOpen(item.key, "log")}>Log service</button>
              <button className="btn-small" onClick={() => onOpen(item.key, "interval")}>Edit interval</button>
              {item.shop && onShop && <button className="btn-small" onClick={() => onShop(item.shop)}>Shop</button>}
            </div>
          )}
          {mode === "log" && (
            <button className="link-btn" style={{ marginTop: 10 }} onClick={() => onOpen(item.key, "interval")}>Edit interval{item.customized ? " (customized)" : ""}</button>
          )}
          {mode === "log" && <div style={{ marginTop: 8 }}><ShopLink item={item} onShop={onShop} /></div>}

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

function rangeText(subs, key, unit) {
  const vals = [...new Set(subs.map((x) => x[key]).filter(Boolean))].sort((a, b) => a - b);
  if (!vals.length) return "";
  return (vals.length === 1 ? fmtNum(vals[0]) : fmtNum(vals[0]) + "\u2013" + fmtNum(vals[vals.length - 1])) + " " + unit;
}

// Tires, brake pads and similar: one row that opens into the individual parts.
function GroupRow({ item, vehicle, est, onShop, open, onToggle, openKey, mode, allOpen, onAllOpen, onAllClose, onOpen, onClose, onLog, onLogAll, onDeleteEntry, onSetInterval }) {
  const gs = groupStatus(item, vehicle.log, vehicle.mileage, undefined, est);
  const every = [rangeText(item.subs, "miles", "mi"), rangeText(item.subs, "months", "mo")].filter(Boolean).join(" / ");
  return (
    <div className={"mrow " + gs.level}>
      <button className="mrow-head" onClick={onToggle} aria-expanded={open}>
        <span className={"dot " + gs.level} />
        <span className="mrow-main">
          <span className="mrow-title">{item.label}</span>
          <span className="mrow-sub">{gs.text}</span>
        </span>
        <span className="mrow-every">{every}</span>
      </button>
      {!open && (gs.level === "overdue" || gs.level === "soon") && item.shop && onShop && (
        <div className="mrow-shop"><ShopLink item={item} onShop={onShop} /></div>
      )}
      {open && (
        <div className="mrow-body">
          {item.note && <p className="hint" style={{ marginTop: 0 }}>{item.note}</p>}
          {item.reason && <p className="hint tuned">Adjusted for your vehicle: {item.reason}</p>}
          {allOpen ? (
            <LogForm item={{ key: item.key + "-all" }} vehicle={vehicle} wholeSet={item.subs.length} onSave={(k, entry) => onLogAll(item, entry)} onCancel={onAllClose} />
          ) : (
            <div className="row">
              <button className="btn-small" onClick={onAllOpen}>Log all {item.subs.length}</button>
            </div>
          )}
          <div className="msubs">
            {item.subs.map((sub) => (
              <Row key={sub.key} item={sub} vehicle={vehicle} est={est} onShop={onShop}
                open={openKey === sub.key} mode={mode}
                onOpen={onOpen} onClose={onClose}
                onLog={onLog} onDeleteEntry={onDeleteEntry} onSetInterval={onSetInterval} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Maintain({ vehicle, onUpdate, goGarage, goIdentify, goShopFor, saveDraft, premium, goPlans }) {
  const [openKey, setOpenKey] = useState(null);
  const [openGroup, setOpenGroup] = useState(null);
  const [allGroup, setAllGroup] = useState(null);
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

  // Due dates run off today's estimated mileage; saved numbers only change when you enter one.
  const est = estimateMiles(vehicle);
  const view = est.estimated ? { ...vehicle, mileage: est.miles } : vehicle;
  const full = premium === null || canUsePremium(premium); // null: still checking the account
  const plan = planFor(vehicle, { full });
  const lockedCount = full ? 0 : planFor(vehicle).length - plan.length;
  const rows = plan.map((it) => ({ it, st: it.subs ? groupStatus(it, view.log, view.mileage, undefined, est.estimated) : getStatus(it, (view.log || {})[it.key], view.mileage, undefined, est.estimated) }));
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

  // Logs the same service on every part of a group (all four tires, both axles...). One cost is split evenly.
  function logAll(group, entry) {
    const keys = group.subs.map((x) => x.key);
    const costs = splitCost(entry.cost, keys.length);
    const note = (entry.notes ? entry.notes + " \u00b7 " : "") + "set of " + keys.length;
    onUpdate(vehicle.id, (v) => {
      const log = { ...(v.log || {}) };
      keys.forEach((k, i) => { log[k] = [...(log[k] || []), { ...entry, id: entry.id + i, cost: costs[i], notes: note }]; });
      return { log, mileage: entry.mileage != null && (v.mileage == null || entry.mileage > v.mileage) ? entry.mileage : v.mileage };
    });
    setAllGroup(null);
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
        {est.estimated && (
          <p className="hint est-note">
            Estimated today: about <strong>{fmtNum(est.miles)} mi</strong>, from your last entry of {fmtNum(vehicle.mileage)} mi
            {est.daysOld ? " " + est.daysOld + " days ago" : ""} at about {fmtNum(est.perMonth)} mi a month
            {est.source === "setting" ? " (your estimate)" : ""}. Enter your real mileage any time to make it exact.
          </p>
        )}
        {vehicle.mileage != null && !est.estimated && est.daysOld > 30 && (
          <p className="hint est-note">Your mileage was last updated {est.daysOld} days ago. Update it for accurate due dates.</p>
        )}
        {vehicle.mileage != null && est.source !== "readings" && (
          <div className="est-rate">
            <label htmlFor="mpy">About how many miles a year do you drive? (optional)</label>
            <input id="mpy" inputMode="numeric" value={vehicle.milesPerYear || ""} placeholder="e.g. 12000"
              onChange={(e) => onUpdate(vehicle.id, { milesPerYear: e.target.value.replace(/[^0-9]/g, "").slice(0, 6) })} />
            <p className="hint">Lets the app keep your mileage current between updates. Once you've entered a few readings it works this out by itself.</p>
          </div>
        )}
      </div>

      <div className="summary">
        <span className={"chip " + (overdue ? "chip-overdue" : "chip-quiet")}>{overdue} overdue</span>
        <span className={"chip " + (soon ? "chip-soon" : "chip-quiet")}>{soon} due soon</span>
        <span className="chip chip-quiet">{unlogged} not logged</span>
      </div>

      <p className="info-note">
        These are common starting intervals, not a factory schedule for your exact engine. Your owner's manual always wins. Edit any interval to match it.{" "}
        <a href={manualLink(vehicle)} target="_blank" rel="noopener noreferrer">Find your owner's manual ↗</a>
      </p>
        </aside>
        <div className="maint-list">
      {rows.map(({ it }) => (it.subs ? (
        <GroupRow key={it.key} item={it} vehicle={view} est={est.estimated} onShop={goShopFor}
          open={openGroup === it.key} onToggle={() => { setOpenGroup(openGroup === it.key ? null : it.key); setOpenKey(null); setAllGroup(null); }}
          openKey={openKey} mode={mode}
          allOpen={allGroup === it.key} onAllOpen={() => { setAllGroup(it.key); setOpenKey(null); }} onAllClose={() => setAllGroup(null)}
          onOpen={open} onClose={() => setOpenKey(null)}
          onLog={logService} onLogAll={logAll} onDeleteEntry={deleteEntry} onSetInterval={setInterval_} />
      ) : (
        <Row key={it.key} item={it} vehicle={view} est={est.estimated} onShop={goShopFor}
          open={openKey === it.key} mode={mode}
          onOpen={open} onClose={() => setOpenKey(null)}
          onLog={logService} onDeleteEntry={deleteEntry} onSetInterval={setInterval_} />
      )))}

      {!full && lockedCount > 0 && (
        <section className="panel maint-locked" aria-labelledby="maint-locked-h">
          <p id="maint-locked-h" className="section-title" style={{ marginBottom: 6 }}>{lockedCount} more items with Premium</p>
          <p className="settings-hint" style={{ marginBottom: 14 }}>
            Premium adds tire, brake and shock tracking (per tire and per axle), the full schedule (fluids, belts, spark plugs, battery and more),
            intervals tuned to your vehicle, and email reminders when something is due.
          </p>
          <button className="btn-secondary" onClick={goPlans}>See Premium</button>
        </section>
      )}

        </div>
      </div>
    </>
  );
}

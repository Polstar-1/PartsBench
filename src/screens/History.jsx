import { historyFor, summarize, toCsv, money, fileSafe } from "../history";
import { todayISO, fmtDate, fmtNum } from "../maintenance";

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function History({ vehicle, full, goPlans }) {
  const entries = historyFor(vehicle);
  const name = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");

  if (!full) {
    return (
      <section className="panel maint-locked" aria-labelledby="hist-locked-h">
        <p id="hist-locked-h" className="section-title" style={{ marginBottom: 6 }}>Costs and service history are Premium</p>
        <p className="settings-hint" style={{ marginBottom: 14 }}>
          See what you've spent on this vehicle: totals, cost per mile, spending by category, and a record you can download or print for a sale or a warranty claim.
          {entries.length > 0 ? " The " + entries.length + (entries.length === 1 ? " service" : " services") + " you've already logged " + (entries.length === 1 ? "is" : "are") + " kept, and will show up here with Premium." : " Anything you log from now on is kept."}
        </p>
        <button className="btn-secondary" onClick={goPlans}>See Premium</button>
      </section>
    );
  }

  if (!entries.length) {
    return (
      <div className="empty-state">
        <p>No services logged for this vehicle yet. Log one on the Schedule tab and add what it cost, and your totals will appear here.</p>
      </div>
    );
  }

  const s = summarize(entries, todayISO());
  const top = s.byGroup.length ? s.byGroup[0].total : 0;

  return (
    <div className="history-report">
      <div className="hist-head">
        <p className="section-title" style={{ marginBottom: 2 }}>{name}</p>
        <p className="hint" style={{ margin: 0 }}>Service history{vehicle.vin ? " · VIN " + vehicle.vin : ""} · as of {fmtDate(todayISO())}</p>
      </div>

      <div className="hist-stats">
        <div className="hist-stat"><span className="hist-k">Total spent</span><span className="hist-v">{money(s.total)}</span></div>
        <div className="hist-stat"><span className="hist-k">Last 12 months</span><span className="hist-v">{money(s.lastYear)}</span></div>
        <div className="hist-stat"><span className="hist-k">Cost per mile</span><span className="hist-v">{s.perMile != null ? "$" + s.perMile.toFixed(3) : "–"}</span></div>
      </div>
      {s.perMile == null && s.total > 0 && <p className="hint">Cost per mile shows once your history covers at least 1,000 miles.</p>}
      {s.span >= 1000 && <p className="hint">Based on {fmtNum(s.span)} miles between your first and latest logged service.</p>}
      {s.costed < s.count && <p className="hint">{s.count - s.costed} of {s.count} logged {s.count - s.costed === 1 ? "service has" : "services have"} no cost, so totals only count the ones that do.</p>}

      {s.byGroup.length > 0 && (
        <div className="panel">
          <p className="section-title" style={{ marginBottom: 10 }}>Where it went</p>
          <ul className="hist-cats">
            {s.byGroup.map((g) => (
              <li key={g.label}>
                <div className="hist-cat-row"><span>{g.label}</span><span>{money(g.total)}</span></div>
                <div className="hist-bar" aria-hidden="true"><span style={{ width: (top ? Math.max((g.total / top) * 100, 2) : 0) + "%" }} /></div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <p className="section-title" style={{ marginBottom: 10 }}>Every service</p>
        <ul className="hist-list">
          {entries.map((e) => (
            <li key={e.id + e.key}>
              <div className="hist-line"><strong>{e.label}</strong><span>{e.cost != null ? money(e.cost) : "–"}</span></div>
              <div className="hint" style={{ margin: 0 }}>
                {fmtDate(e.date)}{e.mileage != null ? " · " + fmtNum(e.mileage) + " mi" : ""}{e.notes ? " · " + e.notes : ""}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="row hist-actions">
        <button className="btn-primary" onClick={() => download("parts-bench-history-" + fileSafe(name) + ".csv", toCsv(vehicle, entries), "text/csv;charset=utf-8")}>Download spreadsheet (CSV)</button>
        <button className="btn-secondary" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
    </div>
  );
}

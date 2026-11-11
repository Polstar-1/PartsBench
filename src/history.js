/* ============================================================
   COSTS & HISTORY
   Turns the service log (vehicle.log) into a readable history, totals, and a CSV.
   Every logged service already carries its date, mileage, cost and notes.
   ============================================================ */
import { planFor, fmtDate } from "./maintenance.js";

// key -> { label, group } for every item and every part (e.g. "tire-df" -> "Tires: Driver front", group "Tires").
function lookup(vehicle) {
  const map = {};
  // Use the full plan so a logged part is always named, whatever the vehicle type or plan.
  const full = planFor({ fuel: "", drive: "AWD", electrification: "", intervals: {} }, { full: true });
  const add = (items) => items.forEach((it) => {
    const group = it.label.replace(/ \((replace)\)$/, "").replace(/ flush$/, "");
    map[it.key] = { label: group, group };
    (it.subs || []).forEach((s) => { map[s.key] = { label: group + ": " + s.label, group }; });
  });
  add(full);
  add(planFor(vehicle || { intervals: {} }, { full: true }));
  return map;
}

export function historyFor(vehicle) {
  const map = lookup(vehicle);
  const out = [];
  Object.entries((vehicle && vehicle.log) || {}).forEach(([key, list]) => {
    (list || []).forEach((e) => {
      if (!e || !e.date) return;
      const info = map[key] || { label: key, group: key };
      const cost = e.cost == null || e.cost === "" || !Number.isFinite(Number(e.cost)) ? null : Number(e.cost);
      out.push({
        id: e.id || key + e.date, key, label: info.label, group: info.group, date: e.date,
        mileage: e.mileage == null || !Number.isFinite(Number(e.mileage)) ? null : Number(e.mileage),
        cost, notes: e.notes ? String(e.notes) : "",
      });
    });
  });
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.mileage || 0) - (a.mileage || 0)));
  return out;
}

const cents = (n) => Math.round(n * 100);

// today is "YYYY-MM-DD". Costs are summed in whole cents so totals never drift.
export function summarize(entries, today) {
  let totalC = 0; let yearC = 0; let costed = 0;
  const cutoff = (() => { const d = new Date(today + "T00:00:00"); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); })();
  const groups = new Map();
  entries.forEach((e) => {
    if (e.cost == null) return;
    const c = cents(e.cost);
    totalC += c; costed += 1;
    if (e.date > cutoff) yearC += c;
    const g = groups.get(e.group) || { label: e.group, cents: 0, count: 0 };
    g.cents += c; g.count += 1; groups.set(e.group, g);
  });
  const miles = entries.map((e) => e.mileage).filter((m) => m != null);
  const span = miles.length > 1 ? Math.max(...miles) - Math.min(...miles) : 0;
  return {
    count: entries.length, costed,
    total: totalC / 100, lastYear: yearC / 100,
    // Cost per mile only means something over a real stretch of driving.
    perMile: span >= 1000 && totalC > 0 ? totalC / 100 / span : null,
    span,
    byGroup: [...groups.values()].sort((a, b) => b.cents - a.cents).map((g) => ({ label: g.label, total: g.cents / 100, count: g.count })),
  };
}

export const money = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// A spreadsheet-safe field: quotes it, and defuses anything a spreadsheet would run as a formula.
function field(v) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

export function toCsv(vehicle, entries) {
  const head = ["Date", "Service", "Mileage", "Cost", "Notes"];
  const rows = entries.map((e) => [e.date, e.label, e.mileage == null ? "" : e.mileage, e.cost == null ? "" : e.cost.toFixed(2), e.notes]);
  const title = vehicle ? [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") : "";
  const lines = ['Parts Bench service history' + (title ? " - " + title : "") + (vehicle && vehicle.vin ? " - VIN " + vehicle.vin : "")];
  // The title line is one cell, quoted, so it can't be read as a formula either.
  return [field(lines[0]), head.map(field).join(","), ...rows.map((r) => r.map(field).join(","))].join("\r\n") + "\r\n";
}

export const fileSafe = (s) => String(s || "vehicle").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "vehicle";
export { fmtDate };

/* ============================================================
   MAINTENANCE PLAN
   These are common starting intervals, not factory schedules for
   every engine. The owner's manual wins; each interval is editable.
   ============================================================ */

const ITEMS = [
  { key: "oil", label: "Engine oil & filter", miles: 5000, months: 6, noEv: true, note: "Use the oil grade and spec in your owner's manual. Some engines allow longer." },
  { key: "rotate", label: "Tire rotation", miles: 7500, months: 6, note: "Also a good time to check tread depth and pressures." },
  { key: "brake-inspect", label: "Brake inspection", miles: 12000, months: 12, note: "Pads, rotors, lines and fluid level." },
  { key: "cabin-air", label: "Cabin air filter", miles: 15000, months: 12, note: "Sooner if the airflow smells musty or feels weak." },
  { key: "engine-air", label: "Engine air filter", miles: 20000, months: 24, noEv: true, note: "Sooner on dusty or gravel roads." },
  { key: "wipers", label: "Wiper blades", miles: null, months: 12 },
  { key: "battery", label: "12V battery test", miles: null, months: 36, note: "Most 12V batteries last 3 to 5 years. Test before winter." },
  { key: "battery-replace", label: "12V battery replaced", miles: null, months: 60, note: "Most last 3 to 5 years. Heat and short trips wear them faster." },
  // Major wear items: these get replaced, one corner or axle at a time. Each has its own log and history.
  { key: "tires", label: "Tires (replace)", miles: 50000, months: 72,
    note: "Tread depth and age matter more than miles. Replace at 2/32\" of tread (4/32\" if you drive in the rain a lot), or around 6 years old. The date code is on the sidewall.",
    subs: [{ key: "tire-df", label: "Driver front" }, { key: "tire-dr", label: "Driver rear" }, { key: "tire-pf", label: "Passenger front" }, { key: "tire-pr", label: "Passenger rear" }] },
  { key: "brake-pads", label: "Brake pads (replace)", miles: 40000, months: null,
    note: "Replace when about 3 mm (1/8 in) of pad is left, or if you hear grinding. Rear pads usually last longer than front.",
    subs: [{ key: "pads-f", label: "Front", miles: 40000 }, { key: "pads-r", label: "Rear", miles: 60000 }] },
  { key: "brake-rotors", label: "Brake rotors (replace)", miles: 70000, months: null,
    note: "Replace below the minimum thickness stamped on the rotor, or if warped or deeply grooved. Often done with new pads.",
    subs: [{ key: "rotors-f", label: "Front" }, { key: "rotors-r", label: "Rear" }] },
  { key: "shocks", label: "Shocks & struts (replace)", miles: 75000, months: null,
    note: "Worn ones cause bouncing, nose-dive when braking and uneven tire wear. Many last 50,000 to 100,000 miles.",
    subs: [{ key: "shocks-f", label: "Front" }, { key: "shocks-r", label: "Rear" }] },
  { key: "brake-fluid", label: "Brake fluid flush", miles: 30000, months: 24, note: "Brake fluid absorbs moisture over time." },
  { key: "plugs", label: "Spark plugs", miles: 60000, months: null, gas: true, note: "Iridium or platinum plugs often go 100,000 miles. Check the manual." },
  { key: "trans", label: "Transmission fluid", miles: 60000, months: null, noEv: true, note: "Interval varies a lot by transmission. Check the manual." },
  { key: "coolant", label: "Coolant flush", miles: 60000, months: 60, noEv: true, note: "Some long-life coolants go 100,000+ miles." },
  { key: "diff", label: "Differential / transfer case fluid", miles: 40000, months: null, awd: true },
  { key: "serp", label: "Serpentine belt", miles: 90000, months: null, noEv: true, note: "Inspect for cracks at every oil change." },
  { key: "timing", label: "Timing belt (if equipped)", miles: 90000, months: 84, noEv: true, note: "Skip if your engine has a timing chain. Check the manual." },
  { key: "fuel-filter", label: "Fuel filter", miles: 30000, months: null, diesel: true },
];

function profile(v) {
  const fuel = (v.fuel || "").toLowerCase();
  const drive = v.drive || "";
  return {
    ev: fuel === "electric",
    diesel: fuel.includes("diesel"),
    awd: /awd|4wd|4x4|all-wheel|four-wheel/i.test(drive),
  };
}

export function planFor(vehicle) {
  const p = profile(vehicle);
  const withCustom = (it) => {
    const custom = (vehicle.intervals || {})[it.key];
    return {
      ...it,
      miles: custom && "miles" in custom ? custom.miles : it.miles,
      months: custom && "months" in custom ? custom.months : it.months,
      customized: !!custom,
    };
  };
  return ITEMS
    .filter((it) => !(p.ev && (it.noEv || it.gas)))
    .filter((it) => !(it.gas && p.diesel))
    .filter((it) => !(it.diesel && !p.diesel))
    .filter((it) => !(it.awd && !p.awd))
    .map((it) => {
      if (!it.subs) return withCustom(it);
      // A group (tires, brakes...): the group row shows the standard interval, and each part has its own.
      const subs = it.subs.map((sub) => withCustom({ miles: it.miles, months: it.months, note: it.note, ...sub }));
      return { ...it, subs, customized: subs.some((x) => x.customized) };
    });
}

/* ---------- dates & status ---------- */

export function todayISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function parseISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addMonths(date, n) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + n);
  return d;
}

export const fmtNum = (n) => Number(n).toLocaleString("en-US");

export function fmtDate(iso) {
  return parseISO(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function latestEntry(entries) {
  if (!entries || !entries.length) return null;
  return [...entries].sort((a, b) => (a.date === b.date ? (b.mileage || 0) - (a.mileage || 0) : a.date < b.date ? 1 : -1))[0];
}

// level: overdue | soon | ok | none
export function getStatus(item, entries, mileage, today = new Date()) {
  const last = latestEntry(entries);
  if (!last) return { level: "none", text: "Not logged yet", last: null };

  const haveMiles = item.miles && mileage != null && mileage !== "" && last.mileage != null;
  const milesLeft = haveMiles ? last.mileage + item.miles - Number(mileage) : null;
  let daysLeft = null;
  let dueDate = null;
  if (item.months) {
    dueDate = addMonths(parseISO(last.date), item.months);
    daysLeft = Math.round((dueDate - today) / 86400000);
  }

  const overdue = (milesLeft != null && milesLeft < 0) || (daysLeft != null && daysLeft < 0);
  const soon =
    (milesLeft != null && milesLeft <= Math.max(500, (item.miles || 0) * 0.1)) ||
    (daysLeft != null && daysLeft <= 30);
  const level = overdue ? "overdue" : soon ? "soon" : "ok";

  const bits = [];
  if (milesLeft != null) bits.push(milesLeft < 0 ? fmtNum(-milesLeft) + " mi overdue" : fmtNum(milesLeft) + " mi left");
  if (daysLeft != null) {
    if (daysLeft < 0) bits.push(-daysLeft + " days overdue");
    else if (daysLeft <= 60) bits.push(daysLeft + " days left");
    else bits.push("due " + dueDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }));
  }
  if (!bits.length) bits.push("Logged");
  return { level, text: bits.join(" · "), last };
}

export const LEVEL_RANK = { overdue: 0, soon: 1, ok: 2, none: 3 };

// A group (tires, brake pads...) takes its level from its most urgent part, with a short summary line.
export function groupStatus(item, log, mileage, today = new Date()) {
  const subs = item.subs.map((sub) => ({ sub, st: getStatus(sub, (log || {})[sub.key], mileage, today) }));
  const count = (lvl) => subs.filter((x) => x.st.level === lvl).length;
  const level = subs.reduce((best, x) => (LEVEL_RANK[x.st.level] < LEVEL_RANK[best] ? x.st.level : best), "none");
  const parts = [];
  if (count("overdue")) parts.push(count("overdue") + " overdue");
  if (count("soon")) parts.push(count("soon") + " due soon");
  if (count("ok")) parts.push(count("ok") + " ok");
  if (count("none")) parts.push(count("none") + " not logged");
  return { level, text: parts.join(" \u00b7 "), subs };
}

// Splits one cost across n parts in whole cents so the pieces add back up exactly.
export function splitCost(total, n) {
  if (total == null || !Number.isFinite(Number(total)) || n < 1) return Array(n).fill(null);
  const cents = Math.round(Number(total) * 100);
  const each = Math.floor(cents / n);
  const extra = cents - each * n;
  return Array.from({ length: n }, (_, i) => (each + (i < extra ? 1 : 0)) / 100);
}

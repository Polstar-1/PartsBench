/* Units. Everything is STORED in miles (mileage, service intervals, readings) so saved data never changes.
   Only what's shown, and what's typed in, converts. Default is imperial. */

const KEY = "partsbench.units";
const KM = 1.609344;
let system = "imperial";
try { if (typeof window !== "undefined" && window.localStorage.getItem(KEY) === "metric") system = "metric"; } catch { /* storage blocked */ }

const listeners = new Set();
export const subscribeUnits = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const getUnits = () => system;
export function setUnits(next) {
  const n = next === "metric" ? "metric" : "imperial";
  if (n === system) return;
  system = n;
  try { window.localStorage.setItem(KEY, n); } catch { /* storage blocked */ }
  listeners.forEach((f) => f());
}

const metric = () => system === "metric";
const group = (n) => Number(n).toLocaleString("en-US");

export const distUnit = () => (metric() ? "km" : "mi");
export const distWord = () => (metric() ? "kilometers" : "miles");

// A distance stored in miles -> the number to show.
export const toDisp = (miles) => (metric() ? Math.round(Number(miles) * KM) : Math.round(Number(miles)));
// What was typed -> miles to store. Keeps a decimal so km -> miles -> km comes back the same.
export const fromDisp = (n) => (metric() ? Math.round((Number(n) / KM) * 10) / 10 : Number(n));
// Typed text -> miles (or null when empty).
export const fromInput = (s) => (s === "" || s == null || !Number.isFinite(Number(s)) ? null : fromDisp(s));

export const fmtDist = (miles) => group(toDisp(miles));
export const fmtDistU = (miles) => group(toDisp(miles)) + " " + distUnit();

// Service intervals read nicer rounded: 5,000 mi shows as 8,000 km, not 8,047.
export function niceInterval(miles) {
  const m = Number(miles);
  if (!metric()) return Math.round(m);
  const km = m * KM;
  const step = km >= 50000 ? 1000 : km >= 5000 ? 500 : 100;
  return Math.round(km / step) * step;
}
export const fmtInterval = (miles) => group(niceInterval(miles));

// The cost-per-distance figure ($ per mile is stored; per km is a third smaller).
export const perDist = (perMile) => (metric() ? perMile / KM : perMile);

// Text written in miles/inches (item notes) -> the chosen system.
export function localizeText(text) {
  if (!text || !metric()) return text;
  const km = (s) => {
    const m = Number(String(s).replace(/,/g, ""));
    return group(niceInterval(m));
  };
  return String(text)
    .replace(/(\d[\d,]*)\s+to\s+(\d[\d,]*)(\+?)\s+miles/g, (_, a, b, plus) => km(a) + " to " + km(b) + plus + " km")
    .replace(/(\d[\d,]*)(\+?)\s+miles/g, (_, a, plus) => km(a) + plus + " km")
    .replace(/\b2\/32"/g, "1.6 mm")
    .replace(/\b4\/32"/g, "3 mm")
    .replace(/\bmiles\b/g, "kilometers");
}

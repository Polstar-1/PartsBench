import { planFor, FREE_KEYS } from "./maintenance.js";

/* "What usually comes due around now." No service history needed: for each job with a mileage interval, find the
   nearest multiple of that interval to the current mileage, and list the bigger jobs that land close to it.
   Routine jobs (oil, filters) come up so often they'd drown the list, so only intervals of 15,000 miles or more count. */
const MIN_INTERVAL = 15000;
const MAX_ITEMS = 5;

export function dueAround(vehicle, mileage) {
  const m = Number(mileage);
  if (!Number.isFinite(m) || m < 1000) return null;
  const out = [];
  for (const it of planFor(vehicle, { full: true })) {
    const every = it.miles;
    if (!every || every < MIN_INTERVAL) continue;
    const k = Math.max(1, Math.round(m / every));
    const near = k * every;
    const off = Math.abs(m - near);
    if (off > Math.max(0.12 * every, 2000)) continue;
    out.push({ key: it.key, label: it.label.replace(/ \((replace|if equipped)\)/i, "").replace(/ replaced$/i, ""), every, free: FREE_KEYS.includes(it.key), off, shop: it.shop });
  }
  // Bigger jobs first, then the ones closest to this mileage.
  out.sort((a, b) => b.every - a.every || a.off - b.off);
  return out.slice(0, MAX_ITEMS);
}

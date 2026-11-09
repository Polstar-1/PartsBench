// Client side of the parts search. Talks to our own /api/parts function (see api/parts.js).
export const SORTS = [
  { key: "best", label: "Best match" },
  { key: "low", label: "Price: low to high" },
  { key: "high", label: "Price: high to low" },
  { key: "new", label: "Newest listed" },
];

export const CONDITIONS = [
  { key: "any", label: "All" },
  { key: "new", label: "New" },
  { key: "reman", label: "Reman" },
  { key: "used", label: "Used" },
];

const cache = new Map();

export function partsKey({ terms, vehicle, sort, cond }) {
  return [terms, vehicle.year, vehicle.make, vehicle.model, sort, cond].join("|");
}

// Resolves to { configured, fitment, items, total } or throws on a real failure.
export async function searchParts({ terms, vehicle, sort, cond, signal }) {
  const key = partsKey({ terms, vehicle, sort, cond });
  if (cache.has(key)) return cache.get(key);
  const p = new URLSearchParams({ q: terms, year: vehicle.year || "", make: vehicle.make || "", model: vehicle.model || "", sort, cond });
  const res = await fetch("/api/parts?" + p.toString(), { signal });
  // Local dev server and old deployments have no /api: treat that like "not set up yet".
  const type = res.headers.get("content-type") || "";
  if (res.status === 404 || !type.includes("json")) return { configured: false, items: [] };
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Search failed");
  if (data.configured) cache.set(key, data);
  return data;
}

export function money(n, currency) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(n);
  } catch {
    return "$" + Number(n).toFixed(2);
  }
}

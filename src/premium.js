/* ============================================================
   PREMIUM
   GATING_OPEN = true  -> every premium feature is open to everybody (current plan, until there's traffic).
   GATING_OPEN = false -> premium features are only for accounts with Premium.
   Either way, accounts that really have Premium get the small PREMIUM tag under the logo.
   ============================================================ */
export const GATING_OPEN = false;

// A row in the `premium` table counts while it's switched on and hasn't passed its end date.
export function rowIsPremium(row, now = Date.now()) {
  if (!row || row.active !== true) return false;
  if (row.until) {
    const end = Date.parse(row.until);
    if (Number.isFinite(end) && end <= now) return false;
  }
  return true;
}

// Use this to decide whether a premium feature is available right now.
export const canUsePremium = (premium) => GATING_OPEN || !!premium;

// Free accounts can keep this many vehicles; Premium has no limit. Vehicles already saved are never taken away.
export const FREE_VEHICLES = 2;
// premium === null means the account check hasn't finished yet, so don't block anyone in that moment.
export const canAddVehicle = (count, premium) => premium === null || canUsePremium(premium) || count < FREE_VEHICLES;

/* ============================================================
   PLANS SCREEN
   PAYMENTS_ON = false -> the buy button stays off ("coming soon").
   PRICES: leave a price as null until it's decided; the screen then says "Pricing coming soon".
   Example once decided:  { monthly: "$1.99", yearly: "$14.99" }
   status: "live" shows a check, "soon" shows "Coming soon" (don't promise what isn't built).
   ============================================================ */
export const PAYMENTS_ON = false;
export const PRICES = { monthly: null, yearly: null };

export const FEATURES = [
  { group: "Included free", rows: [
    { name: "VIN decoder", free: true, premium: true },
    { name: "Garage (save your vehicles)", free: true, premium: true },
    { name: "Safety recall lookup", free: true, premium: true },
    { name: "Parts shop with live eBay listings", free: true, premium: true },
    { name: "Basic maintenance tracker", note: "Oil & filter, tire rotation, air filters, wipers", free: true, premium: true },
  ] },
  { group: "Premium", rows: [
    { name: "Email reminders when maintenance is due", free: false, premium: true },
    { name: "Tire, brake and shock tracking", note: "Per tire and per axle, with \u201cLog all\u201d", free: false, premium: true },
    { name: "Full maintenance schedule", note: "Fluids, belts, plugs, battery and more", free: false, premium: true },
    { name: "Intervals tuned to your vehicle", note: "Hybrid, EV and all-wheel drive adjustments", free: false, premium: true },
    { name: "Cost totals and exportable history", note: "Totals, cost per mile, spending by category, CSV and print", free: false, premium: true },
    { name: "More than two vehicles", note: "Free keeps two in the Garage", free: false, premium: true },
    { name: "Ask AI about your vehicle", free: false, premium: "soon" },
  ] },
];

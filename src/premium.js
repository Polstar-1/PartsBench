/* ============================================================
   PREMIUM
   GATING_OPEN = true  -> every premium feature is open to everybody (current plan, until there's traffic).
   GATING_OPEN = false -> premium features are only for accounts with Premium.
   Either way, accounts that really have Premium get the small PREMIUM tag under the logo.
   ============================================================ */
export const GATING_OPEN = true;

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

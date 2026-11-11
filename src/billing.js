import { supabase } from "./supabase";
import { PAYMENTS_ON } from "./premium";

// Buying is open to everyone once PAYMENTS_ON is true. Before that, opening the site once with ?payments=test
// turns the buy buttons on in that browser tab only, so test purchases can be tried without anyone else seeing them.
export function paymentsOn() {
  if (PAYMENTS_ON) return true;
  try { return window.sessionStorage.getItem("partsbench.payments") === "test"; } catch { return false; }
}

export function rememberTestMode(search) {
  try {
    if (new URLSearchParams(search).get("payments") === "test") window.sessionStorage.setItem("partsbench.payments", "test");
  } catch { /* private mode: the override just won't stick */ }
}

async function post(body) {
  const { data } = await supabase.auth.getSession();
  const token = data && data.session ? data.session.access_token : null;
  if (!token) return { error: "Sign in first (Settings), then try again." };
  try {
    const r = await fetch("/api/billing", { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.url) return { url: j.url };
    return { error: j.error || "Something went wrong. Try again.", manage: !!j.manage };
  } catch {
    return { error: "Couldn't reach the server. Check your connection and try again." };
  }
}

// Both return { url } (go there) or { error }.
export const startCheckout = (plan) => post({ action: "checkout", plan });
export const openPortal = () => post({ action: "portal" });

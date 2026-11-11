// Small helpers for talking to Stripe without any extra packages.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SITE = "https://mypartsbench.com";
export const GRACE_DAYS = 3; // keep Premium a few days past the paid period so a late webhook never cuts anyone off

// Stripe wants forms like  line_items[0][price]=price_123  not JSON.
export function encodeForm(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    const key = prefix ? prefix + "[" + k + "]" : k;
    if (Array.isArray(v)) v.forEach((item, i) => (item && typeof item === "object" ? encodeForm(item, key + "[" + i + "]", out) : out.push(encodeURIComponent(key + "[" + i + "]") + "=" + encodeURIComponent(item))));
    else if (typeof v === "object") encodeForm(v, key, out);
    else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(v));
  }
  return out;
}

export async function stripe(env, f, method, path, params) {
  const r = await f("https://api.stripe.com/v1/" + path, {
    method,
    headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY, "content-type": "application/x-www-form-urlencoded" },
    body: params ? encodeForm(params).join("&") : undefined,
  });
  let body = {};
  try { body = await r.json(); } catch { /* not JSON */ }
  return { ok: r.ok, status: r.status, body };
}

// Checks the Stripe-Signature header: "t=timestamp,v1=hash". Rejects anything old or tampered with.
export function verifySignature(payload, header, secret, now = Date.now(), toleranceSec = 300) {
  if (!payload || !header || !secret) return false;
  const parts = String(header).split(",").map((p) => p.trim().split("="));
  const t = (parts.find(([k]) => k === "t") || [])[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length || !/^\d+$/.test(t)) return false;
  if (Math.abs(now / 1000 - Number(t)) > toleranceSec) return false;
  const want = createHmac("sha256", secret).update(t + "." + payload).digest("hex");
  return sigs.some((s) => s.length === want.length && timingSafeEqual(Buffer.from(s), Buffer.from(want)));
}

const LIVE = new Set(["active", "trialing", "past_due"]);

// A Stripe subscription -> what we store in the premium table.
export function rowFromSubscription(sub, userId, eventTime) {
  const end = sub.current_period_end != null ? sub.current_period_end : sub.items && sub.items.data && sub.items.data[0] ? sub.items.data[0].current_period_end : null;
  const active = LIVE.has(sub.status);
  return {
    user_id: userId,
    active,
    until: active && end ? new Date((end + GRACE_DAYS * 86400) * 1000).toISOString() : null,
    stripe_customer: typeof sub.customer === "string" ? sub.customer : sub.customer && sub.customer.id,
    stripe_subscription: sub.id,
    stripe_updated: eventTime,
  };
}

// Cancels a subscription (used when someone deletes their account). Already gone or already canceled counts as done.
export async function cancelSubscription(env, f, id) {
  const got = await stripe(env, f, "GET", "subscriptions/" + encodeURIComponent(id));
  if (got.status === 404) return true;
  if (!got.ok) return false;
  if (got.body.status === "canceled" || got.body.status === "incomplete_expired") return true;
  const del = await stripe(env, f, "DELETE", "subscriptions/" + encodeURIComponent(id));
  return del.ok || del.status === 404;
}

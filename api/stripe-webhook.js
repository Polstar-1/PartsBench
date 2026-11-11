// Vercel serverless function: Stripe tells us here when someone subscribes, renews, or cancels.
// Needs (Vercel > Settings > Environment Variables, all Sensitive):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
// Only requests that carry a valid Stripe signature are believed. Nothing here trusts the browser.
import { verifySignature, stripe, rowFromSubscription } from "./_lib/stripe.js";

const BASE = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://zlfbryvyrrjfhmsreiwz.supabase.co").replace(/\/$/, "");

function makeDb(env, f) {
  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: secret, "content-type": "application/json" };
  if (secret.startsWith("eyJ")) headers.Authorization = "Bearer " + secret;
  return {
    async find(query) {
      const r = await f(BASE + "/rest/v1/premium?select=user_id,stripe_updated&" + query, { headers });
      if (!r.ok) throw new Error("read premium " + r.status);
      return (await r.json())[0] || null;
    },
    async save(row) {
      const r = await f(BASE + "/rest/v1/premium", { method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
      if (!r.ok) throw new Error("write premium " + r.status);
    },
  };
}

// Returns a short note about what was done (handy for logs and tests).
export async function handleEvent(env, f, event) {
  const db = makeDb(env, f);
  const type = event.type;
  const obj = event.data && event.data.object ? event.data.object : {};
  let sub;
  let uid;

  if (type === "checkout.session.completed") {
    if (obj.mode !== "subscription" || !obj.subscription) return "ignored";
    const got = await stripe(env, f, "GET", "subscriptions/" + encodeURIComponent(typeof obj.subscription === "string" ? obj.subscription : obj.subscription.id));
    if (!got.ok) throw new Error("stripe subscription " + got.status);
    sub = got.body;
    uid = obj.client_reference_id || (sub.metadata && sub.metadata.user_id) || null;
  } else if (type === "customer.subscription.created" || type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    sub = obj;
    uid = (sub.metadata && sub.metadata.user_id) || null;
  } else {
    return "ignored";
  }

  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer && sub.customer.id;
  if (!uid && customer) {
    const known = await db.find("stripe_customer=eq." + encodeURIComponent(customer));
    uid = known ? known.user_id : null;
  }
  if (!uid) return "no-user";

  const existing = await db.find("user_id=eq." + encodeURIComponent(uid));
  if (existing && Number(existing.stripe_updated) > event.created) return "older-event"; // a newer update already landed
  await db.save(rowFromSubscription(sub, uid, event.created));
  return "saved";
}

const json = (code, body, extra) => new Response(JSON.stringify(body), { status: code, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });

// Web-standard handler: request.text() gives the exact bytes Stripe signed, which the signature check needs.
export async function POST(request) {
  const env = process.env;
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) return json(501, { configured: false });

  let raw;
  try { raw = await request.text(); } catch { return json(400, { error: "Couldn't read the request body." }); }
  if (raw.length > 1024 * 1024) return json(400, { error: "Too large." });
  if (!verifySignature(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET)) return json(400, { error: "Bad signature." });

  let event;
  try { event = JSON.parse(raw); } catch { return json(400, { error: "Bad body." }); }
  try {
    const result = await handleEvent(env, fetch, event);
    return json(200, { received: true, result });
  } catch {
    return json(500, { error: "Couldn't save that. Stripe will try again." }); // a non-200 makes Stripe retry later
  }
}

export function GET() { return json(405, { error: "Use POST." }, { allow: "POST" }); }

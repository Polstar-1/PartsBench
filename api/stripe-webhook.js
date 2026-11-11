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

// We need the exact bytes Stripe sent to check the signature. Vercel only parses the body when req.body is
// touched, so read the raw stream first and never look at req.body unless the stream was already used up.
async function readRaw(req) {
  const chunks = [];
  let size = 0;
  if (typeof req[Symbol.asyncIterator] === "function") {
    for await (const c of req) {
      size += c.length;
      if (size > 1024 * 1024) return null;
      chunks.push(Buffer.from(c));
    }
  }
  if (chunks.length) return Buffer.concat(chunks).toString("utf8");
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  return null; // already parsed into an object: the exact bytes are gone
}

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Use POST." }); }
  const env = process.env;
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) return res.status(501).json({ configured: false });

  const raw = await readRaw(req);
  if (raw == null) return res.status(400).json({ error: "Couldn't read the request body." });
  if (!verifySignature(raw, req.headers["stripe-signature"], env.STRIPE_WEBHOOK_SECRET)) return res.status(400).json({ error: "Bad signature." });

  let event;
  try { event = JSON.parse(raw); } catch { return res.status(400).json({ error: "Bad body." }); }
  try {
    const result = await handleEvent(env, fetch, event);
    return res.status(200).json({ received: true, result });
  } catch {
    return res.status(500).json({ error: "Couldn't save that. Stripe will try again." }); // a non-200 makes Stripe retry later
  }
}

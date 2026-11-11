// Vercel serverless function: starts a purchase, or opens the "manage my subscription" page.
//   POST { action: "checkout", plan: "monthly" | "yearly" }  ->  { url }  (Stripe's hosted checkout page)
//   POST { action: "portal" }                                 ->  { url }  (Stripe's page to update card, cancel, see receipts)
// The caller must be signed in. Needs (Vercel > Environment Variables):
//   STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY, SUPABASE_SERVICE_ROLE_KEY
import { stripe, SITE } from "./_lib/stripe.js";
import { rowIsPremium } from "../src/premium.js";

const BASE = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://zlfbryvyrrjfhmsreiwz.supabase.co").replace(/\/$/, "");
const PUBLIC_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_BOH4ct7IJSpH_oXooiRQgQ_ASgF_n4n";

export async function billing(env, f, token, body) {
  let user = null;
  try {
    const who = await f(BASE + "/auth/v1/user", { headers: { apikey: PUBLIC_KEY, Authorization: "Bearer " + token } });
    if (who.ok) user = await who.json();
  } catch {
    return { status: 502, body: { error: "Couldn't reach the account service. Try again." } };
  }
  if (!user || !user.id) return { status: 401, body: { error: "Your login has expired. Sign out, sign in again, then try once more." } };

  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: secret };
  if (secret.startsWith("eyJ")) headers.Authorization = "Bearer " + secret;
  let row;
  try {
    const r = await f(BASE + "/rest/v1/premium?select=active,until,stripe_customer&user_id=eq." + encodeURIComponent(user.id), { headers });
    if (!r.ok) throw new Error("read");
    row = (await r.json())[0] || null;
  } catch {
    return { status: 502, body: { error: "Couldn't check your account. Try again." } };
  }

  const action = body && body.action;
  try {
    if (action === "checkout") {
      if (rowIsPremium(row)) return { status: 409, body: { error: "You already have Premium.", manage: true } };
      const plan = body.plan === "yearly" ? "yearly" : body.plan === "monthly" ? "monthly" : null;
      if (!plan) return { status: 400, body: { error: "Pick monthly or yearly." } };
      const price = plan === "yearly" ? env.STRIPE_PRICE_YEARLY : env.STRIPE_PRICE_MONTHLY;
      if (!price) return { status: 501, body: { configured: false, error: "Buying Premium isn't switched on yet." } };
      const session = await stripe(env, f, "POST", "checkout/sessions", {
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        success_url: SITE + "/?checkout=success",
        cancel_url: SITE + "/?checkout=cancel",
        client_reference_id: user.id,
        ...(row && row.stripe_customer ? { customer: row.stripe_customer } : { customer_email: user.email }),
        subscription_data: { metadata: { user_id: user.id } },
        allow_promotion_codes: "true",
        custom_text: { submit: { message: "Renews automatically until you cancel. Cancel any time in Parts Bench under Settings." } },
      });
      if (!session.ok || !session.body.url) return { status: 502, body: { error: "Couldn't start checkout. Try again in a moment." } };
      return { status: 200, body: { url: session.body.url } };
    }
    if (action === "portal") {
      if (!row || !row.stripe_customer) return { status: 404, body: { error: "There's no subscription on this account to manage." } };
      const portal = await stripe(env, f, "POST", "billing_portal/sessions", { customer: row.stripe_customer, return_url: SITE + "/?checkout=portal" });
      if (!portal.ok || !portal.body.url) return { status: 502, body: { error: "Couldn't open the subscription page. Try again in a moment." } };
      return { status: 200, body: { url: portal.body.url } };
    }
  } catch {
    return { status: 502, body: { error: "Couldn't reach the payment service. Try again." } };
  }
  return { status: 400, body: { error: "Unknown request." } };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Use POST." }); }
  const env = process.env;
  if (!env.STRIPE_SECRET_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) return res.status(501).json({ configured: false, error: "Buying Premium isn't switched on yet." });
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return res.status(401).json({ error: "Please sign in again, then try once more." });
  const r = await billing(env, fetch, token, req.body && typeof req.body === "object" ? req.body : {});
  return res.status(r.status).json(r.body);
}

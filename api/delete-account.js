// Vercel serverless function: permanently deletes the signed-in person's account.
// Deleting an account needs Supabase's secret key, which must never be in the app itself.
// It lives ONLY in Vercel's environment variables:
//   SUPABASE_SERVICE_ROLE_KEY   (required; the "secret" key from Supabase > Project Settings > API Keys)
// With no key set it answers { configured: false } and the app says deletion isn't switched on.
//
// The person's Garage is stored in a table that is linked to their account, so it is
// deleted together with the account.

const BASE = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://zlfbryvyrrjfhmsreiwz.supabase.co").replace(/\/$/, "");
// The public key is safe to include: it is the same one the app itself uses.
const PUBLIC_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_BOH4ct7IJSpH_oXooiRQgQ_ASgF_n4n";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return res.status(501).json({ configured: false, error: "Account deletion isn't switched on yet." });

  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return res.status(401).json({ error: "Please sign in again, then try once more." });

  // Find out who is asking. Only that person's own account can be deleted.
  let user = null;
  try {
    const who = await fetch(BASE + "/auth/v1/user", { headers: { apikey: PUBLIC_KEY, Authorization: "Bearer " + token } });
    if (who.ok) user = await who.json();
  } catch {
    return res.status(502).json({ error: "Couldn't reach the account service. Try again." });
  }
  if (!user || !user.id) return res.status(401).json({ error: "Please sign in again, then try once more." });

  const headers = { apikey: secret, "content-type": "application/json" };
  if (secret.startsWith("eyJ")) headers.Authorization = "Bearer " + secret; // older-style keys also go here
  try {
    const del = await fetch(BASE + "/auth/v1/admin/users/" + encodeURIComponent(user.id), {
      method: "DELETE",
      headers,
      body: JSON.stringify({ should_soft_delete: false }),
    });
    if (!del.ok) return res.status(502).json({ error: "The account couldn't be deleted. Nothing was changed. Try again." });
  } catch {
    return res.status(502).json({ error: "Couldn't reach the account service. Try again." });
  }
  return res.status(200).json({ ok: true });
}

// Vercel serverless function: maintenance reminder emails.
//
// Three jobs, one address:
//   GET  /api/reminders            Vercel's daily timer calls this (with CRON_SECRET). Emails everyone whose
//                                  reminders are on and who has something due.
//   POST /api/reminders            A signed-in person asks for a test email to themselves (Settings > Send a test).
//   GET/POST /api/reminders?u&t    The Unsubscribe link at the bottom of every email.
//
// Needs these in Vercel > Settings > Environment Variables (all server-only, mark Sensitive):
//   SUPABASE_SERVICE_ROLE_KEY   already set for account deletion
//   RESEND_API_KEY              from resend.com > API Keys (sending access only)
//   CRON_SECRET                 any long random text; Vercel's timer sends it automatically
// Optional:  REMINDER_FROM      e.g.  Parts Bench <reminders@mypartsbench.com>
import { timingSafeEqual } from "node:crypto";
import { SITE, dueForGarage, plan, buildEmail, sampleGroups, verify, unsubUrl } from "./_lib/reminders.js";
import { GATING_OPEN, rowIsPremium } from "../src/premium.js";
import { todayISO } from "../src/maintenance.js";
import { esc } from "./_lib/html.js";

const BASE = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://zlfbryvyrrjfhmsreiwz.supabase.co").replace(/\/$/, "");
const PUBLIC_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_BOH4ct7IJSpH_oXooiRQgQ_ASgF_n4n";
const FROM_DEFAULT = "Parts Bench <reminders@mypartsbench.com>";
const CHUNK = 50;
const BUDGET_MS = 50000;

const same = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
const inList = (ids) => "in.(" + ids.join(",") + ")";

function makeClient(env, f) {
  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: secret, "content-type": "application/json" };
  if (secret.startsWith("eyJ")) headers.Authorization = "Bearer " + secret; // older-style keys also go here
  const rest = (path, opts = {}) => f(BASE + "/rest/v1/" + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const get = async (path) => { const r = await rest(path); if (!r.ok) throw new Error("read " + path.split("?")[0] + " " + r.status); return r.json(); };
  const upsert = async (table, row) => {
    const r = await rest(table, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
    if (!r.ok) throw new Error("write " + table + " " + r.status);
  };
  const email = async (uid) => {
    const r = await f(BASE + "/auth/v1/admin/users/" + encodeURIComponent(uid), { headers });
    if (!r.ok) return "";
    const u = await r.json();
    return u && u.email ? u.email : "";
  };
  return { get, upsert, email };
}

async function sendMail(env, f, to, mail, unsub) {
  const r = await f("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.REMINDER_FROM || FROM_DEFAULT, to: [to], subject: mail.subject, html: mail.html, text: mail.text,
      headers: { "List-Unsubscribe": "<" + unsub + ">", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  return r.ok;
}

// Who is allowed premium features right now (everyone, while the doors are open).
async function eligible(db, ids) {
  if (GATING_OPEN || !ids.length) return new Set(ids);
  const ok = new Set();
  for (const part of chunks(ids, CHUNK)) {
    const rows = await db.get("premium?select=user_id,active,until&user_id=" + inList(part));
    rows.forEach((r) => { if (rowIsPremium(r)) ok.add(r.user_id); });
  }
  return ok;
}

export async function runReminders(env, f = fetch, now = new Date()) {
  const db = makeClient(env, f);
  const today = todayISO(now);
  const stop = Date.now() + BUDGET_MS;
  const sum = { users: 0, emailed: 0, skipped: 0, errors: 0, timedOut: false };

  let ids = [];
  for (let off = 0; ; off += 500) {
    const page = await db.get("reminder_prefs?select=user_id&enabled=eq.true&order=user_id&limit=500&offset=" + off);
    ids = ids.concat(page.map((r) => r.user_id));
    if (page.length < 500) break;
  }
  const allowed = await eligible(db, ids);
  ids = ids.filter((id) => allowed.has(id));
  sum.users = ids.length;

  for (const part of chunks(ids, CHUNK)) {
    const garages = new Map((await db.get("garages?select=user_id,data&user_id=" + inList(part))).map((r) => [r.user_id, r.data]));
    const logs = new Map((await db.get("reminder_log?select=user_id,sent&user_id=" + inList(part))).map((r) => [r.user_id, r.sent || {}]));
    for (const uid of part) {
      if (Date.now() > stop) { sum.timedOut = true; return sum; }
      try {
        const prev = logs.get(uid) || {};
        const { send, next } = plan(dueForGarage(garages.get(uid), now), prev, today);
        if (!send.length) {
          if (JSON.stringify(next) !== JSON.stringify(prev)) await db.upsert("reminder_log", { user_id: uid, sent: next });
          sum.skipped++;
          continue;
        }
        const to = await db.email(uid);
        if (!to) { sum.skipped++; continue; }
        const unsub = unsubUrl(uid, env.CRON_SECRET);
        if (!(await sendMail(env, f, to, buildEmail({ groups: send, unsub }), unsub))) { sum.errors++; continue; } // not remembered, so it retries tomorrow
        await db.upsert("reminder_log", { user_id: uid, sent: next });
        sum.emailed++;
        await sleep(env.REMINDER_PAUSE_MS != null ? Number(env.REMINDER_PAUSE_MS) : 600); // stay under Resend's rate limit
      } catch {
        sum.errors++;
      }
    }
  }
  return sum;
}

// A signed-in person asks for a test email to their own address.
export async function sendTest(env, f, token, now = new Date()) {
  let user = null;
  try {
    const who = await f(BASE + "/auth/v1/user", { headers: { apikey: PUBLIC_KEY, Authorization: "Bearer " + token } });
    if (who.ok) user = await who.json();
  } catch {
    return { status: 502, body: { error: "Couldn't reach the account service. Try again." } };
  }
  if (!user || !user.id || !user.email) return { status: 401, body: { error: "Your login has expired. Sign out, sign in again, then try once more." } };

  const db = makeClient(env, f);
  try {
    if (!(await eligible(db, [user.id])).has(user.id)) return { status: 403, body: { error: "Email reminders are a Premium feature." } };
    const log = (await db.get("reminder_log?select=last_test&user_id=eq." + encodeURIComponent(user.id)))[0];
    if (log && log.last_test && now - Date.parse(log.last_test) < 60000) return { status: 429, body: { error: "A test email was just sent. Wait a minute, then try again." } };
    const garage = (await db.get("garages?select=data&user_id=eq." + encodeURIComponent(user.id)))[0];
    let groups = dueForGarage(garage && garage.data, now);
    const sample = groups.length === 0;
    if (sample) groups = sampleGroups();
    const unsub = unsubUrl(user.id, env.CRON_SECRET);
    if (!(await sendMail(env, f, user.email, buildEmail({ groups, unsub, test: true, sample }), unsub))) return { status: 502, body: { error: "The email service didn't accept it. Check the Resend key and sending address, then try again." } };
    await db.upsert("reminder_log", { user_id: user.id, last_test: now.toISOString() });
    return { status: 200, body: { ok: true, sample, to: user.email } };
  } catch {
    return { status: 502, body: { error: "Something went wrong reaching the database. Did you run supabase/reminders.sql?" } };
  }
}

async function unsubscribe(env, f, uid) {
  const db = makeClient(env, f);
  await db.upsert("reminder_prefs", { user_id: uid, enabled: false, updated_at: new Date().toISOString() });
}

const page = (title, body) => "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>" + esc(title) + "</title></head>" +
  "<body style=\"margin:0;background:#14161a;color:#edeeea;font:16px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif\"><main style=\"max-width:460px;margin:12vh auto;padding:0 20px\"><p style=\"font-weight:700;letter-spacing:.08em\">PARTS<span style=\"color:#ff5a1f\">BENCH</span></p>" + body + "</main></body></html>";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const env = process.env;
  const url = new URL(req.url || "/", "http://x");
  const uid = url.searchParams.get("u") || "";
  const tok = url.searchParams.get("t") || "";
  const html = (code, s) => { res.setHeader("Content-Type", "text/html; charset=utf-8"); return res.status(code).send(s); };
  const ready = env.SUPABASE_SERVICE_ROLE_KEY && env.RESEND_API_KEY && env.CRON_SECRET;

  // Unsubscribe link from an email.
  if (uid) {
    if (!env.CRON_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) return html(501, page("Unsubscribe", "<p>This isn't switched on yet.</p>"));
    if (!verify(uid, tok, env.CRON_SECRET)) return html(400, page("Unsubscribe", "<h1>That link doesn't look right</h1><p>You can switch reminders off any time in Parts Bench under Settings.</p>"));
    if (req.method === "POST") {
      try { await unsubscribe(env, fetch, uid); } catch { return html(502, page("Unsubscribe", "<h1>Something went wrong</h1><p>Please try again, or switch reminders off in Parts Bench under Settings.</p>")); }
      return html(200, page("Unsubscribed", "<h1>You're unsubscribed</h1><p>You won't get maintenance reminder emails anymore. You can turn them back on any time in Parts Bench under Settings.</p><p><a style=\"color:#7ba6d4\" href=\"" + SITE + "\">Back to Parts Bench</a></p>"));
    }
    if (req.method === "GET") {
      return html(200, page("Unsubscribe", "<h1>Stop maintenance reminders?</h1><form method=\"post\" action=\"/api/reminders?u=" + encodeURIComponent(uid) + "&t=" + encodeURIComponent(tok) + "\"><button style=\"background:#ff5a1f;color:#1a1000;font-weight:700;border:0;border-radius:8px;padding:12px 18px;font-size:16px;cursor:pointer\">Unsubscribe</button></form>"));
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Use GET or POST." });
  }

  const header = String(req.headers.authorization || "");
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  // Vercel's daily timer.
  if (req.method === "GET") {
    if (!ready) return res.status(501).json({ configured: false, error: "Reminder emails aren't switched on yet." });
    if (!bearer || !same(bearer, env.CRON_SECRET)) return res.status(401).json({ error: "Not allowed." });
    try {
      return res.status(200).json({ ok: true, ...(await runReminders(env, fetch)) });
    } catch (e) {
      return res.status(502).json({ ok: false, error: String(e && e.message ? e.message : e).slice(0, 200) });
    }
  }

  // A person asking for a test email.
  if (req.method === "POST") {
    if (!ready) return res.status(501).json({ configured: false, error: "Reminder emails aren't switched on yet." });
    if (!bearer) return res.status(401).json({ error: "Please sign in again, then try once more." });
    const r = await sendTest(env, fetch, bearer);
    return res.status(r.status).json(r.body);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Use GET or POST." });
}

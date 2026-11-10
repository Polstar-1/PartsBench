// The logic behind maintenance reminder emails. No network calls in here, so it is easy to test.
import { createHmac, timingSafeEqual } from "node:crypto";
import { planFor, getStatus, estimateMiles, todayISO } from "../../src/maintenance.js";
import { esc } from "./html.js";

export const SITE = "https://mypartsbench.com";
const SAFE = /^[A-Za-z0-9 .'&/-]{1,40}$/; // same rule the app uses for links into it

/* ---------- what is due ---------- */

const vehicleName = (v) => v.nickname || [v.year, v.make, v.model].filter(Boolean).join(" ") || "Your vehicle";

// One row per part that is overdue or coming up. Parts you haven't logged yet are left alone:
// we can't tell when they were last done, so nagging about them would just be noise.
export function dueFor(vehicle, today = new Date()) {
  if (!vehicle || !vehicle.id) return null;
  const est = estimateMiles(vehicle, today);
  const miles = est.miles;
  const log = vehicle.log || {};
  const items = [];
  const push = (item, parentLabel) => {
    const entries = log[item.key] || [];
    const st = getStatus(item, entries, miles, today, est.estimated);
    if (st.level !== "overdue" && st.level !== "soon") return;
    const last = st.last;
    items.push({
      id: vehicle.id + "|" + item.key + "|" + (last ? last.id || last.date : "none"),
      label: parentLabel ? parentLabel + " – " + item.label : item.label,
      level: st.level,
      text: st.text,
      shop: item.shop || "",
    });
  };
  for (const it of planFor(vehicle)) {
    if (it.subs) it.subs.forEach((sub) => push({ ...sub, shop: sub.shop || it.shop }, it.label.replace(/ \(replace\)$/, "")));
    else push(it);
  }
  items.sort((a, b) => (a.level === b.level ? 0 : a.level === "overdue" ? -1 : 1));
  return items.length ? { vehicle, name: vehicleName(vehicle), items } : null;
}

export function dueForGarage(garage, today = new Date()) {
  const list = garage && Array.isArray(garage.vehicles) ? garage.vehicles : [];
  return list.map((v) => dueFor(v, today)).filter(Boolean);
}

/* ---------- don't repeat yourself ---------- */

const dayNum = (iso) => Date.parse(iso + "T00:00:00Z") / 86400000;
export const REPEAT_OVERDUE_DAYS = 14;

// "soon" is mentioned once. "overdue" is mentioned when it first becomes overdue, then again every two weeks.
export function shouldSend(prev, level, today) {
  if (!prev) return true;
  if (prev.l === "soon" && level === "overdue") return true;
  if (level === "overdue") return dayNum(today) - dayNum(prev.d) >= REPEAT_OVERDUE_DAYS;
  return false;
}

// Works out which items go in today's email and what to remember afterwards.
// Items that are no longer due (you logged the service) are forgotten, so the log doesn't grow forever.
export function plan(groups, sent, today) {
  const prev = sent || {};
  const next = {};
  const send = [];
  for (const g of groups) {
    const items = [];
    for (const it of g.items) {
      if (shouldSend(prev[it.id], it.level, today)) { items.push(it); next[it.id] = { l: it.level, d: today }; }
      else next[it.id] = prev[it.id];
    }
    if (items.length) send.push({ ...g, items });
  }
  return { send, next };
}

/* ---------- unsubscribe links ---------- */

export const sign = (uid, secret) => createHmac("sha256", secret).update("unsub:" + uid).digest("hex");
export function verify(uid, token, secret) {
  if (!uid || !token || !secret) return false;
  const a = Buffer.from(sign(uid, secret));
  const b = Buffer.from(String(token));
  return a.length === b.length && timingSafeEqual(a, b);
}
export const unsubUrl = (uid, secret) => SITE + "/api/reminders?u=" + encodeURIComponent(uid) + "&t=" + sign(uid, secret);

/* ---------- the email ---------- */

function shopLink(v, part) {
  if (!part || !SAFE.test(part) || !SAFE.test(v.make || "") || !SAFE.test(v.model || "") || !/^\d{4}$/.test(String(v.year || ""))) return "";
  return SITE + "/?y=" + encodeURIComponent(v.year) + "&mk=" + encodeURIComponent(v.make) + "&md=" + encodeURIComponent(v.model) + "&part=" + encodeURIComponent(part);
}

export function buildEmail({ groups, unsub, test = false, sample = false }) {
  const count = groups.reduce((n, g) => n + g.items.length, 0);
  const overdue = groups.reduce((n, g) => n + g.items.filter((i) => i.level === "overdue").length, 0);
  const first = groups[0];
  const subject = (test ? "[Test] " : "") + (sample
    ? "Parts Bench: this is what a maintenance reminder looks like"
    : count === 1
      ? "Parts Bench: " + first.items[0].label + " " + (first.items[0].level === "overdue" ? "is overdue" : "is coming up") + " for your " + first.name
      : "Parts Bench: " + count + " maintenance items " + (overdue ? "need attention" : "coming up") + (groups.length === 1 ? " for your " + first.name : ""));

  const color = { overdue: "#c2362b", soon: "#b7791f" };
  const html = [];
  const text = [];
  html.push('<div style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#1f2328">');
  html.push('<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px 22px;border:1px solid #e3e5e8">');
  html.push('<div style="font-weight:700;letter-spacing:.08em;font-size:14px;margin-bottom:14px">PARTS<span style="color:#ff5a1f">BENCH</span></div>');
  if (test) html.push('<p style="margin:0 0 14px;padding:8px 10px;background:#fff4ec;border-radius:6px;font-size:13px;color:#8a3a10">This is a test email. Real reminders only go out when something is due.</p>');
  if (test) text.push("THIS IS A TEST EMAIL. Real reminders only go out when something is due.\n");
  html.push('<h1 style="font-size:20px;line-height:1.3;margin:0 0 6px">' + (sample ? "Here’s how your reminders will look" : "Maintenance coming up") + "</h1>");
  text.push(sample ? "Here's how your reminders will look" : "Maintenance coming up");
  for (const g of groups) {
    html.push('<h2 style="font-size:16px;margin:20px 0 6px">' + esc(g.name) + "</h2>");
    text.push("\n" + g.name);
    for (const it of g.items) {
      const link = shopLink(g.vehicle, it.shop);
      html.push('<div style="padding:10px 0;border-top:1px solid #eceef0"><div style="font-weight:600">' + esc(it.label) + '</div><div style="font-size:14px;color:' + color[it.level] + '">' + (it.level === "overdue" ? "Overdue" : "Coming up") + " · " + esc(it.text) + "</div>" +
        (link ? '<div style="margin-top:4px;font-size:14px"><a href="' + esc(link) + '" style="color:#0b63b6">Shop ' + esc(it.shop) + " →</a></div>" : "") + "</div>");
      text.push("- " + it.label + ": " + (it.level === "overdue" ? "Overdue" : "Coming up") + " (" + it.text + ")" + (link ? "\n  Shop " + it.shop + ": " + link : ""));
    }
  }
  html.push('<p style="margin:22px 0 0"><a href="' + SITE + '" style="display:inline-block;background:#ff5a1f;color:#1a1000;font-weight:700;text-decoration:none;padding:11px 16px;border-radius:8px">Open Parts Bench</a></p>');
  text.push("\nOpen Parts Bench: " + SITE);
  html.push('<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#6b7280">These are common starting intervals, not a factory schedule for your exact vehicle. Your owner’s manual always wins. Mileage marked ~ is an estimate. Update your mileage in the app for exact dates.</p>');
  html.push('<p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#6b7280">You’re getting this because you turned on maintenance reminders in Parts Bench. <a href="' + esc(unsub) + '" style="color:#6b7280">Unsubscribe</a></p>');
  html.push("</div></div>");
  text.push("\nThese are common starting intervals, not a factory schedule for your exact vehicle. Your owner's manual always wins. Mileage marked ~ is an estimate.");
  text.push("You're getting this because you turned on maintenance reminders in Parts Bench. Unsubscribe: " + unsub);
  return { subject, html: html.join(""), text: text.join("\n") };
}

export function sampleGroups() {
  return [{ name: "Your vehicle", vehicle: {}, items: [{ id: "sample", label: "Engine oil & filter", level: "soon", text: "~400 mi left · 21 days left", shop: "" }] }];
}

export { todayISO };

// Turns the newest GitHub commits into entries for the Updates list.
// Runs while the site is being built (see vite.config.js), so every push updates the list by itself.
//
// How a commit becomes an update:
//   - the first line (title)          -> the update's title
//   - each following line             -> a line in its description
//   - put [internal] in the title      -> that commit is left out (for behind-the-scenes work)
import { execFileSync } from "node:child_process";

// Commits made before this moment are covered by the hand-written entries in src/updates.js.
export const CUTOFF = Date.parse("2026-11-10T06:19:00Z") / 1000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function parseLog(raw, cutoff = CUTOFF) {
  const out = [];
  for (const rec of raw.split("\x1e")) {
    const [hash, at, iso, subject, body = ""] = rec.replace(/^\s+/, "").split("\x1f");
    const ts = Number(at);
    if (!hash || !Number.isFinite(ts) || ts <= cutoff) continue;
    const title = (subject || "").trim();
    if (!title || /\[internal\]/i.test(title) || /^(merge|revert)\b/i.test(title)) continue;
    const lines = body.split("\n").map((l) => l.replace(/^\s*(?:[-*•]\s+)/, "").trim()).filter(Boolean).slice(0, 8).map((l) => clip(l, 220));
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    out.push({ id: ts, date: m ? MONTHS[Number(m[2]) - 1] + " " + Number(m[3]) : undefined, title: clip(title, 80), text: lines.join("\n") });
  }
  return out;
}

// Never throws: with no git history (a download, a shallow copy) the list is simply empty.
export function readUpdates(cwd = process.cwd(), cutoff = CUTOFF) {
  try {
    const raw = execFileSync("git", ["log", "-n", "30", "--format=%H%x1f%at%x1f%aI%x1f%s%x1f%b%x1e"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return parseLog(raw, cutoff);
  } catch {
    return [];
  }
}

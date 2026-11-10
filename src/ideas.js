import { supabase, configured } from "./supabase";

export const CATEGORIES = [
  { value: "feature", label: "Feature" },
  { value: "parts", label: "Parts" },
  { value: "maintenance", label: "Maintenance" },
  { value: "bug", label: "Bug" },
  { value: "other", label: "Other" },
];

export const TOPICS = [
  { value: "question", label: "A question" },
  { value: "problem", label: "Something's broken" },
  { value: "account", label: "My account" },
  { value: "other", label: "Something else" },
];

export const categoryLabel = (v) => (CATEGORIES.find((c) => c.value === v) || CATEGORIES[4]).label;

const NO_TABLE = /could not find the table|does not exist|schema cache/i;

// Turns a database error into something a person can act on.
function describe(error) {
  if (!error) return { error: "", unavailable: false };
  const msg = error.message || "";
  if (error.code === "PGRST205" || error.code === "42P01" || NO_TABLE.test(msg)) return { error: "", unavailable: true };
  if (/daily limit/i.test(msg)) return { error: "You've reached today's limit. Please try again tomorrow.", unavailable: false };
  if (/violates check constraint|too long|value too long/i.test(msg)) return { error: "That's too long or too short. Check the lengths and try again.", unavailable: false };
  if (/failed to fetch|network/i.test(msg)) return { error: "Couldn't reach the server. Check your connection and try again.", unavailable: false };
  return { error: "Something went wrong. Please try again.", unavailable: false };
}

export async function listIdeas(sort) {
  if (!configured) return { items: [], error: "", unavailable: true };
  let q = supabase.from("ideas")
    .select("id,user_id,author_name,category,title,body,status,reply,votes,created_at")
    .neq("status", "hidden");
  q = sort === "new"
    ? q.order("created_at", { ascending: false })
    : q.order("votes", { ascending: false }).order("created_at", { ascending: false });
  const { data, error } = await q.limit(60);
  const d = describe(error);
  return { items: error ? [] : data || [], ...d };
}

export async function myVotes() {
  if (!configured) return [];
  const { data, error } = await supabase.from("idea_votes").select("idea_id");
  return error ? [] : (data || []).map((r) => r.idea_id);
}

export async function postIdea({ title, body, category, authorName }) {
  const { error } = await supabase.from("ideas").insert({
    title: title.trim(),
    body: body.trim(),
    category,
    author_name: (authorName || "").slice(0, 30),
  });
  return describe(error);
}

export async function setVote(ideaId, userId, on) {
  const { error } = on
    ? await supabase.from("idea_votes").insert({ idea_id: ideaId, user_id: userId })
    : await supabase.from("idea_votes").delete().eq("idea_id", ideaId).eq("user_id", userId);
  // A repeat tap on a vote that already exists is not a problem.
  if (error && error.code === "23505") return describe(null);
  return describe(error);
}

export async function removeIdea(ideaId) {
  const { error } = await supabase.from("ideas").delete().eq("id", ideaId);
  return describe(error);
}

export async function sendSupport({ topic, body }) {
  const { error } = await supabase.from("support_messages").insert({ topic, body: body.trim() });
  return describe(error);
}

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return Math.round(s / 60) + " min ago";
  if (s < 86400) return Math.round(s / 3600) + " hr ago";
  if (s < 86400 * 30) return Math.round(s / 86400) + " d ago";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

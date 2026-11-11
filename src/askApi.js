import { supabase } from "./supabase";

// Sends a question to /api/ask. Returns { answer, left } on success, or { error, status, premium?, left? }.
export async function askQuestion(question, vehicle) {
  const { data } = await supabase.auth.getSession();
  const token = data && data.session ? data.session.access_token : null;
  if (!token) return { error: "Sign in first (Settings), then try again.", status: 401 };
  const v = vehicle ? { year: vehicle.year, make: vehicle.make, model: vehicle.model, trim: vehicle.trim, fuel: vehicle.fuel, drive: vehicle.drive, mileage: vehicle.mileage } : null;
  try {
    const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ question, vehicle: v }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return { ...j, status: r.status };
    return { error: j.error || "Something went wrong. Try again.", status: r.status, premium: !!j.premium, configured: j.configured, left: j.left };
  } catch {
    return { error: "Couldn't reach the server. Check your connection and try again.", status: 0 };
  }
}

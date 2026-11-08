import { createClient } from "@supabase/supabase-js";

// Both values are public by design: the publishable key is meant to ship in the browser,
// and Supabase's own rules decide what it can touch. Settings in Vercel or .env.local
// override these defaults if you ever want a different project.
// NEVER put a "secret" or "service_role" key anywhere in this app.
const url = import.meta.env.VITE_SUPABASE_URL || "https://zlfbryvyrrjfhmsreiwz.supabase.co";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_BOH4ct7IJSpH_oXooiRQgQ_ASgF_n4n";

export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key) : null;

import { createClient } from "@supabase/supabase-js";

// These two values are public by design (Supabase protects data with its own rules).
// Never put the "service_role" key here.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key) : null;

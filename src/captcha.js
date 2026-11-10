// Cloudflare Turnstile "site key". This one is PUBLIC by design (it is meant to be in the page),
// so it is fine to keep it in the code. The matching SECRET key goes only into Supabase.
// While this is empty, sign-in shows no human check at all.
const DEFAULT_SITE_KEY = "0x4AAAAAAF6xrPw4Uh9G_LI-";

export const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || DEFAULT_SITE_KEY;

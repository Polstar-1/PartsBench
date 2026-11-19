// A "back up my garage" button sets this before opening Settings, so Settings can put the cursor in the email box.
const KEY = "partsbench.focusSignIn";
export function requestSignInFocus() { try { window.sessionStorage.setItem(KEY, "1"); } catch { /* fine: just opens Settings */ } }
export function consumeSignInIntent() {
  try { const on = window.sessionStorage.getItem(KEY) === "1"; if (on) window.sessionStorage.removeItem(KEY); return on; } catch { return false; }
}

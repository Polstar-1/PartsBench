// Remembers that this device has been signed in before, so a signed-out visit can say so.
export const HAD_ACCOUNT = "partsbench.hadAccount";

export function rememberAccount(on) {
  try { if (on) window.localStorage.setItem(HAD_ACCOUNT, "1"); else window.localStorage.removeItem(HAD_ACCOUNT); } catch { /* private mode: no reminder, nothing breaks */ }
}

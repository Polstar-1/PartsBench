import { useState } from "react";
import { HAD_ACCOUNT } from "./accountMemory";

const DISMISSED = "partsbench.signedOutNote.dismissed"; // hidden for this browser session only

function hadAccount() { try { return window.localStorage.getItem(HAD_ACCOUNT) === "1"; } catch { return false; } }
function wasDismissed() { try { return window.sessionStorage.getItem(DISMISSED) === "1"; } catch { return false; } }

// A greeting when signed in; a quiet, dismissible nudge when signed out and there is something worth keeping.
export default function AccountNotice({ auth, hasVehicles, tab, goSettings }) {
  const [dismissed, setDismissed] = useState(wasDismissed);
  if (!auth.configured || !auth.ready) return null; // still checking: don't flash "signed out"

  if (auth.user) {
    if (tab !== "identify") return null;
    return <p className="welcome" role="status">Welcome back{auth.name ? ", " : ""}{auth.name ? <strong>{auth.name}</strong> : null}!</p>;
  }

  if (dismissed || !(hadAccount() || hasVehicles)) return null;
  return (
    <div className="signed-out-note" role="status">
      <span>You&rsquo;re signed out. Sign in to keep your garage.</span>
      <span className="signed-out-actions">
        <button className="link-btn" onClick={goSettings}>Sign in</button>
        <button className="signed-out-x" aria-label="Dismiss" onClick={() => { try { window.sessionStorage.setItem(DISMISSED, "1"); } catch { /* fine */ } setDismissed(true); }}>&times;</button>
      </span>
    </div>
  );
}

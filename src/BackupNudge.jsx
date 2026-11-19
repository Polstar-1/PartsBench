import { useState } from "react";

// A small, dismissible "keep your garage safe" prompt. It only appears at a moment when something is worth keeping.
// "saved": right after a vehicle is saved. "logged": once a service has been logged.
const COPY = {
  saved: { text: "Saved on this device only. Add your email so you don't lose it if you change phones or clear your browser.", button: "Back up my garage" },
  logged: { text: "Your service history is only on this device. A free account keeps it safe and shows it on any device.", button: "Keep it safe" },
};
const keyFor = (variant) => "partsbench.backupNudge." + variant;
function wasDismissed(variant) { try { return window.localStorage.getItem(keyFor(variant)) === "1"; } catch { return false; } }

export default function BackupNudge({ variant, show, goSettings }) {
  const [gone, setGone] = useState(() => wasDismissed(variant));
  if (!show || gone || !goSettings || !COPY[variant]) return null;
  const c = COPY[variant];
  return (
    <div className="backup-nudge" role="note">
      <p>{c.text}</p>
      <div className="backup-actions">
        <button className="btn-secondary" onClick={goSettings}>{c.button}</button>
        <button className="link-btn" onClick={() => { try { window.localStorage.setItem(keyFor(variant), "1"); } catch { /* fine */ } setGone(true); }}>Not now</button>
      </div>
    </div>
  );
}

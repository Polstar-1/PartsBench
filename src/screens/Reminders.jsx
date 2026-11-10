import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { canUsePremium } from "../premium";

// Settings panel: switch maintenance reminder emails on or off, and send yourself a test.
export default function Reminders({ auth, premium }) {
  const uid = auth.user.id;
  const [state, setState] = useState({ uid: null, enabled: false, problem: "", off: false });
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState({ busy: false, msg: "", bad: false });
  const loaded = state.uid === uid;
  const allowed = canUsePremium(premium);

  useEffect(() => {
    let live = true;
    supabase.from("reminder_prefs").select("enabled").eq("user_id", uid).maybeSingle()
      .then(({ data, error }) => { if (live) setState({ uid, enabled: !error && !!(data && data.enabled), problem: error ? "Reminders aren't available yet." : "", off: !!error }); })
      .catch(() => { if (live) setState({ uid, enabled: false, problem: "Couldn't reach your account right now.", off: true }); });
    return () => { live = false; };
  }, [uid]);

  async function toggle(on) {
    setBusy(true);
    setState({ uid, enabled: on, problem: "", off: false }); // flips at once; goes back if saving fails
    const { error } = await supabase.from("reminder_prefs").upsert({ user_id: uid, enabled: on, updated_at: new Date().toISOString() });
    setBusy(false);
    setState({ uid, enabled: error ? !on : on, problem: error ? "Couldn't save that. Try again." : "", off: false });
  }

  async function sendTest() {
    setTest({ busy: true, msg: "", bad: false });
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session ? data.session.access_token : "";
      const res = await fetch("/api/reminders", { method: "POST", headers: { Authorization: "Bearer " + token } });
      let body = {};
      try { body = await res.json(); } catch { /* not JSON */ }
      if (res.ok && body.ok) setTest({ busy: false, bad: false, msg: "Sent to " + body.to + (body.sample ? ". Nothing is due right now, so this one is a sample." : ".") + " Check your inbox (and spam, just this first time)." });
      else if (res.status === 404 || res.status === 501) setTest({ busy: false, bad: true, msg: "Email reminders aren't switched on yet." });
      else setTest({ busy: false, bad: true, msg: body.error || "That didn't work. Try again." });
    } catch {
      setTest({ busy: false, bad: true, msg: "Couldn't reach the server. Check your connection and try again." });
    }
  }

  return (
    <div className="panel">
      <p className="section-title" style={{ marginBottom: 6 }}>Email reminders</p>
      {!allowed ? (
        <p className="settings-hint" style={{ margin: 0 }}>Maintenance reminders by email are a Premium feature.</p>
      ) : (
        <>
          <p className="settings-hint" style={{ marginBottom: 14 }}>
            Get an email when something on your maintenance list is overdue or coming up. One email, only when there's something to say, and you can switch it off any time.
          </p>
          <label className="trim-toggle" style={{ fontSize: 14, color: "var(--ink)" }}>
            <input type="checkbox" checked={state.enabled} disabled={!loaded || busy || state.off}
              onChange={(e) => toggle(e.target.checked)} />
            <span>Email me when maintenance is due</span>
          </label>
          {state.problem && <p className="error-note" role="alert">{state.problem}</p>}
          <div className="settings-row" style={{ marginTop: 14 }}>
            <button className="btn-secondary" onClick={sendTest} disabled={test.busy}>{test.busy ? "Sending…" : "Send me a test email"}</button>
          </div>
          {test.msg && <p className={test.bad ? "error-note" : "settings-hint"} role={test.bad ? "alert" : "status"} style={{ marginTop: 10 }}>{test.msg}</p>}
        </>
      )}
    </div>
  );
}

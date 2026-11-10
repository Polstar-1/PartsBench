import { useEffect, useState } from "react";

function useCooldown() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (secs <= 0) return undefined;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  return [secs, setSecs];
}

const looksLikeEmail = (s) => /^\S+@\S+\.\S+$/.test(s.trim());
const cleanCode = (s) => s.replace(/\D/g, "").slice(0, 10);

function SignIn({ auth }) {
  const [step, setStep] = useState("email"); // email -> code
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cool, setCool] = useCooldown();

  async function send() {
    setBusy(true); setErr("");
    const r = await auth.sendCode(email.trim(), name.trim());
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setStep("code"); setCode(""); setCool(60);
  }

  async function verify() {
    setBusy(true); setErr("");
    const r = await auth.verifyCode(email.trim(), code, name.trim());
    setBusy(false);
    if (r.error) setErr(r.error);
  }

  return (
    <div className="panel">
      <p className="section-title" style={{ marginBottom: 6 }}>Sign in or create an account</p>
      <p className="settings-hint">No password. We email you a code each time you sign in. Your Garage will follow you to every device.</p>

      {step === "email" && (
        <form onSubmit={(e) => { e.preventDefault(); if (looksLikeEmail(email)) send(); }}>
          <label htmlFor="su-email">Email</label>
          <input id="su-email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="su-name" style={{ marginTop: 14 }}>Account name <span className="opt">(new accounts)</span></label>
          <input id="su-name" type="text" autoComplete="nickname" maxLength={30} placeholder="What should we call you?"
            value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="btn-primary block" style={{ marginTop: 16 }} disabled={busy || !looksLikeEmail(email)}>
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={(e) => { e.preventDefault(); if (code.length >= 6) verify(); }}>
          <p className="settings-hint" style={{ marginTop: 0 }}>We sent a code to <strong>{email.trim()}</strong>. It can take a minute. Check spam too.</p>
          <label htmlFor="su-code">Code</label>
          <input id="su-code" className="code-input" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="123456"
            value={code} onChange={(e) => setCode(cleanCode(e.target.value))} autoFocus />
          <button type="submit" className="btn-primary block" style={{ marginTop: 16 }} disabled={busy || code.length < 6}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <div className="settings-links">
            <button type="button" className="link-btn" disabled={cool > 0 || busy} onClick={send}>{cool > 0 ? "Send again in " + cool + "s" : "Send a new code"}</button>
            <button type="button" className="link-btn" onClick={() => { setStep("email"); setErr(""); }}>Use a different email</button>
          </div>
        </form>
      )}

      {err && <p className="error-note" role="alert">{err}</p>}
    </div>
  );
}

function AccountName({ auth }) {
  const [name, setName] = useState(auth.name);
  const [seen, setSeen] = useState(auth.name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });
  // Follow the saved name when it changes underneath us (first sign-in, another tab).
  if (seen !== auth.name) { setSeen(auth.name); setName(auth.name); }
  const changed = name.trim() !== auth.name;

  async function save() {
    setBusy(true); setMsg({ kind: "", text: "" });
    const r = await auth.saveName(name.trim());
    setBusy(false);
    setMsg(r.error ? { kind: "err", text: r.error } : { kind: "ok", text: "Saved." });
  }

  return (
    <div className="panel">
      <p className="section-title" style={{ marginBottom: 10 }}>Account name</p>
      <form onSubmit={(e) => { e.preventDefault(); if (changed && name.trim()) save(); }}>
        <label htmlFor="acct-name">Name</label>
        <input id="acct-name" type="text" maxLength={30} value={name} onChange={(e) => { setName(e.target.value); setMsg({ kind: "", text: "" }); }} />
        <button type="submit" className="btn-primary" style={{ marginTop: 14 }} disabled={busy || !changed || !name.trim()}>{busy ? "Saving…" : "Save name"}</button>
      </form>
      {msg.text && <p className={msg.kind === "err" ? "error-note" : "ok-note"} role={msg.kind === "err" ? "alert" : "status"}>{msg.text}</p>}
    </div>
  );
}

function ChangeEmail({ auth }) {
  const [step, setStep] = useState("idle"); // idle -> new -> code
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [cool, setCool] = useCooldown();

  function reset() { setStep("idle"); setNewEmail(""); setCode(""); setErr(""); }

  async function send() {
    setBusy(true); setErr("");
    const r = await auth.startEmailChange(newEmail.trim());
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setStep("code"); setCode(""); setCool(60);
  }

  async function confirm() {
    setBusy(true); setErr("");
    const r = await auth.confirmEmailChange(newEmail.trim(), code);
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    reset(); setDone(true);
  }

  return (
    <div className="panel">
      <p className="section-title" style={{ marginBottom: 10 }}>Email</p>
      <p className="settings-current">{auth.user.email}</p>

      {step === "idle" && (
        <button className="btn-secondary" onClick={() => { setStep("new"); setDone(false); }}>Change email</button>
      )}

      {step === "new" && (
        <form onSubmit={(e) => { e.preventDefault(); if (looksLikeEmail(newEmail) && newEmail.trim().toLowerCase() !== (auth.user.email || "").toLowerCase()) send(); }}>
          <label htmlFor="new-email">New email</label>
          <input id="new-email" type="email" autoComplete="email" inputMode="email" placeholder="new@example.com"
            value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoFocus />
          <p className="settings-hint">We'll send a code to the new address. Your email only changes after you enter it.</p>
          <div className="settings-row">
            <button type="submit" className="btn-primary" disabled={busy || !looksLikeEmail(newEmail) || newEmail.trim().toLowerCase() === (auth.user.email || "").toLowerCase()}>{busy ? "Sending…" : "Send code"}</button>
            <button type="button" className="btn-secondary" onClick={reset}>Cancel</button>
          </div>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={(e) => { e.preventDefault(); if (code.length >= 6) confirm(); }}>
          <p className="settings-hint" style={{ marginTop: 0 }}>We sent a code to <strong>{newEmail.trim()}</strong>.</p>
          <label htmlFor="chg-code">Code</label>
          <input id="chg-code" className="code-input" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="123456"
            value={code} onChange={(e) => setCode(cleanCode(e.target.value))} autoFocus />
          <div className="settings-row">
            <button type="submit" className="btn-primary" disabled={busy || code.length < 6}>{busy ? "Checking…" : "Confirm new email"}</button>
            <button type="button" className="btn-secondary" onClick={reset}>Cancel</button>
          </div>
          <div className="settings-links">
            <button type="button" className="link-btn" disabled={cool > 0 || busy} onClick={send}>{cool > 0 ? "Send again in " + cool + "s" : "Send a new code"}</button>
          </div>
        </form>
      )}

      {done && <p className="ok-note" role="status">Email changed. Use the new address next time you sign in.</p>}
      {err && <p className="error-note" role="alert">{err}</p>}
    </div>
  );
}

function DeleteAccount({ auth }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const email = auth.user.email || "";
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  function close() { setOpen(false); setTyped(""); setErr(""); }

  async function remove() {
    setBusy(true); setErr("");
    const r = await auth.deleteAccount();
    setBusy(false);
    if (r.error) setErr(r.error);
    // On success the person is signed out and this page switches to the sign-in form.
  }

  return (
    <div className="panel">
      <p className="section-title" style={{ marginBottom: 6 }}>Delete account</p>
      {!open && (
        <>
          <p className="settings-hint" style={{ marginBottom: 14 }}>Permanently removes your account, the Garage saved to it, and anything you posted on the Ideas board.</p>
          <button className="btn-secondary" onClick={() => setOpen(true)}>Delete my account</button>
        </>
      )}
      {open && (
        <form onSubmit={(e) => { e.preventDefault(); if (matches && !busy) remove(); }}>
          <p className="settings-hint" style={{ marginTop: 0 }}>
            This can't be undone. Your account, your saved vehicles, your maintenance logs, and any ideas, votes and messages you posted will be deleted from every device.
          </p>
          <label htmlFor="del-email">Type <strong>{email}</strong> to confirm</label>
          <input id="del-email" type="email" autoComplete="off" autoCapitalize="off" spellCheck="false"
            value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          <div className="settings-row">
            <button type="submit" className="btn-danger" disabled={!matches || busy}>{busy ? "Deleting…" : "Delete forever"}</button>
            <button type="button" className="btn-secondary" onClick={close} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}
      {err && <p className="error-note" role="alert">{err}</p>}
    </div>
  );
}

export default function Settings({ auth, sync }) {
  return (
    <>
      <p className="eyebrow">Settings</p>
      <h1 className="page-title">{auth.user ? "Your account." : "Settings."}</h1>
      <p className="page-sub">
        {auth.user
          ? "Signed in as " + (auth.name || auth.user.email) + "."
          : "Sign in to keep an account. You can use the whole app without one."}
      </p>

      <div className="settings-grid">
        {!auth.configured && (
          <div className="panel">
            <p className="section-title" style={{ marginBottom: 6 }}>Accounts aren't switched on</p>
            <p className="settings-hint" style={{ marginBottom: 0 }}>Sign-in needs the account service to be connected first. Everything else in the app works as normal.</p>
          </div>
        )}

        {auth.configured && !auth.ready && <div className="panel"><p className="settings-hint" style={{ margin: 0 }}>Loading…</p></div>}

        {auth.configured && auth.ready && !auth.user && <SignIn auth={auth} />}

        {auth.configured && auth.ready && auth.user && (
          <>
            <AccountName auth={auth} />
            <ChangeEmail auth={auth} />
            <div className="panel">
              <p className="section-title" style={{ marginBottom: 6 }}>Garage</p>
              <p className="settings-hint" style={{ marginBottom: 14 }}>
                {sync && sync.status === "error"
                  ? "Couldn't reach your account right now. Your Garage is still saved on this device and will sync when it can."
                  : sync && sync.status === "syncing"
                    ? "Syncing your Garage…"
                    : "Your saved vehicles and maintenance logs are saved to your account, so they follow you to any device you sign in on."}
              </p>
              <button className="btn-secondary" onClick={() => auth.signOut()}>Sign out</button>
            </div>
            <DeleteAccount auth={auth} />
          </>
        )}
      </div>
    </>
  );
}

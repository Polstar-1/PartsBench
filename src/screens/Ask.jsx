import { useState } from "react";
import { GATING_OPEN } from "../premium";
import { askQuestion } from "../askApi";

const MAX = 600;
const URGENCY = {
  stop: { cls: "chip-overdue", text: "Stop driving it" },
  soon: { cls: "chip-soon", text: "Get it checked soon" },
  ok: { cls: "chip-quiet", text: "Can wait" },
};

export default function Ask({ vehicle, signedIn, premium, goSettings, goPlans, goShopFor }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null); // { answer, asked }
  const [left, setLeft] = useState(null);
  const [off, setOff] = useState(false); // server says Ask isn't switched on

  const name = vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") : "";
  const locked = !GATING_OPEN && premium === false; // null = still checking the account
  const canAsk = signedIn && !locked && !off;

  async function submit() {
    const q = text.trim();
    if (q.length < 8 || busy) return;
    setBusy(true); setErr(""); setNote("");
    const r = await askQuestion(q, vehicle);
    setBusy(false);
    if (r.status === 501 || r.configured === false) { setOff(true); return; }
    if (r.left != null) setLeft(r.left);
    if (r.error) { setErr(r.error); return; }
    if (r.offtopic) { setNote("That doesn't look like a vehicle question. Describe a symptom, a warning light or a trouble code and I'll take a look. This one didn't use up a question."); return; }
    setResult({ answer: r.answer, asked: q });
  }

  const a = result && result.answer;
  const u = a ? URGENCY[a.urgency] || URGENCY.soon : null;

  return (
    <>
      <p className="eyebrow">Ask</p>
      <h1 className="page-title">Ask about a problem.</h1>
      <p className="page-sub">Describe what's wrong with your {name || "vehicle"} and get a plain-English answer.</p>

      {off && <p className="info-note" role="status" style={{ maxWidth: 760 }}>Ask isn't switched on yet. It's coming soon.</p>}

      <div className="ask-grid">
        <div className="panel">
          {!signedIn && (
            <p className="info-note" role="note">Ask is for signed-in accounts. <button className="link-btn" onClick={goSettings}>Sign in from Settings</button> to use it.</p>
          )}
          {signedIn && locked && (
            <p className="info-note" role="note">Ask is a Premium feature. <button className="link-btn" onClick={goPlans}>See Premium</button></p>
          )}
          <label htmlFor="ask">What's going on?</label>
          <textarea id="ask" rows={4} value={text} maxLength={MAX} disabled={!canAsk || busy}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Rough idle when cold, check engine light is flashing, code P0301…" />
          <p className="hint" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span>{vehicle ? "About your " + name + "." : "Add a vehicle for better answers."}</span>
            <span>{text.length}/{MAX}</span>
          </p>
          <button className="btn-primary block" style={{ marginTop: 8 }} onClick={submit} disabled={!canAsk || busy || text.trim().length < 8}>
            {busy ? "Thinking…" : "Ask"}
          </button>
          {left != null && <p className="hint" style={{ marginTop: 10 }}>{left} {left === 1 ? "question" : "questions"} left today.</p>}
          {err && <p className="error-note" role="alert" style={{ marginTop: 10 }}>{err}</p>}
          {note && <p className="info-note" role="status" style={{ marginTop: 10 }}>{note}</p>}
        </div>

        {!a ? (
          <div className="panel">
            <p className="section-title" style={{ marginBottom: 10 }}>Each answer covers</p>
            <ol className="ask-list">
              <li><strong>What happened.</strong> The likely fault, in plain language.</li>
              <li><strong>Why it happened.</strong> Wear, age, or a known weak point for this vehicle.</li>
              <li><strong>How to prevent it.</strong> What to do differently so it doesn't repeat.</li>
              <li><strong>The part to buy.</strong> The right replacement, with a link to shop for it.</li>
            </ol>
          </div>
        ) : (
          <div className="panel ask-answer" aria-live="polite">
            <p className="section-title" style={{ marginBottom: 6 }}>{a.title}</p>
            <p><span className={"chip " + u.cls}>{u.text}</span></p>
            <h2 className="ask-h">What happened</h2><p>{a.what}</p>
            {a.why && <><h2 className="ask-h">Why it happened</h2><p>{a.why}</p></>}
            {a.prevent && <><h2 className="ask-h">How to prevent it</h2><p>{a.prevent}</p></>}
            {a.checks && a.checks.length > 0 && (
              <><h2 className="ask-h">Check these first</h2><ul className="ask-checks">{a.checks.map((c, i) => <li key={i}>{c}</li>)}</ul></>
            )}
            {a.part && (
              <>
                <h2 className="ask-h">The part to buy</h2>
                <p>{a.part.name}</p>
                <button className="btn-secondary" onClick={() => goShopFor(a.part.search)}>Shop for it</button>
              </>
            )}
            <p className="hint ask-disclaimer">This is a best guess from a description, not a diagnosis. If brakes, steering, airbags or a high-voltage system are involved, or you're not sure, have a mechanic look at it.</p>
          </div>
        )}
      </div>
    </>
  );
}

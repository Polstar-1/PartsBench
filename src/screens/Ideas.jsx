import { useEffect, useState } from "react";
import { CATEGORIES, TOPICS, categoryLabel, listIdeas, myVotes, postIdea, removeIdea, sendSupport, setVote, timeAgo } from "../ideas";

function SignInPrompt({ text, goSettings }) {
  return (
    <div className="panel">
      <p className="settings-hint" style={{ marginTop: 0 }}>{text}</p>
      <button className="btn-primary" onClick={goSettings}>Sign in</button>
    </div>
  );
}

function Compose({ auth, onDone, onCancel }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("feature");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    const r = await postIdea({ title, body, category, authorName: auth.name });
    setBusy(false);
    if (r.unavailable) { setErr("The ideas board isn't switched on yet."); return; }
    if (r.error) { setErr(r.error); return; }
    onDone();
  }

  return (
    <form className="panel" onSubmit={(e) => { e.preventDefault(); if (title.trim().length >= 3 && !busy) submit(); }}>
      <p className="section-title" style={{ marginBottom: 12 }}>Share an idea</p>
      <label htmlFor="idea-title">Your idea</label>
      <input id="idea-title" type="text" maxLength={80} placeholder="e.g. Add torque specs to maintenance tasks"
        value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <label htmlFor="idea-body" style={{ marginTop: 14 }}>Details <span className="opt">(optional)</span></label>
      <textarea id="idea-body" rows={4} maxLength={1000} placeholder="What would it help you do?"
        value={body} onChange={(e) => setBody(e.target.value)} />
      <label style={{ marginTop: 14 }}>Type</label>
      <div className="pchips" role="group" aria-label="Type of idea">
        {CATEGORIES.map((c) => (
          <button type="button" key={c.value} className={"chip" + (category === c.value ? " active" : "")} aria-pressed={category === c.value} onClick={() => setCategory(c.value)}>{c.label}</button>
        ))}
      </div>
      <p className="settings-hint" style={{ marginTop: 14 }}>Your idea is public and shows your account name{auth.name ? " (" + auth.name + ")" : ""}. Please don't include personal details.</p>
      <div className="settings-row">
        <button type="submit" className="btn-primary" disabled={busy || title.trim().length < 3}>{busy ? "Posting…" : "Post idea"}</button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
      {err && <p className="error-note" role="alert">{err}</p>}
    </form>
  );
}

function IdeaCard({ idea, voted, mine, onVote, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <article className="idea">
      <button className={"vote-btn" + (voted ? " on" : "")} aria-pressed={voted} aria-label={(voted ? "Remove your vote. " : "Vote for this idea. ") + idea.votes + " votes"} onClick={onVote}>
        <span aria-hidden="true">▲</span>
        <strong>{idea.votes}</strong>
      </button>
      <div className="idea-main">
        <h3 className="idea-title">{idea.title}</h3>
        {idea.body && <p className="idea-body">{idea.body}</p>}
        <div className="idea-meta">
          <span className="badge">{categoryLabel(idea.category)}</span>
          {idea.status === "planned" && <span className="badge badge-reman">Planned</span>}
          {idea.status === "done" && <span className="badge badge-new">Done</span>}
          <span>{idea.author_name || "A Parts Bench user"} · {timeAgo(idea.created_at)}</span>
        </div>
        {idea.reply && <p className="idea-reply"><strong>From Parts Bench:</strong> {idea.reply}</p>}
        {mine && !confirming && <button className="link-btn" onClick={() => setConfirming(true)}>Delete my idea</button>}
        {mine && confirming && (
          <span className="idea-confirm">
            <button className="link-btn danger" onClick={onDelete}>Yes, delete</button>
            <button className="link-btn" onClick={() => setConfirming(false)}>Cancel</button>
          </span>
        )}
      </div>
    </article>
  );
}

function Board({ auth, goSettings }) {
  const uid = auth.user ? auth.user.id : null;
  const [sort, setSort] = useState("top");
  const [tick, setTick] = useState(0);
  const [composing, setComposing] = useState(false);
  const [notice, setNotice] = useState({ kind: "", text: "" });
  const [data, setData] = useState({ key: "", items: [], voted: [], error: "", unavailable: false });
  const key = sort + "|" + tick + "|" + (uid || "");
  const loading = data.key !== key;

  useEffect(() => {
    let live = true;
    (async () => {
      const [l, v] = await Promise.all([listIdeas(sort), uid ? myVotes() : Promise.resolve([])]);
      if (!live) return;
      setData({ key, items: l.items, voted: v, error: l.error, unavailable: l.unavailable });
    })();
    return () => { live = false; };
  }, [key, sort, uid]);

  function patchVote(id, on) {
    setData((d) => ({
      ...d,
      voted: on ? [...d.voted, id] : d.voted.filter((x) => x !== id),
      items: d.items.map((i) => (i.id === id ? { ...i, votes: Math.max(0, i.votes + (on ? 1 : -1)) } : i)),
    }));
  }

  async function vote(idea) {
    if (!uid) { setNotice({ kind: "signin", text: "" }); return; }
    setNotice({ kind: "", text: "" });
    const on = !data.voted.includes(idea.id);
    patchVote(idea.id, on);
    const r = await setVote(idea.id, uid, on);
    if (r.error || r.unavailable) {
      patchVote(idea.id, !on);
      setNotice({ kind: "err", text: r.error || "Couldn't save your vote. Try again." });
    }
  }

  async function remove(idea) {
    const r = await removeIdea(idea.id);
    if (r.error) { setNotice({ kind: "err", text: r.error }); return; }
    setTick((t) => t + 1);
  }

  if (data.unavailable) {
    return (
      <div className="panel">
        <p className="section-title" style={{ marginBottom: 6 }}>The ideas board isn't switched on yet</p>
        <p className="settings-hint" style={{ marginBottom: 0 }}>Check back soon. Everything else in the app works as normal.</p>
      </div>
    );
  }

  return (
    <>
      <div className="board-head">
        <div className="pchips" role="group" aria-label="Sort ideas">
          <button className={"chip" + (sort === "top" ? " active" : "")} aria-pressed={sort === "top"} onClick={() => setSort("top")}>Top</button>
          <button className={"chip" + (sort === "new" ? " active" : "")} aria-pressed={sort === "new"} onClick={() => setSort("new")}>New</button>
        </div>
        {!composing && (
          <button className="btn-primary" onClick={() => (uid ? (setNotice({ kind: "", text: "" }), setComposing(true)) : setNotice({ kind: "signin", text: "" }))}>Share an idea</button>
        )}
      </div>

      {notice.kind === "signin" && <SignInPrompt text="Sign in to post ideas and vote. It only takes a code sent to your email." goSettings={goSettings} />}
      {notice.kind === "ok" && <p className="ok-note" role="status" style={{ marginTop: 0, marginBottom: 14 }}>{notice.text}</p>}
      {notice.kind === "err" && <p className="error-note" role="alert" style={{ marginTop: 0, marginBottom: 14 }}>{notice.text}</p>}

      {composing && (
        <Compose auth={auth} onCancel={() => setComposing(false)}
          onDone={() => { setComposing(false); setSort("new"); setTick((t) => t + 1); setNotice({ kind: "ok", text: "Thanks! Your idea is on the board." }); }} />
      )}

      {loading && <p className="settings-hint">Loading ideas…</p>}
      {!loading && data.error && <p className="error-note" role="alert">{data.error}</p>}
      {!loading && !data.error && data.items.length === 0 && (
        <div className="empty-state"><p>No ideas yet. Be the first to share one.</p></div>
      )}
      {!loading && data.items.length > 0 && (
        <div className="idea-list">
          {data.items.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} voted={data.voted.includes(idea.id)} mine={Boolean(uid) && idea.user_id === uid}
              onVote={() => vote(idea)} onDelete={() => remove(idea)} />
          ))}
        </div>
      )}
    </>
  );
}

function Support({ auth, goSettings }) {
  const [topic, setTopic] = useState("question");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  if (!auth.user) return <SignInPrompt text="Sign in to send us a message, so we know where to reply." goSettings={goSettings} />;

  async function submit() {
    setBusy(true); setErr("");
    const r = await sendSupport({ topic, body });
    setBusy(false);
    if (r.unavailable) { setErr("Support messages aren't switched on yet."); return; }
    if (r.error) { setErr(r.error); return; }
    setSent(true); setBody("");
  }

  if (sent) {
    return (
      <div className="panel">
        <p className="section-title" style={{ marginBottom: 6 }}>Message sent</p>
        <p className="settings-hint">Thanks. We read every message and will reply to <strong>{auth.user.email}</strong> if we need to.</p>
        <button className="btn-secondary" onClick={() => setSent(false)}>Send another</button>
      </div>
    );
  }

  return (
    <form className="panel" onSubmit={(e) => { e.preventDefault(); if (body.trim().length >= 5 && !busy) submit(); }}>
      <p className="section-title" style={{ marginBottom: 6 }}>Contact support</p>
      <p className="settings-hint" style={{ marginTop: 0 }}>This is private. Only we can read it. We reply by email.</p>
      <label htmlFor="sup-topic">What's it about?</label>
      <select id="sup-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
        {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <label htmlFor="sup-body" style={{ marginTop: 14 }}>Message</label>
      <textarea id="sup-body" rows={5} maxLength={2000} placeholder="Tell us what's going on. Include your vehicle if it's about a part."
        value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="settings-row">
        <button type="submit" className="btn-primary" disabled={busy || body.trim().length < 5}>{busy ? "Sending…" : "Send message"}</button>
      </div>
      {err && <p className="error-note" role="alert">{err}</p>}
    </form>
  );
}

export default function Ideas({ auth, goSettings }) {
  const [view, setView] = useState("ideas");
  return (
    <>
      <p className="eyebrow">Ideas</p>
      <h1 className="page-title">Help shape Parts Bench.</h1>
      <p className="page-sub">Tell us what you need and vote on what others ask for. We read all of it.</p>

      {!auth.configured && (
        <div className="panel">
          <p className="section-title" style={{ marginBottom: 6 }}>Not switched on yet</p>
          <p className="settings-hint" style={{ marginBottom: 0 }}>The ideas board needs accounts to be connected first. Everything else in the app works as normal.</p>
        </div>
      )}

      {auth.configured && !auth.ready && <div className="panel"><p className="settings-hint" style={{ margin: 0 }}>Loading…</p></div>}

      {auth.configured && auth.ready && (
        <>
          <div className="segmented">
            <button className={"seg-btn" + (view === "ideas" ? " active" : "")} onClick={() => setView("ideas")}>Ideas board</button>
            <button className={"seg-btn" + (view === "support" ? " active" : "")} onClick={() => setView("support")}>Contact support</button>
          </div>
          {view === "ideas" ? <Board auth={auth} goSettings={goSettings} /> : <Support auth={auth} goSettings={goSettings} />}
        </>
      )}
    </>
  );
}

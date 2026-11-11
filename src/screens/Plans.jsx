import { useState } from "react";
import { FEATURES, GATING_OPEN, PRICES } from "../premium";
import { paymentsOn, startCheckout, openPortal } from "../billing";

function Cell({ v }) {
  if (v === "soon") return <span className="plan-soon">Soon</span>;
  return v ? <span className="plan-yes" role="img" aria-label="Included">{"✓"}</span> : <span className="plan-no" role="img" aria-label="Not included">{"–"}</span>;
}

export default function Plans({ premium, signedIn, goSettings, banner, onDismissBanner }) {
  const priced = PRICES.monthly || PRICES.yearly;
  const buying = paymentsOn();
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  async function go(kind, fn) {
    setBusy(kind); setErr("");
    const r = await fn();
    if (r.url) { window.location.assign(r.url); return; }
    setErr(r.error); setBusy("");
  }
  return (
    <>
      <p className="eyebrow">Plans</p>
      <h1 className="page-title">Free and Premium.</h1>
      <p className="page-sub">The basics are free. Premium adds the tools for keeping a vehicle on schedule.</p>

      {banner && (
        <p className="info-note" role="status" style={{ maxWidth: 760 }}>
          {banner} <button className="link-btn" onClick={onDismissBanner}>Dismiss</button>
        </p>
      )}

      {GATING_OPEN && (
        <p className="info-note" role="note" style={{ maxWidth: 760 }}>
          <strong>Everything is free for everyone right now</strong> while Parts Bench is growing. This is how the plans will be split once Premium launches.
        </p>
      )}

      <div className="plan-cards">
        <section className="plan-card" aria-labelledby="plan-free">
          <h2 id="plan-free" className="plan-name">Free</h2>
          <p className="plan-price">$0</p>
          <p className="plan-tag">Look up, save and shop for your vehicle.</p>
          <p className="plan-state">{signedIn && !premium ? "Your plan" : ""}</p>
        </section>
        <section className="plan-card plan-featured" aria-labelledby="plan-premium">
          <h2 id="plan-premium" className="plan-name">Premium</h2>
          <p className="plan-price">
            {priced
              ? <>{PRICES.yearly && <span>{PRICES.yearly}<small> / year</small></span>}{PRICES.yearly && PRICES.monthly && <small className="plan-or"> or </small>}{PRICES.monthly && <span>{PRICES.monthly}<small> / month</small></span>}</>
              : <span className="plan-soonprice">Pricing coming soon</span>}
          </p>
          <p className="plan-tag">Reminders and the full tracker, so nothing gets missed.</p>
          {premium && (
            <>
              <p className="plan-state plan-have">You have Premium {"✓"}</p>
              {buying && <button className="btn-secondary block" disabled={!!busy} onClick={() => go("portal", openPortal)}>{busy === "portal" ? "Opening…" : "Manage subscription"}</button>}
            </>
          )}
          {!premium && !buying && <button className="btn-primary block" disabled>Go Premium – coming soon</button>}
          {!premium && buying && !signedIn && (
            <p className="plan-state">Sign in from <button className="link-btn" onClick={goSettings}>Settings</button> to go Premium.</p>
          )}
          {!premium && buying && signedIn && (
            <>
              <button className="btn-primary block" disabled={!!busy} onClick={() => go("yearly", () => startCheckout("yearly"))}>
                {busy === "yearly" ? "Opening checkout…" : "Go Premium – yearly" + (PRICES.yearly ? " " + PRICES.yearly : "")}
              </button>
              <button className="btn-secondary block" style={{ marginTop: 8 }} disabled={!!busy} onClick={() => go("monthly", () => startCheckout("monthly"))}>
                {busy === "monthly" ? "Opening checkout…" : "Go Premium – monthly" + (PRICES.monthly ? " " + PRICES.monthly : "")}
              </button>
              <p className="plan-fine">
                Renews automatically until you cancel. Cancel any time under Manage subscription. Payments are handled by Stripe; Parts Bench never sees your card. See the <a href="/terms">Terms</a>.
              </p>
            </>
          )}
          {err && <p className="plan-err" role="alert">{err}</p>}
        </section>
      </div>

      <div className="plan-table-wrap">
        <table className="plan-table">
          <caption className="sr-only">Free and Premium compared</caption>
          <thead>
            <tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col" className="plan-colp">Premium</th></tr>
          </thead>
          {FEATURES.map((g) => (
            <tbody key={g.group}>
              <tr className="plan-group"><th colSpan={3} scope="colgroup">{g.group}</th></tr>
              {g.rows.map((r) => (
                <tr key={r.name}>
                  <th scope="row">{r.name}{r.note && <span className="plan-note">{r.note}</span>}</th>
                  <td><Cell v={r.free} /></td>
                  <td className="plan-colp"><Cell v={r.premium} /></td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <p className="plan-foot">
        {signedIn ? "Your plan is shown in " : "Create a free account to keep your garage on every device. Sign in from "}
        <button className="link-btn" onClick={goSettings}>Settings</button>.
      </p>
    </>
  );
}

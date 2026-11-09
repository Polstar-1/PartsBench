import { useEffect, useState } from "react";
import LinkDrawer from "./LinkDrawer";
import { CONDITIONS, SORTS, money, partsKey, searchParts } from "../parts";

const KIND_LABEL = { new: "New", reman: "Reman", used: "Used", other: "" };

function ResultCard({ item }) {
  const total = item.price != null && item.shipping != null ? item.price + item.shipping : null;
  return (
    <a className="pcard" href={item.url} target="_blank" rel="noopener noreferrer sponsored">
      <div className="pcard-img">
        {item.image ? <img src={item.image} alt="" loading="lazy" /> : <span className="pcard-noimg">No photo</span>}
      </div>
      <div className="pcard-body">
        <p className="pcard-title">{item.title}</p>
        <div className="pcard-badges">
          {KIND_LABEL[item.kind] && <span className={"badge badge-" + item.kind}>{KIND_LABEL[item.kind]}</span>}
          {item.fits && <span className="badge badge-fits">✓ Fits your vehicle</span>}
        </div>
        <div className="pcard-bottom">
          <div>
            <span className="pcard-price">{money(item.price, item.currency)}</span>
            <span className="pcard-ship">
              {item.shipping === 0 ? "Free shipping" : item.shipping != null ? "+ " + money(item.shipping, item.currency) + " shipping" : "Shipping varies"}
            </span>
            {total != null && item.shipping > 0 && <span className="pcard-total">{money(total, item.currency)} total</span>}
          </div>
          <span className="pcard-go">eBay ↗</span>
        </div>
        {item.seller && item.seller.name && (
          <p className="pcard-seller">{item.seller.name}{item.seller.percent ? " · " + item.seller.percent + "% positive" : ""}</p>
        )}
      </div>
    </a>
  );
}

export default function PartResults({ vehicle, terms, query, sort, setSort, cond, setCond }) {
  const [state, setState] = useState(null); // { key, data, error }
  const key = partsKey({ terms, vehicle, sort, cond });
  const loading = !state || state.key !== key;
  const data = !loading ? state.data : null;
  const live = data && data.configured !== false;

  useEffect(() => {
    const ctl = new AbortController();
    searchParts({ terms, vehicle, sort, cond, signal: ctl.signal })
      .then((d) => setState({ key, data: d, error: "" }))
      .catch((e) => { if (e.name !== "AbortError") setState({ key, data: null, error: e.message || "Search failed" }); });
    return () => ctl.abort();
  }, [key, terms, vehicle, sort, cond]);

  // Store links only (no eBay data available): same as before.
  if (!loading && !state.error && !live) return <LinkDrawer query={query} />;

  const items = live ? data.items : [];
  return (
    <div className="presults">
      <div className="ptoolbar">
        <label className="psort">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <div className="pchips" role="group" aria-label="Condition">
          {CONDITIONS.map((c) => (
            <button key={c.key} className={"chip" + (cond === c.key ? " active" : "")} aria-pressed={cond === c.key} onClick={() => setCond(c.key)}>{c.label}</button>
          ))}
        </div>
      </div>

      {loading && <div className="pskeleton" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="pcard pcard-skel" />)}</div>}

      {!loading && state.error && <p className="error-note">Couldn't load eBay listings right now. The store links below still work.</p>}

      {live && (
        <>
          <p className="pnote">
            {items.length
              ? (data.fitment === "verified" ? "Listings eBay says fit your " : "Matched by keyword for your ") + [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") + (data.fitment === "verified" ? "." : ". Double-check fit before you buy.")
              : "No eBay listings found for this one" + (cond !== "any" ? " in that condition. Try “All”" : "") + ". Try the stores below."}
          </p>
          <div className="pgrid">{items.map((it) => <ResultCard key={it.id} item={it} />)}</div>
        </>
      )}

      <details className="palso">
        <summary>Also check these stores</summary>
        <LinkDrawer query={query} />
      </details>
    </div>
  );
}

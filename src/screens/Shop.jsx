import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import PartResults from "./PartResults";
import { catalogFor, countParts, searchParts } from "../catalog";

function PartRow({ id, label, terms, icon, path, vehicle, openId, setOpenId, trim, sort, setSort, cond, setCond }) {
  const isOpen = openId === id;
  const query = [vehicle.year, vehicle.make, vehicle.model, trim, terms].filter(Boolean).join(" ");
  const toggle = () => setOpenId(isOpen ? null : id);
  return (
    <div className="item-row">
      <div className="item-row-head" role="button" tabIndex={0} aria-expanded={isOpen} onClick={toggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle())}>
        <span className="item-row-icon"><Icon name={icon} size={18} /></span>
        <span className="item-row-label">
          {label}
          {path && <span className="item-row-path">{path}</span>}
        </span>
        <span className={"item-row-chev" + (isOpen ? " open" : "")}>›</span>
      </div>
      {isOpen && <PartResults vehicle={vehicle} terms={terms} query={query} trim={trim} sort={sort} setSort={setSort} cond={cond} setCond={setCond} />}
    </div>
  );
}

export default function Shop({ vehicle, goIdentify, initialQuery = "", onQueryUsed }) {
  const [groupKey, setGroupKey] = useState(null);
  const [subKey, setSubKey] = useState(null);
  // Arriving from a search page: start with that part searched and its first match open.
  const [openId, setOpenId] = useState(() => {
    if (!initialQuery) return null;
    const hit = searchParts(catalogFor(vehicle), initialQuery, 1)[0];
    return hit ? hit.id : null;
  });
  const [q, setQ] = useState(initialQuery);
  useEffect(() => { if (initialQuery && onQueryUsed) onQueryUsed(); }, [initialQuery, onQueryUsed]);
  const [sort, setSort] = useState("best");
  const [cond, setCond] = useState("any");
  const [useTrim, setUseTrim] = useState(true);
  const trim = useTrim && vehicle && vehicle.trim ? vehicle.trim : "";
  const rowProps = { trim, sort, setSort, cond, setCond };

  const cat = useMemo(() => catalogFor(vehicle), [vehicle]);
  const total = useMemo(() => countParts(cat), [cat]);

  const searching = q.trim().length >= 2;
  const results = useMemo(() => (searching ? searchParts(cat, q.trim()) : []), [cat, q, searching]);

  const group = cat.find((g) => g.key === groupKey);
  const hasMultipleSubs = group && group.subs.length > 1;
  const sub = group ? (hasMultipleSubs ? group.subs.find((s) => s.key === subKey) : group.subs[0]) : null;

  function openGroup(key) { setGroupKey(key); setSubKey(null); setOpenId(null); }

  return (
    <>
      <p className="eyebrow">Shop</p>
      <h1 className="page-title">Shop by category.</h1>
      <p className="page-sub">
        {vehicle
          ? "Pick a part for your " + vehicle.year + " " + vehicle.make + " " + vehicle.model + ". " + total.toLocaleString("en-US") + " part types matched to it."
          : "Add your vehicle first. Every result here is matched to it."}
      </p>

      {!vehicle && (
        <div className="empty-state">
          <p>No vehicle selected yet.</p>
          <button className="btn-secondary" onClick={goIdentify}>Add Your Vehicle</button>
        </div>
      )}

      {vehicle && vehicle.trim && (
        <label className="trim-toggle">
          <input type="checkbox" checked={useTrim} onChange={(e) => setUseTrim(e.target.checked)} />
          <span>Include the “{vehicle.trim}” trim in searches</span>
        </label>
      )}

      {vehicle && (
        <div className="search-box">
          <Icon name="search" size={18} />
          <input type="search" aria-label="Search parts" placeholder="Search all parts, like water pump or tie rod…" value={q}
            onChange={(e) => setQ(e.target.value)} />
          {q && <button className="search-clear" onClick={() => setQ("")} aria-label="Clear search">✕</button>}
        </div>
      )}

      {vehicle && searching && (
        <div className="shop-list">
          <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
            {results.length ? results.length + (results.length >= 60 ? "+ " : " ") + "match" + (results.length === 1 ? "" : "es") + " for “" + q.trim() + "”" : "Nothing matches “" + q.trim() + "”. Try a shorter word."}
          </p>
          {results.map((r) => (
            <PartRow key={r.id} id={r.id} label={r.label} terms={r.terms} icon={r.icon} path={r.group + " › " + r.sub}
              vehicle={vehicle} openId={openId} setOpenId={setOpenId} {...rowProps} />
          ))}
        </div>
      )}

      {vehicle && !searching && !group && (
        <div className="cat-grid">
          {cat.map((g) => (
            <button key={g.key} className="cat-tile" onClick={() => openGroup(g.key)}>
              <span className="cat-icon-wrap"><Icon name={g.icon} /></span>
              <span className="cat-tile-label">{g.label}</span>
              <span className="cat-tile-count">{g.count} parts</span>
            </button>
          ))}
        </div>
      )}

      {vehicle && !searching && group && hasMultipleSubs && !sub && (
        <>
          <div className="cat-detail-header">
            <button className="back-btn" onClick={() => setGroupKey(null)} aria-label="Back">‹</button>
            <h2 className="section-title">{group.label}</h2>
          </div>
          <div className="cat-grid">
            {group.subs.map((s) => (
              <button key={s.key} className="cat-tile" onClick={() => { setSubKey(s.key); setOpenId(null); }}>
                <span className="cat-icon-wrap"><Icon name={s.icon} /></span>
                <span className="cat-tile-label">{s.label}</span>
                <span className="cat-tile-count">{s.items.length} parts</span>
              </button>
            ))}
          </div>
        </>
      )}

      {vehicle && !searching && group && sub && (
        <>
          <div className="cat-detail-header">
            <button className="back-btn" onClick={() => (hasMultipleSubs ? setSubKey(null) : setGroupKey(null))} aria-label="Back">‹</button>
            <h2 className="section-title">{hasMultipleSubs ? group.label + " › " + sub.label : sub.label}</h2>
          </div>
          <div className="shop-list">
            {sub.items.map((item) => (
              <PartRow key={item.label} id={sub.key + "|" + item.label} label={item.label} terms={item.terms} icon={sub.icon}
                vehicle={vehicle} openId={openId} setOpenId={setOpenId} {...rowProps} />
            ))}
          </div>
        </>
      )}

      {vehicle && <p className="pdisclose" style={{ marginTop: 22 }}>Links to eBay, Amazon and other stores are affiliate links. We may earn a commission when you buy, at no extra cost to you. As an Amazon Associate we earn from qualifying purchases.</p>}
    </>
  );
}

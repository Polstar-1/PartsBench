import { useState } from "react";
import { RETAILER_COLORS, buildLinks } from "../shop";

// variant "list": the full-width rows used when there are no live results.
// variant "chips": a compact wrapping row of store buttons shown under live results.
export default function LinkDrawer({ query, variant = "list" }) {
  const [pendingUrl, setPendingUrl] = useState(null);
  const links = buildLinks(query);
  function handleClick(e, url) {
    e.preventDefault();
    if (pendingUrl) return;
    setPendingUrl(url);
    setTimeout(() => {
      window.open(url, "_blank", "noopener");
      setPendingUrl(null);
    }, 380);
  }

  if (variant === "chips") {
    return (
      <div className="link-chips">
        {links.map((l) => {
          const isPending = pendingUrl === l.url;
          const label = l.name === "eBay Motors" ? "More on eBay" : l.name === "Search the whole web" ? "Whole web" : l.name;
          return (
            <a key={l.name} className={"link-chip" + (isPending ? " pending" : "")} href={l.url} onClick={(e) => handleClick(e, l.url)} rel="noopener noreferrer sponsored">
              <span className="link-dot" style={{ background: RETAILER_COLORS[l.name] || "var(--blue)" }} />
              {isPending ? "Opening…" : label}
              <span className="go" aria-hidden="true">↗</span>
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="link-drawer">
      {links.map((l) => {
        const isPending = pendingUrl === l.url;
        return (
          <a key={l.name} className={"link-row" + (isPending ? " pending" : "")} href={l.url} onClick={(e) => handleClick(e, l.url)} rel="noopener noreferrer sponsored">
            <span className="link-dot" style={{ background: RETAILER_COLORS[l.name] || "var(--blue)" }} />
            <span className="link-name">{l.name}</span>
            <span className="go">{isPending ? "Opening…" : "View ↗"}</span>
          </a>
        );
      })}
    </div>
  );
}

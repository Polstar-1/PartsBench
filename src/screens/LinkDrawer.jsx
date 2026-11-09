import { useState } from "react";
import { RETAILER_COLORS, buildLinks } from "../shop";

export default function LinkDrawer({ query }) {
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

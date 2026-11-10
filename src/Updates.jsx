import { useEffect, useRef, useState } from "react";
import { UPDATES, LATEST_ID } from "./updates";

const KEY = "partsbench.updates.seen";

function readSeen() {
  try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; }
}
function writeSeen(n) {
  try { localStorage.setItem(KEY, String(n)); } catch { /* private mode: the dot just comes back next visit */ }
}

// An "Updates" pill in the top bar. An orange dot means there's something you haven't seen yet.
export default function Updates() {
  const [open, setOpen] = useState(false);
  const [seen] = useState(readSeen);   // newest update you'd already looked at before this visit
  const [clear, setClear] = useState(false);     // dot goes away once you've opened the list
  const box = useRef(null);
  const unread = !clear && seen < LATEST_ID;

  function toggle() {
    if (!open) { writeSeen(LATEST_ID); setClear(true); }
    setOpen(!open);
  }

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("touchstart", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="upd" ref={box}>
      <button className={"upd-btn" + (open ? " active" : "")} onClick={toggle} aria-expanded={open} aria-haspopup="true"
        aria-label={unread ? "Updates (new)" : "Updates"}>
        {unread && <span className="upd-dot" data-testid="upd-dot" />}
        <span>Updates</span>
      </button>
      {open && (
        <div className="upd-panel" role="region" aria-label="What's new">
          <div className="upd-head">What's new</div>
          <div className="upd-list">
            {UPDATES.map((u) => (
              <div className="upd-item" key={u.id}>
                <div className="upd-title">
                  {u.id > seen && <span className="upd-new" aria-label="New" />}
                  <span>{u.title}</span>
                  {u.date && <span className="upd-date">{u.date}</span>}
                </div>
                <p>{u.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

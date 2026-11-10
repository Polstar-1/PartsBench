import { useEffect, useRef } from "react";

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
      s.onerror = () => { loading = null; reject(new Error("turnstile blocked")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// Cloudflare's "are you a person?" check. It is invisible unless Cloudflare needs to ask.
// onToken gets a one-use code to send along with the sign-in request ("" when it expires).
// Change resetKey to ask for a fresh code (each one works once).
export default function Turnstile({ siteKey, resetKey, onToken, onError }) {
  const box = useRef(null);
  const widget = useRef(null);
  const handlers = useRef({ onToken, onError });
  useEffect(() => { handlers.current = { onToken, onError }; });

  useEffect(() => {
    let live = true;
    loadScript()
      .then((ts) => {
        if (!live || !box.current) return;
        widget.current = ts.render(box.current, {
          sitekey: siteKey,
          theme: "dark",
          appearance: "interaction-only",
          callback: (t) => handlers.current.onToken(t),
          "expired-callback": () => handlers.current.onToken(""),
          "error-callback": () => handlers.current.onError(),
        });
      })
      .catch(() => { if (live) handlers.current.onError(); });
    return () => {
      live = false;
      if (widget.current !== null && window.turnstile) {
        try { window.turnstile.remove(widget.current); } catch { /* already gone */ }
      }
      widget.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey && widget.current !== null && window.turnstile) {
      try { window.turnstile.reset(widget.current); } catch { /* widget not ready */ }
    }
  }, [resetKey]);

  return <div ref={box} className="turnstile-box" />;
}

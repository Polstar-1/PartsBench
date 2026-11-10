// Small helpers for building the plain HTML pages that search engines read.

export const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// JSON that is safe to put inside a <script> tag.
export const jsonForScript = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

const CSS = `
:root{--bg:#14161a;--panel:#1b1e23;--border:#2b2f36;--ink:#edeeea;--dim:#9aa2ac;--orange:#ff5a1f;--blue:#7ba6d4;--green:#8db36d}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
header{border-bottom:1px solid var(--border)}
.bar{max-width:820px;margin:0 auto;padding:16px 20px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px}
.brand{font-weight:700;letter-spacing:.06em;color:var(--ink);text-decoration:none}.brand span{color:var(--orange)}
nav a{color:var(--dim);text-decoration:none;font-size:14px;margin-right:16px}nav a:hover{color:var(--ink)}
main{max-width:820px;margin:0 auto;padding:22px 20px 56px}
.crumbs{font-size:13px;color:var(--dim);margin:0 0 14px}.crumbs a{color:var(--dim)}
h1{font-size:30px;line-height:1.2;margin:0 0 10px}
h2{font-size:20px;margin:32px 0 8px}
h3{font-size:16px;margin:18px 0 4px}
p,li{color:#d6d8d4}ul{padding-left:22px}li{margin:6px 0}
a{color:var(--blue)}
.lead{font-size:17px}
.cta{display:inline-block;background:var(--orange);color:#181000;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:8px;margin:6px 0}
.cta:hover{filter:brightness(1.1)}
.box{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin:16px 0}
.box p{margin:6px 0}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:15px}
th,td{text-align:left;vertical-align:top;padding:9px 12px;border:1px solid var(--border)}
th{background:var(--panel);font-weight:600;width:34%}
td{color:#d6d8d4}
.stores{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0;padding:0;list-style:none}
.stores a{display:block;padding:10px 14px;border:1px solid var(--border);border-radius:8px;background:var(--panel);text-decoration:none;color:var(--ink)}
.stores a:hover{border-color:var(--orange)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px 16px;list-style:none;padding:0}
.grid li{margin:2px 0}
.chips{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0}
.chips a{display:inline-block;padding:4px 10px;border:1px solid var(--border);border-radius:999px;font-size:14px;text-decoration:none}
.small{font-size:13px;color:var(--dim)}
details{margin:8px 0}summary{cursor:pointer;color:var(--ink)}
footer{border-top:1px solid var(--border);color:var(--dim);font-size:14px}
footer .bar{padding:18px 20px}footer a{color:var(--dim)}
@media (max-width:520px){h1{font-size:25px}th,td{padding:8px;font-size:14px}th{width:38%}}
`;

export function layout({ title, description, canonical, body, jsonld, noindex }) {
  const ld = jsonld ? `<script type="application/ld+json">${jsonForScript(jsonld)}</script>` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
${noindex ? '<meta name="robots" content="noindex">' : ""}
<meta name="theme-color" content="#14161a">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Parts Bench">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ""}
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>${CSS}</style>
${ld}
</head>
<body>
<header><div class="bar">
<a class="brand" href="/">PARTS<span>BENCH</span></a>
<nav><a href="/parts">All vehicles</a><a href="/">Open the app</a></nav>
</div></header>
<main>
${body}
</main>
<footer><div class="bar"><span>&copy; Parts Bench</span><nav><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></div></footer>
</body>
</html>
`;
}

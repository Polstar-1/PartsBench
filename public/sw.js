// Parts Bench service worker: lets the app open offline.
// Bump CACHE when you want to force everyone onto fresh files.
const CACHE = "partsbench-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Only handle our own files. NHTSA lookups, parts search and retailer links always go to the network.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // Live data (parts search) must never be served from the cache.
  if (url.pathname.startsWith("/api/")) return;

  // Pages: network first so updates show up right away, cache as the offline fallback.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("/", copy)); return res; })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Everything else (hashed JS/CSS/icons): cache first, fill in from the network.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});

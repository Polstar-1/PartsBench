// Vercel serverless function: searches eBay for a part and returns clean, sortable results.
// The eBay keys live ONLY in Vercel's environment variables (never in the app code):
//   EBAY_CLIENT_ID, EBAY_CLIENT_SECRET   (required)
//   EBAY_CAMPAIGN_ID                     (optional override; defaults to the campaign ID below, which is public)
//   EBAY_PARTS_CATEGORY                  (optional, defaults to 6030 "Car & Truck Parts & Accessories")
// With no keys set it answers { configured: false } and the app falls back to plain store links.

const DEFAULT_CAMPAIGN = "5339243534";
const PAGE = 200;      // listings per eBay request (eBay's maximum)
const MAX_PAGES = 3;   // never read more than this many pages for one search
const MAX_CALLS = 6;   // most eBay requests one search may make in total
const WANT_REAL = 24;  // stop paging once this many real (not lookalike) matches are found
const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";

// eBay condition IDs. "For parts or not working" (7000) is left out on purpose.
const NEW_IDS = [1000, 1500, 1750];
const RECON_IDS = [2000, 2010, 2020, 2030, 2500];
const USED_IDS = [2750, 3000, 4000, 5000, 6000];
const COND_IDS = { new: NEW_IDS, reman: RECON_IDS, used: USED_IDS, any: [...NEW_IDS, ...RECON_IDS, ...USED_IDS] };
const SORTS = { best: "", low: "price", high: "-price", new: "newlyListed" };

let tokenCache = { value: "", expires: 0 };

export function conditionKind(id, text) {
  const t = String(text || "");
  if (/remanufactured|refurbished|rebuilt|reman/i.test(t)) return "reman";
  const n = Number(id);
  if (NEW_IDS.includes(n)) return "new";
  if (RECON_IDS.includes(n)) return "reman";
  if (USED_IDS.includes(n)) return "used";
  if (/new/i.test(t)) return "new";
  if (/used|pre-owned/i.test(t)) return "used";
  return "other";
}

export function normalizeItem(it) {
  const price = Number(it.price && it.price.value);
  const ship = it.shippingOptions && it.shippingOptions[0];
  const shipVal = ship && ship.shippingCost ? Number(ship.shippingCost.value) : null;
  const image = (it.image && it.image.imageUrl) || (it.thumbnailImages && it.thumbnailImages[0] && it.thumbnailImages[0].imageUrl) || "";
  return {
    id: it.itemId,
    title: it.title || "",
    price: Number.isFinite(price) ? price : null,
    currency: (it.price && it.price.currency) || "USD",
    shipping: shipVal != null && Number.isFinite(shipVal) ? shipVal : null,
    condition: it.condition || "",
    kind: conditionKind(it.conditionId, it.condition),
    image,
    url: it.itemAffiliateWebUrl || it.itemWebUrl || "",
    seller: it.seller ? { name: it.seller.username || "", percent: it.seller.feedbackPercentage || "", score: it.seller.feedbackScore || 0 } : null,
    fits: it.compatibilityMatch === "EXACT",
    leaf: Array.isArray(it.leafCategoryIds) ? it.leafCategoryIds.map(String) : [], // eBay's own category for the listing
  };
}

// eBay matches ANY word in a title, so "crankshaft" also returns crankshaft position sensors, seals and
// tools. These helpers mark listings that look like a different part as "related" so the app can put
// the real matches first and tuck the rest behind a button.
const stem = (w) => (w.length > 3 ? w.replace(/(es|s)$/, "") : w);
const words = (s) => String(s || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
// Words that don't need to appear in a title (position, generic filler).
const OPTIONAL = new Set(["front", "rear", "left", "right", "driver", "passenger", "upper", "lower", "inner", "outer", "and", "for", "the", "with", "kit", "set", "new", "oem", "engine", "assembly", "assy", "pair", "pack"]);
// Words that usually mean "a different part" when they show up in a title but not in what was searched.
const OTHER_PART = new Set(["sensor", "switch", "gasket", "seal", "bolt", "pulley", "bearing", "bracket", "tool", "puller", "harness", "connector", "relay", "cover", "mount", "wrench", "socket", "wire", "boot", "hardware", "holder", "gauge", "adapter", "clip", "retainer", "installer", "remover", "wiring", "rebuild", "overhaul", "piston", "rod", "conrod", "rotor", "caliper", "pad", "tensioner", "idler", "component"].map(stem));

// Only the start of a title says what the part IS. Everything after "for", "with", "&", "w/" is extra
// ("Head Gasket Set w/ Head Bolts", "Crankshaft for Saab 9-3"), so lookalike words are judged there only.
const SPLIT = /\bw\/|\b(?:with|for|fits?|includes?|including|plus|compatible)\b|&|\+|,/;
function leadSegment(title) {
  const plain = String(title || "").toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, " "); // "(277mm)", "[Enhanced Strength]" are not part names
  const parts = plain.split(SPLIT).map((x) => x.trim()).filter((x) => /[a-z]{3}/.test(x)); // skip fragments with no real word, like "10.91''"
  return parts[0] || "";
}

// "Rear pads" are the wrong part when the search says front (and likewise left/right, upper/lower, inner/outer).
const OPPOSITE = { front: "rear", rear: "front", left: "right", right: "left", upper: "lower", lower: "upper", inner: "outer", outer: "inner" };

// Why a title looks like a different part ("" = it looks right): "missing" a searched word, "opposite" side/position, or "other" part word.
function relatedReason(title, q) {
  const have = new Set(words(title).map(stem));
  const asked = words(q).filter((w) => w.length > 1 && !OPTIONAL.has(w)).map(stem);
  if (asked.some((w) => !have.has(w))) return "missing"; // a word that was searched for is missing
  const titleWords = new Set(words(title));
  const leadWords = new Set(words(leadSegment(title)));
  for (const w of words(q)) {
    const o = OPPOSITE[w];
    if (o && leadWords.has(o) && !titleWords.has(w)) return "opposite"; // asked for front, title says rear only
  }
  const askedSet = new Set(asked);
  for (const w of words(leadSegment(title)).map(stem)) if (OTHER_PART.has(w) && !askedSet.has(w)) return "other"; // a sensor/seal/etc. we didn't ask for
  return "";
}

export function isRelated(title, q) { return relatedReason(title, q) !== ""; }

// eBay files every listing in a specific category ("Serpentine Belts", "Belt Tensioners", "Crankshafts").
// The listings that clearly match by title tell us which categories the wanted part lives in, and that
// works for any part on any vehicle without a word list. Needs at least 3 clear matches to be trusted.
export function categoryProfile(items, q) {
  const seeds = items.filter((i) => i.leaf && i.leaf.length && !isRelated(i.title, q));
  if (seeds.length < 3) return null;
  const count = new Map();
  for (const i of seeds) for (const id of new Set(i.leaf)) count.set(id, (count.get(id) || 0) + 1);
  const ids = new Set();
  let top = "", best = 0;
  for (const [id, n] of count) {
    if (n >= 2 && n / seeds.length >= 0.25) ids.add(id); // one stray listing doesn't make a category
    if (n > best) { best = n; top = id; }
  }
  return ids.size && ids.has(top) ? { ids, top } : null;
}

// Does the title name this vehicle (its make or model)? Used to put listings made for your car first.
function namesVehicle(title, make, model) {
  const t = String(title || "").toLowerCase();
  const rx = (v) => {
    const parts = String(v || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    return parts.length ? new RegExp("\\b" + parts.join("[-\\s]?") + "\\b") : null;
  };
  const m = rx(make), d = rx(model);
  return Boolean((m && m.test(t)) || (d && d.test(t)));
}

// Real matches first (eBay's order kept inside each group), then related ones. Caps keep the response small.
// With opts.make/model (best-match sort only), real matches that name your vehicle go ahead of the rest.
export function rankRelevance(items, q, maxMain = 24, maxRelated = 12, opts = {}) {
  const profile = categoryProfile(items, q);
  const tagged = items.map((i) => {
    const reason = relatedReason(i.title, q);
    if (profile && i.leaf && i.leaf.length) {
      const inCategory = i.leaf.some((id) => profile.ids.has(id));
      if (!inCategory) return { ...i, related: true };          // filed under a different eBay category: a different part
      if (reason === "other") return { ...i, related: false };  // looks like a lookalike by words, but eBay files it with the real part
    }
    return { ...i, related: reason !== "" };
  });
  const real = tagged.filter((i) => !i.related);
  const boost = opts.make || opts.model;
  const ordered = boost ? [...real.filter((i) => namesVehicle(i.title, opts.make, opts.model)), ...real.filter((i) => !namesVehicle(i.title, opts.make, opts.model))] : real;
  return [...ordered.slice(0, maxMain), ...tagged.filter((i) => i.related).slice(0, maxRelated)];
}

async function getToken(id, secret) {
  if (tokenCache.value && Date.now() < tokenCache.expires - 60000) return tokenCache.value;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + Buffer.from(id + ":" + secret).toString("base64") },
    body: "grant_type=client_credentials&scope=" + encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  });
  if (!res.ok) throw new Error("eBay sign-in failed (" + res.status + ")");
  const data = await res.json();
  tokenCache = { value: data.access_token, expires: Date.now() + (Number(data.expires_in) || 7200) * 1000 };
  return tokenCache.value;
}

async function search(token, env, params) {
  const url = SEARCH_URL + "?" + params.toString();
  const headers = { Authorization: "Bearer " + token, "X-EBAY-C-MARKETPLACE-ID": "EBAY_MOTORS_US", Accept: "application/json" };
  headers["X-EBAY-C-ENDUSERCTX"] = "affiliateCampaignId=" + (env.EBAY_CAMPAIGN_ID || DEFAULT_CAMPAIGN);
  const res = await fetch(url, { headers });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

const clean = (s, max) => String(s || "").replace(/[^\w\s\-./&'+]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export default async function handler(req, res) {
  const env = process.env;
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "GET") { res.statusCode = 405; return res.end(JSON.stringify({ error: "GET only" })); }
  if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET) return res.end(JSON.stringify({ configured: false, items: [] }));

  const url = new URL(req.url, "http://x");
  const q = clean(url.searchParams.get("q"), 80);
  const year = /^\d{4}$/.test(url.searchParams.get("year") || "") ? url.searchParams.get("year") : "";
  const make = clean(url.searchParams.get("make"), 40);
  const model = clean(url.searchParams.get("model"), 40);
  const trim = clean(url.searchParams.get("trim"), 40);
  const sort = SORTS[url.searchParams.get("sort")] !== undefined ? url.searchParams.get("sort") : "best";
  const cond = COND_IDS[url.searchParams.get("cond")] ? url.searchParams.get("cond") : "any";
  if (q.length < 2) { res.statusCode = 400; return res.end(JSON.stringify({ error: "Missing part name" })); }

  const base = () => {
    const p = new URLSearchParams();
    p.set("filter", "conditionIds:{" + COND_IDS[cond].join("|") + "}");
    if (SORTS[sort]) p.set("sort", SORTS[sort]);
    p.set("limit", String(PAGE)); // ask for plenty so there is still enough left after lookalike parts are set aside
    return p;
  };

  try {
    const token = await getToken(env.EBAY_CLIENT_ID, env.EBAY_CLIENT_SECRET);
    const category = env.EBAY_PARTS_CATEGORY || "6030";

    // Try the most exact search first, then loosen: fits-your-trim, fits-your-model, plain keywords.
    const attempts = [];
    if (year && make && model) {
      if (trim) attempts.push({ fitment: "verified", compat: true, withTrim: true });
      attempts.push({ fitment: "verified", compat: true, withTrim: false });
    }
    attempts.push({ fitment: "keyword", compat: false, withTrim: Boolean(trim) });
    if (trim) attempts.push({ fitment: "keyword", compat: false, withTrim: false });

    let out = null;       // the first search that has real matches (not just lookalike parts)
    let fallback = null;  // otherwise: the first search that returned anything at all
    let lastFailure = null;
    let anyOk = false;
    let calls = 0;        // total eBay requests for this one search, kept small so it stays fast
    const countReal = (list) => list.map(normalizeItem).filter((i) => i.url && i.price != null && !isRelated(i.title, q)).length;
    for (const a of attempts) {
      if (calls >= MAX_CALLS) break;
      const p = base();
      if (a.compat) {
        p.set("q", q);
        p.set("compatibility_filter", "Year:" + year + ";Make:" + make + ";Model:" + model + (a.withTrim ? ";Trim:" + trim : ""));
      } else {
        p.set("q", [year, make, model, a.withTrim ? trim : "", q].filter(Boolean).join(" "));
      }
      p.set("category_ids", category);
      calls++;
      let r = await search(token, env, p);
      if (!r.ok && !a.compat) { p.delete("category_ids"); calls++; r = await search(token, env, p); }
      if (!r.ok) { lastFailure = r.status; continue; }
      anyOk = true;
      if (r.body.itemSummaries && r.body.itemSummaries.length) {
        // eBay lists lookalike parts (sensors, seals) ahead of the real thing, so keep reading
        // further pages until there are enough real matches.
        const summaries = [...r.body.itemSummaries];
        for (let page = 1; page < MAX_PAGES && calls < MAX_CALLS && countReal(summaries) < WANT_REAL && r.body.next && summaries.length < (r.body.total || 0); page++) {
          p.set("offset", String(page * PAGE));
          calls++;
          const more = await search(token, env, p);
          if (!more.ok || !more.body.itemSummaries || !more.body.itemSummaries.length) break; // keep what we have
          summaries.push(...more.body.itemSummaries);
          r = more;
        }
        // Few real matches? Search again inside the category the real matches live in, which skips the lookalikes.
        if (countReal(summaries) > 0 && countReal(summaries) < WANT_REAL && calls < MAX_CALLS) {
          const prof = categoryProfile(summaries.map(normalizeItem), q);
          if (prof && prof.top) {
            const p2 = new URLSearchParams(p);
            p2.delete("offset");
            p2.set("category_ids", prof.top);
            calls++;
            const focused = await search(token, env, p2);
            if (focused.ok && focused.body.itemSummaries) {
              const seen = new Set(summaries.map((x) => x.itemId));
              for (const it of focused.body.itemSummaries) if (!seen.has(it.itemId)) summaries.push(it);
            }
          }
        }
        const found = { fitment: a.fitment, trim: a.withTrim ? trim : "", body: { total: r.body.total, itemSummaries: summaries } };
        if (countReal(summaries) > 0) { out = found; break; }
        // Only lookalikes here (e.g. seals when you asked for the crankshaft). Remember it, then try the looser searches.
        if (!fallback) fallback = found;
      }
    }
    if (!out) out = fallback;
    if (!out && !anyOk) throw new Error("eBay search failed (" + lastFailure + ")");
    if (!out) out = { fitment: "keyword", trim: "", body: { total: 0, itemSummaries: [] } };

    const items = rankRelevance((out.body.itemSummaries || []).map(normalizeItem).filter((i) => i.url && i.price != null), q, 24, 12,
      sort === "best" ? { make, model } : {}); // price / newest sorts keep their own order
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.end(JSON.stringify({ configured: true, fitment: out.fitment, trim: out.trim, total: out.body.total || items.length, items }));
  } catch (e) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ configured: true, error: e.message || "Search failed", items: [] }));
  }
}

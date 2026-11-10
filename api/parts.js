// Vercel serverless function: searches eBay for a part and returns clean, sortable results.
// The eBay keys live ONLY in Vercel's environment variables (never in the app code):
//   EBAY_CLIENT_ID, EBAY_CLIENT_SECRET   (required)
//   EBAY_CAMPAIGN_ID                     (optional override; defaults to the campaign ID below, which is public)
//   EBAY_PARTS_CATEGORY                  (optional, defaults to 6030 "Car & Truck Parts & Accessories")
// With no keys set it answers { configured: false } and the app falls back to plain store links.

const DEFAULT_CAMPAIGN = "5339243534";
const PAGE = 200;      // listings per eBay request (eBay's maximum)
const MAX_PAGES = 3;   // never read more than this many pages for one search
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
const OTHER_PART = new Set(["sensor", "switch", "gasket", "seal", "bolt", "pulley", "bearing", "bracket", "tool", "puller", "harness", "connector", "relay", "cover", "mount", "wrench", "socket", "wire", "boot", "hardware", "holder", "gauge", "adapter", "clip", "retainer", "installer", "remover", "wiring"].map(stem));

export function isRelated(title, q) {
  const have = new Set(words(title).map(stem));
  const asked = words(q).filter((w) => w.length > 1 && !OPTIONAL.has(w)).map(stem);
  if (asked.some((w) => !have.has(w))) return true; // a word that was searched for is missing
  const askedSet = new Set(asked);
  for (const w of have) if (OTHER_PART.has(w) && !askedSet.has(w)) return true; // it is a sensor/seal/etc. and we didn't ask for one
  return false;
}

// Real matches first (eBay's order kept inside each group), then related ones. Caps keep the response small.
export function rankRelevance(items, q, maxMain = 24, maxRelated = 12) {
  const tagged = items.map((i) => ({ ...i, related: isRelated(i.title, q) }));
  return [...tagged.filter((i) => !i.related).slice(0, maxMain), ...tagged.filter((i) => i.related).slice(0, maxRelated)];
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

    let out = null;
    let lastFailure = null;
    let anyOk = false;
    for (const a of attempts) {
      const p = base();
      if (a.compat) {
        p.set("q", q);
        p.set("compatibility_filter", "Year:" + year + ";Make:" + make + ";Model:" + model + (a.withTrim ? ";Trim:" + trim : ""));
      } else {
        p.set("q", [year, make, model, a.withTrim ? trim : "", q].filter(Boolean).join(" "));
      }
      p.set("category_ids", category);
      let r = await search(token, env, p);
      if (!r.ok && !a.compat) { p.delete("category_ids"); r = await search(token, env, p); }
      if (!r.ok) { lastFailure = r.status; continue; }
      anyOk = true;
      if (r.body.itemSummaries && r.body.itemSummaries.length) {
        // eBay lists lookalike parts (sensors, seals) ahead of the real thing, so keep reading
        // further pages until there are enough real matches.
        const summaries = [...r.body.itemSummaries];
        const realCount = () => summaries.map(normalizeItem).filter((i) => i.url && i.price != null && !isRelated(i.title, q)).length;
        for (let page = 1; page < MAX_PAGES && realCount() < WANT_REAL && r.body.next && summaries.length < (r.body.total || 0); page++) {
          p.set("offset", String(page * PAGE));
          const more = await search(token, env, p);
          if (!more.ok || !more.body.itemSummaries || !more.body.itemSummaries.length) break; // keep what we have
          summaries.push(...more.body.itemSummaries);
          r = more;
        }
        out = { fitment: a.fitment, trim: a.withTrim ? trim : "", body: { total: r.body.total, itemSummaries: summaries } };
        break;
      }
    }
    if (!out && !anyOk) throw new Error("eBay search failed (" + lastFailure + ")");
    if (!out) out = { fitment: "keyword", trim: "", body: { total: 0, itemSummaries: [] } };

    const items = rankRelevance((out.body.itemSummaries || []).map(normalizeItem).filter((i) => i.url && i.price != null), q);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.end(JSON.stringify({ configured: true, fitment: out.fitment, trim: out.trim, total: out.body.total || items.length, items }));
  } catch (e) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ configured: true, error: e.message || "Search failed", items: [] }));
  }
}

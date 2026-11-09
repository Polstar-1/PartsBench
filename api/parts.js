// Vercel serverless function: searches eBay for a part and returns clean, sortable results.
// The eBay keys live ONLY in Vercel's environment variables (never in the app code):
//   EBAY_CLIENT_ID, EBAY_CLIENT_SECRET   (required)
//   EBAY_CAMPAIGN_ID                     (optional, from eBay Partner Network, makes links earn commission)
//   EBAY_PARTS_CATEGORY                  (optional, defaults to 6030 "Car & Truck Parts & Accessories")
// With no keys set it answers { configured: false } and the app falls back to plain store links.

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
  if (env.EBAY_CAMPAIGN_ID) headers["X-EBAY-C-ENDUSERCTX"] = "affiliateCampaignId=" + env.EBAY_CAMPAIGN_ID;
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
  const sort = SORTS[url.searchParams.get("sort")] !== undefined ? url.searchParams.get("sort") : "best";
  const cond = COND_IDS[url.searchParams.get("cond")] ? url.searchParams.get("cond") : "any";
  if (q.length < 2) { res.statusCode = 400; return res.end(JSON.stringify({ error: "Missing part name" })); }

  const base = () => {
    const p = new URLSearchParams();
    p.set("filter", "conditionIds:{" + COND_IDS[cond].join("|") + "}");
    if (SORTS[sort]) p.set("sort", SORTS[sort]);
    p.set("limit", "24");
    return p;
  };

  try {
    const token = await getToken(env.EBAY_CLIENT_ID, env.EBAY_CLIENT_SECRET);
    let out = null;

    // 1) Best case: eBay's own "fits this vehicle" filter.
    if (year && make && model) {
      const p = base();
      p.set("q", q);
      p.set("category_ids", env.EBAY_PARTS_CATEGORY || "6030");
      p.set("compatibility_filter", "Year:" + year + ";Make:" + make + ";Model:" + model);
      const r = await search(token, env, p);
      if (r.ok && r.body.itemSummaries && r.body.itemSummaries.length) out = { fitment: "verified", body: r.body };
    }
    // 2) Fallback: plain keyword search with the vehicle in the words.
    if (!out) {
      const p = base();
      p.set("q", [year, make, model, q].filter(Boolean).join(" "));
      p.set("category_ids", env.EBAY_PARTS_CATEGORY || "6030");
      let r = await search(token, env, p);
      if (!r.ok) { p.delete("category_ids"); r = await search(token, env, p); }
      if (!r.ok) throw new Error("eBay search failed (" + r.status + ")");
      out = { fitment: "keyword", body: r.body };
    }

    const items = (out.body.itemSummaries || []).map(normalizeItem).filter((i) => i.url && i.price != null);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.end(JSON.stringify({ configured: true, fitment: out.fitment, total: out.body.total || items.length, items }));
  } catch (e) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ configured: true, error: e.message || "Search failed", items: [] }));
  }
}

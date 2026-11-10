// Vercel serverless function: the public pages search engines index.
//   /parts                         every vehicle we cover
//   /parts/2015-toyota-camry       one vehicle: popular parts, maintenance plan, recalls
//   /parts/2015-toyota-camry/front-brake-pads   one part on that vehicle
// Vercel's rewrites (vercel.json) send those addresses here. Pages are cached at the edge for a day.
// Only vehicles and parts listed in _lib/seoData.js exist; anything else is a 404.

import { esc, layout } from "./_lib/html.js";
import { SITE, VEHICLES, CORE_PARTS, vehicleFromSlug, partFromSlug, yearsOf, groupedParts, locate, slugify } from "./_lib/seoData.js";
import { buildLinks } from "../src/shop.js";
import { planFor } from "../src/maintenance.js";

const RECALLS = "https://api.nhtsa.gov/recalls/recallsByVehicle";
const OK_CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";
const SHORT_CACHE = "public, s-maxage=600, stale-while-revalidate=3600";

const fmt = (n) => Number(n).toLocaleString("en-US");
const appLink = (v, part) => "/?y=" + v.year + "&mk=" + encodeURIComponent(v.make) + "&md=" + encodeURIComponent(v.model) + (part ? "&part=" + encodeURIComponent(part.label) : "");

function intervalText(item) {
  const bits = [];
  if (item.miles) bits.push(fmt(item.miles) + " miles");
  if (item.months) bits.push(item.months % 12 === 0 ? item.months / 12 + (item.months === 12 ? " year" : " years") : item.months + " months");
  return bits.length ? "Every " + bits.join(" or ") : "Check as needed";
}

async function fetchRecalls(v) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const url = RECALLS + "?make=" + encodeURIComponent(v.make) + "&model=" + encodeURIComponent(v.model) + "&modelYear=" + v.year;
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : null;
  } catch {
    return null; // NHTSA unreachable: leave the section out rather than guess
  } finally {
    clearTimeout(timer);
  }
}

function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: SITE + it.path })),
  };
}

const crumbs = (items) =>
  `<p class="crumbs">${items.map((it, i) => (i === items.length - 1 ? esc(it.name) : `<a href="${esc(it.path)}">${esc(it.name)}</a>`)).join(" &rsaquo; ")}</p>`;

const storeLinks = (query) =>
  `<ul class="stores">${buildLinks(query).map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="sponsored nofollow noopener">${esc(l.name)}</a></li>`).join("")}</ul>`;

const DISCLOSE = `<p class="small">Links to eBay and other stores are affiliate links. We may earn a commission if you buy, at no extra cost to you. Parts Bench is not a store and does not sell parts. Always confirm fitment with the seller before you buy.</p>`;

/* ----------------------------------------------------------------- pages */

function indexPage() {
  const makes = [...new Set(VEHICLES.map((v) => v.make))];
  const body = `
<h1>Parts for popular vehicles</h1>
<p class="lead">Pick your vehicle and year to see common parts, what wears out, a general maintenance schedule and where to shop. Don't see yours? The <a href="/">Parts Bench app</a> works with any vehicle.</p>
${makes.map((make) => `
<h2>${esc(make)}</h2>
${VEHICLES.filter((v) => v.make === make).map((v) => `
<details><summary>${esc(v.model)} <span class="small">(${v.from} to ${v.to})</span></summary>
<ul class="chips">${yearsOf(v).map((y) => `<li><a href="/parts/${y}-${v.slug}">${y}</a></li>`).join("")}</ul></details>`).join("")}`).join("")}
`;
  return {
    status: 200, cache: OK_CACHE,
    html: layout({ title: "Parts for popular vehicles | Parts Bench", description: "Find common replacement parts, maintenance intervals and where to shop for popular cars and trucks.", canonical: SITE + "/parts", body,
      jsonld: breadcrumbLd([{ name: "Parts Bench", path: "/" }, { name: "Parts", path: "/parts" }]) }),
  };
}

async function hubPage(v) {
  const recalls = await fetchRecalls(v);
  const plan = planFor({ fuel: "", drive: "", intervals: {} });
  const groups = groupedParts();
  const years = yearsOf(v);

  let recallHtml = "";
  if (recalls) {
    if (!recalls.length) {
      recallHtml = `<h2>Safety recalls</h2><p>NHTSA has no recalls on record for the ${esc(v.name)}. Recalls are recorded by model year, not by VIN, so check your own VIN at <a href="https://www.nhtsa.gov/recalls" rel="nofollow noopener" target="_blank">nhtsa.gov/recalls</a>.</p>`;
    } else {
      const shown = recalls.slice(0, 6);
      recallHtml = `<h2>Safety recalls</h2>
<p>NHTSA lists <strong>${recalls.length}</strong> recall${recalls.length === 1 ? "" : "s"} for the ${esc(v.name)}. Recalls apply by model year, and not every vehicle of that year is affected. Check your own VIN at <a href="https://www.nhtsa.gov/recalls" rel="nofollow noopener" target="_blank">nhtsa.gov/recalls</a>.</p>
<ul>${shown.map((r) => {
  const id = String(r.NHTSACampaignNumber || "").replace(/[^A-Za-z0-9]/g, "");
  const summary = String(r.Summary || "").trim();
  return `<li><strong>${esc(r.Component || "Recall")}</strong>${id ? ` (<a href="https://www.nhtsa.gov/recalls?nhtsaId=${esc(id)}" rel="nofollow noopener" target="_blank">${esc(id)}</a>)` : ""}${summary ? `: ${esc(summary.length > 220 ? summary.slice(0, 217) + "…" : summary)}` : ""}</li>`;
}).join("")}</ul>${recalls.length > shown.length ? `<p class="small">Showing ${shown.length} of ${recalls.length}.</p>` : ""}`;
    }
  }

  const body = `
${crumbs([{ name: "Parts Bench", path: "/" }, { name: "Parts", path: "/parts" }, { name: v.name, path: v.path }])}
<h1>${esc(v.name)} parts</h1>
<p class="lead">Common replacement parts for the ${esc(v.name)}, what usually wears out, a general maintenance schedule, and where to shop. Parts can differ by engine, trim and build date, so confirm fitment with your VIN before you buy.</p>
<a class="cta" href="${esc(appLink(v))}">Shop the ${esc(v.name)} in the app</a>

<h2>Popular parts</h2>
${groups.map(([group, parts]) => `<h3>${esc(group)}</h3>
<ul class="grid">${parts.map((p) => `<li><a href="${esc(v.path + "/" + p.slug)}">${esc(p.label)}</a></li>`).join("")}</ul>`).join("")}

<h2>General maintenance schedule</h2>
<p>These are common starting intervals, not a factory schedule for your engine. Your owner's manual always wins.</p>
<table>
${plan.map((it) => `<tr><th>${esc(it.label)}</th><td>${esc(intervalText(it))}${it.note ? `<br><span class="small">${esc(it.note)}</span>` : ""}</td></tr>`).join("")}
</table>
${recallHtml}

<h2>Other ${esc(v.make + " " + v.model)} years</h2>
<ul class="chips">${years.map((y) => (y === v.year ? `<li><a aria-current="page" href="/parts/${y}-${v.slug}"><strong>${y}</strong></a></li>` : `<li><a href="/parts/${y}-${v.slug}">${y}</a></li>`)).join("")}</ul>
<p class="small">Parts Bench is a free tool for identifying a vehicle, tracking maintenance and finding parts. <a href="/">Open the app</a> to save your vehicle and keep a maintenance log.</p>
${DISCLOSE}
`;
  return {
    status: 200, cache: recalls ? OK_CACHE : SHORT_CACHE,
    html: layout({
      title: v.name + " Parts and Maintenance | Parts Bench",
      description: "Common replacement parts, a general maintenance schedule and safety recalls for the " + v.name + ". Compare stores and shop for the right part.",
      canonical: SITE + v.path, body,
      jsonld: breadcrumbLd([{ name: "Parts Bench", path: "/" }, { name: "Parts", path: "/parts" }, { name: v.name, path: v.path }]),
    }),
  };
}

function partPage(v, part) {
  const loc = locate(part) || { group: "Parts", sub: "" };
  const plan = planFor({ fuel: "", drive: "", intervals: {} });
  const maint = part.maint ? plan.find((i) => i.key === part.maint) : null;
  const query = v.name + " " + part.label;
  const related = CORE_PARTS.filter((p) => p.slug !== part.slug && (locate(p) || {}).group === loc.group).slice(0, 6);
  const other = related.length ? related : CORE_PARTS.filter((p) => p.slug !== part.slug).slice(0, 6);
  const what = part.what.replace(/\{v\}/g, v.name);

  const body = `
${crumbs([{ name: "Parts Bench", path: "/" }, { name: "Parts", path: "/parts" }, { name: v.name, path: v.path }, { name: part.label, path: v.path + "/" + part.slug }])}
<h1>${esc(v.name)} ${esc(part.label)}</h1>
<p class="lead">${esc(what)}</p>
<a class="cta" href="${esc(appLink(v, part))}">Compare ${esc(part.label.toLowerCase())} for your ${esc(v.model)} in the app</a>

<h2>Signs it may need replacing</h2>
<ul>${part.signs.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>

<h2>At a glance</h2>
<table>
<tr><th>Part</th><td>${esc(part.label)}${loc.sub ? `<br><span class="small">${esc(loc.group)} &rsaquo; ${esc(loc.sub)}</span>` : ""}</td></tr>
<tr><th>Typical life</th><td>${esc(part.life)}</td></tr>
<tr><th>DIY difficulty</th><td>${esc(part.diff)}<br><span class="small">${esc(part.diffNote)}</span></td></tr>
${maint ? `<tr><th>Related service</th><td>${esc(maint.label)}: ${esc(intervalText(maint))}${maint.note ? `<br><span class="small">${esc(maint.note)}</span>` : ""}</td></tr>` : ""}
</table>
<p class="small">Lifespans and difficulty are general. They vary with the engine, trim, driving and climate, and your owner's manual and a qualified mechanic should have the final say.</p>

<h2>Before you buy</h2>
<p>${esc(part.tip)}</p>
<p>Confirm the part fits your exact ${esc(v.name)} by checking your VIN, engine size and trim with the seller. The ${esc(v.model)} was sold with different options across the ${esc(String(v.year))} model year, and a part that fits one build may not fit another.</p>

<h2>Where to buy a ${esc(v.name)} ${esc(part.label.toLowerCase())}</h2>
<p>These searches are set up for your vehicle and the part.</p>
${storeLinks(query)}
${DISCLOSE}

<h2>Related ${esc(v.model)} parts</h2>
<ul class="chips">${other.map((p) => `<li><a href="${esc(v.path + "/" + p.slug)}">${esc(p.label)}</a></li>`).join("")}</ul>
<p><a href="${esc(v.path)}">All ${esc(v.name)} parts and maintenance &rsaquo;</a></p>
`;
  const title = v.name + " " + part.label + ": Signs, Fitment and Where to Buy | Parts Bench";
  return {
    status: 200, cache: OK_CACHE,
    html: layout({
      title,
      description: "Replacing the " + part.label.toLowerCase() + " on a " + v.name + ": warning signs, typical life, DIY difficulty and where to buy.",
      canonical: SITE + v.path + "/" + part.slug, body,
      jsonld: breadcrumbLd([{ name: "Parts Bench", path: "/" }, { name: "Parts", path: "/parts" }, { name: v.name, path: v.path }, { name: part.label, path: v.path + "/" + part.slug }]),
    }),
  };
}

function notFound() {
  const body = `
<h1>We don't have that page yet</h1>
<p class="lead">We only publish pages for popular vehicles and common parts. The Parts Bench app works with any vehicle, so you can still look up yours.</p>
<p><a class="cta" href="/">Open the app</a></p>
<p><a href="/parts">Browse the vehicles we cover &rsaquo;</a></p>`;
  return { status: 404, cache: "public, s-maxage=3600", html: layout({ title: "Page not found | Parts Bench", description: "That page does not exist.", body, noindex: true }) };
}

const one = (x) => (Array.isArray(x) ? x[0] : x);

export default async function handler(req, res) {
  const q = req.query || {};
  const vSlug = one(q.vehicle);
  const pSlug = one(q.part);
  let out;
  try {
    if (!vSlug) out = indexPage();
    else {
      const v = vehicleFromSlug(String(vSlug).toLowerCase());
      if (!v) out = notFound();
      else if (!pSlug) out = await hubPage(v);
      else {
        const part = partFromSlug(slugify(String(pSlug)));
        out = part ? partPage(v, part) : notFound();
      }
    }
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).send("Something went wrong. Please try again.");
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", out.cache);
  return res.status(out.status).send(out.html);
}

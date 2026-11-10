// Vercel serverless function: /sitemap.xml
// Lists the index, every vehicle page, and the most-searched part pages for the newest model years of each vehicle.
// The remaining part pages are still reachable from each vehicle page.
import { SITE, VEHICLES, CORE_PARTS, SITEMAP_PART_YEARS, yearsOf } from "./_lib/seoData.js";

export default function handler(_req, res) {
  const urls = [SITE + "/", SITE + "/parts", SITE + "/privacy", SITE + "/terms"];
  const top = CORE_PARTS.filter((p) => p.top);
  for (const v of VEHICLES) {
    yearsOf(v).forEach((y, i) => {
      const base = SITE + "/parts/" + y + "-" + v.slug;
      urls.push(base);
      if (i < SITEMAP_PART_YEARS) for (const p of top) urls.push(base + "/" + p.slug);
    });
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => "  <url><loc>" + u + "</loc></url>").join("\n") + "\n</urlset>\n";
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  return res.status(200).send(xml);
}

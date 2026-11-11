// Your affiliate IDs. Empty = plain links. These are public (they appear in every link).
// Amazon Associates: your store tag, e.g. "partsbench-20"
// eBay Partner Network: your campaign ID. Generate one sample link in EPN and
// compare it with the parameters below to confirm they match.
export const AFFILIATE = { amazonTag: "partsbench-20", ebayCampId: "5339243534" };

export const RETAILER_COLORS = {
  "eBay Motors": "#5b8dbe",
  "Amazon": "#ff9900",
  "AutoZone": "#e51937",
  "O'Reilly Auto Parts": "#c8102e",
  "RockAuto": "#3f6fb0",
  "Search the whole web": "#9199a3",
};

export function buildLinks(query) {
  const q = encodeURIComponent(query);
  const amazon = "https://www.amazon.com/s?k=" + q + (AFFILIATE.amazonTag ? "&tag=" + encodeURIComponent(AFFILIATE.amazonTag) : "");
  const ebay = "https://www.ebay.com/sch/i.html?_nkw=" + q + (AFFILIATE.ebayCampId
    ? "&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=" + encodeURIComponent(AFFILIATE.ebayCampId) + "&toolid=10001&mkevt=1"
    : "");
  return [
    { name: "eBay Motors", url: ebay },
    { name: "Amazon", url: amazon },
    { name: "AutoZone", url: "https://www.autozone.com/searchresult?searchText=" + q },
    { name: "O'Reilly Auto Parts", url: "https://www.oreillyauto.com/search?q=" + q },
    { name: "RockAuto", url: "https://www.google.com/search?q=" + encodeURIComponent("site:rockauto.com " + query) },
    { name: "Search the whole web", url: "https://www.google.com/search?q=" + encodeURIComponent(query + " for sale") },
  ];
}

const VPIC = "https://vpic.nhtsa.dot.gov/api/vehicles";
const RECALLS = "https://api.nhtsa.gov/recalls/recallsByVehicle";

export function mapBodyClassToType(bodyClass) {
  const s = (bodyClass || "").toLowerCase();
  if (!s) return null;
  if (/pickup|truck/.test(s)) return "truck";
  if (/minivan|\bvan\b/.test(s)) return "minivan";
  if (/wagon/.test(s)) return "wagon";
  if (/hatchback|liftback/.test(s)) return "hatchback";
  if (/crossover|cuv/.test(s)) return "crossover";
  if (/suv|sport utility|multi-purpose|mpv/.test(s)) return "suv";
  if (/convertible|cabriolet|roadster|coupe/.test(s)) return "coupe";
  if (/sedan|saloon/.test(s)) return "sedan";
  return "sedan";
}

// "In-Line" + 4 -> "I4", "V-Shaped" + 6 -> "V6", "Horizontally Opposed (Flat)" + 4 -> "H4"
function cylinderLayout(cfg, cyl) {
  if (!cyl) return "";
  if (/in-?line|straight/i.test(cfg)) return "I" + cyl;
  if (/v-?shaped/i.test(cfg)) return "V" + cyl;
  if (/opposed|flat|boxer/i.test(cfg)) return "H" + cyl;
  if (/w-?shaped/i.test(cfg)) return "W" + cyl;
  return cyl + "-cyl";
}

// Fully electric vehicles get the electric silhouette (except trucks and vans).
function pickBodyType(r) {
  const type = mapBodyClassToType(r.BodyClass);
  const electric = (r.FuelTypePrimary || "").toLowerCase() === "electric" || /bev|battery electric/i.test(r.ElectrificationLevel || "");
  if (electric && type !== "truck" && type !== "minivan") return "ev";
  return type;
}

function composeEngine(r) {
  const parts = [];
  if (r.DisplacementL) parts.push(parseFloat(r.DisplacementL).toFixed(1) + "L");
  const layout = cylinderLayout((r.EngineConfiguration || "").trim(), r.EngineCylinders);
  if (layout) parts.push(layout);
  if (!parts.length && r.FuelTypePrimary) parts.push(r.FuelTypePrimary);
  return parts.length ? parts.join(" ") : "Not reported for this VIN";
}

// Returns a vehicle draft, or null if NHTSA has no match. Throws on network errors.
export async function decodeVin(vin) {
  const res = await fetch(VPIC + "/decodevinvalues/" + encodeURIComponent(vin) + "?format=json");
  const data = await res.json();
  const r = data.Results && data.Results[0];
  if (!r || !r.Make) return null;
  return {
    id: null,
    year: r.ModelYear || "",
    make: r.Make || "",
    model: r.Model || "",
    trim: r.Trim || r.Series || "",
    bodyClass: r.BodyClass || "",
    bodyType: pickBodyType(r),
    engine: composeEngine(r),
    cylinders: r.EngineCylinders || "Not reported",
    hp: r.EngineHP ? Math.round(parseFloat(r.EngineHP)) + " hp" : "Not reported",
    drive: r.DriveType || "",
    fuel: r.FuelTypePrimary || "",
    electrification: r.ElectrificationLevel || "",
    vin,
  };
}

export async function getModels(make, year) {
  const res = await fetch(VPIC + "/getmodelsformakeyear/make/" + encodeURIComponent(make) + "/modelyear/" + encodeURIComponent(year) + "?format=json");
  const data = await res.json();
  return (data.Results || []).map((r) => r.Model_Name).filter((v, i, a) => v && a.indexOf(v) === i).sort();
}

// Recalls are looked up by year/make/model. They are not VIN-specific.
export async function getRecalls(make, model, year) {
  const url = RECALLS + "?make=" + encodeURIComponent(make) + "&model=" + encodeURIComponent(model) + "&modelYear=" + encodeURIComponent(year);
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

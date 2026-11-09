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

// ---- Makes list ----
// NHTSA's own list of makes for cars and SUVs/crossovers (includes discontinued ones like Saab,
// Pontiac and Saturn). Heavy trucks and buses are left out. Cached on the device for two weeks.
const MAKES_KEY = "partsbench.makes.v1";
const MAKES_TTL = 14 * 24 * 3600 * 1000;
const MAKE_BLOCK = new Set(["BLUE BIRD", "FREIGHTLINER", "COACHWORKS", "ORION BUS", "EXECUCOACH INC", "SPRINTER (DODGE OR FREIGHTLINER)", "WORLD TRANSPORT AUTHORITY", "CALIFORNIA", "THE VEHICLE PRODUCTION GROUP", "GENERAL PURPOSE VEHICLES", "UKEYCHEYMA", "BEYOND ROADS", "AMPHI-RANGER", "USA MPV CO", "US SPECIALTY VEHICLES LLC", "HUNTER AUTOMOTIVE GROUP, INC", "IRON GURU CUSTOMS", "A & O", "PHOENIX CRUISER", "PHOENIX TRX", "VEOLECTRA", "WINNEBAGO", "TERRAFUGIA"]);
const KEEP_UPPER = new Set(["AM", "BMW", "GMC", "MG", "AC", "AMC", "FF", "RPM", "HMC", "SPV", "CAMI", "EV", "USA", "UD", "LLC", "INC", "MPV"]);

export function prettyMake(raw) {
  return String(raw).trim().toLowerCase().replace(/(^|[\s\-/.(])([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase())
    .split(/(\s+|-)/).map((tok) => (KEEP_UPPER.has(tok.toUpperCase()) ? tok.toUpperCase() : tok)).join("");
}

// Used if NHTSA can't be reached and nothing is cached yet.
export const FALLBACK_MAKES = ["Acura","Alfa Romeo","AMC","Aston Martin","Audi","Bentley","BMW","Buick","Cadillac","Chevrolet","Chrysler","Daewoo","Datsun","Dodge","Eagle","Ferrari","Fiat","Ford","Genesis","Geo","GMC","Honda","Hummer","Hyundai","Infiniti","Isuzu","Jaguar","Jeep","Kia","Lamborghini","Land Rover","Lexus","Lincoln","Lotus","Maserati","Mazda","Mercedes-Benz","Mercury","Mini","Mitsubishi","Nissan","Oldsmobile","Plymouth","Pontiac","Porsche","Ram","Rivian","Rolls-Royce","Saab","Saturn","Scion","Smart","Subaru","Suzuki","Tesla","Toyota","Volkswagen","Volvo"];

export async function getMakes() {
  try {
    const c = JSON.parse(localStorage.getItem(MAKES_KEY) || "null");
    if (c && Array.isArray(c.list) && c.list.length > 50 && Date.now() - c.at < MAKES_TTL) return c.list;
  } catch { /* storage unavailable: just fetch */ }
  const kinds = ["car", "multipurpose%20passenger%20vehicle%20(mpv)"];
  const lists = await Promise.all(kinds.map(async (k) => {
    const res = await fetch(VPIC + "/GetMakesForVehicleType/" + k + "?format=json");
    const data = await res.json();
    return data.Results || [];
  }));
  const seen = new Map();
  lists.flat().forEach((r) => {
    const raw = (r.MakeName || "").trim();
    if (!raw || MAKE_BLOCK.has(raw.toUpperCase())) return;
    const pretty = prettyMake(raw);
    if (!seen.has(pretty.toLowerCase())) seen.set(pretty.toLowerCase(), pretty);
  });
  const list = [...seen.values()].sort((a, b) => a.localeCompare(b));
  if (list.length < 50) throw new Error("makes list too short");
  try { localStorage.setItem(MAKES_KEY, JSON.stringify({ at: Date.now(), list })); } catch { /* ignore */ }
  return list;
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

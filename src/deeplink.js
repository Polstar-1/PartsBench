// Our public search pages link into the app like:
//   /?y=2015&mk=Toyota&md=Camry&part=Front%20Brake%20Pads
// This turns that into a vehicle (and an optional part to search for). Anything odd is ignored.
const SAFE = /^[A-Za-z0-9 .'&/-]{1,40}$/;

export function readDeepLink(search) {
  try {
    const p = new URLSearchParams(search);
    const y = p.get("y") || "";
    const make = p.get("mk") || "";
    const model = p.get("md") || "";
    const part = p.get("part") || "";
    if (!/^\d{4}$/.test(y) || Number(y) < 1980 || Number(y) > 2035) return null;
    if (!SAFE.test(make) || !SAFE.test(model)) return null;
    return {
      vehicle: { id: null, year: y, make, model, trim: "", bodyClass: "", bodyType: null, engine: "", cylinders: "", hp: "", drive: "", fuel: "", vin: "" },
      query: SAFE.test(part) ? part : "",
    };
  } catch {
    return null;
  }
}

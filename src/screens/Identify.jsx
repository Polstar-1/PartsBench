import { useRef, useState } from "react";
import VehicleStage from "../VehicleStage";
import { decodeVin, getModels } from "../nhtsa";

const MAKES = ["Acura","Alfa Romeo","Audi","BMW","Buick","Cadillac","Chevrolet","Chrysler",
  "Dodge","Fiat","Ford","Genesis","GMC","Honda","Hyundai","Infiniti","Jaguar","Jeep","Kia",
  "Land Rover","Lexus","Lincoln","Mazda","Mercedes-Benz","Mini","Mitsubishi","Nissan",
  "Porsche","Ram","Subaru","Tesla","Toyota","Volkswagen","Volvo"];

const CURRENT_YEAR = new Date().getFullYear() + 1;
const YEAR_MIN = 1990;
const MIN_SCAN_MS = 2200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} className={"seg-btn" + (value === o.value ? " active" : "")} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

function SpecRow({ label, value, mono }) {
  return (
    <div className="spec-row">
      <div className="spec-label">{label}</div>
      <div className={"spec-value" + (mono ? " mono" : "")}>{value}</div>
    </div>
  );
}

export default function Identify({ draft, savedMatch, onDraft, onSave, goShop, goGarage }) {
  const [entryMode, setEntryMode] = useState("vin");
  const [vinValue, setVinValue] = useState("");
  const [vinError, setVinError] = useState("");
  const [phase, setPhase] = useState(draft && draft.bodyType ? "done" : "idle");
  const [target, setTarget] = useState(draft ? draft.bodyType : null);
  const pendingRef = useRef(null);

  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [ymmError, setYmmError] = useState("");

  const [mileage, setMileage] = useState("");

  const decoding = phase === "scan" || phase === "land";

  async function handleVinSubmit() {
    setVinError("");
    const vin = vinValue.trim();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      setVinError("That's not a valid 17-character VIN. VINs never use the letters I, O or Q, so check for mixed-up characters.");
      return;
    }
    onDraft(null);
    setPhase("scan");
    const t0 = performance.now();
    let v = null;
    let err = "";
    try {
      v = await decodeVin(vin);
      if (!v) err = "NHTSA doesn't have a match for that VIN. Double-check it, or use Year / Make / Model instead.";
    } catch {
      err = "Couldn't reach NHTSA's decoder right now. Check your connection and try again.";
    }
    const wait = MIN_SCAN_MS - (performance.now() - t0);
    if (wait > 0) await sleep(wait);
    if (!v) {
      setVinError(err);
      setPhase("idle");
      return;
    }
    pendingRef.current = v;
    setTarget(v.bodyType || "sedan");
    setPhase("land");
  }

  function handleLanded() {
    onDraft(pendingRef.current);
    setPhase("done");
  }

  function handleYearOrMake(nextYear, nextMake) {
    setYear(nextYear);
    setMake(nextMake);
    setModel("");
    setModels([]);
    setYmmError("");
    if (!nextYear || !nextMake) return;
    setModelsLoading(true);
    getModels(nextMake, nextYear)
      .then((list) => {
        if (!list.length) setYmmError("No models found for that year and make. Try a nearby model year.");
        setModels(list);
      })
      .catch(() => setYmmError("Couldn't reach NHTSA's vehicle database. Check your connection and try again."))
      .finally(() => setModelsLoading(false));
  }

  function handleYmmSubmit() {
    setPhase("idle");
    onDraft({ id: null, year, make, model, trim: "", bodyClass: "", bodyType: null, engine: "", cylinders: "", hp: "", drive: "", fuel: "", vin: "" });
  }

  const showSpecs = draft && !decoding;
  const caption = draft && draft.bodyClass ? draft.bodyClass : "Body style matched";

  return (
    <>
      <p className="eyebrow">Identify</p>
      <h1 className="page-title">Identify your vehicle.</h1>
      <p className="page-sub">VIN gives the full breakdown. Year / Make / Model is a quick fallback.</p>

      <div className="identify-grid">
        <div className="id-form">
          <Segmented value={entryMode} onChange={setEntryMode} options={[
            { value: "vin", label: "VIN" },
            { value: "ymm", label: "Year / Make / Model" },
          ]} />

          {entryMode === "vin" && (
            <div className="panel">
              <label htmlFor="vin">17-character VIN</label>
              <div className="row">
                <input id="vin" maxLength={17} value={vinValue}
                  onChange={(e) => setVinValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && !decoding && handleVinSubmit()}
                  placeholder="e.g. 4S4BRBCC1D3200000" autoComplete="off" spellCheck="false" disabled={decoding} />
                <button className="btn-primary" onClick={handleVinSubmit} disabled={decoding}>{decoding ? "Decoding…" : "Decode"}</button>
              </div>
              <p className="hint">Find it on the driver-side door jamb sticker, the dash through the windshield, or your registration.</p>
              {vinError && <p className="error-note">{vinError}</p>}
            </div>
          )}

          {entryMode === "ymm" && (
            <div className="panel">
              <div className="grid3">
                <div>
                  <label htmlFor="year">Year</label>
                  <select id="year" value={year} onChange={(e) => handleYearOrMake(e.target.value, make)}>
                    <option value="">Year</option>
                    {Array.from({ length: CURRENT_YEAR - YEAR_MIN + 1 }, (_, i) => CURRENT_YEAR - i).map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="make">Make</label>
                  <select id="make" value={make} onChange={(e) => handleYearOrMake(year, e.target.value)}>
                    <option value="">Make</option>
                    {MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="model">Model</label>
                  <select id="model" value={model} disabled={!models.length} onChange={(e) => setModel(e.target.value)}>
                    <option value="">{modelsLoading ? "Loading…" : models.length ? "Model" : "Year+Make first"}</option>
                    {models.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <button className="btn-primary block" onClick={handleYmmSubmit} disabled={!model}>Find Parts</button>
              {ymmError && <p className="error-note">{ymmError}</p>}
            </div>
          )}

          {showSpecs && (
            <div className="panel">
              {savedMatch ? (
                <>
                  <p className="saved-note"><span className="saved-check">✓</span> This vehicle is in your garage.</p>
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="btn-primary block" onClick={goGarage}>Open Garage</button>
                    <button className="btn-secondary" onClick={goShop}>Shop parts</button>
                  </div>
                </>
              ) : (
                <>
                  <label htmlFor="odo">Current mileage (optional)</label>
                  <input id="odo" inputMode="numeric" value={mileage} placeholder="e.g. 112000"
                    onChange={(e) => setMileage(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))} />
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="btn-primary block" onClick={() => onSave(draft, mileage ? Number(mileage) : null)}>Save to Garage</button>
                    <button className="btn-secondary" onClick={goShop}>Shop parts</button>
                  </div>
                  <p className="hint">Saving lets you track maintenance and check recalls for this vehicle.</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="id-result">
          <VehicleStage phase={phase} target={target} onLanded={handleLanded} caption={caption} />

          {showSpecs && (
            <div className="spec-plate">
              <div className="rivet tl" /><div className="rivet tr" /><div className="rivet bl" /><div className="rivet br" />
              <h3 className="plate-title">{draft.year} {draft.make} {draft.model}</h3>
              {draft.vin ? (
                <>
                  <SpecRow label="Trim" value={draft.trim || "—"} />
                  <SpecRow label="Body Style" value={draft.bodyClass || "—"} />
                  <SpecRow label="Engine" value={draft.engine} />
                  <SpecRow label="Cylinders" value={draft.cylinders} />
                  <SpecRow label="Horsepower" value={draft.hp} />
                  {draft.drive && <SpecRow label="Drivetrain" value={draft.drive.split("/")[0]} />}
                  <SpecRow label="VIN" value={draft.vin} mono />
                </>
              ) : (
                <SpecRow label="Source" value="Year / Make / Model" />
              )}
            </div>
          )}

          {showSpecs && !draft.vin && (
            <p className="info-note">Use the VIN tab for the full breakdown. Engine, drivetrain and body style come from the VIN, not the model name alone.</p>
          )}
        </div>
      </div>
    </>
  );
}
